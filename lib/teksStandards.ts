import teksDatabase from './teksStandards.generated';

export interface TEKSStandard {
  code: string;
  description: string;
  category: string;
}

export interface TEKSGradeSubject {
  grade: string;
  subject: string;
  standards: TEKSStandard[];
  overviewStatement: string;
}

const teksRecords = teksDatabase as unknown as TEKSGradeSubject[];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGrade(grade: string): string {
  const value = grade.trim().toLowerCase();
  if (!value) return '';

  const numericMatch = value.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade)?$/);
  if (numericMatch) {
    return numericMatch[1];
  }

  const aliases: Record<string, string> = {
    kindergarten: 'k',
    '3rd grade': '3',
    '4th grade': '4',
    '5th grade': '5',
    '6th grade': '6',
    '7th grade': '7',
    '8th grade': '8',
    '9th grade': '9',
    '10th grade': '10',
    '11th grade': '11',
    '12th grade': '12',
  };

  return aliases[value] || value;
}

function normalizeSubject(subject: string): string {
  const value = subject.trim().toLowerCase().replace(/\./g, '');

  const aliases: Record<string, string> = {
    ela: 'english language arts',
    english: 'english language arts',
    'english language arts': 'english language arts',
    'english language arts and reading': 'english language arts',
    math: 'mathematics',
    mathematics: 'mathematics',
    'algebra 1': 'algebra i',
    'algebra i': 'algebra i',
    'english 2': 'english ii',
    'english ii': 'english ii',
    'us history': 'us history',
    'u s history': 'us history',
    'u.s. history': 'us history',
  };

  return aliases[value] || value;
}

function getGradeCandidates(grade: string, subject: string): string[] {
  const normalizedGrade = normalizeGrade(grade);
  const normalizedSubject = normalizeSubject(subject);

  if (
    (normalizedSubject === 'biology' || normalizedSubject === 'chemistry') &&
    (normalizedGrade === '9' || normalizedGrade === '10')
  ) {
    return ['9', '10'];
  }

  return [normalizedGrade];
}

function getKeywordTokens(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2);
}

export function getTEKSStandards(
  grade: string,
  subject: string
): {
  standards: TEKSStandard[];
  overview: string;
  found: boolean;
} {
  const gradeCandidates = getGradeCandidates(grade, subject);
  const normalizedSubject = normalizeSubject(subject);
  const match = teksRecords.find(
    (entry) =>
      gradeCandidates.includes(normalizeGrade(entry.grade)) &&
      normalizeSubject(entry.subject) === normalizedSubject
  );

  if (match) {
    return {
      standards: match.standards,
      overview: match.overviewStatement,
      found: true,
    };
  }

  return {
    standards: [],
    overview: `Standards for ${grade} ${subject} are not yet loaded in the system.`,
    found: false,
  };
}

export function getRelatedTEKSStandards(
  grade: string,
  subject: string,
  contextText: string,
  options?: { limit?: number; excludeCodes?: string[] }
): TEKSStandard[] {
  const { standards } = getTEKSStandards(grade, subject);
  if (!standards.length) return [];

  const limit = options?.limit ?? 8;
  const excludeCodes = new Set(options?.excludeCodes || []);
  const contextTokens = new Set(getKeywordTokens(contextText));

  const scored = standards
    .filter((standard) => !excludeCodes.has(standard.code))
    .map((standard) => {
      const descriptionTokens = getKeywordTokens(`${standard.category} ${standard.description}`);
      const overlap = descriptionTokens.reduce(
        (score, token) => score + (contextTokens.has(token) ? 1 : 0),
        0
      );

      const exactCategoryBonus = normalizeText(contextText).includes(normalizeText(standard.category)) ? 2 : 0;
      const exactDescriptionBonus = normalizeText(contextText).includes(normalizeText(standard.description)) ? 3 : 0;

      return {
        standard,
        score: overlap + exactCategoryBonus + exactDescriptionBonus,
      };
    })
    .sort((a, b) => b.score - a.score || a.standard.code.localeCompare(b.standard.code));

  return scored.slice(0, limit).map((entry) => entry.standard);
}

export function formatTEKSForPrompt(
  standards: TEKSStandard[],
  overview: string,
  options?: { totalCount?: number }
): string {
  if (standards.length === 0) {
    return `Standards reference: ${overview}`;
  }

  const standardsText = standards
    .map((standard) => `  • ${standard.code}: ${standard.description}`)
    .join('\n');

  const totalLine =
    options?.totalCount && options.totalCount > standards.length
      ? `\nThis lesson has access to ${options.totalCount} official TEKS expectations in the full course library. The standards below are the most relevant TEKS for this lesson transcript.`
      : '';

  return `
TEXAS TEKS STANDARDS FOR THIS GRADE & SUBJECT:
${overview}${totalLine}

Most Relevant Standards for This Lesson:
${standardsText}
`;
}
