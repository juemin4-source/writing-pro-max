#!/usr/bin/env node
/**
 * ds-pipeline-runner.js — 02 protocol on DeepSeek API with token tracking
 *
 * Usage: node ds-pipeline-runner.js <novel.md> [options]
 * Options:
 *   --model <name>    deepseek-v4-flash (default) | deepseek-v4-pro
 *   --output <dir>    Output directory
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DS_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DS_API = 'api.deepseek.com';

const args = process.argv.slice(2);
const novelPath = path.resolve(args[0] || '');
const model = args.includes('--model') ? args[args.indexOf('--model') + 1] : 'deepseek-v4-flash';
const outputBase = args.includes('--output') ? path.resolve(args[args.indexOf('--output') + 1])
  : path.join(path.dirname(novelPath), 'ds-output');
const whitelistArg = args.includes('--whitelist') ? args[args.indexOf('--whitelist') + 1] : null;

// Read character whitelist from 01 manifest
let characterWhitelist = [];
if (whitelistArg && fs.existsSync(whitelistArg)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(whitelistArg, 'utf8'));
    characterWhitelist = manifest.explicit_characters || [];
    console.log(`📋 Whitelist: [${characterWhitelist.join(', ')}]`);
  } catch(e) { console.warn(`⚠️ whitelist read error: ${e.message}`); }
}

if (!novelPath || !fs.existsSync(novelPath)) {
  console.error('Usage: node ds-pipeline-runner.js <novel.md> [--model deepseek-v4-flash|deepseek-v4-pro] [--output <dir>]');
  process.exit(1);
}

// ── Token tracking ────────────────────────────────────────────────────
let totalIn = 0, totalOut = 0;
function approxTok(s) { return Math.ceil((s || '').length / 1.5); }

// ── DeepSeek API call ─────────────────────────────────────────────────
function callDS(system, userMsg, opts = {}) {
  return new Promise((resolve, reject) => {
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: userMsg }
    ];
    const body = JSON.stringify({
      model, messages,
      max_tokens: opts.maxTokens || 4096,
      temperature: opts.temp ?? 0.7,
      stream: false
    });

    const req = https.request({
      hostname: DS_API, path: '/v1/chat/completions', method: 'POST',
      headers: {
        'Authorization': `Bearer ${DS_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          const content = j.choices?.[0]?.message?.content || '';
          const usage = j.usage || {};
          const inT = usage.prompt_tokens || approxTok(system + userMsg);
          const outT = usage.completion_tokens || approxTok(content);
          totalIn += inT; totalOut += outT;
          console.log(`     📊 +${inT} in / +${outT} out  (¥${((inT/1000000)+(outT/1000000*2)).toFixed(5)})`);
          resolve(content);
        } catch(e) { reject(new Error(`Parse error: ${e.message}\n${data.slice(0,300)}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Pipeline ──────────────────────────────────────────────────────────
const novelText = fs.readFileSync(novelPath, 'utf8');
const novelName = path.basename(novelPath, '.md');
const ckDir = path.join(outputBase, '02-script-development', 'checkpoints');
fs.mkdirSync(ckDir, { recursive: true });
fs.mkdirSync(path.join(ckDir, '09-scene-cards'), { recursive: true });

function sys(role, step) {
  return `你是 AI 影视生产 pipeline 的 ${role}。你正在执行剧本改编协议的第 ${step} 步。使用中文。输出完整、结构化。直接输出产物，不要多余内容。`;
}

async function main() {
  const start = Date.now();
  console.log(`📗 ${novelName}`);
  console.log(`   源文件: ${novelName}.md (${novelText.length} chars)`);
  console.log(`   模型: ${model}`);
  console.log('');

  // Phase 0: Budget
  const lines = novelText.split('\n');
  const budget = { source: novelName, lines: lines.length, chars: novelText.length,
    chapters: lines.filter(l => l.trim().startsWith('## ')).length,
    mode: lines.length < 500 ? 'ARC' : 'FULL' };
  fs.writeFileSync(path.join(ckDir, '00-budget-scope.json'), JSON.stringify(budget, null, 2));
  console.log(`Phase 0: Budget ✅ (${budget.lines} lines, mode: ${budget.mode})`);

  // Phase 1A: source-map
  console.log('\nPhase 1A: Source Map');
  const sm = path.join(__dirname, 'source-map.js');
  const smOut = path.join(ckDir, '01-source-map.json');
  require('child_process').execSync(`node "${sm}" "${novelPath}" --output "${smOut}"`, { stdio: 'pipe' });
  const smData = JSON.parse(fs.readFileSync(smOut, 'utf8'));
  console.log(`   ${smData.chapters.length} segments, ${(smData.dialogueRatio*100).toFixed(0)}% dialogue`);

  // Phase 1B-10: LLM phases
  const phases = [
    { step: '1B', file: '02-narrative-function.md', role: '剧本分析员', label: 'Narrative Function',
      msg: `分析以下小说的每个场景的叙事功能。输出每个场景的：## Scene N\n### Source\n### Narrative Function\n### Screen Function\n### What Must Be Preserved\n### What Must Be Cut\n### Screen Translation Strategy\n\n${novelText.slice(0,4000)}` },
    { step: '2', file: '03-main-proposition.md', role: '剧本分析员', label: 'Proposition',
      msg: `输出以下小说的核心命题：## MAIN NARRATIVE PROPOSITION\n### 主命题\n### 反命题\n### 人物如何证明命题\n### 结尾如何回收命题\n${novelText.slice(0,3000)}` },
    { step: '3', file: '04-driver-decision.json', role: '剧本分析员', label: 'Driver',
      msg: `输出JSON：以下小说的改编发动机和影视形态。{\"driverType\":\"...\",\"primaryQuestions\":[...],\"targetFormat\":\"...\"}\n\n${novelText.slice(0,2500)}` },
    { step: '4', file: '05-screen-objects.json', role: '剧本分析员', label: 'Objects',
      msg: `找出以下小说的屏幕核心物件（4-8个）。JSON数组：对象含 id, binding, firstAppearance, recurrence, visualFunction。\n\n${novelText.slice(0,3000)}` },
    { step: '5', file: '06-translation-log.md', role: '剧本分析员', label: 'Translation',
      msg: `找出以下小说中不可拍的内心活动，给出外化方案。每条约50-100字。\n\n${novelText}` },
    { step: '7', file: '07-episode-map.json', role: '剧本分析员', label: 'Episode Map',
      msg: `JSON格式：将以下小说场景重组为剧集功能映射。\n\n${novelText.slice(0,2500)}` },
    { step: '8', file: '08-plot-nodes.json', role: '剧本分析员', label: 'Plot Nodes',
      msg: `JSON格式：设计以下小说的情节节点和关键场面。\n\n${novelText.slice(0,2500)}` },
    { step: '9', file: '09-scene-cards.md', role: '剧本分析员', label: 'Scene Cards',
      msg: `为以下小说每个场景设计场景卡。每张含：目标、阻碍、冲突、变化、物件\n\n${novelText}` },
    { step: '10', file: '11-screenplay.md', role: '编剧', label: 'Screenplay',
      msg: `写完整剧本。格式：每场"### S-N 场景名"→"内/外·地点·时间"→人物→动作+对白。动作≥40%，无"感到/意识到"。\n\n${novelText.slice(0,2000)}` },
  ];

  for (const p of phases) {
    console.log(`\nPhase ${p.step}: ${p.label}`);
    const whitelistConstraint = characterWhitelist.length > 0
      ? `\n\n⚠️ 角色约束：以下是在原文中确认真实存在的角色：[${characterWhitelist.join(', ')}]。剧本中只能出现这些角色——不要发明新角色名。如果原文中有角色在场景中没有名字，用"家属""护士""医生"等通用称谓，不要编名字。\n\n`
      : '';
    const resp = await callDS(sys(p.role, p.step), whitelistConstraint + p.msg, { maxTokens: p.step === '10' ? 8192 : 4096 });
    fs.writeFileSync(path.join(ckDir, p.file), resp, 'utf8');
  }

  // Validation
  console.log('\nValidation');
  const validate = path.join(__dirname, 'validate-screenplay.js');
  const sp = path.join(ckDir, '11-screenplay.md');
  if (fs.existsSync(sp)) {
    try {
      // T5：角色从剧本自动提取，不再硬编码
      const vr = require('child_process').execSync(
        `node "${validate}" "${sp}"`, { encoding: 'utf8', stdio: 'pipe' });
      const vj = JSON.parse(vr);
      console.log(`   ${vj.overall} (action ${(vj.stats.actionRatio*100).toFixed(0)}%, interior leak: ${vj.stats.interiorLeakageCount}, char: ${(vj.checks.characterConsistency||[]).filter(c=>c.severity==='FAIL').length} fail)`);
    } catch(e) { console.log(`   validate: ${e.message}`); }
  }

  // Summary
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const costV4 = (totalIn / 1000000 * 1) + (totalOut / 1000000 * 2);
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Complete`);
  console.log(`   时间: ${elapsed}s`);
  console.log(`   模型: ${model}`);
  console.log(`   Tokens in:  ${totalIn.toLocaleString()}`);
  console.log(`   Tokens out: ${totalOut.toLocaleString()}`);
  console.log(`   Total:      ${(totalIn + totalOut).toLocaleString()}`);
  console.log(`   Cost:       ¥${costV4.toFixed(4)} (${model})`);
  console.log('='.repeat(50));
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
