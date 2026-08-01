#!/usr/bin/env node
/**
 * budget.js — 02 预算统计共享模块（Phase 0 机械部分）
 *
 * 语义源：SKILL.md Phase 0（SAMPLE ≤500 行 / ARC 500-5000 / FULL >5000）
 * 模式选择（判断部分）由导演在 DIRECTOR_WAIT 决定；本模块只提供统计与建议。
 * runner / test-runner / 会话三处共用，消除阈值漂移。
 *
 * Usage:
 *   node budget.js <novel.md>          # JSON 输出
 *   const { analyzeSource } = require('./budget.js')
 */

const fs = require('fs');
const path = require('path');

const MODE_THRESHOLDS = { sample: 500, arc: 5000 }; // lines: ≤500 SAMPLE, 500-5000 ARC, >5000 FULL

function analyzeSource(novelText, sourceName = '') {
  const lines = novelText.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  return {
    source: sourceName,
    lineCount: lines.length,
    nonEmptyLineCount: nonEmpty.length,
    charCount: novelText.replace(/\s+/g, '').length,
    chapterCount: lines.filter(l => l.trim().startsWith('## ')).length,
    // recommendedMode 是建议；最终模式由导演判定（DIRECTOR_WAIT）
    recommendedMode: lines.length <= MODE_THRESHOLDS.sample ? 'SAMPLE'
      : lines.length <= MODE_THRESHOLDS.arc ? 'ARC' : 'FULL',
  };
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return analyzeSource(content, path.basename(filePath));
}

module.exports = { analyzeSource, analyzeFile, MODE_THRESHOLDS };

if (require.main === module) {
  const p = process.argv[2];
  if (!p) { console.error('Usage: node budget.js <novel.md>'); process.exit(1); }
  console.log(JSON.stringify(analyzeFile(path.resolve(p)), null, 2));
}
