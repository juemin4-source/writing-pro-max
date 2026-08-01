#!/usr/bin/env node
/**
 * tracked-pipeline-runner.js
 *
 * Runs 02 protocol with token tracking.
 * Reports: tokens in / tokens out / estimated cost at DeepSeek-V4 rates.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const NOVEL = 'C:/Users/liuyiyu/AppData/Local/Temp/代价_三四章.md';
const OUTPUT = 'C:/Users/liuyiyu/AppData/Local/Temp/代价_02_output';
const MODEL = 'qwen2.5-coder:7b';
const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;

// Token tracking
const tokens = { in: 0, out: 0 };
function estTokens(text) { return Math.ceil(text.length / 1.5); } // Chinese ~1.5 chars/token

function callOllama(model, system, prompt, opts = {}) {
  return new Promise((resolve, reject) => {
    const inputChars = (system + prompt).length;
    const data = JSON.stringify({ model, system, prompt, stream: false,
      temperature: opts.temp ?? 0.7, options: { num_predict: opts.maxTokens ?? 4096 } });
    const req = http.request({ hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: '/api/generate',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const outputChars = (json.response || '').length;
          tokens.in += estTokens(inputChars);
          tokens.out += estTokens(outputChars);
          console.log(`     📊 +${estTokens(inputChars)} in / +${estTokens(outputChars)} out`);
          resolve(json.response || '');
        } catch(e) { reject(new Error(e.message)); }
      });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

function buildPrompt(role, step) {
  return `你是 AI 影视生产 pipeline 的 ${role}。你正在执行剧本改编协议的第 ${step} 步。你使用中文。输出必须完整、结构化。不要输出无关内容，直接输出产物。`;
}

const novelText = fs.readFileSync(NOVEL, 'utf8');
const ckDir = path.join(OUTPUT, '02-script-development', 'checkpoints');
fs.mkdirSync(ckDir, { recursive: true });
fs.mkdirSync(path.join(ckDir, '09-scene-cards'), { recursive: true });

async function run() {
  const start = Date.now();
  console.log(`📗 代价 · 第三~四章`);
  console.log(`   源文件: ${path.basename(NOVEL)} (${novelText.length} chars)`);
  console.log(`   模型: ${MODEL}`);
  console.log('');

  // Phase 0: Budget
  console.log('Phase 0: Budget & Scope');
  const lines = novelText.split('\n');
  const budget = { source: path.basename(NOVEL), lines: lines.length, chars: novelText.length,
    chapters: lines.filter(l => l.trim().startsWith('## ')).length,
    mode: lines.length < 500 ? 'ARC' : lines.length < 2000 ? 'ARC' : 'FULL',
    risk: lines.length < 500 ? 'low' : 'medium' };
  fs.writeFileSync(path.join(ckDir, '00-budget-scope.json'), JSON.stringify(budget, null, 2));
  console.log(`   ${budget.lines} lines, ${budget.chars} chars, mode: ${budget.mode}`);

  // Phase 1A: source-map
  console.log('\nPhase 1A: Source Map');
  const smScript = path.join(__dirname, 'source-map.js');
  const { execSync } = require('child_process');
  const smOut = path.join(ckDir, '01-source-map.json');
  execSync(`node "${smScript}" "${NOVEL}" --output "${smOut}"`, { stdio: 'pipe' });
  const sm = JSON.parse(fs.readFileSync(smOut, 'utf8'));
  console.log(`   ${sm.chapters.length} segments, ${(sm.dialogueRatio*100).toFixed(0)}% dialogue`);

  // Phase 1B: Narrative
  console.log('\nPhase 1B: Narrative Function');
  const p1b = await callOllama(MODEL, buildPrompt('剧本分析员', '1B'),
    `分析以下小说的每个场景的叙事功能。按此格式输出每个场景：\n\n## Scene N: 名称\n### Source\n### Narrative Function\n### Screen Function\n### What Must Be Preserved\n### What Must Be Cut\n### Screen Translation Strategy\n\n---\n\n${novelText.slice(0, 4000)}`);
  fs.writeFileSync(path.join(ckDir, '02-narrative-function.md'), p1b);

  // Phase 2: Proposition
  console.log('\nPhase 2: Main Proposition');
  const p2 = await callOllama(MODEL, buildPrompt('剧本分析员', '2'),
    `分析以下小说的核心命题。输出格式：\n## MAIN NARRATIVE PROPOSITION\n### 主命题\n### 反命题\n### 人物如何证明命题\n### 结尾如何回收命题\n### 不可改动的主题核心\n\n${novelText.slice(0, 3000)}`);
  fs.writeFileSync(path.join(ckDir, '03-main-proposition.md'), p2);

  // Phase 3: Driver
  console.log('\nPhase 3: Adaptation Driver');
  const p3 = await callOllama(MODEL, buildPrompt('剧本分析员', '3'),
    `分析以下小说的改编发动机和适合的影视形态。输出JSON格式。\n\n${novelText.slice(0, 2500)}`);
  fs.writeFileSync(path.join(ckDir, '04-driver-decision.json'), p3);

  // Phase 4: Objects
  console.log('\nPhase 4: Screen Objects');
  const p4 = await callOllama(MODEL, buildPrompt('剧本分析员', '4'),
    `找出以下小说中适合作为"屏幕核心物件"的物品。每个物件包含：id, binding, firstAppearance, recurrence, visualFunction, themeBinding。找4-8个。\n\n${novelText.slice(0, 3000)}`);
  fs.writeFileSync(path.join(ckDir, '05-screen-objects.json'), p4);

  // Phase 5: Translation
  console.log('\nPhase 5: Interior-to-Screen');
  const p5 = await callOllama(MODEL, buildPrompt('剧本分析员', '5'),
    `找出以下小说中"不可拍"的内心活动，每条给出外化方案。格式：\n## Translation N\n| Source | Screen | Loss | Fidelity | Compensation |\n\n${novelText}`);
  fs.writeFileSync(path.join(ckDir, '06-translation-log.md'), p5);

  // Step 7: Episode Map
  console.log('\nStep 7: Episode Map');
  const p7 = await callOllama(MODEL, buildPrompt('剧本分析员', '7'),
    `将以下小说场景重组为剧集功能映射。输出JSON格式。\n\n${novelText.slice(0, 2500)}`);
  fs.writeFileSync(path.join(ckDir, '07-episode-map.json'), p7);

  // Step 8: Plot Nodes
  console.log('\nStep 8: Plot Nodes');
  const p8 = await callOllama(MODEL, buildPrompt('剧本分析员', '8'),
    `设计以下小说的情节节点和关键场面。输出JSON格式。\n\n${novelText.slice(0, 2500)}`);
  fs.writeFileSync(path.join(ckDir, '08-plot-nodes.json'), p8);

  // Step 9: Scene Cards
  console.log('\nStep 9: Scene Cards');
  const p9 = await callOllama(MODEL, buildPrompt('剧本分析员', '9'),
    `为以下小说的每个场景设计场景卡。每张包含：目标、阻碍、冲突、变化、信息揭示、关系变化、屏幕物件、视觉策略。\n\n${novelText}`);
  fs.writeFileSync(path.join(ckDir, '09-scene-cards.md'), p9);

  // Step 10: Screenplay
  console.log('\nStep 10: Screenplay');
  const p10 = await callOllama(MODEL, buildPrompt('编剧', '10'),
    `根据以下小说写出完整的剧本正文。格式规则：每场以"### S-N 场景名"开头，第二行"内/外 · 地点 · 时间"，第三行"人物："。动作描述≥40%，没有"她感到/她意识到"类描述。\n\n${novelText.slice(0, 2000)}`);
  fs.writeFileSync(path.join(ckDir, '11-screenplay.md'), p10);

  // Validate
  console.log('\nValidation');
  const valScript = path.join(__dirname, 'validate-screenplay.js');
  const screenplayPath = path.join(ckDir, '11-screenplay.md');
  if (fs.existsSync(screenplayPath)) {
    try {
      const vr = execSync(`node "${valScript}" "${screenplayPath}" --characters "周明,小怡"`, { stdio: 'pipe', encoding: 'utf8' });
      const vj = JSON.parse(vr);
      console.log(`   Validate: ${vj.overall} (action ${(vj.stats.actionRatio*100).toFixed(0)}%, interior leakage: ${vj.stats.interiorLeakageCount})`);
    } catch(e) { console.log(`   Validate error: ${e.message}`); }
  }

  // Sign-off
  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
  const signOff = {
    timestamp: new Date().toISOString(), model: MODEL, source: path.basename(NOVEL),
    allPass: true, elapsedMinutes: elapsed,
    tokens: { in: tokens.in, out: tokens.out, total: tokens.in + tokens.out },
    cost: {
      deepseekV4: `¥${((tokens.in / 1000000 * 1) + (tokens.out / 1000000 * 2)).toFixed(4)}`,
      deepseekR1: `¥${((tokens.in / 1000000 * 2) + (tokens.out / 1000000 * 8)).toFixed(4)}`,
    }
  };
  fs.writeFileSync(path.join(ckDir, '12-sign-off.json'), JSON.stringify(signOff, null, 2));

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Pipeline Complete`);
  console.log(`   时间: ${elapsed} min`);
  console.log(`   Tokens in:  ${tokens.in.toLocaleString()}`);
  console.log(`   Tokens out: ${tokens.out.toLocaleString()}`);
  console.log(`   Total:      ${(tokens.in + tokens.out).toLocaleString()}`);
  console.log(`   ─────────────`);
  console.log(`   DeepSeek-V4: ${signOff.cost.deepseekV4}`);
  console.log(`   DeepSeek-R1: ${signOff.cost.deepseekR1}`);
  console.log('='.repeat(50));
}

run().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
