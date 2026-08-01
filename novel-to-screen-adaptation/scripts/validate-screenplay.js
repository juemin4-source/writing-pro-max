#!/usr/bin/env node
/**
 * validate-screenplay.js — 02 script-development quality gate
 *
 * Reads a screenplay markdown file and checks for:
 *   - Action-to-dialogue ratio
 *   - Interior monologue leakage ("她感到/她意识到/她记得")
 *   - Scene heading format
 *   - Dialogue compression signal
 *   - Scene sequence structure
 *
 * Usage:
 *   node validate-screenplay.js <screenplay.md> [--source-novel <novel.md>]
 *
 * Output: JSON with PASS/FAIL/WARN per check category
 */

const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────
// 阈值对齐 SKILL.md 剧本硬规则（文档为源，见设计文档 F4/T-D）
const MIN_ACTION_RATIO = 0.40;        // 40% minimum action（SKILL.md 硬规则）
const WARN_ACTION_RATIO = 0.45;       // 45% target
const INTERIOR_PATTERNS = [
  /她感(到|觉)/g, /他感(到|觉)/g,
  /她意识到/g, /他意识到/g,
  /她记得/g, /他记得/g,
  /她想起/g, /他想起/g,
  /她突然明白/g, /他突然明白/g,
  /在她内心深处/g, /在他内心深处/g,
  /她明白(了)?/g, /他明白(了)?/g,
  /她注意(到)?/g, /他注意(到)?/g,
];
const EXPLANATORY_DIALOGUE = [
  /如你所知/g, /众所周知/g,
  /你应该知道/g, /你难道不知道/g,
  /让我解释/g, /简单来说/g,
];
// 场景标题正则：兼容协议模板四种格式 — ### S-1 送药 / ### S1: 送药 / ### EP04-S05 综合实验楼 · 天台 / ### SC-01 场景名（协议命名归一）
const SCENE_HEADING_RE = /^#{1,3}\s+(?:EP\d+-)?S(?:C)?-?\d+/m;
// 动作行：不是对白标记，不是空行，不是 ---（对白标记含 **角色名：** 与 角色名：/角色名（表情）：）
const ACTION_LINE_RE = /^(?!\*\*)(?!---)(?!$)(?!\s*$).+/m;
// 对白角色名行：**白焰：** / 白焰： / 艾娃（声音微颤）：（排除"人物："元数据列表行）
const DIALOGUE_SPEAKER_RE = /^(?:\*\*)?(?!人物)([一-鿿]{1,4}(?:（[^）]*）)?)[：:](?:\*\*)?$/;
// 对白行（兼容旧格式）
const DIALOGUE_LINE_RE = /^\*\*.+：\*\*$/m;
// 动作占比测量：统计非空行中，非对白的部分
const INTERIOR_IN_ACTION_RE = /(感到|意识到|觉得|记得|想起|注意到|明白)/;

// ── Helpers ───────────────────────────────────────────────────────────

function countByType(lines) {
  let actionChars = 0;
  let dialogueChars = 0;
  let interiorMatches = 0;
  let interiorLines = [];
  let explanatoryMatches = [];
  let actionLines = 0;
  let dialogueLines = 0;
  let totalNonEmptyLines = 0;
  let sceneHeadings = 0;
  let redFlags = [];

  // dialogueCollect：对白内容收集模式（speaker 行后的内容行是对白，直到空行/标题/分隔线）
  let collectingDialogue = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('---') || line.startsWith('#')) {
      collectingDialogue = false;
      if (line.startsWith('#')) {
        // Check if it's a scene heading or chapter heading
        if (SCENE_HEADING_RE.test(line)) {
          sceneHeadings++;
        }
        // Count chapter headings as action
        actionChars += line.length;
        actionLines++;
        totalNonEmptyLines++;
      }
      continue;
    }

    totalNonEmptyLines++;

    // Speaker line (dialogue marker): **白焰：** / 白焰： / 艾娃（声音微颤）：
    const speakerMatch = line.match(DIALOGUE_SPEAKER_RE);
    if (speakerMatch) {
      collectingDialogue = true;
      dialogueChars += line.length;
      dialogueLines++;

      // Check for explanatory dialogue patterns
      for (const pat of EXPLANATORY_DIALOGUE) {
        const m = line.match(pat);
        if (m) explanatoryMatches.push({ line: i + 1, text: line.slice(0, 60), pattern: m[0] });
      }
      continue;
    }

    // Dialogue content line (inside collection)
    if (collectingDialogue) {
      dialogueChars += line.length;
      continue;
    }

    // Action line
    actionChars += line.length;
    actionLines++;

    // Check for interior leakage in action
    for (const pat of INTERIOR_PATTERNS) {
      const m = line.match(pat);
      if (m) {
        interiorMatches++;
        interiorLines.push({ line: i + 1, text: line.slice(0, 60), pattern: m[0] });
      }
    }

    // Check for interior words in general
    if (!line.startsWith('**') && !line.startsWith('（')) {
      const interiorWordMatch = line.match(INTERIOR_IN_ACTION_RE);
      if (interiorWordMatch) {
        redFlags.push({
          line: i + 1,
          type: 'possible_interior_leakage',
          text: line.slice(0, 60),
          word: interiorWordMatch[1]
        });
      }
    }
  }

  const totalChars = actionChars + dialogueChars;
  const actionRatio = totalChars > 0 ? actionChars / totalChars : 0;
  const dialogueRatio = totalChars > 0 ? dialogueChars / totalChars : 0;

  return {
    actionChars,
    dialogueChars,
    actionRatio,
    dialogueRatio,
    actionLines,
    dialogueLines,
    totalNonEmptyLines,
    sceneHeadings,
    interiorMatches,
    interiorLines,
    explanatoryMatches,
    redFlags
  };
}

// ── Checks ────────────────────────────────────────────────────────────

function checkFormat(stats) {
  const issues = [];
  if (stats.sceneHeadings < 2) {
    issues.push({ severity: 'FAIL', msg: `Only ${stats.sceneHeadings} scene headings found. Need ≥ 2.` });
  } else {
    issues.push({ severity: 'PASS', msg: `${stats.sceneHeadings} scene headings.` });
  }
  return issues;
}

function checkActionRatio(stats) {
  const issues = [];
  const ratio = stats.actionRatio;
  if (ratio < MIN_ACTION_RATIO) {
    issues.push({ severity: 'FAIL', msg: `Action ratio ${(ratio * 100).toFixed(0)}% < minimum ${(MIN_ACTION_RATIO * 100).toFixed(0)}%. Too much dialogue, not enough visual storytelling.` });
  } else if (ratio < WARN_ACTION_RATIO) {
    issues.push({ severity: 'WARN', msg: `Action ratio ${(ratio * 100).toFixed(0)}% < target ${(WARN_ACTION_RATIO * 100).toFixed(0)}%. Consider adding more visual action.` });
  } else {
    issues.push({ severity: 'PASS', msg: `Action ratio ${(ratio * 100).toFixed(0)}% — good.` });
  }
  return issues;
}

function checkInteriorLeakage(stats) {
  const issues = [];
  if (stats.interiorMatches > 0) {
    const examples = stats.interiorLines.slice(0, 3).map(l => `  L${l.line}: "${l.text}..."`).join('\n');
    issues.push({ severity: 'FAIL', msg: `${stats.interiorMatches} interior monologue pattern(s) found (她感到/她意识到/她记得...). Replace with visible action.\n${examples}` });
  } else {
    issues.push({ severity: 'PASS', msg: 'No interior monologue leakage detected.' });
  }

  if (stats.redFlags.length > 0) {
    const examples = stats.redFlags.slice(0, 3).map(l => `  L${l.line}: "${l.text}..." (${l.word})`).join('\n');
    issues.push({ severity: 'WARN', msg: `${stats.redFlags.length} possible interior leakage word(s) found — manual review recommended.\n${examples}` });
  }

  return issues;
}

function checkExplanatoryDialogue(stats) {
  const issues = [];
  if (stats.explanatoryMatches.length > 0) {
    const examples = stats.explanatoryMatches.slice(0, 3).map(l => `  L${l.line}: "${l.text}..." → pattern: "${l.pattern}"`).join('\n');
    issues.push({ severity: 'FAIL', msg: `${stats.explanatoryMatches.length} explanatory dialogue pattern(s) found (如你所知/让我解释...). Remove or rewrite.\n${examples}` });
  } else {
    issues.push({ severity: 'PASS', msg: 'No explanatory dialogue detected.' });
  }
  return issues;
}

function checkDialogueDensity(stats) {
  const issues = [];
  if (stats.dialogueLines > 0 && stats.actionLines > 0) {
    const ratio = stats.dialogueRatio;
    if (ratio > 0.70) {
      issues.push({ severity: 'WARN', msg: `Dialogue-heavy: ${(ratio * 100).toFixed(0)}% of content is dialogue. Consider adding more visual storytelling.` });
    } else {
      issues.push({ severity: 'PASS', msg: `Dialogue ratio ${(ratio * 100).toFixed(0)}% — within range.` });
    }
  }
  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────

// 从剧本提取角色（多格式兼容）——用于幻觉检查与角色一致性
function extractCharacters(screenplayContent) {
  const chars = new Set();

  // Format 1: **角色名：** (markdown bold, unambiguous)
  (screenplayContent.match(/\*\*([一-鿿]{2,4})[：:]/g) || []).forEach(m => {
    chars.add(m.replace(/\*\*/g, '').replace(/[：:]/g, '').trim());
  });

  // Format 2: 短名(2-3字)："对话" — 对话行，不是动作描述
  (screenplayContent.match(/^([一-鿿]{2,3})[：:][""「」]/gm) || []).forEach(m => {
    chars.add(m.replace(/[：:][""「」].*$/, '').trim());
  });

  // Format 3: 人物：角色名、角色名 (scene header)
  (screenplayContent.match(/人物：([^\n]+)/g) || []).forEach(m => {
    m.replace(/人物：/, '').split(/[、,，]/).forEach(n => {
      const name = n.trim();
      if (name && name.length >= 2 && name.length <= 4) chars.add(name);
    });
  });

  // Format 4: 无星号 speaker 行：艾娃（声音微颤）：/ 艾娃： — 协议与产物常用格式（排除"人物："元数据）
  (screenplayContent.match(/^(?!人物)(?:[一-鿿]{1,4}(?:（[^）]*）)?)[：:]/gm) || []).forEach(m => {
    const name = m.replace(/[：:].*$/, '').replace(/（[^）]*）/g, '').trim();
    if (name && name.length >= 2 && name.length <= 4) chars.add(name);
  });

  return [...chars];
}

function checkHallucination(screenplayContent, sourceNovelContent) {
  const issues = [];
  if (!sourceNovelContent) return issues;

  // Extract character names from screenplay — multiple formats
  const screenChars = new Set(extractCharacters(screenplayContent));

  // Check each against source novel (character must appear in source text)
  const hallucinations = [...screenChars].filter(ch => !sourceNovelContent.includes(ch));

  if (hallucinations.length > 0) {
    issues.push({
      severity: 'FAIL',
      msg: `Hallucinated characters: ${hallucinations.join(', ')}. These names don't appear in the source novel.`
    });
  } else {
    issues.push({ severity: 'PASS', msg: 'No hallucinated characters detected.' });
  }

  return issues;
}

function checkCharacterConsistency(content, mainCharacters) {
  const issues = [];
  if (!mainCharacters || mainCharacters.length === 0) return issues;

  for (const ch of mainCharacters) {
    // Count in dialogue markers (**角色名：** or **角色名**)
    const dialogueRe = new RegExp(`\\*\\*${ch}[：:\\*]`, 'g');
    const dialogueMatches = content.match(dialogueRe);
    const dialogueCount = dialogueMatches ? dialogueMatches.length : 0;

    // Count in standalone character lines (角色名 on its own line)
    const headingRe = new RegExp(`^${ch}$`, 'gm');
    const headingMatches = content.match(headingRe);
    const headingCount = headingMatches ? headingMatches.length : 0;

    // Count in action descriptions
    const actionRe = new RegExp(ch, 'g');
    const actionMatches = content.match(actionRe);
    const actionCount = actionMatches ? actionMatches.length : 0;

    const totalDialogueOrHeading = dialogueCount + headingCount;

    if (totalDialogueOrHeading === 0 && actionCount < 3) {
      issues.push({
        severity: 'FAIL',
        msg: `Main character "${ch}" appears 0 times in dialogue/headings and <3 times total. Is this the right protagonist?`
      });
    } else if (totalDialogueOrHeading === 0) {
      issues.push({
        severity: 'WARN',
        msg: `Main character "${ch}" has no dialogue lines (${actionCount} action mentions). Consider giving them dialogue.`
      });
    }
  }
  return issues;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node validate-screenplay.js <screenplay.md> [options]');
    console.error('Options:');
    console.error('  --characters <name1,name2,...>   Main characters list for consistency check');
    console.error('  --source-novel <novel.md>        Source novel for dialogue compression comparison');
    process.exit(1);
  }

  const screenplayPath = path.resolve(args[0]);
  if (!fs.existsSync(screenplayPath)) {
    console.error(`File not found: ${screenplayPath}`);
    process.exit(1);
  }

  // Parse args
  let mainCharacters = [];
  let sourceNovelPath = null;
  const chIdx = args.indexOf('--characters');
  if (chIdx !== -1 && chIdx + 1 < args.length) {
    mainCharacters = args[chIdx + 1].split(',').map(s => s.trim()).filter(Boolean);
  }
  const snIdx = args.indexOf('--source-novel');
  if (snIdx !== -1 && snIdx + 1 < args.length) {
    sourceNovelPath = path.resolve(args[snIdx + 1]);
  }

  const content = fs.readFileSync(screenplayPath, 'utf8');
  const lines = content.split('\n');

  // 角色缺省时从剧本自动提取（T5：角色来源=剧本，不依赖外部参数）
  if (mainCharacters.length === 0) {
    mainCharacters = extractCharacters(content);
  }

  const stats = countByType(lines);

  // Read source novel for hallucination check
  let sourceNovelContent = null;
  if (sourceNovelPath && fs.existsSync(sourceNovelPath)) {
    sourceNovelContent = fs.readFileSync(sourceNovelPath, 'utf8');
  }

  // Run checks
  const formatIssues = checkFormat(stats);
  const actionIssues = checkActionRatio(stats);
  const interiorIssues = checkInteriorLeakage(stats);
  const explanatoryIssues = checkExplanatoryDialogue(stats);
  const densityIssues = checkDialogueDensity(stats);
  const characterIssues = checkCharacterConsistency(content, mainCharacters);
  const hallucinationIssues = checkHallucination(content, sourceNovelContent);

  const allIssues = [...formatIssues, ...actionIssues, ...interiorIssues, ...explanatoryIssues, ...densityIssues, ...characterIssues, ...hallucinationIssues];
  const fails = allIssues.filter(i => i.severity === 'FAIL');
  const warns = allIssues.filter(i => i.severity === 'WARN');

  let overall;
  if (fails.length > 0) overall = 'FAIL';
  else if (warns.length > 0) overall = 'PASS_WITH_NOTES';
  else overall = 'PASS';

  const result = {
    screenplay: screenplayPath,
    timestamp: new Date().toISOString(),
    stats: {
      totalLines: lines.length,
      nonEmptyLines: stats.totalNonEmptyLines,
      sceneHeadings: stats.sceneHeadings,
      actionChars: stats.actionChars,
      dialogueChars: stats.dialogueChars,
      actionRatio: parseFloat(stats.actionRatio.toFixed(3)),
      dialogueRatio: parseFloat(stats.dialogueRatio.toFixed(3)),
      actionLines: stats.actionLines,
      dialogueLines: stats.dialogueLines,
      interiorLeakageCount: stats.interiorMatches,
      redFlagCount: stats.redFlags.length,
    },
    checks: {
      format: formatIssues,
      actionRatio: actionIssues,
      interiorLeakage: interiorIssues,
      explanatoryDialogue: explanatoryIssues,
      dialogueDensity: densityIssues,
      characterConsistency: characterIssues,
      hallucination: hallucinationIssues,
    },
    overall,
    summary: {
      pass: allIssues.filter(i => i.severity === 'PASS').length,
      warn: warns.length,
      fail: fails.length,
    }
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  main();
}

module.exports = { validateScreenplay: main };
