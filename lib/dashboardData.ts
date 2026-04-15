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

export const SAMPLE_PREVIEW_TEACHER_ID = 'sample-teacher-1';
export const SAMPLE_TEACHER_IDS = {
  'Ms. Carter': 'sample-teacher-1',
  'Mr. Evans': 'sample-teacher-2',
  'Dr. Lee': 'sample-teacher-3',
} as const;

function getSampleAnalysisNarrative(report: LessonReport, teacherDisplayName: string) {
  const scoreBand =
    report.coverage >= 90 && report.clarity >= 88
      ? 'strong and increasingly consistent'
      : report.gaps >= 3
        ? 'in need of targeted support'
        : 'solid with room to sharpen execution';

  return [
    'Executive Summary',
    `${teacherDisplayName}'s ${report.title.toLowerCase()} lesson was ${scoreBand}, with evidence tied to clarity, pacing, engagement, and mastery checks.`,
    '',
    'Coaching Priorities',
    `- Tighten modeling and guided practice around ${report.title.toLowerCase()}.`,
    '- Add one brief mastery check before independent work begins.',
    '- End with a short written or verbal closure prompt to confirm understanding.',
    '',
    'Standards Alignment',
    `- Coverage evidence suggests ${report.coverage}% alignment to the intended objective.`,
    `- Clarity and explanation moves were rated at ${report.clarity}%.`,
    `- Student engagement opportunities were rated at ${report.engagement}%.`,
  ].join('\n');
}

function getSampleTranscript(report: LessonReport, teacherDisplayName: string) {
  return [
    `${teacherDisplayName}: Today we're focusing on ${report.title.toLowerCase()}.`,
    `${teacherDisplayName}: Turn and talk with your partner about what you already know before we build the new concept together.`,
    'Student response period omitted for sample preview.',
    `${teacherDisplayName}: Now show me your thinking before we move to the next example.`,
  ].join('\n');
}

function buildSampleReport(
  id: string,
  teacher: string,
  title: string,
  date: string,
  metrics: {
    coverage: number;
    clarity: number;
    engagement: number;
    assessment: number;
    gaps: number;
  }
): LessonReport {
  return {
    id,
    title,
    subject: 'Biology',
    grade: '10',
    teacher,
    date,
    ...metrics,
  };
}

export const sampleReports: LessonReport[] = [
  buildSampleReport('1', 'Ms. Carter', 'Cell Structure and Function', '2026-01-09', { coverage: 82, clarity: 79, engagement: 75, assessment: 70, gaps: 3 }),
  buildSampleReport('2', 'Ms. Carter', 'Photosynthesis', '2026-01-16', { coverage: 84, clarity: 81, engagement: 77, assessment: 72, gaps: 2 }),
  buildSampleReport('3', 'Ms. Carter', 'Genetics Basics', '2026-01-30', { coverage: 86, clarity: 83, engagement: 80, assessment: 74, gaps: 2 }),
  buildSampleReport('4', 'Ms. Carter', 'Mitosis and Meiosis', '2026-02-06', { coverage: 85, clarity: 81, engagement: 78, assessment: 73, gaps: 2 }),
  buildSampleReport('5', 'Ms. Carter', 'Enzymes', '2026-02-20', { coverage: 81, clarity: 78, engagement: 75, assessment: 70, gaps: 3 }),
  buildSampleReport('6', 'Ms. Carter', 'Cellular Respiration', '2026-03-06', { coverage: 83, clarity: 80, engagement: 77, assessment: 72, gaps: 2 }),
  buildSampleReport('7', 'Ms. Carter', 'Introduction to Ecosystems', '2026-03-20', { coverage: 89, clarity: 86, engagement: 83, assessment: 78, gaps: 1 }),
  buildSampleReport('8', 'Ms. Carter', 'Food Webs and Energy Flow', '2026-04-03', { coverage: 91, clarity: 88, engagement: 86, assessment: 81, gaps: 1 }),
  buildSampleReport('9', 'Ms. Carter', 'Adaptation and Survival', '2026-04-17', { coverage: 93, clarity: 90, engagement: 88, assessment: 83, gaps: 1 }),
  buildSampleReport('10', 'Ms. Carter', 'Scientific Argumentation', '2026-05-01', { coverage: 94, clarity: 91, engagement: 89, assessment: 84, gaps: 1 }),
  buildSampleReport('11', 'Mr. Evans', 'Introduction to Ecosystems', '2026-01-08', { coverage: 75, clarity: 73, engagement: 70, assessment: 66, gaps: 4 }),
  buildSampleReport('12', 'Mr. Evans', 'Food Webs and Energy Flow', '2026-01-22', { coverage: 77, clarity: 75, engagement: 72, assessment: 68, gaps: 3 }),
  buildSampleReport('13', 'Mr. Evans', 'DNA and Inheritance', '2026-02-05', { coverage: 79, clarity: 77, engagement: 74, assessment: 69, gaps: 3 }),
  buildSampleReport('14', 'Mr. Evans', 'Natural Selection', '2026-02-19', { coverage: 80, clarity: 78, engagement: 75, assessment: 70, gaps: 3 }),
  buildSampleReport('15', 'Mr. Evans', 'Protein Synthesis', '2026-03-05', { coverage: 82, clarity: 79, engagement: 76, assessment: 72, gaps: 2 }),
  buildSampleReport('16', 'Mr. Evans', 'Ecological Change Over Time', '2026-03-19', { coverage: 83, clarity: 80, engagement: 77, assessment: 73, gaps: 2 }),
  buildSampleReport('17', 'Mr. Evans', 'Genetic Variation', '2026-04-02', { coverage: 84, clarity: 81, engagement: 78, assessment: 74, gaps: 2 }),
  buildSampleReport('18', 'Mr. Evans', 'Scientific Modeling', '2026-04-16', { coverage: 85, clarity: 82, engagement: 79, assessment: 75, gaps: 2 }),
  buildSampleReport('19', 'Mr. Evans', 'Population Dynamics', '2026-04-30', { coverage: 86, clarity: 83, engagement: 80, assessment: 76, gaps: 1 }),
  buildSampleReport('20', 'Mr. Evans', 'Biology Review Seminar', '2026-05-14', { coverage: 87, clarity: 84, engagement: 81, assessment: 77, gaps: 1 }),
  buildSampleReport('21', 'Dr. Lee', 'Enzymes', '2026-01-10', { coverage: 88, clarity: 86, engagement: 84, assessment: 79, gaps: 2 }),
  buildSampleReport('22', 'Dr. Lee', 'Cellular Respiration', '2026-01-24', { coverage: 89, clarity: 87, engagement: 85, assessment: 80, gaps: 2 }),
  buildSampleReport('23', 'Dr. Lee', 'Genetic Variation', '2026-02-07', { coverage: 91, clarity: 88, engagement: 86, assessment: 82, gaps: 1 }),
  buildSampleReport('24', 'Dr. Lee', 'Scientific Modeling', '2026-02-21', { coverage: 92, clarity: 89, engagement: 87, assessment: 83, gaps: 1 }),
  buildSampleReport('25', 'Dr. Lee', 'Protein Synthesis', '2026-03-07', { coverage: 93, clarity: 90, engagement: 88, assessment: 84, gaps: 1 }),
  buildSampleReport('26', 'Dr. Lee', 'Ecological Change Over Time', '2026-03-21', { coverage: 94, clarity: 91, engagement: 89, assessment: 85, gaps: 1 }),
  buildSampleReport('27', 'Dr. Lee', 'Adaptation and Survival', '2026-04-04', { coverage: 95, clarity: 92, engagement: 90, assessment: 86, gaps: 1 }),
  buildSampleReport('28', 'Dr. Lee', 'Scientific Argumentation', '2026-04-18', { coverage: 95, clarity: 92, engagement: 90, assessment: 87, gaps: 1 }),
  buildSampleReport('29', 'Dr. Lee', 'Population Dynamics', '2026-05-02', { coverage: 96, clarity: 93, engagement: 91, assessment: 88, gaps: 1 }),
  buildSampleReport('30', 'Dr. Lee', 'Biology Review Seminar', '2026-05-16', { coverage: 96, clarity: 94, engagement: 92, assessment: 89, gaps: 1 }),
];

export function buildSampleAnalysisReports() {
  return sampleReports.map((report) => {
    const teacherId = SAMPLE_TEACHER_IDS[report.teacher as keyof typeof SAMPLE_TEACHER_IDS] || SAMPLE_PREVIEW_TEACHER_ID;
    return {
      ...report,
      id: `sample-report-${report.id}`,
      user_id: teacherId,
      teacher_name: report.teacher,
      created_at: `${report.date}T14:00:00.000Z`,
      coverage_score: report.coverage,
      clarity_rating: report.clarity,
      engagement_level: report.engagement,
      assessment_quality: report.assessment,
      gaps_detected: report.gaps,
      result: getSampleAnalysisNarrative(report, report.teacher),
      analysis_result: getSampleAnalysisNarrative(report, report.teacher),
      transcript: getSampleTranscript(report, report.teacher),
    } satisfies AnalysisReport;
  });
}

export function buildTeacherDashboardSampleReports(teacherDisplayName: string) {
  return sampleReports.slice(0, 10).map((report) => ({
    ...report,
    id: `sample-report-${report.id}`,
    user_id: SAMPLE_PREVIEW_TEACHER_ID,
    teacher_name: teacherDisplayName,
    created_at: `${report.date}T14:00:00.000Z`,
    coverage_score: report.coverage,
    clarity_rating: report.clarity,
    engagement_level: report.engagement,
    assessment_quality: report.assessment,
    gaps_detected: report.gaps,
    result: getSampleAnalysisNarrative(report, teacherDisplayName),
    analysis_result: getSampleAnalysisNarrative(report, teacherDisplayName),
    transcript: getSampleTranscript(report, teacherDisplayName),
  } satisfies AnalysisReport));
}

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

export function sortReportsNewestFirst(reports: AnalysisReport[]) {
  return [...reports].sort((a, b) => (b.date ?? b.created_at ?? '').localeCompare(a.date ?? a.created_at ?? ''));
}

export function getLatestLessonTrend(reports: AnalysisReport[]) {
  const sortedReports = sortReportsNewestFirst(reports);
  if (sortedReports.length < 2) return 0;
  return calculateLessonScore(sortedReports[0]) - calculateLessonScore(sortedReports[1]);
}
