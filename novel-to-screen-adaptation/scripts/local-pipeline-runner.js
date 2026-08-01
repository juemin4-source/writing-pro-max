#!/usr/bin/env node
/**
 * local-pipeline-runner.js
 *
 * Runs the complete Novel-to-Screen Adaptation Protocol (02) 100% locally.
 * - Script phases (1A) use Node.js directly
 * - LLM phases (1B, 2, 3, 4, 5, 7, 8, 9, 10) call Ollama API at localhost:11434
 * - Validation phase uses validate-screenplay.js
 *
 * Usage:
 *   node local-pipeline-runner.js <novel.md> [options]
 *
 * Options:
 *   --output <dir>       Output directory (default: <novel-dir>/02-output)
 *   --model <name>       Ollama model (default: qwen2.5-coder:7b)
 *   --chapter <N>        Only process chapter N (default: all)
 *   --step <N>           Resume from step N (default: 00)
 *   --manifest <json>    01 story-analyzer manifest (optional)
 *   --directors-brief <md>  Director's Adaptation Brief (optional)
 *   --dry-run            Print prompts but don't call LLM
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// ── Config ────────────────────────────────────────────────────────────

const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;

function getopt() {
  const args = process.argv.slice(2);
  const opts = { model: 'qwen2.5-coder:7b', output: null, chapter: null, step: '00', manifest: null, directorsBrief: null, dryRun: false };
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output': opts.output = path.resolve(args[++i]); break;
      case '--model': opts.model = args[++i]; break;
      case '--chapter': opts.chapter = args[++i]; break;
      case '--step': opts.step = args[++i]; break;
      case '--manifest': opts.manifest = path.resolve(args[++i]); break;
      case '--directors-brief': opts.directorsBrief = path.resolve(args[++i]); break;
      case '--dry-run': opts.dryRun = true; break;
      default: positional.push(args[i]);
    }
  }

  if (positional.length === 0) {
    console.error('Usage: node local-pipeline-runner.js <novel.md> [options]');
    process.exit(1);
  }

  opts.novel = path.resolve(positional[0]);
  if (!fs.existsSync(opts.novel)) {
    console.error(`File not found: ${opts.novel}`);
    process.exit(1);
  }

  // Set output directory
  if (!opts.output) {
    opts.output = path.join(path.dirname(opts.novel), '02-output');
  }

  return opts;
}

// ── Ollama API ────────────────────────────────────────────────────────

function callOllama(model, system, prompt, opts = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model,
      system,
      prompt,
      stream: false,
      temperature: opts.temperature ?? 0.7,
      options: {
        num_predict: opts.maxTokens ?? 4096,
      }
    });

    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.response || '');
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}\nBody: ${body.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Prompt helpers ────────────────────────────────────────────────────

function buildSystemPrompt(role, step) {
  return `你是 AI 影视生产 pipeline 的 ${role}。你正在执行剧本改编协议的第 ${step} 步。
你使用中文。输出必须完整、结构化、有具体文本证据。
不要输出无关内容，直接输出产物。`;
}

function readNovelText(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content;
}

function writeCheckpoint(checkpointDir, filename, content) {
  fs.mkdirSync(checkpointDir, { recursive: true });
  const filePath = path.join(checkpointDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${filename}`);
  return filePath;
}

// ── Pipeline steps ────────────────────────────────────────────────────

async function phase00_budget(novelPath, checkpointDir, opts) {
  const content = fs.readFileSync(novelPath, 'utf8');
  const lines = content.split('\n');
  const lineCount = lines.length;
  const charCount = content.replace(/\s+/g, '').length;
  const chapterCount = lines.filter(l => l.trim().startsWith('## ')).length;

  // Detect mode
  let recommendedMode, risk;
  if (lineCount < 200) { recommendedMode = 'SAMPLE'; risk = 'low'; }
  else if (lineCount < 2000) { recommendedMode = 'ARC'; risk = 'low-to-medium'; }
  else if (lineCount < 10000) { recommendedMode = 'ARC'; risk = 'medium'; }
  else { recommendedMode = 'FULL'; risk = 'high'; }

  const report = `## SOURCE_BUDGET_REPORT

| 字段 | 值 |
|------|----|
| source_file | ${path.basename(novelPath)} |
| line_count | ${lineCount} |
| chapter_count | ${chapterCount} |
| total_chars | ${charCount} |
| recommended_mode | ${recommendedMode} |
| risk | ${risk} |
| reasoning | ${lineCount}行, ${chapterCount}章, 适合${recommendedMode}模式 |
`;

  writeCheckpoint(checkpointDir, '00-budget-scope.json', JSON.stringify({
    sourceFile: path.basename(novelPath),
    lineCount, charCount, chapterCount,
    recommendedMode, risk,
    timestamp: new Date().toISOString()
  }, null, 2));
  return report;
}

async function phase01A_sourceMap(novelPath, checkpointDir, opts) {
  // Run source-map.js
  const sourceMapScript = path.join(__dirname, 'source-map.js');
  if (!fs.existsSync(sourceMapScript)) {
    console.warn('  ⚠️ source-map.js not found, running basic analysis instead');
    return phase01A_basic(novelPath, checkpointDir);
  }

  const { execSync } = require('child_process');
  const outputPath = path.join(checkpointDir, '01-source-map.json');
  try {
    execSync(`node "${sourceMapScript}" "${novelPath}" --output "${outputPath}"`, { stdio: 'pipe' });
    console.log('  ✅ 01-source-map.json (via source-map.js)');
    return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch (e) {
    console.warn(`  ⚠️ source-map.js failed: ${e.message}, using basic fallback`);
    return phase01A_basic(novelPath, checkpointDir);
  }
}

function phase01A_basic(novelPath, checkpointDir) {
  const content = fs.readFileSync(novelPath, 'utf8');
  const lines = content.split('\n');

  const chapters = [];
  let currentCh = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('## ')) {
      if (currentCh) chapters.push(currentCh);
      currentCh = {
        id: `CH${String(chapters.length + 1).padStart(2, '0')}`,
        title: lines[i].trim().replace(/^##\s*/, ''),
        startLine: i + 1, endLine: null, lineCount: null
      };
    }
  }
  if (currentCh) { currentCh.endLine = lines.length; currentCh.lineCount = currentCh.endLine - currentCh.startLine; chapters.push(currentCh); }

  const dialogues = lines.filter(l => l.trim().startsWith('"') || l.trim().startsWith('**')).length;
  const nonEmpty = lines.filter(l => l.trim()).length;

  const result = {
    sourceFile: path.basename(novelPath),
    totalLines: lines.length,
    totalNonEmpty: nonEmpty,
    totalChars: content.length,
    chapters,
    dialogueLines: dialogues,
    dialogueRatio: nonEmpty > 0 ? dialogues / nonEmpty : 0,
  };

  writeCheckpoint(checkpointDir, '01-source-map.json', JSON.stringify(result, null, 2));
  return result;
}

async function phase01B_narrativeFunction(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  const system = buildSystemPrompt('剧本分析员', '1B（叙事功能解析）');
  const prompt = `分析以下小说第一章的每个场景，输出每个场景的叙事功能分析。

请按以下格式输出：

## Scene 1: [场景名称]

### Source
原文段落概述

### Narrative Function
这段在小说里完成什么功能？

### Screen Function
这段在屏幕上应该完成什么功能？（可能和小说不同）

### What Must Be Preserved
### What Must Be Cut
### Screen Translation Strategy

---

小说原文：
${novelText.slice(0, 4000)}`;

  if (opts.dryRun) { console.log('--- Phase 1B prompt ---\n' + prompt.slice(0, 500) + '...\n---'); return; }

  const response = await callOllama(opts.model, system, prompt, { maxTokens: 4096 });
  writeCheckpoint(checkpointDir, '02-narrative-function.md', response);
  return response;
}

async function phase02_proposition(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  const system = buildSystemPrompt('剧本分析员', '2（叙事命题）');
  const prompt = `分析以下小说的核心命题。

输出格式：

## MAIN NARRATIVE PROPOSITION

### 主命题
（一句可改编的命题句，不是标签。例如："当一个被制造出来维护秩序的人发现自己的完整人生也是系统产品时，他是否还能保留一点不被系统使用的自我？"）

### 反命题
（主命题的对立面）

### 人物如何证明命题
（每个角色在这个命题中的立场）

### 结尾如何回收命题
（结尾如果回收这个命题）

### 不可改动的主题核心

---

小说原文：
${novelText.slice(0, 4000)}`;

  if (opts.dryRun) { console.log('--- Phase 2 prompt ---\n' + prompt.slice(0, 500) + '...\n---'); return; }

  const response = await callOllama(opts.model, system, prompt, { maxTokens: 2048 });
  writeCheckpoint(checkpointDir, '03-main-proposition.md', response);
  return response;
}

async function phase03_driver(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  const system = buildSystemPrompt('剧本分析员', '3（改编发动机）');
  const prompt = `分析以下小说的改编发动机和适合的影视形态。

输出 JSON：

{
  "driverType": "concept-driven | character-driven | mystery-mechanism | identity-revelation | ...",
  "secondaryDriver": "...",
  "primaryQuestions": ["观众想知道的问题1", "问题2", ...],
  "targetFormat": "episode | film | mini-series | short-drama",
  "episodeCount": 1,
  "episodeRuntime": 480,
  "reasoning": "为什么选择这个驱动"
}

---

小说原文：
${novelText.slice(0, 3000)}`;

  if (opts.dryRun) { console.log('--- Phase 3 prompt ---\n---'); return; }

  const response = await callOllama(opts.model, system, prompt, { maxTokens: 2048 });
  writeCheckpoint(checkpointDir, '04-driver-decision.json', response);
  return response;
}

async function phase04_objects(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  const system = buildSystemPrompt('剧本分析员', '4（屏幕物件系统）');
  const prompt = `找出以下小说中适合作为"屏幕核心物件"的物品。

屏幕物件 = 可反复出现、能承载心理和主题的视觉锚点。不是一次性道具。

每个物件输出：

{
  "id": "物件名",
  "binding": "它承载什么叙事功能",
  "firstAppearance": "第一次出现的场景",
  "recurrence": "后续回收计划",
  "visualFunction": "它在屏幕上的视觉表现",
  "themeBinding": "它绑定什么主题"
}

找出 4-8 个物件。

---

小说原文：
${novelText.slice(0, 4000)}`;

  if (opts.dryRun) { console.log('--- Phase 4 prompt ---\n---'); return; }

  const response = await callOllama(opts.model, system, prompt, { maxTokens: 3072 });
  writeCheckpoint(checkpointDir, '05-screen-objects.json', response);
  return response;
}

async function phase05_translation(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  const system = buildSystemPrompt('剧本分析员', '5（内心信息外化）');
  const prompt = `找出以下小说中"不可拍"的内心活动，每条给出外化方案。

对每条转换：

## Translation N: "原文句子"

| 字段 | 内容 |
|------|------|
| Source | 原文 |
| Screen | 屏幕替代方案 |
| Loss | 丢失了什么信息 |
| Fidelity | 高/中/低 |
| Compensation | 补偿方案类型和具体计划 |
| Converter | 转换类型 |

至少找出 5 处。重点找："我感到/我意识到/我记得/我心中/我明白/我知道"类内容。

---

小说原文：
${novelText}`;

  if (opts.dryRun) { console.log('--- Phase 5 prompt ---\n---'); return; }

  const response = await callOllama(opts.model, system, prompt, { maxTokens: 4096 });
  writeCheckpoint(checkpointDir, '06-translation-log.md', response);
  return response;
}

async function phase07_episodeMap(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  const system = buildSystemPrompt('剧本分析员', '7（剧集功能重组）');
  const prompt = `将以下小说场景重组为剧集功能映射。

输出 JSON：

{
  "episodes": [{
    "id": "E01",
    "title": "...",
    "runtime": 480,
    "episodeFunction": "本集在整体中的功能",
    "actStructure": "三幕",
    "sceneMap": [
      { "id": "S-1", "novelPosition": "...", "dramaticFunction": "...", "runtime": 90 }
    ]
  }]
}

---

小说原文：
${novelText.slice(0, 4000)}`;

  if (opts.dryRun) { console.log('--- Phase 7 prompt ---\n---'); return; }

  const response = await callOllama(opts.model, system, prompt, { maxTokens: 3072 });
  writeCheckpoint(checkpointDir, '07-episode-map.json', response);
  return response;
}

async function phase08_plotNodes(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  const system = buildSystemPrompt('剧本分析员', '8（情节节点）');
  const prompt = `设计以下小说的情节节点和关键场面。

输出 JSON：

{
  "plotNodes": [
    { "id": "PN-1", "type": "cold-open | inciting | midpoint | crisis | climax", "scene": "S-1", "content": "...", "function": "..." }
  ],
  "setPieces": [
    { "id": "SP-1", "scene": "...", "visualStrategy": "...", "budget": "low|medium|high", "duration": 60 }
  ]
}

---

小说原文：
${novelText.slice(0, 3000)}`;

  if (opts.dryRun) { console.log('--- Phase 8 prompt ---\n---'); return; }

  const response = await callOllama(opts.model, system, prompt, { maxTokens: 3072 });
  writeCheckpoint(checkpointDir, '08-plot-nodes.json', response);
  return response;
}

async function phase09_sceneCards(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  const system = buildSystemPrompt('剧本分析员', '9（场景卡）');
  const prompt = `为以下小说的每个场景设计场景卡。

每张卡格式：

## S-N: 场景名称

**目标:** [角色]想要[什么]
**阻碍:** 什么挡住了他/她
**冲突:** 目标和阻碍的碰撞（外部可见）
**变化:** 从A状态→B状态
**信息揭示:** 观众知道了什么
**关系变化:** 谁靠近了/远离了
**屏幕物件:** 本场使用的物件
**视觉策略:** 关键画面描述

---

小说原文：
${novelText}`;

  if (opts.dryRun) { console.log('--- Phase 9 prompt ---\n---'); return; }

  const response = await callOllama(opts.model, system, prompt, { maxTokens: 4096 });

  // Write individual scene card files
  const scDir = path.join(checkpointDir, '09-scene-cards');
  fs.mkdirSync(scDir, { recursive: true });

  // Extract scenes from response
  const scenes = response.split(/## S-/);
  for (let i = 1; i < scenes.length; i++) {
    const sceneContent = '## S-' + scenes[i];
    const firstLine = scenes[i].split('\n')[0].trim().replace(/[^a-zA-Z0-9一-鿿_-]/g, '_');
    const fileName = `S-${String(i).padStart(2, '0')}-${firstLine.slice(0, 20)}.md`;
    fs.writeFileSync(path.join(scDir, fileName), sceneContent, 'utf8');
  }
  console.log(`  ✅ ${scenes.length - 1} scene cards written`);

  writeCheckpoint(checkpointDir, '09-scene-cards.md', response);
  return response;
}

async function phase10_screenplay(novelPath, checkpointDir, opts) {
  const novelText = readNovelText(novelPath);

  // First: beat sheet
  const beatSystem = buildSystemPrompt('编剧', '10a（节拍表）');
  const beatPrompt = `先为以下小说设计节拍表。

格式：

## S-N Beat Sheet

BEAT 1: [动作/事件]
  TURN: [人物状态变化]
BEAT 2: ...
EXIT: [场景出口状态]

至少 3 个场景，每场 3-8 个 beat。

---

小说原文：
${novelText.slice(0, 3000)}`;

  if (opts.dryRun) { console.log('--- Phase 10a prompt ---\n---'); return; }

  const beatResponse = await callOllama(opts.model, beatSystem, beatPrompt, { maxTokens: 4096 });

  const bsDir = path.join(checkpointDir, '10-beat-sheets');
  fs.mkdirSync(bsDir, { recursive: true });
  writeCheckpoint(bsDir, 'all-beats.md', beatResponse);

  // Then: screenplay draft
  const scriptSystem = buildSystemPrompt('编剧', '10b（剧本正文）');
  const scriptPrompt = `根据前面的分析和节拍表，写出完整的剧本正文。

格式规则：
- 每场以 "### S-N 场景名" 开头
- 第二行写 "内/外 · 地点 · 时间"
- 第三行列人物
- 动作描述占至少 40%
- 没有"她感到/她意识到/她记得"类描述
- 对白不超过 3 句连续
- 每场结尾有转场

小说原文：
${novelText.slice(0, 2000)}

要求写出完整剧本（至少 4 场，每场有完整的动作和对白）。`;

  const scriptResponse = await callOllama(opts.model, scriptSystem, scriptPrompt, { maxTokens: 8192 });
  writeCheckpoint(checkpointDir, '11-screenplay.md', scriptResponse);
  return scriptResponse;
}

async function phase12_signOff(checkpointDir, opts) {
  // Check which files exist
  const required = [
    '00-budget-scope.json',
    '01-source-map.json',
    '02-narrative-function.md',
    '03-main-proposition.md',
    '04-driver-decision.json',
    '05-screen-objects.json',
    '06-translation-log.md',
    '07-episode-map.json',
    '08-plot-nodes.json',
    '11-screenplay.md',
  ];

  const results = {};
  let allPass = true;
  for (const file of required) {
    const exists = fs.existsSync(path.join(checkpointDir, file));
    results[file] = exists ? '✅' : '❌';
    if (!exists) allPass = false;
  }

  const signOff = {
    timestamp: new Date().toISOString(),
    model: opts.model,
    sourceFile: path.basename(opts.novel),
    checks: results,
    allPass,
    notes: allPass ? 'All steps completed with local model' : 'Missing files detected'
  };

  writeCheckpoint(checkpointDir, '12-sign-off.json', JSON.stringify(signOff, null, 2));

  // Run validate-screenplay
  const screenplayPath = path.join(checkpointDir, '11-screenplay.md');
  if (fs.existsSync(screenplayPath)) {
    const validateScript = path.join(__dirname, 'validate-screenplay.js');
    if (fs.existsSync(validateScript)) {
      console.log('\n--- Running validate-screenplay.js ---');
      try {
        const { execSync } = require('child_process');
        const result = execSync(`node "${validateScript}" "${screenplayPath}"`, { stdio: 'pipe' });
        const output = JSON.parse(result.stdout.toString());
        console.log(`  Overall: ${output.overall}`);
        console.log(`  Action ratio: ${(output.stats.actionRatio * 100).toFixed(0)}%`);
        console.log(`  Interior leakage: ${output.stats.interiorLeakageCount}`);
        console.log(`  Pass: ${output.summary.pass}, Warn: ${output.summary.warn}, Fail: ${output.summary.fail}`);
      } catch (e) {
        console.warn(`  ⚠️ validate-screenplay.js error: ${e.message}`);
      }
    }
  }

  return signOff;
}

// ── Progress tracking ────────────────────────────────────────────────

function writeProgress(checkpointDir, step, status) {
  const progressPath = path.join(checkpointDir, 'progress.json');
  let progress = {};
  if (fs.existsSync(progressPath)) {
    try { progress = JSON.parse(fs.readFileSync(progressPath, 'utf8')); } catch {}
  }
  progress.lastUpdated = new Date().toISOString();
  progress.currentStep = step;
  progress.status = status;
  if (!progress.completedSteps) progress.completedSteps = [];
  if (status === 'done' && !progress.completedSteps.includes(step)) {
    progress.completedSteps.push(step);
  }
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const opts = getopt();
  const checkpointDir = path.join(opts.output, '02-script-development', 'checkpoints');
  const novelName = path.basename(opts.novel, '.md');

  console.log(`\n🔧 Novel-to-Screen Adaptation Protocol (100% Local)`);
  console.log(`   Novel: ${opts.novel}`);
  console.log(`   Model: ${opts.model}`);
  console.log(`   Output: ${opts.output}`);
  console.log(`   Dry run: ${opts.dryRun}\n`);

  // Phase 0
  console.log('Phase 0: Budget & Scope Contract');
  await phase00_budget(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '00', 'done');

  // Phase 1A
  console.log('Phase 1A: Mechanical Source Map');
  const sourceMap = await phase01A_sourceMap(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '01', 'done');
  console.log(`   Chapters: ${sourceMap.chapters?.length || '?'}`);
  console.log(`   Dialogue ratio: ${sourceMap.dialogueRatio ? (sourceMap.dialogueRatio * 100).toFixed(0) + '%' : '?'}\n`);

  // Phase 1B
  console.log('Phase 1B: Narrative Function Parsing (LLM)...');
  await phase01B_narrativeFunction(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '02', 'done');
  console.log('');

  // Phase 2
  console.log('Phase 2: Main Proposition (LLM)...');
  await phase02_proposition(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '03', 'done');
  console.log('');

  // Phase 3
  console.log('Phase 3: Adaptation Driver (LLM)...');
  await phase03_driver(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '04', 'done');
  console.log('');

  // Phase 4
  console.log('Phase 4: Screen Object System (LLM)...');
  await phase04_objects(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '05', 'done');
  console.log('');

  // Phase 5
  console.log('Phase 5: Interior-to-Screen Translation (LLM)...');
  await phase05_translation(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '06', 'done');
  console.log('');

  // Step 7
  console.log('Step 7: Episode Function Map (LLM)...');
  await phase07_episodeMap(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '07', 'done');
  console.log('');

  // Step 8
  console.log('Step 8: Plot Node & Set-Piece (LLM)...');
  await phase08_plotNodes(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '08', 'done');
  console.log('');

  // Step 9
  console.log('Step 9: Scene Cards (LLM)...');
  await phase09_sceneCards(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '09', 'done');
  console.log('');

  // Step 10
  console.log('Step 10: Beat Sheet + Screenplay (LLM)...');
  await phase10_screenplay(opts.novel, checkpointDir, opts);
  writeProgress(checkpointDir, '10', 'done');
  console.log('');

  // Sign-off
  console.log('Step 12: Quality Gate & Validation');
  const signOff = await phase12_signOff(checkpointDir, opts);
  writeProgress(checkpointDir, '12', signOff.allPass ? 'PASS' : 'FAIL');
  console.log(`   Overall: ${signOff.allPass ? '✅ PASS' : '❌ FAIL'}`);

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log(`📋 Pipeline Complete`);
  console.log(`   Output: ${opts.output}/02-script-development/`);
  console.log(`   Checkpoints: ${checkpointDir}`);
  console.log(`   Model: ${opts.model}`);
  console.log(`   Status: ${signOff.allPass ? '✅ ALL STEPS DONE' : '❌ MISSING STEPS'}`);
  console.log('='.repeat(50));
}

main().catch(e => {
  console.error('Pipeline failed:', e);
  process.exit(1);
});
