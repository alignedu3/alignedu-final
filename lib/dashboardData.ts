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

export function calculateLessonScore(report: LessonReport): number {
  const weighted =
    report.coverage * 0.35 +
    report.clarity * 0.30 +
    report.engagement * 0.20 +
    report.assessment * 0.15;

  const gapPenalty = report.gaps * 2;
  const finalScore = Math.max(0, Math.min(100, Math.round(weighted - gapPenalty)));

  return finalScore;
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function getDashboardSummary(reports: LessonReport[]) {
  const scores = reports.map(calculateLessonScore);

  return {
    lessonsAnalyzed: reports.length,
    averageScore: average(scores),
    averageCoverage: average(reports.map(r => r.coverage)),
    averageClarity: average(reports.map(r => r.clarity)),
    averageEngagement: average(reports.map(r => r.engagement)),
    averageAssessment: average(reports.map(r => r.assessment)),
    totalGaps: reports.reduce((sum, r) => sum + r.gaps, 0),
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

export function getTrendData(reports: LessonReport[]) {
  return [...reports]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(report => ({
      date: report.date,
      score: calculateLessonScore(report),
      coverage: report.coverage,
      clarity: report.clarity,
      engagement: report.engagement,
      assessment: report.assessment,
    }));
}
