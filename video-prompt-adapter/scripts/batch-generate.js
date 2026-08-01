#!/usr/bin/env node
/**
 * batch-generate.js
 *
 * Generates all clips for the "星空少女" MV in one pass.
 * Reads input JSON files from input/ dir, assembles prompts, prints report.
 */

const fs = require('fs');
const path = require('path');
const { assemble } = require('./assemble-prompt.js');

const inputDir = path.resolve(__dirname, '..', 'input');
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json')).sort();

const results = [];

for (const file of files) {
  const fullPath = path.join(inputDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    const prompt = assemble(data);
    const label = file.replace('.json', '');
    results.push({ label, prompt, length: prompt.length, ok: prompt.length <= 500 });
  } catch (e) {
    results.push({ label: file, error: e.message, ok: false });
  }
}

// Report
console.log('═'.repeat(60));
console.log('  Seedance Prompt Batch — "冷灰蓝的梵高"');
console.log('═'.repeat(60));
console.log();

for (const r of results) {
  const status = r.ok ? '✓' : '✗';
  console.log(`${status} ${r.label}  (${r.length}/500 chars)`);
  if (r.error) {
    console.log(`  ERROR: ${r.error}`);
  } else {
    console.log(`  ${r.prompt}`);
  }
  console.log();
}

// Summary
const total = results.length;
const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
console.log('─'.repeat(60));
console.log(`Total: ${total}  |  Pass: ${passed}  |  Fail: ${failed}`);
