export const DALLAS_ISD_RUBRIC_ID = 'dallas-isd-2025-2026';

const DALLAS_RUBRIC_PILOT_USER_IDS = new Set([
  '32707daa-0454-4ad5-87bc-26a8da84a42f', // Joseph Francis
]);

export function canUseDallasRubricPilot(userId: string | null | undefined, role: string | null | undefined) {
  return role === 'super_admin' || Boolean(userId && DALLAS_RUBRIC_PILOT_USER_IDS.has(userId));
}

export type RubricRating = -1 | 0 | 1 | 2 | 3;

export type RubricEvidenceItem = {
  indicator: string;
  title: string;
  rating: RubricRating;
  evidence: string;
};

export type RubricReviewItem = RubricEvidenceItem & {
  confirmedRating: RubricRating;
  administratorNote: string;
};

export const DALLAS_ISD_OBSERVATION_INDICATORS = [
  { indicator: '2.1', title: 'Alignment' },
  { indicator: '2.2', title: 'Mastery' },
  { indicator: '2.3', title: 'Delivery' },
  { indicator: '2.4', title: 'Cognitive Demand' },
  { indicator: '3.1', title: 'Procedures and Systems' },
  { indicator: '3.2', title: 'Behavioral Expectations' },
  { indicator: '3.3', title: 'Climate and Culture' },
] as const;

export const RUBRIC_RATING_LABELS: Record<RubricRating, string> = {
  [-1]: 'Not rated',
  0: 'Unsatisfactory',
  1: 'Progressing',
  2: 'Proficient',
  3: 'Exemplary',
};

export function isElementaryRubricGrade(grade: string) {
  return ['3rd Grade', '4th Grade', '5th Grade'].includes(grade);
}

export function parseDallasRubricEvidence(text: string): RubricEvidenceItem[] {
  const normalized = String(text || '').replace(/\r/g, '');
  const match = normalized.match(/===\s*DALLAS ISD RUBRIC EVIDENCE\s*===([\s\S]*?)(?=\n===|$)/i);
  if (!match) return [];

  const rows = Array.from(match[1].matchAll(/-\s*(2\.[1-4]|3\.[1-3])\s+([^:]+):\s*Rating\s*(-?\d)\s*\|\s*Evidence:\s*([^\n]+)/gi));
  return rows.map((row) => {
    const parsed = Number(row[3]);
    const rating = ([-1, 0, 1, 2, 3].includes(parsed) ? parsed : -1) as RubricRating;
    return {
      indicator: row[1],
      title: row[2].trim(),
      rating,
      evidence: row[4].trim(),
    };
  });
}

export function stripDallasRubricSection(text: unknown) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\n*===\s*DALLAS ISD RUBRIC EVIDENCE\s*===[\s\S]*?(?=\n===|$)/gi, '')
    .trim();
}

export function hidePilotRubricFields<T extends Record<string, unknown>>(analysis: T): T {
  return {
    ...analysis,
    result: stripDallasRubricSection(analysis.result),
    analysis_result: stripDallasRubricSection(analysis.analysis_result),
    admin_edited_result: stripDallasRubricSection(analysis.admin_edited_result),
    rubric_id: null,
    rubric_review: null,
  };
}
