#!/usr/bin/env node
/**
 * adapt-step.js — 02 script-development 12-step workflow enforcer
 *
 * Forces step-by-step execution with checkpoint files.
 * Each step must produce its output file before the next step can begin.
 *
 * Usage:
 *   node adapt-step.js status <outputDir>
 *   node adapt-step.js start <outputDir> --source <novel.md> --manifest <manifest.json>
 *   node adapt-step.js step <N> <outputDir>    # mark step N as complete
 *   node adapt-step.js check <outputDir>        # check what's missing
 *   node adapt-step.js sign <outputDir>         # generate sign-off (must pass gate)
 *
 * Output structure:
 *   <outputDir>/02-script-development/
 *     checkpoints/
 *       00-budget-scope.json
 *       01-source-map.json
 *       02-narrative-function.md
 *       03-main-proposition.md
 *       04-driver-decision.json
 *       05-screen-objects.json
 *       06-translation-log.md
 *       07-episode-map.json
 *       08-plot-nodes.json
 *       09-scene-cards/       (directory)
 *       10-beat-sheets/       (directory)
 *       11-screenplay.md
 *       12-sign-off.json
 *     progress.json           (current step tracker)
 */

const fs = require('fs');
const path = require('path');

// ── Step definitions ──────────────────────────────────────────────────

const STEPS = {
  '00': { name: 'budget-scope', file: '00-budget-scope.json', label: 'Budget & Scope Check', mandatory: true },
  '01': { name: 'source-map', file: '01-source-map.json', label: 'Source Map', mandatory: true },
  '02': { name: 'narrative-function', file: '02-narrative-function.md', label: 'Narrative Function Parsing', mandatory: true },
  '03': { name: 'main-proposition', file: '03-main-proposition.md', label: 'Main Proposition', mandatory: true },
  '04': { name: 'driver-decision', file: '04-driver-decision.json', label: 'Adaptation Driver', mandatory: true },
  '05': { name: 'screen-objects', file: '05-screen-objects.json', label: 'Screen Object System', mandatory: true },
  '06': { name: 'translation-log', file: '06-translation-log.md', label: 'Interior-to-Screen Translation', mandatory: true },
  '07': { name: 'episode-map', file: '07-episode-map.json', label: 'Episode Function Map', mandatory: true },
  '08': { name: 'plot-nodes', file: '08-plot-nodes.json', label: 'Plot Node & Set-Piece', mandatory: true },
  '09': { name: 'scene-cards', file: '09-scene-cards', label: 'Scene Cards', mandatory: true, is_dir: true },
  '10': { name: 'beat-sheets', file: '10-beat-sheets', label: 'Beat Sheet', mandatory: true, is_dir: true },
  '11': { name: 'screenplay', file: '11-screenplay.md', label: 'Screenplay Draft', mandatory: true },
  '12': { name: 'sign-off', file: '12-sign-off.json', label: 'Quality Gate', mandatory: true, is_final: true },
};

// ── Helpers ───────────────────────────────────────────────────────────

function getWorkDir(outputDir) {
  return path.resolve(outputDir, '02-script-development');
}

function getCheckpointDir(workDir) {
  const d = path.join(workDir, 'checkpoints');
  return d;
}

function getProgressFile(workDir) {
  return path.join(workDir, 'progress.json');
}

function readProgress(workDir) {
  const pf = getProgressFile(workDir);
  if (fs.existsSync(pf)) {
    try {
      return JSON.parse(fs.readFileSync(pf, 'utf8'));
    } catch { return null; }
  }
  return null;
}

function writeProgress(workDir, progress) {
  const pf = getProgressFile(workDir);
  fs.mkdirSync(path.dirname(pf), { recursive: true });
  fs.writeFileSync(pf, JSON.stringify(progress, null, 2), 'utf8');
}

function stepCompleted(checkpointDir, stepId) {
  const step = STEPS[stepId];
  if (!step) return false;
  const cp = path.join(checkpointDir, step.file);
  if (step.is_dir) return fs.existsSync(cp);
  return fs.existsSync(cp);
}

function getCurrentStep(progress) {
  if (!progress) return null;
  return progress.currentStep || null;
}

function getStepId(label) {
  for (const [id, def] of Object.entries(STEPS)) {
    if (def.name === label || def.label === label || id === label) return id;
  }
  return null;
}

// ── Commands ──────────────────────────────────────────────────────────

function cmdStatus(outputDir) {
  const workDir = getWorkDir(outputDir);
  const checkpointDir = getCheckpointDir(workDir);
  const progress = readProgress(workDir);

  if (!progress) {
    console.log('STATUS: NOT_STARTED — No adaptation work found.');
    console.log('Run: node adapt-step.js start <outputDir> --source <novel.md>');
    return;
  }

  console.log(`STATUS: ${progress.status || 'IN_PROGRESS'}`);
  console.log(`Source: ${progress.sourceFile || 'unknown'}`);
  console.log(`Manifest: ${progress.manifestFile || 'unknown'}`);
  console.log(`Target Format: ${progress.targetFormat || 'unknown'}`);
  console.log(`Current Step: ${progress.currentStep ? `${progress.currentStep}: ${STEPS[progress.currentStep]?.label}` : 'not started'}`);
  console.log('');

  // Show step table
  const stepIds = Object.keys(STEPS).sort();
  const maxLabelLen = Math.max(...stepIds.map(id => STEPS[id].label.length));

  for (const id of stepIds) {
    const step = STEPS[id];
    const done = stepCompleted(checkpointDir, id);
    const isCurrent = progress.currentStep === id;
    const marker = done ? '✅' : (isCurrent ? '⏳' : '⬜');
    const currentLabel = isCurrent ? ' ← CURRENT' : '';
    console.log(`  ${marker} ${id}: ${step.label.padEnd(maxLabelLen)}${currentLabel}`);
  }

  console.log('');
  if (progress.notes && progress.notes.length > 0) {
    console.log('Notes:');
    progress.notes.forEach(n => console.log(`  - ${n}`));
  }
}

function cmdStart(outputDir) {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  const manifestIdx = args.indexOf('--manifest');

  if (sourceIdx === -1) {
    console.error('Error: --source <novel.md> is required');
    process.exit(1);
  }

  const sourceFile = path.resolve(args[sourceIdx + 1]);
  if (!fs.existsSync(sourceFile)) {
    console.error(`Error: Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  const manifestFile = manifestIdx !== -1 ? path.resolve(args[manifestIdx + 1]) : null;
  if (manifestFile && !fs.existsSync(manifestFile)) {
    console.error(`Error: Manifest file not found: ${manifestFile}`);
    process.exit(1);
  }

  const workDir = getWorkDir(outputDir);
  const checkpointDir = getCheckpointDir(workDir);

  // Check for existing work
  if (fs.existsSync(workDir)) {
    console.error(`Error: Work already exists at ${workDir}`);
    console.error('Run "node adapt-step.js status <outputDir>" to check current state.');
    process.exit(1);
  }

  // Create directories
  fs.mkdirSync(checkpointDir, { recursive: true });
  fs.mkdirSync(path.join(checkpointDir, '09-scene-cards'), { recursive: true });
  fs.mkdirSync(path.join(checkpointDir, '10-beat-sheets'), { recursive: true });

  // Read source to estimate
  const sourceContent = fs.readFileSync(sourceFile, 'utf8');
  const wordCount = sourceContent.replace(/\s+/g, '').length;

  // Read manifest if exists
  let manifest = null;
  if (manifestFile) {
    try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch {}
  }

  const progress = {
    sourceFile,
    manifestFile,
    sourceWordCount: wordCount,
    targetFormat: manifest?.targetFormat || null,
    povType: manifest?.povType || 'unknown',
    hasAbstractCoreConcept: manifest?.hasAbstractCoreConcept || false,
    currentStep: null,  // nothing started
    status: 'IN_PROGRESS',
    startedAt: new Date().toISOString(),
    completedSteps: [],
    notes: [],
  };

  writeProgress(workDir, progress);
  console.log(`Started adaptation work at ${workDir}`);
  console.log(`Source: ${sourceFile} (${wordCount} chars)`);
  console.log(`Target format: ${manifest?.targetFormat || 'not specified — run step 00 first'}`);
  console.log('');
  console.log('Next: run the 12 steps in order.');
  console.log('  Start with: node adapt-step.js step 00 <outputDir>');
  console.log('  Then:       node adapt-step.js step 01 <outputDir>');
  console.log('  ...');
  console.log('  Check:      node adapt-step.js status <outputDir>');
  console.log('  Sign off:   node adapt-step.js sign <outputDir>');
}

function cmdStep(stepArg, outputDir) {
  const stepId = getStepId(stepArg);
  if (!stepId) {
    console.error(`Error: Unknown step "${stepArg}". Valid steps: ${Object.keys(STEPS).sort().join(', ')}`);
    process.exit(1);
  }

  const workDir = getWorkDir(outputDir);
  const progress = readProgress(workDir);
  if (!progress) {
    console.error('Error: No adaptation work found. Run "node adapt-step.js start <outputDir> --source <novel.md>" first.');
    process.exit(1);
  }

  const step = STEPS[stepId];
  const checkpointDir = getCheckpointDir(workDir);

  // Validate: previous step must be completed
  const stepIds = Object.keys(STEPS).sort();
  const currentIdx = stepIds.indexOf(stepId);

  if (stepId !== '00') {
    // Check all previous steps are complete
    for (let i = 0; i < currentIdx; i++) {
      const prevId = stepIds[i];
      const prevStep = STEPS[prevId];
      if (prevStep.mandatory && !stepCompleted(checkpointDir, prevId)) {
        console.error(`ERROR: Step ${prevId} (${prevStep.label}) is not yet complete.`);
        console.error(`Cannot start step ${stepId} until all previous steps are done.`);
        console.error(`Complete step ${prevId} first, then retry.`);
        process.exit(1);
      }
    }
  }

  // Mark step as current
  progress.currentStep = stepId;
  progress.lastUpdated = new Date().toISOString();
  writeProgress(workDir, progress);

  console.log(`⏳ Step ${stepId}: ${step.label}`);
  console.log('');
  console.log(`Output file: checkpoints/${step.file}`);
  console.log(`Reference:   frameworks/${step.name}.md`);
  if (step.mandatory) console.log('Mandatory:   YES — must produce output file before next step');
  console.log('');
  console.log(`"The ${step.label} step is now active. Produce the output and then mark: node adapt-step.js step N ${outputDir}"`);

  // Print step-specific hints
  const hints = {
    '00': 'Hints:\n  - Estimate scene count: sourceWordCount / 1000 ≈ scenes\n  - Check if core concept is abstract (need visual metaphor)',
    '01': 'Hints:\n  - List ALL characters, even minor ones\n  - Mark POV narrator if first-person\n  - Tag locations by significance (origins/conflict/resolution)',
    '02': 'Hints:\n  - One entry per scene\n  - Differentiate "narrative function" from "screen function"\n  - Always note What Must Be Preserved and What Must Be Cut',
    '03': 'Hints:\n  - Proposition must be testable in a scene\n  - Every scene should test proposition OR anti-proposition',
    '04': 'Hints:\n  - Concept-driven ≠ plot-driven. If core=concept, driver=concept\n  - Format decision changes everything downstream',
    '05': 'Hints:\n  - 3-5 objects max per episode\n  - Every object must have firstAppearance and recurrence plan',
    '06': 'Hints:\n  - If first-person POV: translate ALL interior monologue\n  - Every translation must log loss + fidelity\n  - Target: 5+ translation records',
    '07': 'Hints:\n  - If scene order === novel order, you are doing it wrong\n  - Episode function must be unique per episode',
    '08': 'Hints:\n  - Not every important scene is a set-piece\n  - Set-piece needs visual/technical strategy',
    '09': 'Hints:\n  - One file per scene\n  - Must include: goal, obstacle, conflict, change\n  - Conflict must be external-and-visible',
    '10': 'Hints:\n  - One file per scene\n  - Include TURN and EXIT for each beat\n  - THIS MUST COME BEFORE SCREENPLAY DRAFT',
    '11': 'Hints:\n  - Action ratio ≥ 40%\n  - No interior monologue\n  - Dialogue compressed 30%+ from novel\n  - Then run validate-screenplay.js',
    '12': 'Hints:\n  - Run all checks from framework 12\n  - Run validate-screenplay.js first\n  - Output sign-off.json with PASS/FAIL/WARN per check',
  };

  if (hints[stepId]) {
    console.log('');
    console.log(hints[stepId]);
  }
}

function cmdCheck(outputDir) {
  const workDir = getWorkDir(outputDir);
  const checkpointDir = getCheckpointDir(workDir);
  const progress = readProgress(workDir);

  if (!progress) {
    console.log('No adaptation work found at', workDir);
    process.exit(0);
  }

  const stepIds = Object.keys(STEPS).sort();
  const missing = [];
  const complete = [];

  for (const id of stepIds) {
    const step = STEPS[id];
    const done = stepCompleted(checkpointDir, id);
    if (done) {
      complete.push(id);
    } else if (step.mandatory) {
      missing.push(id);
    }
  }

  console.log(`Progress: ${complete.length}/${stepIds.length} steps complete`);
  console.log('');

  if (complete.length > 0) {
    console.log('✅ Complete steps:');
    complete.forEach(id => console.log(`   ${id}: ${STEPS[id].label}`));
  }

  if (missing.length > 0) {
    console.log('');
    console.log('❌ Missing mandatory steps:');
    missing.forEach(id => console.log(`   ${id}: ${STEPS[id].label}`));
    console.log('');
    console.log('Next missing step:', missing[0]);
    console.log(`Run: node adapt-step.js step ${missing[0]} ${outputDir}`);
  } else {
    console.log('');
    console.log('All mandatory steps complete!');
    console.log(`Run: node adapt-step.js sign ${outputDir}`);
  }
}

function cmdSign(outputDir) {
  const workDir = getWorkDir(outputDir);
  const progress = readProgress(workDir);

  if (!progress) {
    console.error('Error: No adaptation work found.');
    process.exit(1);
  }

  const checkpointDir = getCheckpointDir(workDir);
  const stepIds = Object.keys(STEPS).sort();

  // Check all mandatory steps done
  const missing = [];
  for (const id of stepIds) {
    const step = STEPS[id];
    if (step.mandatory && !step.is_final && !stepCompleted(checkpointDir, id)) {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    console.error('ERROR: Cannot sign off — missing mandatory steps:');
    missing.forEach(id => console.error(`  ${id}: ${STEPS[id].label}`));
    console.error('');
    console.error('Complete all steps first, then retry.');
    process.exit(1);
  }

  // Check step 11 (screenplay) exists
  if (!stepCompleted(checkpointDir, '11')) {
    console.error('ERROR: Step 11 (Screenplay Draft) not found.');
    console.error('Must produce screenplay before sign-off.');
    process.exit(1);
  }

  // Generate sign-off
  const signOff = {
    gateVersion: '1.0',
    timestamp: new Date().toISOString(),
    sourceFile: progress.sourceFile,
    targetFile: path.join(checkpointDir, '11-screenplay.md'),
    stepsCompleted: stepIds.filter(id => stepCompleted(checkpointDir, id)),
    checks: {
      format: 'PENDING',
      pov: 'PENDING',
      concept: 'PENDING',
      dialogue: 'PENDING',
      structure: 'PENDING',
      action: 'PENDING',
      object: 'PENDING',
      episode: 'PENDING',
    },
    overall: 'PENDING',
    notes: [],
    blockers: [],
    downstreamNotes: {},
  };

  // Write sign-off template
  const signOffPath = path.join(checkpointDir, '12-sign-off.json');
  fs.writeFileSync(signOffPath, JSON.stringify(signOff, null, 2), 'utf8');

  console.log('📋 Sign-off template generated at:');
  console.log(`   ${signOffPath}`);
  console.log('');
  console.log('! IMPORTANT !');
  console.log('The sign-off checks are PENDING. You must:');
  console.log('  1. Run validate-screenplay.js against the screenplay');
  console.log('  2. Review framework 12 quality gate manually');
  console.log('  3. Update sign-off.json with actual PASS/FAIL/WARN');
  console.log('  4. If FAIL → return to appropriate step');
  console.log('  5. If PASS/PASS_WITH_NOTES → screenplay may leave 02');
  console.log('');
  console.log('Run validator:');
  console.log(`  node validate-screenplay.js "${path.join(checkpointDir, '11-screenplay.md')}" --source-novel "${progress.sourceFile}"`);
  console.log('  (include --characters "主角名1,主角名2" for character presence check)');
  console.log('');
  console.log('Update sign-off:');
  console.log(`  Edit ${signOffPath}`);
}

function cmdResume(outputDir) {
  const workDir = getWorkDir(outputDir);
  const progress = readProgress(workDir);
  if (!progress) {
    console.error('Error: No adaptation work found.');
    process.exit(1);
  }

  const checkpointDir = getCheckpointDir(workDir);
  const stepIds = Object.keys(STEPS).sort();

  // Find first incomplete mandatory step
  for (const id of stepIds) {
    const step = STEPS[id];
    if (step.mandatory && !step.is_final && !stepCompleted(checkpointDir, id)) {
      progress.currentStep = id;
      progress.lastUpdated = new Date().toISOString();
      writeProgress(workDir, progress);

      console.log(`Resuming at step ${id}: ${step.label}`);
      console.log('');
      cmdStep(id, outputDir);
      return;
    }
  }

  // Check sign-off
  if (!stepCompleted(checkpointDir, '12')) {
    console.log('All mandatory steps complete. Need sign-off.');
    cmdSign(outputDir);
    return;
  }

  console.log('All steps complete including sign-off. 02 is DONE.');
  cmdStatus(outputDir);
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage:');
    console.log('  node adapt-step.js status <outputDir>');
    console.log('  node adapt-step.js start <outputDir> --source <novel.md> [--manifest <manifest.json>]');
    console.log('  node adapt-step.js step <N> <outputDir>');
    console.log('  node adapt-step.js check <outputDir>');
    console.log('  node adapt-step.js sign <outputDir>');
    console.log('  node adapt-step.js resume <outputDir>');
    process.exit(0);
  }

  const command = args[0];
  const outputDir = args[1];

  switch (command) {
    case 'status': cmdStatus(outputDir); break;
    case 'start': cmdStart(outputDir); break;
    case 'step': cmdStep(args[2], outputDir); break;
    case 'check': cmdCheck(outputDir); break;
    case 'sign': cmdSign(outputDir); break;
    case 'resume': cmdResume(outputDir); break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Valid: status, start, step, check, sign, resume');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
