#!/usr/bin/env node
/**
 * assemble-episode.js
 *
 * Stitches multiple Seedance prompts into one coherent episode.
 * Strips embedded 【尾帧】from scene prompts — episode level emits it once.
 *
 * Usage: node assemble-episode.js <episode-input.json> | --stdin
 */

const fs = require('fs');
const path = require('path');

function assemble(input) {
  const lines = [];

  // ─── Episode header ───
  lines.push(`【集次】${input.episode || '未命名'}`);
  if (input.totalDuration) lines.push(`【总时长】${input.totalDuration}秒`);
  if (input.overallStyle) lines.push(`【总风格】${input.overallStyle}`);
  if (input.soundDesign) lines.push(`【声音总纲】${input.soundDesign}`);
  lines.push('');

  // ─── Scenes ───
  if (input.scenes && input.scenes.length > 0) {
    input.scenes.forEach((scene, i) => {
      const header = scene.sceneId
        ? `场景${i + 1}（${scene.sceneId}）：${scene.timeRange || ''}`
        : `场景${i + 1}：${scene.timeRange || ''}`;
      lines.push(header);
      lines.push('');

      if (scene.seedancePrompt) {
        // Strip embedded 【尾帧】— episode level adds it once
        const cleaned = scene.seedancePrompt.replace(/\n?【尾帧】.*$/s, '').trim();
        lines.push(cleaned);
      }

      if (i < input.scenes.length - 1) lines.push('---');
    });
  }

  // ─── End frame ───
  if (input.endFrame) {
    lines.push('');
    lines.push(`【尾帧】${input.endFrame}`);
  }

  return lines.join('\n');
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
      console.log(assemble(raw));
    });
    return;
  }
  if (!fp) { process.stderr.write('Usage: node assemble-episode.js <input.json> | --stdin\n'); process.exit(1); }
  try { raw = JSON.parse(fs.readFileSync(path.resolve(fp), 'utf-8')); } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`); process.exit(1);
  }
  console.log(assemble(raw));
}

if (require.main === module) main();
module.exports = { assemble };
