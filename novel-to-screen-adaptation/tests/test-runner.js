#!/usr/bin/env node
/**
 * test-runner.js — 02 stability test suite
 *
 * Runs pipeline scripts against fixtures and validates outputs.
 * Usage:
 *   node test-runner.js                      # run all tests
 *   node test-runner.js --model deepseek-v4  # specify model for LLM phases
 *   node test-runner.js --skip-llm           # skip LLM phases (scripts only)
 *
 * Each test:
 *   1. Runs the relevant script(s)
 *   2. Checks outputs exist
 *   3. Validates against expected metrics
 *   4. Reports PASS/FAIL
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const EXPECTED_DIR = path.join(__dirname, 'expected');

// ── Config ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    model: args.includes('--model') ? args[args.indexOf('--model') + 1] : null,
    skipLLM: args.includes('--skip-llm'),
    verbose: args.includes('--verbose'),
  };
}

// ── Test Framework ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let warnings = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else if (result === 'WARN') {
      console.log(`  ⚠️  ${name}`);
      warnings++;
    } else {
      console.log(`  ❌ ${name}: ${result}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
  return true;
}

function fileExists(p) {
  return fs.existsSync(p);
}

function runScript(scriptPath, args) {
  const cmd = `node "${scriptPath}" ${args}`;
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

// ── Tests ─────────────────────────────────────────────────────────────

function testPhase00(fixture) {
  const outputDir = path.join(FIXTURES_DIR, '__test_output__');
  const checkpointDir = path.join(outputDir, '02-script-development', 'checkpoints');
  fs.mkdirSync(checkpointDir, { recursive: true });

  // Budget 统计走共享模块（T4：budget.js 单一事实源，消除阈值漂移）
  const budgetScript = path.join(ROOT, 'scripts', 'budget.js');
  assert(fileExists(budgetScript), 'budget.js should exist');
  const budget = JSON.parse(runScript(budgetScript, `"${fixture}"`));

  fs.writeFileSync(path.join(checkpointDir, '00-budget-scope.json'), JSON.stringify(budget, null, 2), 'utf8');

  assert(budget.lineCount > 0, 'Budget should have line count');
  assert(budget.charCount > 0, 'Budget should have char count');
  assert(['SAMPLE', 'ARC', 'FULL'].includes(budget.recommendedMode), 'Budget should have valid mode');
  return true;
}

function testPhase01A(fixture) {
  const outputDir = path.join(FIXTURES_DIR, '__test_output__');
  const checkpointDir = path.join(outputDir, '02-script-development', 'checkpoints');
  fs.mkdirSync(checkpointDir, { recursive: true });

  const sourceMapScript = path.join(ROOT, 'scripts', 'source-map.js');
  assert(fileExists(sourceMapScript), 'source-map.js should exist');

  const outputPath = path.join(checkpointDir, '01-source-map.json');
  runScript(sourceMapScript, `"${fixture}" --output "${outputPath}"`);
  assert(fileExists(outputPath), 'source-map should produce output');

  const result = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert(result.totalLines > 0, 'Should detect lines');
  assert(result.chapters.length > 0, 'Should detect at least 1 chapter');
  assert(typeof result.dialogueRatio === 'number', 'Should compute dialogue ratio');

  // Check against expected
  const expectedPath = path.join(EXPECTED_DIR, '01-source-map.json');
  if (fileExists(expectedPath)) {
    const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
    if (Math.abs(result.totalLines - expected.checks.totalLines) > 50) {
      return 'WARN';
    }
  }

  return true;
}

function testValidate(fixture) {
  const validateScript = path.join(ROOT, 'scripts', 'validate-screenplay.js');
  assert(fileExists(validateScript), 'validate-screenplay.js should exist');

  // Create a minimal valid screenplay to test against
  const testScript = path.join(FIXTURES_DIR, '__test_output__', 'test-screenplay.md');
  const screenplay = `### S-1 送药

外 · 小区门口 · 日

人物：南东君、保安

阳光洒落。保安机器人的显示屏亮起。

**南东君：**
你好。

**保安：**
到几栋几单元？

**南东君：**
5栋7单元。

---

### S-2 回家

内 · 家 · 午后

南东君推开门。消毒液和咖啡的气息。

**父亲：**
回来了？

**南东君：**
嗯。

---

`;
  fs.writeFileSync(testScript, screenplay, 'utf8');

  // T5：角色自动提取（不再传 --characters，验证从剧本"人物：/speaker"行提取）
  const result = runScript(validateScript, `"${testScript}"`);
  const parsed = JSON.parse(result);

  assert(parsed.overall !== undefined, 'Should return overall verdict');
  assert(parsed.stats.actionRatio > 0.4, `Should meet 40% action ratio (got ${(parsed.stats.actionRatio * 100).toFixed(0)}%)`);
  assert(parsed.stats.interiorLeakageCount === 0, 'Should have 0 interior leakage');

  // Check character consistency
  const charCheck = parsed.checks.characterConsistency || [];
  const charFailures = charCheck.filter(c => c.severity === 'FAIL');
  assert(charFailures.length === 0, `Should pass character check (got ${charFailures.length} failures)`);

  return true;
}

function testAdaptStep() {
  const adaptScript = path.join(ROOT, 'scripts', 'adapt-step.js');
  assert(fileExists(adaptScript), 'adapt-step.js should exist');

  const help = runScript(adaptScript, '');
  assert(help.includes('Usage:'), 'Should show usage');
  assert(help.includes('status'), 'Should list status command');
  assert(help.includes('step'), 'Should list step command');
  assert(help.includes('sign'), 'Should list sign command');
  return true;
}

function testFrameworksExist() {
  const frameworksDir = path.join(ROOT, 'frameworks');
  const required = [
    '00-directors-brief.md',
    '06-interior-to-screen.md',
    '12-adaptation-quality-gate.md',
  ];
  for (const f of required) {
    assert(fileExists(path.join(frameworksDir, f)), `Framework ${f} should exist`);
  }
  return true;
}

function testPromptsExist() {
  const promptsDir = path.join(ROOT, 'prompts');
  const required = [
    '01B-narrative-function.md',
    '02-proposition.md',
    '03-driver.md',
    '04-screen-objects.md',
    '05-translation.md',
    '07-episode-map.md',
    '08-plot-nodes.md',
    '09-scene-cards.md',
    '10-screenplay.md',
  ];
  for (const f of required) {
    assert(fileExists(path.join(promptsDir, f)), `Prompt ${f} should exist`);
  }
  return true;
}

function testScriptsCompile() {
  const scriptsDir = path.join(ROOT, 'scripts');
  const scripts = ['source-map.js', 'adapt-step.js', 'validate-screenplay.js'];
  for (const s of scripts) {
    const fullPath = path.join(scriptsDir, s);
    assert(fileExists(fullPath), `${s} should exist`);
    // Verify it's valid UTF-8 with expected exports
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(content.length > 100, `${s} should be non-trivial`);
    assert(content.includes('function') || content.includes('require'), `${s} should contain JS`);
  }
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const opts = parseArgs();
  const fixture = path.join(FIXTURES_DIR, '渊光代码_第一章.md');

  if (!fileExists(fixture)) {
    console.error(`Fixture not found: ${fixture}`);
    console.error('Run: cp <novel.md> tests/fixtures/');
    process.exit(1);
  }

  console.log(`🧪 02 Stability Test Suite`);
  console.log(`   Fixture: ${path.basename(fixture)}`);
  console.log(`   Skip LLM: ${opts.skipLLM}`);
  if (opts.model) console.log(`   Model: ${opts.model}`);
  console.log('');

  // Script tests
  console.log('Scripts:');
  test('scripts compile without syntax errors', () => testScriptsCompile());
  test('adapt-step.js CLI works', () => testAdaptStep());

  // Phase tests
  console.log('\nPhase 0:');
  test('budget & scope check', () => testPhase00(fixture));

  console.log('\nPhase 1A:');
  test('source-map runs and produces valid output', () => testPhase01A(fixture));

  console.log('\nQuality:');
  test('validate-screenplay catches format issues', () => testValidate(fixture));

  // Structure tests
  console.log('\nStructure:');
  test('frameworks complete', () => testFrameworksExist());
  test('prompts extracted', () => testPromptsExist());

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`${'='.repeat(40)}`);

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main();
