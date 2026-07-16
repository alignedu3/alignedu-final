import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const repoRoot = process.cwd();
const helperPath = path.join(repoRoot, 'lib', 'openaiStructuredAnalysis.ts');

async function loadStructuredAnalysisModule() {
  const source = fs.readFileSync(helperPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
    fileName: helperPath,
    reportDiagnostics: true,
  });

  if (transpiled.diagnostics?.length) {
    throw new Error(
      transpiled.diagnostics
        .map((diag) => ts.flattenDiagnosticMessageText(diag.messageText, '\n'))
        .join('\n')
    );
  }

  const localTmpRoot = path.join(repoRoot, '.tmp');
  fs.mkdirSync(localTmpRoot, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(localTmpRoot, 'alignedu-openai-test-'));
  const tempFile = path.join(tempDir, 'openaiStructuredAnalysis.mjs');
  fs.writeFileSync(tempFile, transpiled.outputText, 'utf8');
  return {
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
    module: import(pathToFileURL(tempFile).href),
  };
}

function loadFixture(name) {
  const file = path.join(repoRoot, 'tests', 'fixtures', 'openai-structured-analysis', name);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('structured analysis fixtures render back into the legacy report contract', async () => {
  const loaded = await loadStructuredAnalysisModule();
  const mod = await loaded.module;
  const fixtures = ['staar-school.json', 'higher-ed-custom.json'].map(loadFixture);

  try {
    for (const fixture of fixtures) {
      const normalized = mod.normalizeStructuredAnalysisPayload(fixture.payload);
      const rendered = mod.renderStructuredAnalysisToLegacyText(
        normalized,
        fixture.higherEdAlignmentTitle || undefined
      );

      for (const expected of fixture.expectedIncludes) {
        assert.ok(
          rendered.includes(expected),
          `${fixture.name} should include ${expected}`
        );
      }

      for (const unexpected of fixture.expectedNotIncludes) {
        assert.ok(
          !rendered.includes(unexpected),
          `${fixture.name} should not include ${unexpected}`
        );
      }

      assert.match(
        rendered,
        /Instructional Score \(0-100\): \d+/,
        `${fixture.name} should render an instructional score`
      );
    }
  } finally {
    loaded.cleanup();
  }
});

test('empty content gaps normalize to the expected placeholder and zero-gap count', async () => {
  const loaded = await loadStructuredAnalysisModule();
  const mod = await loaded.module;
  const fixture = loadFixture('higher-ed-custom.json');

  try {
    const normalized = mod.normalizeStructuredAnalysisPayload(fixture.payload);
    const rendered = mod.renderStructuredAnalysisToLegacyText(
      normalized,
      fixture.higherEdAlignmentTitle || undefined
    );

    assert.deepEqual(normalized.contentGapsToReinforce, ['No major content gaps identified.']);
    assert.match(rendered, /Gaps Flagged: 0/);
    assert.match(rendered, /1\. No major content gaps identified\./);
  } finally {
    loaded.cleanup();
  }
});

test('role-specific action plans render as stable report sections', async () => {
  const loaded = await loadStructuredAnalysisModule();
  const mod = await loaded.module;
  const fixture = loadFixture('staar-school.json');

  try {
    fixture.payload.teacherActionPlan = [
      { label: 'Learning Target', content: 'Students will justify one answer with evidence.', bullets: [] },
    ];
    fixture.payload.administratorCoachingPlan = [
      { label: 'Look For Next Time', content: 'Every student produces visible evidence.', bullets: [] },
    ];

    const rendered = mod.renderStructuredAnalysisToLegacyText(
      mod.normalizeStructuredAnalysisPayload(fixture.payload)
    );

    assert.match(rendered, /=== NEXT-LESSON ACTION PLAN ===/);
    assert.match(rendered, /- Learning Target: Students will justify one answer with evidence\./);
    assert.match(rendered, /=== ADMINISTRATOR COACHING PLAN ===/);
    assert.match(rendered, /- Look For Next Time: Every student produces visible evidence\./);
  } finally {
    loaded.cleanup();
  }
});
