import { STAAR_SUBJECTS } from '@/lib/staarSubjects';
import { parseAnalysisMetrics, parseFeedbackSections, type ReportSection } from '@/lib/analysisReport';
import { getRelatedTEKSStandards, getTEKSStandards, type TEKSStandard } from '@/lib/teksStandards';

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

export type AdminSupportPlan = {
  teacherId?: string;
  teacherName: string;
  summary: string;
  priorityReason: string;
  adminAction: string;
  lookFors: string[];
  followUpTimeline: string;
  supportPriorityScore?: number;
  requiresPrioritySupport?: boolean;
};

export const SAMPLE_PREVIEW_TEACHER_ID = 'sample-teacher-1';
export const SAMPLE_TEACHER_IDS = {
  'Ms. Carter': 'sample-teacher-1',
  'Mr. Evans': 'sample-teacher-2',
  'Dr. Lee': 'sample-teacher-3',
} as const;

function normalizeGradeLabel(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  const numericMatch = trimmed.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade)?$/);
  if (numericMatch) {
    return numericMatch[1];
  }

  const wordMap: Record<string, string> = {
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

  return wordMap[trimmed] || trimmed;
}

function normalizeSubjectLabel(value: string) {
  return value.trim().toLowerCase();
}

export function isSTAARTestedLesson(report: AnalysisReport | LessonReport) {
  const reportGrade = normalizeGradeLabel(String(report.grade || ''));
  const reportSubject = normalizeSubjectLabel(String(report.subject || ''));

  return STAAR_SUBJECTS.some(
    ({ grade, subject }) =>
      normalizeGradeLabel(grade) === reportGrade &&
      normalizeSubjectLabel(subject) === reportSubject
  );
}

export function getTEKSCoverageInsights(report: AnalysisReport) {
  if (!isSTAARTestedLesson(report)) return null;

  const metrics = getLessonMetrics(report);
  const { standards, overview, found } = getTEKSStandards(String(report.grade || ''), String(report.subject || ''));
  const relatedStandards = found
    ? getRelatedTEKSStandards(
        String(report.grade || ''),
        String(report.subject || ''),
        `${report.title || ''} ${report.result || report.analysis_result || ''}`,
        { limit: 3 }
      )
    : [];
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (metrics.coverage >= 88) {
    strengths.push('The lesson stays tightly aligned to the assessed standard and keeps students focused on the intended content.');
  } else if (metrics.coverage >= 78) {
    strengths.push('The lesson addresses the core standard, but tighter emphasis on the assessed outcome would strengthen coherence.');
  } else {
    gaps.push('The assessed standard needs more explicit emphasis so the lesson is unmistakably anchored to the TEKS target.');
  }

  if (metrics.clarity >= 85) {
    strengths.push('Teacher explanations make the standard accessible and help students understand what success looks like.');
  } else {
    gaps.push('Clarify the academic target with sharper modeling, success criteria, and more explicit vocabulary tied to the TEKS.');
  }

  if (metrics.assessment >= 80) {
    strengths.push('Checks for understanding provide useful evidence of whether students are on track with the intended standard.');
  } else {
    gaps.push('Add a stronger formative check aligned to the TEKS so mastery is measured before students move on.');
  }

  if (metrics.gaps > 0) {
    gaps.push(`Revisit the ${metrics.gaps} identified content gap${metrics.gaps === 1 ? '' : 's'} to improve STAAR readiness and reduce unfinished understanding.`);
  }

  const readinessSummary =
    metrics.score >= 85
      ? 'TEKS alignment and lesson execution suggest strong readiness for continued standards-based instruction.'
      : metrics.score >= 75
        ? 'TEKS coverage is on track, but the lesson would benefit from stronger precision and more explicit mastery evidence.'
        : 'TEKS coverage needs tighter alignment, clearer delivery, and stronger checks for mastery to support readiness.';

  return {
    overview,
    standards: found ? (relatedStandards.length ? relatedStandards : standards.slice(0, 3)) : [],
    hasStandards: found && standards.length > 0,
    strengths,
    gaps,
    readinessSummary,
  };
}

function formatStandardsBlock(standards: TEKSStandard[]) {
  return standards.map((standard) => `  - ${standard.code}: ${standard.description}`);
}

function buildSampleStandardsAlignment(report: LessonReport, improvements: string[]) {
  const topicContext = `${report.title} ${report.subject} ${report.grade}`;
  const covered = getRelatedTEKSStandards(report.grade, report.subject, topicContext, { limit: 3 });
  const reinforcement = getRelatedTEKSStandards(
    report.grade,
    report.subject,
    `${topicContext} ${improvements.join(' ')}`,
    {
      limit: 3,
      excludeCodes: covered.map((standard) => standard.code),
    }
  );
  const notCovered = getRelatedTEKSStandards(
    report.grade,
    report.subject,
    `${topicContext} extension prerequisite application evidence lab analysis`,
    {
      limit: 3,
      excludeCodes: [...covered, ...reinforcement].map((standard) => standard.code),
    }
  );

  return {
    covered,
    reinforcement,
    notCovered,
  };
}

function getSampleAnalysisNarrative(report: LessonReport, teacherDisplayName: string) {
  const score =
    report.coverage * 0.35 +
    report.clarity * 0.3 +
    report.engagement * 0.2 +
    report.assessment * 0.15 -
    report.gaps * 2;

  const scoreBand =
    score >= 88
      ? 'strong and increasingly consistent'
      : score >= 78
        ? 'solid with room to sharpen execution'
        : 'in need of targeted support';

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (report.coverage >= 88) {
    strengths.push('The lesson stayed closely aligned to the intended objective and maintained clear focus on grade-level content.');
  } else {
    improvements.push('Tighten objective alignment so each instructional segment clearly advances the core standard.');
  }

  if (report.clarity >= 85) {
    strengths.push('Teacher explanations and modeling gave students a clear path into the task.');
  } else {
    improvements.push('Strengthen clarity with tighter modeling, clearer exemplars, and more precise success criteria.');
  }

  if (report.engagement >= 82) {
    strengths.push('Students had meaningful response opportunities that supported attention and participation.');
  } else {
    improvements.push('Build in more visible checks for understanding and student response moments during instruction.');
  }

  if (report.assessment >= 78) {
    strengths.push('The lesson included useful evidence of learning before students moved on.');
  } else {
    improvements.push('Add a stronger formative check before independent work or closure to confirm mastery.');
  }

  if (report.gaps >= 3) {
    improvements.push('Revisit unfinished content and close conceptual gaps before progressing to the next lesson sequence.');
  }

  const sampleContentGaps =
    report.gaps > 0
      ? [
          `Students need a clearer explanation of how ${report.title.toLowerCase()} connects to the unit’s core biology concepts and vocabulary.`,
          'The lesson needs a stronger bridge from teacher modeling to independent student explanation or application.',
          'A more explicit mastery check is needed so misconceptions are identified before the lesson closes.',
          'Students should revisit the prerequisite concept knowledge needed to fully understand the day’s content.',
          'The lesson should more clearly connect the observed task to the assessed biology standard or course expectation.',
        ].slice(0, report.gaps)
      : ['No major content gaps identified.'];

  const standardsAlignment = buildSampleStandardsAlignment(report, improvements);

  return [
    'Metrics:',
    `Instructional Score (0-100): ${Math.max(0, Math.min(100, Math.round(score)))}`,
    `Coverage (0-100): ${report.coverage}`,
    `Clarity (0-100): ${report.clarity}`,
    `Engagement (0-100): ${report.engagement}`,
    `Assessment Quality (0-100): ${report.assessment}`,
    `Gaps Flagged: ${report.gaps}`,
    '',
    '=== EXECUTIVE SUMMARY ===',
    `${teacherDisplayName}'s ${report.title.toLowerCase()} lesson was ${scoreBand}. The strongest evidence came from coverage, clarity, engagement, and how consistently the lesson checked for understanding before moving students forward.`,
    '',
    '=== WHAT WENT WELL ===',
    ...strengths.map((item) => `- ${item}`),
    '',
    '=== WHAT CAN IMPROVE ===',
    ...improvements.map((item) => `- ${item}`),
    '',
    '=== CONTENT GAPS TO REINFORCE ===',
    ...sampleContentGaps.map((item, index) => `${index + 1}. ${item}`),
    '',
    '=== RECOMMENDED NEXT STEP ===',
    `${teacherDisplayName} should continue building on what worked while focusing next on stronger mastery checks, tighter closure, and clear evidence that students can independently demonstrate understanding by the end of the lesson.`,
    '',
    '=== INSTRUCTIONAL COACHING FEEDBACK ===',
    `- Key Findings: Coverage indicates ${report.coverage}% alignment to the lesson objective and intended content focus.`,
    `- Missed Opportunities: ${report.clarity >= 85 ? 'Push for deeper student ownership and independent reasoning.' : 'Tighten modeling and explanation so students see exactly what success looks like.'}`,
    `- Student Engagement Signals: Engagement was rated at ${report.engagement}%, reflecting ${report.engagement >= 82 ? 'active student participation during the lesson' : 'limited student response opportunities that should be strengthened'}.`,
    `- Suggested Next Steps: ${report.assessment >= 78 ? 'Keep the current structure and strengthen the final mastery check.' : 'Add a stronger formative check before closure to confirm student understanding.'}`,
    '',
    '=== STAAR TEKS COVERAGE ===',
    `- Readiness Summary: The lesson is ${report.coverage >= 88 ? 'strongly aligned' : 'partially aligned'} to the assessed Biology standard for this course sequence.`,
    '- Standards Reinforced:',
    ...formatStandardsBlock(standardsAlignment.covered),
    '- Standards That Need Stronger Assessment Evidence:',
    ...formatStandardsBlock(standardsAlignment.reinforcement),
    `- STAAR Readiness Recommendation: ${report.coverage >= 88 ? 'Maintain strong standards alignment while deepening independent student evidence.' : 'Tighten the connection between instruction, practice, and the assessed TEKS expectation.'}`,
    '',
    '=== TEXAS TEKS STANDARDS ALIGNMENT ===',
    '- Covered in the Lesson:',
    ...formatStandardsBlock(standardsAlignment.covered),
    '- Needs Reinforcement:',
    ...formatStandardsBlock(standardsAlignment.reinforcement),
    '- Not Covered in the Lesson:',
    ...formatStandardsBlock(standardsAlignment.notCovered),
    '- Standards Mastery Notes: Students engaged with the central biology concept, but the strongest mastery evidence appeared when the lesson required precise academic language, explanation, or transfer beyond the modeled example.',
    '- Recommended Standards Follow-Up: Revisit one reinforcement TEKS in the next lesson with a brief written or verbal mastery check, then add one not-covered TEKS as an application or extension task so students connect the concept to broader course expectations.',
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
    grade: '9',
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
  buildSampleReport('11', 'Mr. Evans', 'Introduction to Ecosystems', '2026-01-08', { coverage: 69, clarity: 65, engagement: 63, assessment: 57, gaps: 4 }),
  buildSampleReport('12', 'Mr. Evans', 'Food Webs and Energy Flow', '2026-01-22', { coverage: 71, clarity: 67, engagement: 64, assessment: 58, gaps: 4 }),
  buildSampleReport('13', 'Mr. Evans', 'DNA and Inheritance', '2026-02-05', { coverage: 72, clarity: 68, engagement: 65, assessment: 59, gaps: 4 }),
  buildSampleReport('14', 'Mr. Evans', 'Natural Selection', '2026-02-19', { coverage: 70, clarity: 66, engagement: 63, assessment: 57, gaps: 4 }),
  buildSampleReport('15', 'Mr. Evans', 'Protein Synthesis', '2026-03-05', { coverage: 73, clarity: 69, engagement: 66, assessment: 60, gaps: 3 }),
  buildSampleReport('16', 'Mr. Evans', 'Ecological Change Over Time', '2026-03-19', { coverage: 74, clarity: 70, engagement: 67, assessment: 61, gaps: 3 }),
  buildSampleReport('17', 'Mr. Evans', 'Genetic Variation', '2026-04-02', { coverage: 75, clarity: 71, engagement: 68, assessment: 62, gaps: 3 }),
  buildSampleReport('18', 'Mr. Evans', 'Scientific Modeling', '2026-04-16', { coverage: 74, clarity: 70, engagement: 67, assessment: 61, gaps: 3 }),
  buildSampleReport('19', 'Mr. Evans', 'Population Dynamics', '2026-04-30', { coverage: 76, clarity: 72, engagement: 69, assessment: 63, gaps: 2 }),
  buildSampleReport('20', 'Mr. Evans', 'Biology Review Seminar', '2026-05-14', { coverage: 77, clarity: 73, engagement: 70, assessment: 64, gaps: 2 }),
  buildSampleReport('21', 'Dr. Lee', 'Enzymes', '2026-01-10', { coverage: 88, clarity: 86, engagement: 84, assessment: 79, gaps: 1 }),
  buildSampleReport('22', 'Dr. Lee', 'Cellular Respiration', '2026-01-24', { coverage: 89, clarity: 87, engagement: 85, assessment: 80, gaps: 1 }),
  buildSampleReport('23', 'Dr. Lee', 'Genetic Variation', '2026-02-07', { coverage: 90, clarity: 88, engagement: 86, assessment: 81, gaps: 1 }),
  buildSampleReport('24', 'Dr. Lee', 'Scientific Modeling', '2026-02-21', { coverage: 91, clarity: 89, engagement: 86, assessment: 82, gaps: 1 }),
  buildSampleReport('25', 'Dr. Lee', 'Protein Synthesis', '2026-03-07', { coverage: 92, clarity: 90, engagement: 88, assessment: 84, gaps: 1 }),
  buildSampleReport('26', 'Dr. Lee', 'Ecological Change Over Time', '2026-03-21', { coverage: 91, clarity: 89, engagement: 87, assessment: 83, gaps: 1 }),
  buildSampleReport('27', 'Dr. Lee', 'Adaptation and Survival', '2026-04-04', { coverage: 93, clarity: 91, engagement: 89, assessment: 85, gaps: 1 }),
  buildSampleReport('28', 'Dr. Lee', 'Scientific Argumentation', '2026-04-18', { coverage: 92, clarity: 90, engagement: 88, assessment: 84, gaps: 1 }),
  buildSampleReport('29', 'Dr. Lee', 'Population Dynamics', '2026-05-02', { coverage: 94, clarity: 92, engagement: 90, assessment: 86, gaps: 1 }),
  buildSampleReport('30', 'Dr. Lee', 'Biology Review Seminar', '2026-05-16', { coverage: 93, clarity: 91, engagement: 89, assessment: 85, gaps: 1 }),
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

function normalizeInsightText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeInsightList(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = normalizeInsightText(item);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function splitContentIntoThoughts(value: string) {
  return cleanInsightText(value)
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanInsightText(value: string) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/^[\s\-•*0-9.]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksTruncated(value: string) {
  const text = cleanInsightText(value);
  if (!text) return true;
  const lastToken = text.split(/\s+/).at(-1) || '';
  return text.length < 28 || (!/[.!?]$/.test(text) && lastToken.length <= 2);
}

function normalizeInsightItems(items: string[]) {
  return dedupeInsightList(
    items
      .map(cleanInsightText)
      .filter((item) => item && !looksTruncated(item))
  );
}

function getCoachingSectionItems(report: AnalysisReport, title: string) {
  const parsed = parseFeedbackSections(report.result || report.analysis_result || '');
  const section = parsed.coaching.find((entry) => entry.title === title);
  if (!section) return [];

  return normalizeInsightItems([
    ...section.bullets,
    ...splitContentIntoThoughts(section.content),
  ]);
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
  const parsedMetrics = parseAnalysisMetrics(report.result || report.analysis_result || '');
  const storedCoverage = toNumberMetric(report.coverage ?? report.coverage_score, parsedMetrics.coverage ?? 75);
  const storedClarity = toNumberMetric(report.clarity ?? report.clarity_rating, parsedMetrics.clarity ?? 75);
  const storedEngagement = toNumberMetric(report.engagement ?? report.engagement_level, parsedMetrics.engagement ?? 75);
  const storedAssessment = toNumberMetric(report.assessment ?? report.assessment_quality, parsedMetrics.assessment ?? 75);
  const storedGaps = toNumberMetric(report.gaps ?? report.gaps_detected, parsedMetrics.gaps ?? 0);
  const storedLooksLikeFallbackDefaults =
    storedCoverage === 75 &&
    storedClarity === 75 &&
    storedEngagement === 75 &&
    storedAssessment === 75 &&
    storedGaps <= 1 &&
    (parsedMetrics.coverage !== null ||
      parsedMetrics.clarity !== null ||
      parsedMetrics.engagement !== null ||
      parsedMetrics.assessment !== null ||
      parsedMetrics.gaps !== null);
  const fallbackScore = parsedMetrics.score ?? calculateLessonScore(report);

  return {
    score: toNumberMetric(report.score, fallbackScore),
    coverage: storedLooksLikeFallbackDefaults ? (parsedMetrics.coverage ?? storedCoverage) : storedCoverage,
    clarity: storedLooksLikeFallbackDefaults ? (parsedMetrics.clarity ?? storedClarity) : storedClarity,
    engagement: storedLooksLikeFallbackDefaults ? (parsedMetrics.engagement ?? storedEngagement) : storedEngagement,
    assessment: storedLooksLikeFallbackDefaults ? (parsedMetrics.assessment ?? storedAssessment) : storedAssessment,
    gaps: storedLooksLikeFallbackDefaults ? (parsedMetrics.gaps ?? storedGaps) : storedGaps,
  };
}

export function getLessonInsights(report: AnalysisReport) {
  const metrics = getLessonMetrics(report);
  const parsed = parseFeedbackSections(report.result || report.analysis_result || '');
  const aiKeyFindingsSection = parsed.coaching.find((section) => section.title === 'Key Findings');
  const aiFindings = dedupeInsightList([
    ...(aiKeyFindingsSection?.bullets || []),
    ...(aiKeyFindingsSection?.content
      ? aiKeyFindingsSection.content
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
      : []),
  ]);
  const parsedStrengths = normalizeInsightItems(parsed.whatWentWell);
  const parsedImprovements = normalizeInsightItems(parsed.whatCanImprove);
  const coachingKeyFindings = getCoachingSectionItems(report, 'Key Findings');
  const coachingMissedOpportunities = getCoachingSectionItems(report, 'Missed Opportunities');
  const coachingSuggestedNextSteps = getCoachingSectionItems(report, 'Suggested Next Steps');
  const findings: string[] = [];
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (metrics.score >= 80) {
    findings.push('Overall lesson quality is strong with consistent instructional delivery.');
    strengths.push('The lesson shows solid overall instructional quality with evidence of coherent delivery.');
  } else {
    findings.push('Overall lesson quality is below target and needs targeted refinement.');
    improvements.push('Raise the overall lesson quality by tightening instruction, checking for understanding, and reinforcing closure.');
  }

  if (metrics.coverage >= 80) {
    findings.push('Standards coverage is strong and aligned to lesson goals.');
    strengths.push('Standards coverage is aligned to the lesson objective and supports the intended learning target.');
  } else {
    findings.push('Standards coverage is light; prioritize explicit alignment to objectives.');
    improvements.push('Strengthen standards alignment so the lesson objective is reinforced in modeling, practice, and closure.');
  }

  if (metrics.clarity >= 80) {
    findings.push('Explanations are clear and sequencing supports student understanding.');
    strengths.push('Explanations and sequencing support understanding and reduce confusion for students.');
  } else {
    findings.push('Instructional clarity can improve with tighter modeling and checks for understanding.');
    improvements.push('Improve clarity with tighter modeling, clearer examples, and better checks for understanding.');
  }

  if (metrics.engagement >= 80) {
    findings.push('Student engagement appears high with active participation opportunities.');
    strengths.push('Students had visible opportunities to participate and stay engaged with the content.');
  } else {
    findings.push('Engagement is limited; add more interaction and response moments during instruction.');
    improvements.push('Increase student response opportunities so engagement is visible throughout the lesson.');
  }

  if (metrics.assessment >= 80) {
    strengths.push('Formative assessment moves provided useful evidence of student understanding before moving on.');
  } else {
    improvements.push('Add stronger formative checks before independent work or closure to confirm mastery.');
  }

  if (metrics.gaps > 0) {
    findings.push(`Detected ${metrics.gaps} gap${metrics.gaps === 1 ? '' : 's'} that should be revisited for mastery.`);
    improvements.push(`Address the ${metrics.gaps} identified gap${metrics.gaps === 1 ? '' : 's'} with reteach and a quick mastery check.`);
  } else {
    findings.push('No major concept gaps were detected in this lesson evidence.');
    strengths.push('No major concept gaps were detected in the available lesson evidence.');
  }

  const nextAction =
    cleanInsightText(parsed.recommendedNextStep) ||
    coachingSuggestedNextSteps[0] ||
    parsedImprovements[0] ||
    (metrics.gaps > 0
      ? `Reteach the most important missed concept from this lesson, then end with a brief check that shows whether students can explain it independently.`
      : 'Keep the strongest instructional move from this lesson and add one sharper understanding check before the lesson closes.');

  const summary =
    metrics.score >= 85
      ? 'High-performing lesson with clear evidence of strong instructional moves.'
      : metrics.score >= 75
        ? 'Solid lesson with room to sharpen execution and mastery checks.'
        : 'Lesson needs targeted support around clarity, closure, and reinforcement.';

  const celebration =
    strengths[0] ||
    'This lesson includes evidence worth preserving and building on in future instruction.';

  const improvementSummary =
    improvements[0] ||
    'Continue refining execution with stronger checks for understanding and purposeful closure.';

  return {
    ...metrics,
    findings: aiFindings.length > 0 ? aiFindings : dedupeInsightList(findings),
    strengths: parsedStrengths.length > 0 ? parsedStrengths : (coachingKeyFindings.length > 0 ? coachingKeyFindings : strengths),
    improvements: parsedImprovements.length > 0 ? parsedImprovements : (coachingMissedOpportunities.length > 0 ? coachingMissedOpportunities : improvements),
    nextAction,
    summary,
    celebration,
    improvementSummary,
  };
}

export function getLessonReportSections(report: AnalysisReport): {
  executiveSummary: string;
  strengths: string[];
  improvements: string[];
  recommendedNextStep: string;
  contentGaps: string[];
  coaching: ReportSection[];
  teks: ReportSection[];
  staar: ReportSection[];
  submissionContext: ReportSection[];
} {
  const parsed = parseFeedbackSections(report.result || report.analysis_result || '');
  const insights = getLessonInsights(report);
  const parsedStrengths = normalizeInsightItems(parsed.whatWentWell);
  const parsedImprovements = normalizeInsightItems(parsed.whatCanImprove);
  const recommendedNextStep = cleanInsightText(parsed.recommendedNextStep);

  return {
    executiveSummary: parsed.executiveSummary || insights.summary,
    strengths: parsedStrengths.length ? parsedStrengths : insights.strengths,
    improvements: parsedImprovements.length ? parsedImprovements : insights.improvements,
    recommendedNextStep: recommendedNextStep || insights.nextAction,
    contentGaps: parsed.contentGaps.flatMap((section) => {
      if (section.bullets.length > 0) return section.bullets;
      return section.content
        ? section.content
            .split(/\n+/)
            .map((line) => line.replace(/^[0-9]+\.\s*/, '').trim())
            .filter(Boolean)
        : [];
    }),
    coaching: parsed.coaching,
    teks: parsed.teks,
    staar: parsed.staar,
    submissionContext: parsed.submissionContext,
  };
}

export function buildAdminSupportPlanForTeacher(
  teacherName: string,
  reports: AnalysisReport[],
  teacherId?: string
): AdminSupportPlan | null {
  if (!reports.length) return null;

  const sortedReports = sortReportsNewestFirst(reports);
  const latestReport = sortedReports[0];
  const latestMetrics = getLessonMetrics(latestReport);
  const trend = getLatestLessonTrend(sortedReports);
  const reportSections = getLessonReportSections(latestReport);

  const weakestDomain = [
    { key: 'coverage', label: 'standards alignment', value: latestMetrics.coverage },
    { key: 'clarity', label: 'instructional clarity', value: latestMetrics.clarity },
    { key: 'engagement', label: 'student engagement', value: latestMetrics.engagement },
    { key: 'assessment', label: 'checks for understanding', value: latestMetrics.assessment },
  ].sort((a, b) => a.value - b.value)[0];

  const trendMagnitude = Math.abs(trend);
  const trendText =
    trend < 0
      ? `the latest lesson declined by ${trendMagnitude} point${trendMagnitude === 1 ? '' : 's'} from the previous lesson`
      : trend > 0
        ? `the latest lesson improved by ${trendMagnitude} point${trendMagnitude === 1 ? '' : 's'} from the previous lesson`
        : 'the latest lesson held steady compared with the previous lesson';

  const supportPriorityScore =
    Math.max(0, 78 - latestMetrics.score) +
    Math.max(0, 76 - weakestDomain.value) +
    latestMetrics.gaps * 6 +
    (trend < 0 ? Math.min(12, trendMagnitude * 2) : 0);

  const requiresPrioritySupport =
    latestMetrics.score < 75 ||
    weakestDomain.value < 72 ||
    latestMetrics.gaps >= 2 ||
    trend <= -4 ||
    (latestMetrics.score < 78 && latestMetrics.gaps > 0 && weakestDomain.value < 74);

  const priorityReason =
    latestMetrics.gaps > 0
      ? `${teacherName} is the priority because the most recent lesson still showed ${latestMetrics.gaps} content gap${latestMetrics.gaps === 1 ? '' : 's'} and ${weakestDomain.label} remains the clearest support need.`
      : `${teacherName} is the priority because ${weakestDomain.label} remains the clearest support need in the most recent lesson.`;

  const adminAction =
    reportSections.recommendedNextStep
      ? `Use the next planning touchpoint to coach ${teacherName} on ${weakestDomain.label}, then anchor the follow-up observation to this next step: ${reportSections.recommendedNextStep}`
      : `Use the next planning touchpoint to coach ${teacherName} on ${weakestDomain.label} and preview one concrete move before the next lesson.`;

  const lookFors = [
    weakestDomain.key === 'coverage'
      ? 'The lesson objective and modeled work stay tightly aligned to the target standard.'
      : weakestDomain.key === 'clarity'
        ? 'Directions, exemplars, and success criteria are explicitly modeled before students work independently.'
        : weakestDomain.key === 'engagement'
          ? 'Students have visible response opportunities and are asked to explain their thinking during instruction.'
          : 'The teacher uses a clear mastery check before closure and responds to misconceptions before moving on.',
    latestMetrics.gaps > 0
      ? `Previously flagged gaps are revisited and checked for mastery before the lesson closes.`
      : 'Students can demonstrate understanding before the lesson ends.',
    trend < 0
      ? 'The teacher follows the agreed coaching move consistently from the start of the lesson.'
      : 'The targeted support move is visible and strengthens overall lesson coherence.',
  ];

  const followUpTimeline =
    latestMetrics.score < 70 || latestMetrics.gaps >= 3
      ? 'Follow up within 5 instructional days.'
      : 'Follow up within 7 to 10 instructional days.';

  const summary =
    `${teacherName} needs targeted support in ${weakestDomain.label}. The latest lesson scored ${latestMetrics.score}/100, with ${weakestDomain.label} at ${weakestDomain.value}/100. ${trendText}.`;

  return {
    teacherId,
    teacherName,
    summary,
    priorityReason,
    adminAction,
    lookFors,
    followUpTimeline,
    supportPriorityScore,
    requiresPrioritySupport,
  };
}

export function getDashboardSummary(reports: AnalysisReport[]) {
  const metrics = reports.map(getLessonMetrics);
  const scores = metrics.map((metric) => metric.score);

  return {
    lessonsAnalyzed: reports.length,
    averageScore: average(scores),
    averageCoverage: average(metrics.map((metric) => metric.coverage)),
    averageClarity: average(metrics.map((metric) => metric.clarity)),
    averageEngagement: average(metrics.map((metric) => metric.engagement)),
    averageAssessment: average(metrics.map((metric) => metric.assessment)),
    totalGaps: metrics.reduce((sum, metric) => sum + metric.gaps, 0),
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
    .map(report => {
      const metrics = getLessonMetrics(report);
      return {
      date: report.date ?? report.created_at?.slice(0, 10),
      score: metrics.score,
      coverage: metrics.coverage,
      clarity: metrics.clarity,
      engagement: metrics.engagement,
      assessment: metrics.assessment,
    };
    });
}

export function sortReportsNewestFirst(reports: AnalysisReport[]) {
  return [...reports].sort((a, b) => (b.date ?? b.created_at ?? '').localeCompare(a.date ?? a.created_at ?? ''));
}

export function getLatestLessonTrend(reports: AnalysisReport[]) {
  const sortedReports = sortReportsNewestFirst(reports);
  if (sortedReports.length < 2) return 0;
  return getLessonMetrics(sortedReports[0]).score - getLessonMetrics(sortedReports[1]).score;
}
