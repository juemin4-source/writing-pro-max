#!/usr/bin/env node
/**
 * format-seedance.js
 *
 * Compiles internal shot data into official Seedance 2.0 prompt format.
 *
 * Official format:
 *   [@引用], [主体/画面描述], [运镜/镜头语言], [风格/氛围/光影]
 *   [分时段描述]
 *   【声音】...
 *   【尾帧】...
 *
 * Usage: node format-seedance.js <input.json> | --stdin
 */

const fs = require('fs');
const path = require('path');

function format(input) {
  const lines = [];

  // ─── @ references ───
  const refs = [];
  if (input.refs) {
    if (input.refs.video) refs.push(`将${input.refs.video}延长${input.duration || 15}s`);
    if (input.refs.character) refs.push(input.refs.character);
    if (input.refs.scene) refs.push(input.refs.scene);
    if (input.refs.audio) refs.push(`背景BGM参考${input.refs.audio}`);
  }
  if (refs.length > 0) lines.push(refs.join('，'));

  // ─── Three-part formula: [subject+scene+action], [camera], [style] ───
  const desc = [input.subject, input.scene, input.action].filter(Boolean).join('，');
  const formula = [desc, input.camera, input.style].filter(Boolean).join('，');
  if (formula) lines.push(formula);

  // ─── Time-axis segments ───
  if (input.segments && input.segments.length > 0) {
    input.segments.forEach(s => lines.push(`${s.timeRange}画面：${s.content}`));
  }

  // ─── Sound ───
  if (input.sound) lines.push(`【声音】${input.sound}`);

  // ─── End frame ───
  if (input.endFrame) lines.push(`【尾帧】${input.endFrame}`);

  return lines.join('\n\n');
}

function main() {
  let raw;
  const fp = process.argv[2];

  if (fp === '--stdin') {
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => {
      try { raw = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) {
        process.stderr.write('Error: invalid JSON from stdin\n'); process.exit(1);
      }
      console.log(format(raw));
    });
    return;
  }

  if (!fp) { process.stderr.write('Usage: node format-seedance.js <input.json> | --stdin\n'); process.exit(1); }
  try { raw = JSON.parse(fs.readFileSync(path.resolve(fp), 'utf-8')); } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`); process.exit(1);
  }
  console.log(format(raw));
}

if (require.main === module) main();
module.exports = { format };
