#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const PDF_DIR = '/tmp/teks-import';
const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'teksStandards.generated.ts');

const SOURCES = [
  { file: 'ch110a.pdf', grade: '3rd Grade', subject: 'English Language Arts', start: '§110.5.', end: '§110.6.' },
  { file: 'ch110a.pdf', grade: '4th Grade', subject: 'English Language Arts', start: '§110.6.', end: '§110.7.' },
  { file: 'ch110a.pdf', grade: '5th Grade', subject: 'English Language Arts', start: '§110.7.', end: null },
  { file: 'ch110b.pdf', grade: '6th Grade', subject: 'English Language Arts', start: '§110.22.', end: '§110.23.' },
  { file: 'ch110b.pdf', grade: '7th Grade', subject: 'English Language Arts', start: '§110.23.', end: '§110.24.' },
  { file: 'ch110b.pdf', grade: '8th Grade', subject: 'English Language Arts', start: '§110.24.', end: '§110.25.' },
  { file: 'ch110c.pdf', grade: '10th Grade', subject: 'English II', start: '§110.37.', end: '§110.38.' },

  { file: 'ch111a.pdf', grade: '3rd Grade', subject: 'Mathematics', start: '§111.5.', end: '§111.6.' },
  { file: 'ch111a.pdf', grade: '4th Grade', subject: 'Mathematics', start: '§111.6.', end: '§111.7.' },
  { file: 'ch111a.pdf', grade: '5th Grade', subject: 'Mathematics', start: '§111.7.', end: null },
  { file: 'ch111b.pdf', grade: '6th Grade', subject: 'Mathematics', start: '§111.26.', end: '§111.27.' },
  { file: 'ch111b.pdf', grade: '7th Grade', subject: 'Mathematics', start: '§111.27.', end: '§111.28.' },
  { file: 'ch111b.pdf', grade: '8th Grade', subject: 'Mathematics', start: '§111.28.', end: '§111.29.' },
  { file: 'ch111c.pdf', grade: '9th Grade', subject: 'Algebra I', start: '§111.39.', end: '§111.40.' },
  { file: 'ch111c.pdf', grade: '10th Grade', subject: 'Geometry', start: '§111.41.', end: '§111.42.' },

  { file: 'ch112a.pdf', grade: '5th Grade', subject: 'Science', start: '§112.7.', end: null },
  { file: 'ch112b.pdf', grade: '6th Grade', subject: 'Science', start: '§112.26.', end: '§112.27.' },
  { file: 'ch112b.pdf', grade: '8th Grade', subject: 'Science', start: '§112.28.', end: null },
  { file: 'ch112c.pdf', grade: '9th Grade', subject: 'Biology', start: '§112.42.', end: '§112.43.' },
  { file: 'ch112c.pdf', grade: '10th Grade', subject: 'Chemistry', start: '§112.43.', end: '§112.44.' },

  { file: 'ch113b.pdf', grade: '8th Grade', subject: 'Social Studies', start: '§113.20.', end: null },
  { file: 'ch113c.pdf', grade: '11th Grade', subject: 'U.S. History', start: '§113.41.', end: '§113.42.' },
];

function stripPdfNoise(text) {
  return text
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n--\s*\d+\s+of\s+\d+\s*--\n/g, '\n')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^(Elementary|Middle School|High School)\s+§\d+\.[A-Z]\.?$/i.test(trimmed)) return false;
      if (/^§\d+\.[A-Z]\.\s+(Elementary|Middle School|High School)$/i.test(trimmed)) return false;
      if (/^(Page\s+\d+(?:\s+of\s+\d+)?\s+)?[A-Z][a-z]+\s+\d{4}\s+Update(?:\s+Page\s+\d+(?:\s+of\s+\d+)?)?$/i.test(trimmed)) return false;
      return true;
    })
    .join('\n');
}

function cleanText(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

function parseSectionNumber(startMarker) {
  const match = startMarker.match(/§(\d+\.\d+)\./);
  if (!match) {
    throw new Error(`Could not parse section number from marker: ${startMarker}`);
  }
  return match[1];
}

function extractSection(text, startMarker, endMarker) {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error(`Missing start marker ${startMarker}`);
  }

  let endIndex = text.length;
  if (endMarker) {
    const markerIndex = text.indexOf(endMarker, startIndex + startMarker.length);
    if (markerIndex !== -1) {
      endIndex = markerIndex;
    }
  }

  return text.slice(startIndex, endIndex).trim();
}

function extractOverview(section, fallbackTitle) {
  const introMatch = section.match(/\(([abc])\)\s+Introduction\.\s*([\s\S]*?)(?=\n\([bcd]\)\s+Knowledge and skills\.)/);
  if (!introMatch) {
    return cleanText(fallbackTitle);
  }

  const introText = introMatch[2];
  const numberedParagraphs = [...introText.matchAll(/(?:^|\n)\((\d+)\)\s+([\s\S]*?)(?=(?:\n\(\d+\)\s)|$)/g)]
    .map((match) => cleanText(match[2]))
    .filter(Boolean);

  const preferred =
    numberedParagraphs.find((paragraph) =>
      /(students in|in [a-z0-9 .,'-]+, students|focus on|will study|the english language arts and reading)/i.test(paragraph)
    ) ||
    numberedParagraphs[0] ||
    fallbackTitle;

  return cleanText(preferred);
}

function parseKnowledgeSection(section) {
  const knowledgeMatch = section.match(/\(([bcd])\)\s+Knowledge and skills\.\s*([\s\S]*)$/);
  if (!knowledgeMatch) {
    throw new Error('Knowledge and skills block not found.');
  }

  return {
    subsectionLetter: knowledgeMatch[1].toLowerCase(),
    body: knowledgeMatch[2].trim(),
  };
}

function parseStrands(body, sectionNumber, subsectionLetter) {
  const standards = [];
  const strandRegex = /(?:^|\n)\((\d+)\)\s+([\s\S]*?)(?=(?:\n\(\d+\)\s)|$)/g;
  const strands = [...body.matchAll(strandRegex)];

  for (const strandMatch of strands) {
    const strandNumber = strandMatch[1];
    const strandBody = strandMatch[2].trim();
    const studentIndex = strandBody.indexOf('The student');
    const categoryText = studentIndex >= 0 ? strandBody.slice(0, studentIndex) : strandBody;
    const category = cleanText(categoryText.replace(/[:.]$/, ''));
    const letterRegex = /(?:^|\n)\(([A-Z])\)\s+([\s\S]*?)(?=(?:\n\([A-Z]\)\s)|$)/g;
    const lettered = [...strandBody.matchAll(letterRegex)];

    if (lettered.length > 0) {
      for (const letterMatch of lettered) {
        const letter = letterMatch[1];
        const description = cleanText(letterMatch[2]);
        standards.push({
          code: `§${sectionNumber}(${subsectionLetter})(${strandNumber})(${letter})`,
          description,
          category,
        });
      }
      continue;
    }

    const description = cleanText(studentIndex >= 0 ? strandBody.slice(studentIndex) : strandBody);
    if (description) {
      standards.push({
        code: `§${sectionNumber}(${subsectionLetter})(${strandNumber})`,
        description,
        category,
      });
    }
  }

  return standards;
}

async function parsePdf(filePath) {
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });
  try {
    const { text } = await parser.getText();
    return stripPdfNoise(text);
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const cache = new Map();
  const records = [];

  for (const source of SOURCES) {
    const filePath = path.join(PDF_DIR, source.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing PDF file: ${filePath}`);
    }

    if (!cache.has(source.file)) {
      cache.set(source.file, await parsePdf(filePath));
    }

    const text = cache.get(source.file);
    const section = extractSection(text, source.start, source.end);
    const titleLine = cleanText(section.split('\n')[0]);
    const overviewStatement = extractOverview(section, titleLine);
    const { subsectionLetter, body } = parseKnowledgeSection(section);
    const sectionNumber = parseSectionNumber(source.start);
    const standards = parseStrands(body, sectionNumber, subsectionLetter);

    if (standards.length === 0) {
      throw new Error(`No standards parsed for ${source.grade} ${source.subject}`);
    }

    records.push({
      grade: source.grade,
      subject: source.subject,
      overviewStatement,
      standards,
    });
  }

  const fileContents = `const teksStandards = ${JSON.stringify(records, null, 2)} as const;\n\nexport default teksStandards;\n`;
  fs.writeFileSync(OUTPUT_PATH, fileContents);
  console.log(`Wrote ${records.length} TEKS entries to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
