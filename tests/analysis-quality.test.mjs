import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

async function loadQualityModule() {
  const sourcePath = path.join(process.cwd(), 'lib', 'analysisQuality.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const tempPath = path.join(process.cwd(), '.tmp', `analysis-quality-${Date.now()}.mjs`);
  fs.mkdirSync(path.dirname(tempPath), { recursive: true });
  fs.writeFileSync(tempPath, output);
  return { module: await import(pathToFileURL(tempPath).href), tempPath };
}

test('quality gate accepts a grounded, actionable report', async () => {
  const loaded = await loadQualityModule();
  try {
    const report = `=== RECOMMENDED NEXT STEP ===\nUse a two-minute written response from every learner, sort responses by misconception, and reteach the most common gap before independent practice begins.\n\n=== EVIDENCE FROM THE LESSON ===\n- Opening: The teacher asked students to predict the outcome.\n- Modeling: The teacher compared two worked examples.\n- Closure: Three students shared answers aloud.\n\n=== NEXT-LESSON ACTION PLAN ===\n- Learning Target: Explain the process accurately.\n- Instructional Move: Model one contrasting example.\n- Check for Understanding: Collect one response from each student.\n- Response Plan: Reteach the most common misconception.\n\n=== ADMINISTRATOR COACHING PLAN ===\n- Celebrate: The model made the process visible.\n- Ask: What did the responses reveal?\n- Commit: Use one all-student check.\n- Look For Next Time: Responses change the next teaching move.`;
    assert.deepEqual(loaded.module.evaluateAnalysisQuality(report), { passed: true, score: 100, issues: [] });
  } finally {
    fs.rmSync(loaded.tempPath, { force: true });
  }
});

test('quality gate flags incomplete and unsupported reports', async () => {
  const loaded = await loadQualityModule();
  try {
    const result = loaded.module.evaluateAnalysisQuality('Every student mastered the lesson.');
    assert.equal(result.passed, false);
    assert.ok(result.issues.length >= 4);
  } finally {
    fs.rmSync(loaded.tempPath, { force: true });
  }
});
