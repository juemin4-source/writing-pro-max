#!/usr/bin/env node
/**
 * source-map.js — Mechanical Source Map Generator (Phase 1A)
 *
 * Automatically extracts from a novel:
 *   - Chapter boundaries + line counts
 *   - Character mentions + frequency
 *   - Location mentions + frequency
 *   - Object mentions + frequency
 *   - Dialogue ratio per chapter
 *   - Scene boundary heuristics
 *
 * Usage:
 *   node source-map.js <novel.md> [--output <output.json>]
 *
 * The output is fed into Phase 1B (dramatic function parsing by LLM).
 * This script does NOT replace LLM judgment — it produces the structural
 * skeleton that the LLM then interprets.
 */

const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────

// Patterns that look like chapter headings
const CHAPTER_PATTERNS = [
  /^#{1,3}\s*(?:第[一二三四五六七八九十百千万]+章|Chapter\s+\d+|CH\d+)/i,
  /^#{1,3}\s*(?:序章|序幕|终章|尾声|后记|番外)/,
  /^#{1,3}\s*.{1,30}$/,  // heading with short text
  /^\*\*.+\*\*$/,         // bold line as chapter marker
  /^—{3,}$/,              // horizontal rule as chapter separator
  /^第[一二三四五六七八九十百千万]+章/,  // Chinese chapter markers without #
];

// Dialogue patterns
const DIALOGUE_PATTERNS = [
  /^「[^」]+」/,        // Japanese/Chinese quotes 「」
  /^『[^』]+』/,
  /^".+"/,               // double quotes at line start
  /^'.+'/,               // single quotes at line start
  /^\*\*.+：\*\*/,       // markdown bold对话: **角色名：**
  /^——.*/,               // em-dash dialogue
  /^“.+/,            // left double curly quote at line start
];

// Time/location words that suggest scene boundaries
const SCENE_BOUNDARY_WORDS = [
  /(?:这时|那时|突然|就在这时|与此同时|片刻后|几分钟后|半小时后|当天晚上|第二天|第二天早上|第二天下午|第二天晚上|第三天|一周后|一个月后)/,
  /(?:清晨|中午|傍晚|黄昏|深夜|午夜|凌晨)/,
  /(?:回到|来到|走进|走出|推开|穿过|沿着|拐进|驶向|抵达|离开|进入|外面|里面)/,
  /(?:与此同时|同一时间|另一边|另外一边)/,
];

const LOCATION_MARKERS = [
  /(?:室|厅|房|馆|楼|院|园|区|站|场|港|库|营|殿|塔|阁|廊|亭|台|桥|街|路|巷|道|山|河|湖|海|岛|岸|谷|洞|穴|寨|堡|城|镇|村|寨|林|场|园|厂|司|局|处|科|房|间)/,
];

// 角色提取边界（2026-08-01 导演裁决）：人物/地点/物件是**语义任务**，
// 由 01 story-analyzer 的 manifest（explicit_characters）或 Phase 1B（LLM）提供。
// 机械层只做结构拆分；角色仅从外部清单与剧本对白标记（**角色名：**）提取，
// 不做语义猜测（第一人称叙述/称呼后缀/词频启发一律不猜）。
const SPEAKER_LINE_RE = /^\*\*(.+?)[：:]/;  // 剧本格式对白标记（唯一机械可信源）

// ── Helpers ───────────────────────────────────────────────────────────

function isChapterHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  for (const pat of CHAPTER_PATTERNS) {
    if (pat.test(trimmed)) return true;
  }
  return false;
}

function isDialogueLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  for (const pat of DIALOGUE_PATTERNS) {
    if (pat.test(trimmed)) return true;
  }
  return false;
}

function isSceneBoundary(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  for (const pat of SCENE_BOUNDARY_WORDS) {
    if (pat.test(trimmed)) return true;
  }
  return false;
}

function extractCharacterMentions(text, knownCharacters) {
  const mentions = {};
  if (knownCharacters && knownCharacters.length > 0) {
    for (const ch of knownCharacters) {
      const regex = new RegExp(ch, 'g');
      const count = (text.match(regex) || []).length;
      if (count > 0) mentions[ch] = count;
    }
  }
  return mentions;
}

function extractLocationMentions(text) {
  // 地点提取边界（2026-08-01）：仅输出"候选片段"（紧凑名词短语），供 LLM 归纳；
  // 最终地点清单由 Phase 1B 判定——机械不输出语义结论
  const mentions = {};
  const sentences = text.split(/[。！？\n]/);
  for (const s of sentences) {
    for (const marker of LOCATION_MARKERS) {
      const m = s.match(new RegExp(`([\\u4e00-\\u9fff]{1,4}${marker.source})`, 'g'));
      if (m) {
        for (const phrase of m) {
          const trimmed = phrase.trim();
          // 过滤：动词开头短语（来到/走进/回到…）、"的"结尾（"的房间"是属格不是地点）
          if (/^(来到|走进|走出|回到|离开|进入|推开|穿过|沿着|驶向|抵达|跑到|冲进|溜进|翻过|爬进|出现在|走进了)/.test(trimmed)) continue;
          if (trimmed.endsWith('的') || trimmed.endsWith('了') || trimmed.endsWith('在')) continue;
          if (trimmed.length >= 2 && trimmed.length <= 6) {
            mentions[trimmed] = (mentions[trimmed] || 0) + 1;
          }
        }
      }
    }
  }
  return mentions;
}

function extractObjectMentions(text, knownObjects) {
  const mentions = {};
  if (knownObjects && knownObjects.length > 0) {
    for (const obj of knownObjects) {
      const regex = new RegExp(obj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const count = (text.match(regex) || []).length;
      if (count > 0) mentions[obj] = count;
    }
  }
  return mentions;
}

function findCharacterNamesInDialogue(lines) {
  // 角色提取边界（2026-08-01）：只认剧本格式 **角色名：**（机械可信源）；
  // 中文小说叙述格式不猜——由 01 manifest 或 Phase 1B 提供
  const candidates = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const m1 = trimmed.match(SPEAKER_LINE_RE);
    if (m1) {
      candidates.add(m1[1].trim());
    }
  }

  return Array.from(candidates).filter(n => n.length > 0 && n.length < 10);
}

function calculateDialogueRatio(lines) {
  let dialogueLines = 0;
  let totalNonEmpty = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    totalNonEmpty++;
    if (isDialogueLine(trimmed)) dialogueLines++;
  }

  return totalNonEmpty > 0 ? dialogueLines / totalNonEmpty : 0;
}

// ── Main ──────────────────────────────────────────────────────────────

function generateSourceMap(filePath, knownCharacters = []) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Phase 1: Identify chapter boundaries
  const chapters = [];
  let currentChapter = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isChapterHeading(line) || line.trim().match(/^—{3,}$/) && i > 10) {
      if (currentChapter) {
        currentChapter.endLine = i;
        currentChapter.lineCount = currentChapter.endLine - currentChapter.startLine;
        chapters.push(currentChapter);
      }

      if (line.trim().match(/^—{3,}$/)) {
        // Separator line — start a new unnamed segment
        currentChapter = {
          id: `CH${String(chapters.length + 1).padStart(2, '0')}`,
          title: `(segment)`,
          startLine: i + 1,
          endLine: null,
          lineCount: null,
        };
      } else {
        currentChapter = {
          id: `CH${String(chapters.length + 1).padStart(2, '0')}`,
          title: line.trim().replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, ''),
          startLine: i + 1,
          endLine: null,
          lineCount: null,
        };
      }
    }
  }

  // Close last chapter
  if (currentChapter) {
    currentChapter.endLine = lines.length;
    currentChapter.lineCount = currentChapter.endLine - currentChapter.startLine;
    chapters.push(currentChapter);
  }

  // If no chapters found, treat entire text as one chapter
  if (chapters.length === 0) {
    chapters.push({
      id: 'CH01',
      title: path.basename(filePath, '.md'),
      startLine: 1,
      endLine: lines.length,
      lineCount: lines.length,
    });
  }

  // Phase 2: Extract characters
  // 角色边界（2026-08-01 导演裁决）：机械层只取剧本对白标记 + 外部清单（01 manifest）；
  // 其余由 Phase 1B（LLM）提供——机械不做语义猜测
  const allCharacters = new Set(findCharacterNamesInDialogue(lines));
  for (const ch of knownCharacters) allCharacters.add(ch);
  const allCharactersArr = [...allCharacters];  // extractCharacterMentions 按数组处理

  // Phase 3: Per-chapter analysis
  for (const ch of chapters) {
    const chapterLines = lines.slice(ch.startLine - 1, ch.endLine - 1);
    const chapterText = chapterLines.join('\n');

    ch.dialogueLines = chapterLines.filter(l => isDialogueLine(l)).length;
    ch.narrativeLines = chapterLines.filter(l => l.trim() && !isDialogueLine(l) && !isChapterHeading(l)).length;
    ch.totalNonEmpty = chapterLines.filter(l => l.trim()).length;
    ch.dialogueRatio = ch.totalNonEmpty > 0 ? ch.dialogueLines / ch.totalNonEmpty : 0;

    ch.characters = extractCharacterMentions(chapterText, allCharactersArr);
    ch.locations = extractLocationMentions(chapterText);
    ch.sceneBoundaries = [];

    // Detect scene boundaries
    for (let i = 0; i < chapterLines.length; i++) {
      if (isSceneBoundary(chapterLines[i])) {
        ch.sceneBoundaries.push(i + ch.startLine);
      }
    }

    // Also detect blank-line scene transitions (two consecutive blank lines)
    let blankCount = 0;
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].trim() === '' && lines[i + 1].trim() === '') {
        blankCount++;
      }
    }
  }

  // Phase 4: Build character summary
  const characterSummary = {};
  for (const ch of chapters) {
    for (const [name, count] of Object.entries(ch.characters)) {
      if (!characterSummary[name]) {
        characterSummary[name] = {
          mentionCount: 0,
          dialogueCount: 0,
          chapterAppearances: [],
        };
      }
      characterSummary[name].mentionCount += count;
      characterSummary[name].chapterAppearances.push(ch.id);
    }
  }

  // Phase 5: Build location summary
  const locationSummary = {};
  for (const ch of chapters) {
    for (const [loc, count] of Object.entries(ch.locations)) {
      if (!locationSummary[loc]) {
        locationSummary[loc] = {
          mentionCount: 0,
          chapterAppearances: [],
        };
      }
      locationSummary[loc].mentionCount += count;
      locationSummary[loc].chapterAppearances.push(ch.id);
    }
  }

  // Phase 6: First/last appearance for characters and locations
  for (const [name, data] of Object.entries(characterSummary)) {
    const chIds = data.chapterAppearances;
    data.firstAppearance = chIds[0];
    data.lastAppearance = chIds[chIds.length - 1];
  }
  for (const [loc, data] of Object.entries(locationSummary)) {
    const chIds = data.chapterAppearances;
    data.firstAppearance = chIds[0];
    data.lastAppearance = chIds[chIds.length - 1];
  }

  // Build result
  const result = {
    sourceFile: path.resolve(filePath),
    sourceFileName: path.basename(filePath),
    totalLines: lines.length,
    totalNonEmpty: lines.filter(l => l.trim()).length,
    totalWordCount: content.replace(/\s+/g, '').length,
    chapterCount: chapters.length,
    chapters,
    characters: characterSummary,
    characterCount: Object.keys(characterSummary).length,
    dialogueLines: lines.filter(l => isDialogueLine(l)).length,
    dialogueRatio: lines.filter(l => l.trim()).length > 0
      ? lines.filter(l => isDialogueLine(l)).length / lines.filter(l => l.trim()).length
      : 0,
    locations: locationSummary,
    locationCount: Object.keys(locationSummary).length,
    // 语义层边界（2026-08-01 导演裁决）：characters/locations/objects 的最终清单
    // 由 01 manifest 或 Phase 1B（LLM）提供；机械层只输出结构 + 剧本对白标记角色 + 地点候选
    extractionBoundary: 'characters: 仅剧本 **角色名：** 标记 + --characters-file 外部清单；locations: 候选片段，LLM 归纳；objects: 由 Phase 1B 提供',
  };

  return result;
}

// ── CLI ───────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node source-map.js <novel.md> [--output <output.json>]');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? path.resolve(args[outputIdx + 1]) : null;

  // 外部已知人物清单（NT-01）：--characters "晨,西奥多,艾娃" 或 --characters-file manifest.json（读 explicit_characters）
  let knownCharacters = [];
  const chIdx = args.indexOf('--characters');
  if (chIdx !== -1 && chIdx + 1 < args.length) {
    knownCharacters = args[chIdx + 1].split(',').map(s => s.trim()).filter(Boolean);
  }
  const chFileIdx = args.indexOf('--characters-file');
  if (chFileIdx !== -1 && chFileIdx + 1 < args.length) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.resolve(args[chFileIdx + 1]), 'utf8'));
      knownCharacters = knownCharacters.concat(manifest.explicit_characters || []);
    } catch (e) {
      console.warn(`⚠️ characters-file read error: ${e.message}`);
    }
  }

  const result = generateSourceMap(filePath, knownCharacters);

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`Source map written to ${outputPath}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  // Summary
  console.error(`\n📊 Source Map Summary:`);
  console.error(`   File: ${path.basename(filePath)}`);
  console.error(`   Total lines: ${result.totalLines}`);
  console.error(`   Chapters: ${result.chapterCount}`);
  console.error(`   Characters found: ${result.characterCount}`);
  console.error(`   Locations found: ${result.locationCount}`);
  console.error(`   Dialogue ratio: ${(result.dialogueRatio * 100).toFixed(1)}%`);

  return result;
}

if (require.main === module) {
  main();
}

module.exports = { generateSourceMap };
