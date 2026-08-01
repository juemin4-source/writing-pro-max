#!/usr/bin/env node
/**
 * assemble-prompt.js
 *
 * Assembles a Seedance 2.0 prompt from structured input.
 * Reads JSON from stdin or file, outputs prompt string.
 *
 * Usage:
 *   node assemble-prompt.js <input.json>
 *   node assemble-prompt.js --stdin
 */

const fs = require('fs');
const path = require('path');

function assemble(input) {
  const parts = [];

  // @ references first
  const refs = [];
  if (input.refs) {
    if (input.refs.character) refs.push(`@${input.refs.character} 的人物作为主角`);
    (input.refs.image || []).forEach(r => refs.push(`@${r}`));
    (input.refs.video || []).forEach(r => refs.push(`参考 @${r} 的运镜效果`));
    (input.refs.audio || []).forEach(r => refs.push(`背景BGM参考 @${r}`));
  }
  if (refs.length > 0) parts.push(refs.join('，'));

  // Main description
  const descParts = [];
  if (input.shotSize) descParts.push(shotSizeLabel(input.shotSize));
  if (input.subject) descParts.push(input.subject);
  if (input.scene) descParts.push(input.scene);
  if (input.action) descParts.push(input.action);
  if (input.camera) descParts.push(input.camera);
  if (input.style) descParts.push(input.style);
  if (input.effect) descParts.push(input.effect);
  if (input.audioDesign) descParts.push(input.audioDesign);

  if (descParts.length > 0) parts.push(descParts.join('，'));

  // Segments (for ≥10s)
  if (input.segments && input.segments.length > 0) {
    const segs = input.segments.map(s => `${s.timeRange}：${s.content}`).join('，');
    parts.push(segs);
  }

  let prompt = parts.join('，');

  // Truncate to 500 chars
  if (prompt.length > 500) prompt = prompt.slice(0, 497) + '...';

  return prompt;
}

function shotSizeLabel(s) {
  const map = {
    'extreme-close-up': '极致特写',
    'close-up': '面部特写',
    'medium-close-up': '中近景',
    'medium': '中景',
    'full': '全景',
    'wide': '远景',
  };
  return map[s] || s;
}

// ─── CLI ───

function main() {
  let input;
  const filePath = process.argv[2];

  if (filePath === '--stdin') {
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => {
      try { input = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) {
        process.stderr.write('Error: invalid JSON from stdin\n'); process.exit(1);
      }
      console.log(assemble(input));
    });
    return;
  }

  if (!filePath) {
    process.stderr.write('Usage: node assemble-prompt.js <input.json> | --stdin\n');
    process.exit(1);
  }

  try { input = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8')); } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`); process.exit(1);
  }
  console.log(assemble(input));
}

if (require.main === module) main();
module.exports = { assemble };
