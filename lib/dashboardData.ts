export type LessonReport = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  teacher: string;
  date: string;
  coverage: number;
  clarity: number;
  engagement: number;
  assessment: number;
  gaps: number;
};

export type AnalysisReport = Partial<LessonReport> & {
  id: string;
  user_id?: string | null;
  created_at?: string | null;
  teacher_name?: string | null;
  name?: string | null;
  coverage_score?: number | string | null;
  clarity_rating?: number | string | null;
  engagement_level?: number | string | null;
  assessment_quality?: number | string | null;
  gaps_detected?: number | string | null;
  result?: string | null;
  analysis_result?: string | null;
  transcript?: string | null;
  score?: number | string | null;
};

export type ProfileRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export const sampleReports: LessonReport[] = [
  {
    id: '1',
    title: 'Cell Structure and Function',
    subject: 'Biology',
    grade: '10',
    teacher: 'Ms. Carter',
    date: '2026-04-01',
    coverage: 88,
    clarity: 84,
    engagement: 79,
    assessment: 72,
    gaps: 2,
  },
  {
    id: '2',
    title: 'Photosynthesis',
    subject: 'Biology',
    grade: '10',
    teacher: 'Ms. Carter',
    date: '2026-04-03',
    coverage: 91,
    clarity: 87,
    engagement: 82,
    assessment: 76,
    gaps: 1,
  },
  {
    id: '3',
    title: 'Genetics Basics',
    subject: 'Biology',
    grade: '10',
    teacher: 'Mr. Evans',
    date: '2026-04-02',
    coverage: 79,
    clarity: 81,
    engagement: 74,
    assessment: 68,
    gaps: 3,
  },
  {
    id: '4',
    title: 'Mitosis and Meiosis',
    subject: 'Biology',
    grade: '10',
    teacher: 'Mr. Evans',
    date: '2026-04-05',
    coverage: 83,
    clarity: 78,
    engagement: 76,
    assessment: 70,
    gaps: 2,
  },
  {
    id: '5',
    title: 'Enzymes',
    subject: 'Biology',
    grade: '10',
    teacher: 'Dr. Lee',
    date: '2026-04-04',
    coverage: 94,
    clarity: 90,
    engagement: 88,
    assessment: 84,
    gaps: 1,
  },
  {
    id: '6',
    title: 'Cellular Respiration',
    subject: 'Biology',
    grade: '10',
    teacher: 'Dr. Lee',
    date: '2026-04-07',
    coverage: 92,
    clarity: 91,
    engagement: 89,
    assessment: 86,
    gaps: 1,
  },
];

export function toNumberMetric(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function calculateLessonScore(report: AnalysisReport): number {
  const coverage = toNumberMetric(report.coverage ?? report.coverage_score, 75);
  const clarity = toNumberMetric(report.clarity ?? report.clarity_rating, 75);
  const engagement = toNumberMetric(report.engagement ?? report.engagement_level, 75);
  const assessment = toNumberMetric(report.assessment ?? report.assessment_quality, 75);
  const gaps = toNumberMetric(report.gaps ?? report.gaps_detected, 0);

  const weighted =
    coverage * 0.35 +
    clarity * 0.30 +
    engagement * 0.20 +
    assessment * 0.15;

  const gapPenalty = gaps * 2;
  const finalScore = Math.max(0, Math.min(100, Math.round(weighted - gapPenalty)));

  return finalScore;
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function getLessonMetrics(report: AnalysisReport) {
  return {
    score: calculateLessonScore(report),
    coverage: toNumberMetric(report.coverage ?? report.coverage_score, 75),
    clarity: toNumberMetric(report.clarity ?? report.clarity_rating, 75),
    engagement: toNumberMetric(report.engagement ?? report.engagement_level, 75),
    assessment: toNumberMetric(report.assessment ?? report.assessment_quality, 75),
    gaps: toNumberMetric(report.gaps ?? report.gaps_detected, 0),
  };
}

export function getLessonInsights(report: AnalysisReport) {
  const metrics = getLessonMetrics(report);
  const findings: string[] = [];

  if (metrics.score >= 80) {
    findings.push('Overall lesson quality is strong with consistent instructional delivery.');
  } else {
    findings.push('Overall lesson quality is below target and needs targeted refinement.');
  }

  if (metrics.coverage >= 80) {
    findings.push('Standards coverage is strong and aligned to lesson goals.');
  } else {
    findings.push('Standards coverage is light; prioritize explicit alignment to objectives.');
  }

  if (metrics.clarity >= 80) {
    findings.push('Explanations are clear and sequencing supports student understanding.');
  } else {
    findings.push('Instructional clarity can improve with tighter modeling and checks for understanding.');
  }

  if (metrics.engagement >= 80) {
    findings.push('Student engagement appears high with active participation opportunities.');
  } else {
    findings.push('Engagement is limited; add more interaction and response moments during instruction.');
  }

  if (metrics.gaps > 0) {
    findings.push(`Detected ${metrics.gaps} gap${metrics.gaps === 1 ? '' : 's'} that should be revisited for mastery.`);
  } else {
    findings.push('No major concept gaps were detected in this lesson evidence.');
  }

  const nextAction =
    metrics.gaps > 0
      ? 'Revisit missed concepts, strengthen closure, and add a quick mastery check before moving on.'
      : 'Maintain strong instruction and add deeper checks for understanding to extend rigor.';

  const summary =
    metrics.score >= 85
      ? 'High-performing lesson with clear evidence of strong instructional moves.'
      : metrics.score >= 75
        ? 'Solid lesson with room to sharpen execution and mastery checks.'
        : 'Lesson needs targeted support around clarity, closure, and reinforcement.';

  return {
    ...metrics,
    findings,
    nextAction,
    summary,
  };
}

export function getDashboardSummary(reports: AnalysisReport[]) {
  const scores = reports.map(calculateLessonScore);

  return {
    lessonsAnalyzed: reports.length,
    averageScore: average(scores),
    averageCoverage: average(reports.map(r => toNumberMetric(r.coverage ?? r.coverage_score, 0))),
    averageClarity: average(reports.map(r => toNumberMetric(r.clarity ?? r.clarity_rating, 0))),
    averageEngagement: average(reports.map(r => toNumberMetric(r.engagement ?? r.engagement_level, 0))),
    averageAssessment: average(reports.map(r => toNumberMetric(r.assessment ?? r.assessment_quality, 0))),
    totalGaps: reports.reduce((sum, r) => sum + toNumberMetric(r.gaps ?? r.gaps_detected, 0), 0),
  };
}

export function getTeacherRankings(reports: LessonReport[]) {
  const byTeacher = new Map<string, LessonReport[]>();

  for (const report of reports) {
    const existing = byTeacher.get(report.teacher) ?? [];
    existing.push(report);
    byTeacher.set(report.teacher, existing);
  }

  return Array.from(byTeacher.entries())
    .map(([teacher, teacherReports]) => {
      const scores = teacherReports.map(calculateLessonScore);
      return {
        teacher,
        lessons: teacherReports.length,
        avgScore: average(scores),
        avgCoverage: average(teacherReports.map(r => r.coverage)),
        avgClarity: average(teacherReports.map(r => r.clarity)),
        totalGaps: teacherReports.reduce((sum, r) => sum + r.gaps, 0),
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);
}

export function getTrendData(reports: AnalysisReport[]) {
  return [...reports]
    .sort((a, b) => (a.date ?? a.created_at ?? '').localeCompare(b.date ?? b.created_at ?? ''))
    .map(report => ({
      date: report.date ?? report.created_at?.slice(0, 10),
      score: calculateLessonScore(report),
      coverage: toNumberMetric(report.coverage ?? report.coverage_score, 0),
      clarity: toNumberMetric(report.clarity ?? report.clarity_rating, 0),
      engagement: toNumberMetric(report.engagement ?? report.engagement_level, 0),
      assessment: toNumberMetric(report.assessment ?? report.assessment_quality, 0),
    }));
}