import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

async function loadModule() {
  const helperPath = path.join(process.cwd(), 'lib', 'multipartLesson.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    fileName: helperPath,
  }).outputText;
  const tempFile = path.join(process.cwd(), '.tmp', `multipart-${Date.now()}.mjs`);
  fs.mkdirSync(path.dirname(tempFile), { recursive: true });
  fs.writeFileSync(tempFile, output);
  return { module: await import(pathToFileURL(tempFile).href), tempFile };
}

const longText = (word) => Array.from({ length: 80 }, (_, index) => `${word}${index % 12}`).join(' ');

test('removes a repeated transcription chunk cycle', async () => {
  const loaded = await loadModule();
  try {
    const one = longText('alpha');
    const two = longText('beta');
    const cycle = `[Transcript chunk 1 of 2]\n${one}\n\n[Transcript chunk 2 of 2]\n${two}`;
    const cleaned = loaded.module.deduplicateTranscript(`Teacher note preamble.\n\n${cycle}\n\n${cycle}`);
    assert.equal((cleaned.match(/Transcript chunk/g) || []).length, 2);
    assert.match(cleaned, /^Teacher note preamble\./);
  } finally {
    fs.rmSync(loaded.tempFile, { force: true });
  }
});

test('recognizes part numbers in common filenames', async () => {
  const loaded = await loadModule();
  try {
    assert.equal(loaded.module.extractLessonPartNumber('chapter8_part_2.m4a'), 2);
    assert.equal(loaded.module.extractLessonPartNumber('Chapter 8 - Part 1.mp3'), 1);
  } finally {
    fs.rmSync(loaded.tempFile, { force: true });
  }
});

test('rejects a duplicate multipart upload instead of rescoring it', async () => {
  const loaded = await loadModule();
  try {
    const transcript = longText('same');
    const result = loaded.module.mergeLessonEvidence(transcript, transcript);
    assert.equal(result.duplicateOnly, true);
    assert.equal(result.transcript, transcript);
  } finally {
    fs.rmSync(loaded.tempFile, { force: true });
  }
});

test('orders explicitly numbered lesson parts chronologically', async () => {
  const loaded = await loadModule();
  try {
    const partTwo = `[Lesson part: 2]\n${longText('second')}`;
    const partOne = longText('first');
    const result = loaded.module.mergeLessonEvidence(partTwo, partOne, 1);
    assert.equal(result.reordered, true);
    assert.ok(result.transcript.indexOf('first') < result.transcript.indexOf('second'));
  } finally {
    fs.rmSync(loaded.tempFile, { force: true });
  }
});
