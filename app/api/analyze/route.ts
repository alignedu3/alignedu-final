import OpenAI from "openai";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { after } from "next/server";
import { formatTEKSForPrompt, getPrimaryTEKSStandards, getRelatedTEKSStandards, getTEKSStandards } from "@/lib/teksStandards";
import { STAAR_SUBJECTS } from "@/lib/staarSubjects";
import { getAdminVisibility } from "@/lib/adminVisibility";
import { getHigherEdBiologyObjectivesForChapter } from "@/lib/higherEdBiologyObjectives";
import { normalizeStructuredReportText, parseFeedbackSections } from "@/lib/analysisReport";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/errorHandling";

const BIOLOGY_GAP_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "during",
  "needs",
  "need",
  "more",
  "most",
  "much",
  "very",
  "clear",
  "clearer",
  "clearly",
  "stronger",
  "strong",
  "better",
  "fully",
  "thoroughly",
  "thorough",
  "detail",
  "detailed",
  "deeper",
  "depth",
  "concept",
  "concepts",
  "idea",
  "ideas",
  "lesson",
  "recording",
  "class",
  "teacher",
  "student",
  "students",
  "process",
  "processes",
  "function",
  "functions",
  "role",
  "roles",
  "difference",
  "differences",
  "specific",
  "important",
  "importance",
  "mechanism",
  "mechanisms",
  "relation",
  "relationship",
  "adequately",
  "underdeveloped",
  "explained",
  "explanation",
  "covered",
  "addressed",
  "mentioned",
  "taught",
  "include",
  "including",
  "understanding",
  "overall",
  "particularly",
  "could",
  "would",
  "should",
  "still",
  "about",
  "their",
  "they",
  "them",
  "were",
  "was",
  "what",
  "when",
  "where",
  "how",
  "why",
  "then",
  "than",
  "also",
  "just",
  "only",
  "through",
  "across",
  "each",
  "between",
  "into",
  "your",
  "have",
  "has",
  "had",
]);

const BIOLOGY_PRIORITY_TOKENS = new Set([
  "dna",
  "rna",
  "mrna",
  "trna",
  "rrna",
  "gene",
  "genes",
  "genetic",
  "genetics",
  "protein",
  "proteins",
  "codon",
  "codons",
  "amino",
  "acid",
  "acids",
  "transcription",
  "translation",
  "transcribe",
  "translate",
  "promoter",
  "terminator",
  "polymerase",
  "ribosome",
  "ribosomes",
  "mutation",
  "mutations",
  "mutate",
  "processing",
  "splice",
  "splicing",
  "introns",
  "exons",
  "eukaryotic",
  "eukaryote",
  "eukaryotes",
  "prokaryotic",
  "prokaryote",
  "prokaryotes",
  "nucleotide",
  "nucleotides",
  "genome",
  "chromosome",
  "chromosomes",
  "replication",
  "enzyme",
  "enzymes",
  "peptide",
  "polypeptide",
]);

const HIGHER_ED_BIOLOGY_CONCEPT_CHECKS = [
  {
    label: "mRNA",
    aliases: ["mrna", "messenger rna"],
    support: ["message", "copy", "template", "codon", "transcript", "protein"],
  },
  {
    label: "tRNA",
    aliases: ["trna", "transfer rna"],
    support: ["amino", "acid", "anticodon", "ribosome", "carry", "brings", "bring"],
  },
  {
    label: "rRNA",
    aliases: ["rrna", "ribosomal rna"],
    support: ["ribosome", "ribosomal", "structure", "component", "peptide", "cataly"],
  },
  {
    label: "coding strand",
    aliases: ["coding strand"],
    support: ["template", "dna", "strand"],
  },
  {
    label: "template strand",
    aliases: ["template strand"],
    support: ["coding", "dna", "strand"],
  },
  {
    label: "mutations",
    aliases: ["mutation", "mutations"],
    support: ["protein", "amino", "change", "effect", "impact", "sequence"],
  },
  {
    label: "start and stop codons",
    aliases: ["start codon", "stop codon", "start and stop codons", "codons"],
    support: ["translation", "protein", "amino", "ribosome"],
  },
] as const;

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable in server runtime.");
    throw new Error("Server configuration error: OPENAI_API_KEY is not set.");
  }
  if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
    console.error("Malformed OPENAI_API_KEY environment variable in server runtime.");
    throw new Error("Server configuration error: OPENAI_API_KEY appears malformed.");
  }
  return apiKey;
}

function createOpenAIClient() {
  return new OpenAI({ apiKey: getOpenAIKey() });
}

const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const LONG_AUDIO_TRANSCRIPTION_MODEL = "whisper-1";
const TRANSCRIPTION_CONCURRENCY = 4;
const LONG_AUDIO_WHISPER_THRESHOLD_SECONDS = 40 * 60;

type WorkflowProgress = {
  percent: number;
  step: string;
};

type AnalysisWorkflowInput = {
  targetUserId: string;
  observedTeacherId: string;
  observedTeacherName: string;
  callerProfileName: string;
  grade: string;
  subject: string;
  book: string;
  chapter: string;
  lectureText: string;
  waitTimeEvidence: string;
  audioDuration?: number;
  files: File[];
  onProgress?: (progress: WorkflowProgress) => Promise<void> | void;
};

type AnalysisWorkflowOutput = {
  result: string;
  transcript: string;
  score: number;
  metrics: {
    score: number;
    coverage: number;
    clarity: number;
    engagement: number;
    assessment: number;
    gaps: number;
  };
  analysisId: string | null;
  saved: boolean;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type TranscriptionProgress = {
  completed: number;
  index: number;
  total: number;
};

function selectTranscriptionModel(audioDurationSeconds?: number, fileCount = 0) {
  if (
    (typeof audioDurationSeconds === "number" && audioDurationSeconds >= LONG_AUDIO_WHISPER_THRESHOLD_SECONDS) ||
    fileCount >= 40
  ) {
    return LONG_AUDIO_TRANSCRIPTION_MODEL;
  }

  return DEFAULT_TRANSCRIPTION_MODEL;
}

function safeJson<T>(data: T, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function buildCoverageCalibrationContext(params: {
  hasStandards: boolean;
  isHigherEdBiology: boolean;
  isHigherEdCustomText: boolean;
  grade: string;
  subject: string;
  chapter: string;
  book: string;
  primaryPromptStandards: Array<{ code: string; description: string }>;
  relatedPromptStandards: Array<{ code: string; description: string }>;
  matchedBiologyObjectives: string[];
}) {
  const {
    hasStandards,
    isHigherEdBiology,
    isHigherEdCustomText,
    chapter,
    book,
    primaryPromptStandards,
    relatedPromptStandards,
    matchedBiologyObjectives,
  } = params;

  const rubric = `Coverage scoring rubric:
- 95-100: Nearly all priority lesson targets for this chapter/objective set or TEKS set were taught accurately and with strong completeness.
- 85-94: Most priority targets were covered well, with only minor omissions or thin spots.
- 70-84: The lesson covered the core target, but multiple important subtopics, distinctions, or standard elements remained partial, thin, or deferred.
- 50-69: Only part of the intended target set was covered; several key concepts or required elements were not developed enough.
- 30-49: Limited coverage of what was supposed to be taught.
- 0-29: The lesson was largely off-target from the intended chapter/objective or standards set.`;

  if (isHigherEdBiology) {
    return `${rubric}

For Higher Ed Biology, score Coverage against what should reasonably be taught for ${chapter || "the selected Campbell Biology chapter"} and these matched course objective(s):
${matchedBiologyObjectives.length ? matchedBiologyObjectives.map((objective) => `- ${objective}`).join("\n") : "- No matched objective available."}

Do not default Coverage to around 70 just because 2 or 3 content gaps appear.
Coverage must reflect how much of the intended chapter/objective content was actually taught across the full lesson, on a true 0-100 scale.`;
  }

  if (isHigherEdCustomText) {
    return `${rubric}

For Higher Ed lessons, score Coverage against the intended textbook target${book ? ` from ${book}` : ""}${chapter ? ` for ${chapter}` : ""}.
Do not default Coverage to around 70 just because a few content gaps appear.`;
  }

  if (hasStandards) {
    return `${rubric}

For school-grade lessons, score Coverage against the intended standards target using the Primary TEKS first and the Related Supporting TEKS second.
Primary TEKS:
${primaryPromptStandards.length ? primaryPromptStandards.map((standard) => `- ${standard.code}: ${standard.description}`).join("\n") : "- None identified."}

Related Supporting TEKS:
${relatedPromptStandards.length ? relatedPromptStandards.map((standard) => `- ${standard.code}: ${standard.description}`).join("\n") : "- None identified."}

Do not default Coverage to around 70 just because 2 or 3 content gaps appear.
Coverage must reflect how much of the intended TEKS set was actually taught, on a true 0-100 scale.`;
  }

  return `${rubric}

Score Coverage based on how completely the intended lesson target was actually taught, not simply on the number of listed gaps.`;
}

function buildMetricCalibrationContext(params: {
  coverageCalibrationContext: string;
}) {
  return `${params.coverageCalibrationContext}

Additional metric calibration:
- Clarity:
  - 90-100: Explanations, modeling, and distinctions were consistently precise and easy to follow.
  - 75-89: Mostly clear, with a few rushed, thin, or less precise moments.
  - 60-74: Understandable in parts, but several explanations or distinctions were incomplete or confusing.
  - Below 60: Students would likely struggle to follow the lesson due to major imprecision or confusion.
- Engagement:
  - 90-100: Students were consistently prompted to think, respond, discuss, or demonstrate understanding.
  - 75-89: Good participation and interaction, though not constant.
  - 60-74: Some engagement was present, but much of the lesson was passive or uneven.
  - Below 60: Little evidence of active student participation.
- Assessment Quality:
  - 90-100: Checks for understanding gave strong evidence of actual mastery.
  - 75-89: Useful checks were present, but not consistently deep or precise.
  - 60-74: Limited or surface-level checks for understanding.
  - Below 60: Little reliable evidence that student understanding was checked.
- Instructional Score:
  - This should reflect the weighted quality of the lesson as a whole, based on Coverage, Clarity, Engagement, and Assessment Quality.
  - Do not anchor Instructional Score or Coverage to the number of gap bullets alone.
  - Use the full 0-100 range when justified by the evidence.`;
}

async function callOpenAI(openai: OpenAI, messages: ChatMessage[]) {
  return await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0,
  });
}

async function callOpenAIMetricsRepair(openai: OpenAI, prompt: string) {
  return await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are repairing a lesson report's score block. Return only the metrics block with integers, no commentary.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  });
}

async function callOpenAISectionRepair(openai: OpenAI, prompt: string) {
  return await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are repairing one missing section in a lesson report. Return only the requested section body, with no heading and no commentary.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  });
}

async function transcribeAudioFiles(
  openai: OpenAI,
  files: File[],
  audioDurationSeconds?: number,
  onChunkComplete?: (progress: TranscriptionProgress) => Promise<void> | void
) {
  if (files.length === 0) {
    return [];
  }

  const transcriptionModel = selectTranscriptionModel(audioDurationSeconds, files.length);
  const responseFormat =
    transcriptionModel === "whisper-1" ? "verbose_json" : "json";
  const transcripts = new Array<string>(files.length).fill("");
  let nextIndex = 0;
  let completed = 0;
  const workerCount = Math.min(TRANSCRIPTION_CONCURRENCY, files.length);

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= files.length) {
        return;
      }

      const transcription = await openai.audio.transcriptions.create({
        file: files[currentIndex],
        model: transcriptionModel,
        response_format: responseFormat,
      });

      transcripts[currentIndex] = String(transcription.text || "").trim();
      completed += 1;

      if (onChunkComplete) {
        await onChunkComplete({
          completed,
          index: currentIndex,
          total: files.length,
        });
      }
    }
  };

  await Promise.all(
    Array.from({ length: workerCount }, () => worker())
  );

  return transcripts
    .map((spokenText, index) =>
      spokenText
        ? `[Transcript chunk ${index + 1} of ${files.length}]\n${spokenText}`
        : ""
    )
    .filter(Boolean);
}

function parseOptionalMetricsFromResult(result: string) {
  const parseMetric = (pattern: RegExp) => {
    const match = result.match(pattern);
    return match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : null;
  };

  return {
    score: parseMetric(/(?:###\s+)?Instructional Score(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i),
    coverage_score: parseMetric(/(?:###\s+)?Coverage(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i),
    clarity_rating: parseMetric(/(?:###\s+)?Clarity(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i),
    engagement_level: parseMetric(/(?:###\s+)?Engagement(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i),
    assessment_quality: parseMetric(/(?:###\s+)?Assessment Quality(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i),
    gaps_detected: (() => {
      const match = result.match(/(?:###\s+)?Gaps[\s]*(?:Flagged)?(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i);
      return match ? Math.max(0, parseInt(match[1], 10)) : null;
    })(),
  };
}

function hasCompleteMetricsBlock(result: string) {
  const metrics = parseOptionalMetricsFromResult(result);
  return Object.values(metrics).every((value) => value !== null);
}

function hasFlatInstructionalMetrics(result: string) {
  const metrics = parseOptionalMetricsFromResult(result);
  const instructionalMetrics = [
    metrics.score,
    metrics.coverage_score,
    metrics.clarity_rating,
    metrics.engagement_level,
    metrics.assessment_quality,
  ];

  if (instructionalMetrics.some((value) => value === null)) {
    return false;
  }

  return new Set(instructionalMetrics).size === 1;
}

function hasSuspiciousDefaultMetrics(metrics: {
  score: number | null;
  coverage_score: number | null;
  clarity_rating: number | null;
  engagement_level: number | null;
  assessment_quality: number | null;
  gaps_detected: number | null;
}) {
  return (
    metrics.score === 75 &&
    metrics.coverage_score === 75 &&
    metrics.clarity_rating === 75 &&
    metrics.engagement_level === 75 &&
    metrics.assessment_quality === 75
  );
}

function shouldRepairMetricsBlock(result: string) {
  const metrics = parseOptionalMetricsFromResult(result);
  return !hasCompleteMetricsBlock(result) || hasFlatInstructionalMetrics(result) || hasSuspiciousDefaultMetrics(metrics);
}

function upsertMetricsBlock(
  reportText: string,
  metrics: {
    score: number;
    coverage_score: number;
    clarity_rating: number;
    engagement_level: number;
    assessment_quality: number;
    gaps_detected: number;
  }
) {
  const normalized = normalizeStructuredReportText(reportText);
  const metricsBlock = buildMetricsBlock(metrics);
  const metricsPattern = /(?:^|\n)Metrics:\n(?:Instructional Score.*\nCoverage.*\nClarity.*\nEngagement.*\nAssessment Quality.*\nGaps Flagged:.*)(?=\n|$)/i;

  if (metricsPattern.test(normalized)) {
    return normalized.replace(metricsPattern, (match) => {
      const hasLeadingNewline = match.startsWith("\n");
      return `${hasLeadingNewline ? "\n" : ""}${metricsBlock}`;
    });
  }

  return `${metricsBlock}\n\n${normalized}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertStructuredSection(
  reportText: string,
  heading: string,
  body: string,
  insertBeforeHeading?: string
) {
  const normalized = normalizeStructuredReportText(reportText);
  const trimmedBody = body.trim();
  if (!trimmedBody) return normalized;

  const sectionBlock = `=== ${heading} ===\n${trimmedBody}`;
  const sectionPattern = new RegExp(
    `===\\s*${escapeRegExp(heading)}\\s*===[\\s\\S]*?(?=\\n===|$)`,
    "i"
  );

  if (sectionPattern.test(normalized)) {
    return normalized.replace(sectionPattern, sectionBlock);
  }

  if (insertBeforeHeading) {
    const insertPattern = new RegExp(`\\n===\\s*${escapeRegExp(insertBeforeHeading)}\\s*===`, "i");
    const match = normalized.match(insertPattern);
    if (match && typeof match.index === "number") {
      return `${normalized.slice(0, match.index).trimEnd()}\n\n${sectionBlock}\n\n${normalized.slice(match.index + 1)}`;
    }
  }

  return `${normalized.trimEnd()}\n\n${sectionBlock}`;
}

function needsWhatWentWellRepair(result: string) {
  const feedbackSections = parseFeedbackSections(result);
  const bullets = feedbackSections.whatWentWell;
  const combinedStrengthText = bullets.join(" ").trim();
  const hasTruncatedBullet = bullets.some((bullet) => {
    const trimmed = bullet.trim();
    if (!trimmed) return true;
    const lastToken = trimmed.split(/\s+/).at(-1) || "";
    return trimmed.length < 40 || (!/[.!?]$/.test(trimmed) && lastToken.length <= 2);
  });

  if (bullets.length >= 3 && !hasTruncatedBullet && combinedStrengthText.length >= 150) {
    return false;
  }

  return true;
}

function needsExecutiveSummaryRepair(result: string) {
  const feedbackSections = parseFeedbackSections(result);
  const summary = feedbackSections.executiveSummary.trim();
  if (!summary) return true;

  const normalized = summary.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const genericPatterns = [
    "lesson needs targeted support around clarity closure and reinforcement",
    "solid lesson with room to sharpen execution and mastery checks",
    "high performing lesson with clear evidence of strong instructional moves",
  ];

  const sentenceCount = summary.split(/(?<=[.!?])\s+/).filter(Boolean).length;
  return summary.length < 80 || summary.length > 260 || sentenceCount > 2 || genericPatterns.some((pattern) => normalized.includes(pattern));
}

function needsWhatCanImproveRepair(result: string) {
  const feedbackSections = parseFeedbackSections(result);
  const bullets = feedbackSections.whatCanImprove.map((bullet) => bullet.trim()).filter(Boolean);

  const genericPatterns = [
    "raise the overall lesson quality by tightening instruction checking for understanding and reinforcing closure",
    "strengthen standards alignment so the lesson objective is reinforced in modeling practice and closure",
    "improve clarity with tighter modeling clearer examples and better checks for understanding",
    "increase student response opportunities so engagement is visible throughout the lesson",
    "add stronger formative checks before independent work or closure to confirm mastery",
  ];

  if (bullets.length < 3) {
    return true;
  }

  const genericCount = bullets.filter((bullet) => {
    const normalized = bullet.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    return genericPatterns.some((pattern) => normalized.includes(pattern));
  }).length;

  return genericCount >= 2;
}

function needsRecommendedNextStepRepair(result: string) {
  const feedbackSections = parseFeedbackSections(result);
  const nextStep = feedbackSections.recommendedNextStep.trim();
  if (!nextStep) return true;

  const normalized = nextStep.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const genericPatterns = [
    "revisit missed concepts strengthen closure and add a quick mastery check before moving on",
    "maintain strong instruction and add deeper checks for understanding to extend rigor",
    "continue building on what worked while focusing next on stronger mastery checks tighter closure and clear evidence that students can independently demonstrate understanding by the end of the lesson",
  ];

  const sentenceCount = nextStep.split(/(?<=[.!?])\s+/).filter(Boolean).length;

  if (nextStep.length < 70 || nextStep.length > 360 || sentenceCount > 3) {
    return true;
  }

  return genericPatterns.some((pattern) => normalized.includes(pattern));
}

function needsContentGapsRepair(result: string) {
  return getContentGapItems(result).length === 0;
}

function getContentGapItems(result: string) {
  const feedbackSections = parseFeedbackSections(result);
  return feedbackSections.contentGaps.flatMap((section) => {
    if (section.bullets.length > 0) return section.bullets;
    return section.content
      ? section.content
          .split(/\n+/)
          .map((line) => line.replace(/^[0-9]+\.\s*/, '').trim())
          .filter(Boolean)
      : [];
  }).filter((item) => {
    const normalized = item.toLowerCase().trim();
    return normalized && normalized !== "no major content gaps identified.";
  });
}

function hasSubstantiveContentGapClaims(result: string) {
  return getContentGapItems(result).length > 0;
}

function needsHigherEdAlignmentRepair(result: string) {
  const feedbackSections = parseFeedbackSections(result);
  return (feedbackSections.higherEdAlignment?.length ?? 0) === 0;
}

function buildMetricsBlock(metrics: {
  score: number;
  coverage_score: number;
  clarity_rating: number;
  engagement_level: number;
  assessment_quality: number;
  gaps_detected: number;
}) {
  return [
    "Metrics:",
    `Instructional Score (0-100): ${metrics.score}`,
    `Coverage (0-100): ${metrics.coverage_score}`,
    `Clarity (0-100): ${metrics.clarity_rating}`,
    `Engagement (0-100): ${metrics.engagement_level}`,
    `Assessment Quality (0-100): ${metrics.assessment_quality}`,
    `Gaps Flagged: ${metrics.gaps_detected}`,
  ].join("\n");
}

function calculateOverallScoreFromMetrics(metrics: {
  coverage_score: number;
  clarity_rating: number;
  engagement_level: number;
  assessment_quality: number;
  gaps_detected: number;
}) {
  const weighted =
    metrics.coverage_score * 0.30 +
    metrics.clarity_rating * 0.25 +
    metrics.engagement_level * 0.25 +
    metrics.assessment_quality * 0.20;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}

function shouldNormalizeReportedScore(metrics: {
  score: number | null;
  coverage_score: number | null;
  clarity_rating: number | null;
  engagement_level: number | null;
  assessment_quality: number | null;
  gaps_detected: number | null;
}) {
  if (
    metrics.score === null ||
    metrics.coverage_score === null ||
    metrics.clarity_rating === null ||
    metrics.engagement_level === null ||
    metrics.assessment_quality === null
  ) {
    return false;
  }

  const calculated = calculateOverallScoreFromMetrics({
    coverage_score: metrics.coverage_score,
    clarity_rating: metrics.clarity_rating,
    engagement_level: metrics.engagement_level,
    assessment_quality: metrics.assessment_quality,
    gaps_detected: metrics.gaps_detected ?? 0,
  });

  const componentValues = [
    metrics.coverage_score,
    metrics.clarity_rating,
    metrics.engagement_level,
    metrics.assessment_quality,
  ];
  const hasDifferentiatedComponents = new Set(componentValues).size > 1;

  if (metrics.score === null) {
    return true;
  }

  return Math.abs(metrics.score - calculated) >= 1 || (hasDifferentiatedComponents && metrics.score === 75);
}

function extractScoreFromResult(result: string): number {
  const parsed = parseOptionalMetricsFromResult(result);
  if (shouldNormalizeReportedScore(parsed)) {
    return calculateOverallScoreFromMetrics({
      coverage_score: parsed.coverage_score as number,
      clarity_rating: parsed.clarity_rating as number,
      engagement_level: parsed.engagement_level as number,
      assessment_quality: parsed.assessment_quality as number,
      gaps_detected: parsed.gaps_detected ?? 0,
    });
  }

  if (parsed.score !== null) {
    return parsed.score;
  }

  if (
    parsed.coverage_score !== null &&
    parsed.clarity_rating !== null &&
    parsed.engagement_level !== null &&
    parsed.assessment_quality !== null
  ) {
    return calculateOverallScoreFromMetrics({
      coverage_score: parsed.coverage_score,
      clarity_rating: parsed.clarity_rating,
      engagement_level: parsed.engagement_level,
      assessment_quality: parsed.assessment_quality,
      gaps_detected: parsed.gaps_detected ?? 0,
    });
  }

  return 75;
}

function extractMetricsFromResult(result: string): {
  coverage_score: number;
  clarity_rating: number;
  engagement_level: number;
  assessment_quality: number;
  gaps_detected: number;
} {
  const parsed = parseOptionalMetricsFromResult(result);
  const observedInstructionalValues = [
    parsed.score,
    parsed.coverage_score,
    parsed.clarity_rating,
    parsed.engagement_level,
    parsed.assessment_quality,
  ].filter((value): value is number => value !== null);
  const inferredBaseline = observedInstructionalValues.length
    ? Math.round(observedInstructionalValues.reduce((sum, value) => sum + value, 0) / observedInstructionalValues.length)
    : 75;
  const inferredGaps = parsed.gaps_detected ?? Math.max(0, parseFeedbackSections(result).contentGaps.length);

  if (
    parsed.coverage_score !== null &&
    parsed.clarity_rating !== null &&
    parsed.engagement_level !== null &&
    parsed.assessment_quality !== null &&
    parsed.gaps_detected !== null
  ) {
    return {
      coverage_score: parsed.coverage_score,
      clarity_rating: parsed.clarity_rating,
      engagement_level: parsed.engagement_level,
      assessment_quality: parsed.assessment_quality,
      gaps_detected: parsed.gaps_detected,
    };
  }

  const defaults = {
    coverage_score: inferredBaseline,
    clarity_rating: inferredBaseline,
    engagement_level: inferredBaseline,
    assessment_quality: inferredBaseline,
    gaps_detected: inferredGaps,
  };

  const coverageMatch = result.match(/(?:###\s+)?Coverage(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i);
  const clarityMatch = result.match(/(?:###\s+)?Clarity(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i);
  const engagementMatch = result.match(/(?:###\s+)?Engagement(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i);
  const assessmentMatch = result.match(/(?:###\s+)?Assessment Quality(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i);
  const gapsMatch = result.match(/(?:###\s+)?Gaps[\s]*(?:Flagged)?(?:\s*\([^)]*\))?[:\s]*([0-9]+)/i);

  return {
    coverage_score: coverageMatch ? parseInt(coverageMatch[1], 10) : defaults.coverage_score,
    clarity_rating: clarityMatch ? parseInt(clarityMatch[1], 10) : defaults.clarity_rating,
    engagement_level: engagementMatch ? parseInt(engagementMatch[1], 10) : defaults.engagement_level,
    assessment_quality: assessmentMatch ? parseInt(assessmentMatch[1], 10) : defaults.assessment_quality,
    gaps_detected: gapsMatch ? parseInt(gapsMatch[1], 10) : defaults.gaps_detected,
  };
}

function normalizeBiologyText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizeBiologyToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (/(ses|xes|zes|ches|shes)$/i.test(token) && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenizeBiologyConcept(value: string) {
  return normalizeBiologyText(value)
    .split(/\s+/)
    .map((token) => singularizeBiologyToken(token.trim()))
    .filter((token) => token && !BIOLOGY_GAP_STOP_WORDS.has(token));
}

function buildTokenFrequencyMap(tokens: string[]) {
  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  return counts;
}

function extractCandidateBiologyPhrases(gapItem: string) {
  const normalized = normalizeBiologyText(gapItem);
  const phrases = normalized
    .split(/[,:;()]/)
    .flatMap((part) => part.split(/\b(?:and|or|while|particularly|including|such as)\b/))
    .map((part) => part.trim())
    .filter((part) => part.split(/\s+/).length >= 2);

  return Array.from(new Set(phrases));
}

function splitTranscriptIntoEvidenceSnippets(transcript: string) {
  return String(transcript || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((snippet) => snippet.trim())
    .filter((snippet) => snippet.length >= 25);
}

function normalizeEvidenceSnippet(snippet: string) {
  return normalizeBiologyText(snippet);
}

function getHigherEdBiologyConceptEvidence(transcript: string) {
  const snippets = splitTranscriptIntoEvidenceSnippets(transcript);

  return HIGHER_ED_BIOLOGY_CONCEPT_CHECKS.flatMap((concept) => {
    const matchedSnippet = snippets.find((snippet) => {
      const normalizedSnippet = normalizeEvidenceSnippet(snippet);
      const hasAlias = concept.aliases.some((alias) => normalizedSnippet.includes(alias));
      if (!hasAlias) return false;

      const supportMatches = concept.support.filter((token) =>
        normalizedSnippet.includes(token)
      ).length;

      return supportMatches >= 1;
    });

    if (!matchedSnippet) return [];

    return [
      {
        label: concept.label,
        snippet: matchedSnippet,
      },
    ];
  });
}

function getContradictedTranscriptGapConcepts(
  result: string,
  transcript: string,
  options?: {
    priorityTokens?: Set<string>;
    minimumTokenLength?: number;
  }
) {
  const normalizedTranscript = normalizeBiologyText(transcript);
  const transcriptTokens = tokenizeBiologyConcept(transcript);
  const transcriptTokenCounts = buildTokenFrequencyMap(transcriptTokens);
  const transcriptTokenSet = new Set(transcriptTokens);
  const gapItems = getContentGapItems(result);
  const contradictions: Array<{ gap: string; matchedTokens: string[] }> = [];
  const minimumTokenLength = options?.minimumTokenLength ?? 6;

  for (const gapItem of gapItems) {
    const candidatePhrases = extractCandidateBiologyPhrases(gapItem);
    const exactPhraseMatch = candidatePhrases.find(
      (phrase) => phrase.length >= 12 && normalizedTranscript.includes(phrase)
    );

    const significantTokens = Array.from(
      new Set(
        tokenizeBiologyConcept(gapItem).filter(
          (token) =>
            (options?.priorityTokens?.has(token) ?? false) || token.length >= minimumTokenLength
        )
      )
    );

    if (significantTokens.length === 0) {
      continue;
    }

    const matchedTokens = significantTokens.filter((token) => transcriptTokenSet.has(token));
    const repeatedSingleTokenMatch =
      significantTokens.length === 1 &&
      ((options?.priorityTokens?.has(significantTokens[0]) ?? false) ||
        significantTokens[0].length >= minimumTokenLength) &&
      (transcriptTokenCounts.get(significantTokens[0]) ?? 0) >= 2;

    const multiTokenMatch =
      significantTokens.length >= 2 &&
      matchedTokens.length >= Math.min(2, significantTokens.length) &&
      matchedTokens.length >= Math.ceil(significantTokens.length / 2);

    if (exactPhraseMatch || repeatedSingleTokenMatch || multiTokenMatch) {
      contradictions.push({
        gap: gapItem,
        matchedTokens: exactPhraseMatch ? [exactPhraseMatch] : matchedTokens,
      });
    }
  }

  return contradictions;
}

function getContradictedHigherEdBiologyGapConcepts(result: string, transcript: string) {
  const baselineContradictions = getContradictedTranscriptGapConcepts(result, transcript, {
    priorityTokens: BIOLOGY_PRIORITY_TOKENS,
    minimumTokenLength: 6,
  });
  const gapItems = getContentGapItems(result);
  const evidenceByConcept = getHigherEdBiologyConceptEvidence(transcript);

  evidenceByConcept.forEach((evidence) => {
    gapItems.forEach((gapItem) => {
      const normalizedGap = normalizeBiologyText(gapItem);
      const normalizedLabel = normalizeBiologyText(evidence.label);
      if (!normalizedGap.includes(normalizedLabel)) return;

      const existing = baselineContradictions.find((item) => item.gap === gapItem);
      if (existing) {
        if (!existing.matchedTokens.includes(evidence.label)) {
          existing.matchedTokens.push(evidence.label);
        }
        return;
      }

      baselineContradictions.push({
        gap: gapItem,
        matchedTokens: [evidence.label],
      });
    });
  });

  return baselineContradictions;
}

function getContradictedSchoolGradeGapConcepts(result: string, transcript: string) {
  return getContradictedTranscriptGapConcepts(result, transcript, {
    minimumTokenLength: 5,
  });
}

function extractStructuredSectionBody(text: string, heading: string) {
  const normalized = normalizeStructuredReportText(text);
  const match = normalized.match(new RegExp(`===\\s*${escapeRegExp(heading)}\\s*===([\\s\\S]*?)(?====|$)`, "i"));
  return String(match?.[1] || "").trim();
}

function createServiceSupabaseClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function updateAnalysisJob(
  jobId: string,
  patch: Record<string, unknown>
) {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("analysis_jobs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.error("ANALYSIS JOB UPDATE ERROR:", { jobId, error, patch });
  }
}

async function runAnalysisWorkflow(input: AnalysisWorkflowInput): Promise<AnalysisWorkflowOutput> {
  const {
    targetUserId,
    observedTeacherId,
    observedTeacherName,
    callerProfileName,
    grade,
    subject,
    book,
    chapter,
    lectureText,
    waitTimeEvidence,
    audioDuration,
    files,
    onProgress,
  } = input;

  const reportProgress = async (percent: number, step: string) => {
    if (!onProgress) return;
    await onProgress({ percent, step });
  };

  const openai = createOpenAIClient();
  let transcript = lectureText;

  if (files.length > 0) {
    await reportProgress(8, `Transcribing audio chunks (0 of ${files.length})...`);
    const spokenParts = await transcribeAudioFiles(
      openai,
      files,
      audioDuration,
      async ({ completed, total }) => {
        if (completed !== total && completed !== 1 && completed % 4 !== 0) {
          return;
        }

        await reportProgress(
          Math.min(42, 8 + Math.round((completed / total) * 34)),
          `Transcribing audio chunks (${completed} of ${total})...`
        );
      }
    );
    const spokenText = spokenParts.join("\n\n");
    if (spokenText) {
      transcript = transcript
        ? `${transcript}\n\nAudio Transcript:\n${spokenText}`
        : spokenText;
    }
  }

  if (!transcript || transcript.trim().length < 10) {
    throw new Error("Please provide lesson notes or upload an audio file for transcription.");
  }

  await reportProgress(46, "Matching standards and lesson context...");

  const { standards, overview, found: hasStandards } = getTEKSStandards(grade, subject);
  const isSTAAR = STAAR_SUBJECTS.some(
    (s) => s.grade.toLowerCase() === grade.toLowerCase() && s.subject.toLowerCase() === subject.toLowerCase()
  );
  const primaryPromptStandards = hasStandards
    ? getPrimaryTEKSStandards(grade, subject, transcript, {
        limit: isSTAAR ? 10 : 8,
      })
    : [];
  const relatedPromptStandards = hasStandards
    ? getRelatedTEKSStandards(grade, subject, transcript, {
        limit: isSTAAR ? 10 : 8,
        excludeCodes: primaryPromptStandards.map((standard) => standard.code),
      })
    : [];
  const teksContext = formatTEKSForPrompt(primaryPromptStandards, overview, {
    totalCount: standards.length,
    relatedStandards: relatedPromptStandards,
  });

  const isHigherEdBiology =
    grade.trim().toLowerCase() === 'higher ed' &&
    subject.trim().toLowerCase() === 'biology';
  const isHigherEdCustomText =
    grade.trim().toLowerCase() === 'higher ed' &&
    subject.trim().length > 0 &&
    subject.trim().toLowerCase() !== 'biology';
  const matchedBiologyObjectives = isHigherEdBiology ? getHigherEdBiologyObjectivesForChapter(chapter) : [];
  const coverageCalibrationContext = buildCoverageCalibrationContext({
    hasStandards,
    isHigherEdBiology,
    isHigherEdCustomText,
    grade,
    subject,
    chapter,
    book,
    primaryPromptStandards,
    relatedPromptStandards,
    matchedBiologyObjectives,
  });
  const metricCalibrationContext = buildMetricCalibrationContext({
    coverageCalibrationContext,
  });
  const lessonContextTitle = chapter
    ? isHigherEdBiology
      ? `Campbell Biology ${chapter}`
      : book
        ? `${book} ${chapter}`
        : chapter
    : '';

  let systemPrompt = `You are an elite instructional coach analyzing classroom teaching. Be specific, evidence-based, and actionable. Organize the report with clear sections, bullet points, and concise language so it is easy to follow.

Every report must feel unique to the lesson in front of you, not like a reusable template. Anchor feedback to concrete evidence from this specific lesson: teacher moves, student responses, task structure, checks for understanding, pacing, and standards alignment. Avoid generic praise or generic coaching phrases unless they are tied to an explicit lesson detail.

Use varied wording across sections. Do not repeat the same sentence frame in multiple sections. When possible, reference 3 or more distinct lesson moments across the report. You may quote short phrases from the transcript when it helps ground the feedback, but keep quotes brief.

Score the lesson with professional calibration. The scores do not need to match each other. Let strengths and weaknesses land where the evidence supports them. Only use the same number across multiple categories if the transcript truly supports that level across all of them.`;

  if (isHigherEdBiology) {
    systemPrompt += `\n\nFor Higher Ed Biology lessons, compare the instruction to a strong introductory undergraduate biology sequence using Campbell Biology as the reference frame. Evaluate whether the lesson reflects accurate biological terminology, concept depth, prerequisite logic, and textbook-level expectations for a college introductory biology course.${matchedBiologyObjectives.length ? ` Also evaluate whether the lesson advances these course objectives inferred from the selected chapter: ${matchedBiologyObjectives.join(' ')}` : ''} If the lesson appears to be one part of a larger sequence, evaluate the submitted recording on its own terms and avoid treating clearly deferred chapter content as missing unless the transcript shows that concept should already have been taught in this lesson.`;
  } else if (isHigherEdCustomText && book) {
    systemPrompt += `\n\nFor this Higher Ed lesson, compare the instruction to the expectations of the provided textbook and chapter. Evaluate whether the lesson reflects accurate terminology, concept depth, prerequisite logic, and chapter-level expectations for that course text.`;
  }

  const waitTimeGuidance = `Important wait-time rule: once the lesson is underway, assume the teacher typically allows about 8 to 10 seconds for student response after questions unless the transcript gives clear evidence that the teacher rushed, answered their own questions, cut students off, or rapidly moved on without space for thinking. Audio transcription often removes silence, pauses, and think time, so do not criticize wait time based only on the absence of transcribed silence. Only flag weak wait time when there is explicit evidence of it in the lesson record.`;
  const transcriptOnlyGuidance = waitTimeEvidence
    ? ''
    : `This lesson was submitted as transcript or notes without audio timing evidence. Do not score pacing, wait time, engagement, or assessment more harshly just because the written transcript is concise, omits pauses, or captures fewer student responses than a full audio transcription would. Judge those areas only from clear positive or negative evidence that appears in the submitted text.`;
  let userPrompt = '';

  const higherEdBiologyFormat = isHigherEdBiology
    ? `\n\n=== HIGHER ED BIOLOGY TEXTBOOK ALIGNMENT ===\nCompare this lesson to the expectations of an introductory college biology course using Campbell Biology as the benchmark. Use labeled bullets for:\n- Textbook Alignment: what chapter-level or concept-level expectations the lesson appears to address.\n- Missing Conceptual Depth: what a strong introductory biology lesson or textbook treatment would include that was missing or underdeveloped here.\n- Terminology Precision: whether the biological language and explanation depth are at the level expected in an introductory biology course.\n- College-Level Recommendation: the most important adjustment needed to better align the lesson to a Campbell Biology-style course sequence.`
    : '';
  const higherEdCustomTextFormat = isHigherEdCustomText && book
    ? `\n\n=== HIGHER ED TEXTBOOK ALIGNMENT ===\nCompare this lesson to ${book}${chapter ? `, ${chapter},` : ''} as the benchmark. Use labeled bullets for:\n- Textbook Alignment: what chapter-level or concept-level expectations the lesson appears to address.\n- Missing Conceptual Depth: what a strong textbook-aligned lesson for this course would include that was missing or underdeveloped here.\n- Terminology Precision: whether the course language and explanation depth are at the level expected for this textbook.\n- College-Level Recommendation: the most important adjustment needed to better align the lesson to this textbook and chapter.`
    : '';

  const reportFormat = `Analyze this lesson transcript and provide feedback in the following structured format. Use these exact section headers and keep the feedback evidence-based, specific, and unbiased.

Important writing rules:
- Make every major section lesson-specific, not generic.
- In each bullet, point to a concrete observed move, student behavior, question type, task design choice, or missed opportunity from this lesson.
- Avoid repeating the same praise or critique in multiple sections.
- If evidence is limited, say what was observable instead of inventing detail.
- Review the full transcript before judging coverage. Do not overweight the opening explanation or analogy if later chunks show broader content coverage.
- Treat the transcript as a full sequence. Check beginning, middle, and end before deciding a concept was omitted or underdeveloped.
- Prioritize the most distinctive strengths and weaknesses from this lesson, not the most common teacher coaching advice.
- Gaps Flagged must match the number of substantive bullets listed in CONTENT GAPS TO REINFORCE. If no meaningful gaps are visible, set Gaps Flagged to 0 and say so plainly.
- Calibrate each metric separately. Coverage, Clarity, Engagement, Assessment Quality, and the overall score should reflect different aspects of the lesson and should not default to the same number unless the evidence clearly supports that.
- EXECUTIVE SUMMARY should synthesize the lesson, not repeat later bullets.
- WHAT WENT WELL and WHAT CAN IMPROVE should contain the clearest distinct evidence, not generic coaching language.
- RECOMMENDED NEXT STEP should build directly from the top improvement need without repeating the same wording already used above.
- INSTRUCTIONAL COACHING FEEDBACK should summarize patterns and implications, not restate earlier bullets verbatim.
- For CONTENT GAPS TO REINFORCE, only include concepts that are truly absent, inaccurate, or materially underdeveloped across the lesson as a whole. If a concept is clearly taught later in the transcript, do not list it as a gap.
- If the recording is part one of a multi-part lesson sequence, distinguish between "not yet covered in this recording" and "incorrectly or inadequately taught."
- For Higher Ed Biology, do not claim mRNA, tRNA, rRNA, codons, transcription, or translation were missing if the transcript explicitly names them and gives their role with basic accuracy. In that case, you may note a need for added depth or precision, but not absence.
- For Higher Ed Biology, if the transcript explicitly ties tRNA to amino acids or anticodons, or ties rRNA to the ribosome's structure or function, do not keep those as content gaps.
- Before naming a biology content gap, verify that the concept was not adequately addressed anywhere in the transcript. If it was taught with reasonable introductory accuracy, frame the issue as limited depth, incomplete distinction, or deferred follow-up instead of saying it was not covered.
- For Higher Ed Biology, anchor missing-content judgments to the selected Campbell Biology chapter and the matched course objective(s), not to every concept that could appear somewhere in a broader biology unit.
- Coverage must be scored directly against the intended chapter/objective target or TEKS target, not inferred only from the number of gap bullets.

${metricCalibrationContext}

Metrics:
Instructional Score (0-100): [number]
Coverage (0-100): [number]
Clarity (0-100): [number]
Engagement (0-100): [number]
Assessment Quality (0-100): [number]
Gaps Flagged: [number]

=== EXECUTIVE SUMMARY ===
Provide a concise 1-2 sentence summary of overall lesson quality, student experience, and biggest instructional takeaway. Mention at least 1 concrete lesson detail. Keep it brief and avoid repeating later bullets.

=== WHAT WENT WELL ===
- [specific strength tied to a concrete lesson moment]
- [specific strength tied to a concrete lesson moment]
- [specific strength tied to a concrete lesson moment]

=== WHAT CAN IMPROVE ===
- [specific area for improvement tied to a concrete lesson moment]
- [specific area for improvement tied to a concrete lesson moment]
- [specific area for improvement tied to a concrete lesson moment]

=== CONTENT GAPS TO REINFORCE ===
Provide a numbered list of the exact content misunderstandings, missing ideas, weak prerequisite links, or underdeveloped biological concepts that need reteach. If there are no meaningful content gaps, write "1. No major content gaps identified."

=== RECOMMENDED NEXT STEP ===
Provide 1 short paragraph with the single highest-leverage next move for the teacher. Limit it to 2-3 sentences. It must directly address the most important weakness from this lesson and explain why it matters here without repeating the summary.

=== INSTRUCTIONAL COACHING FEEDBACK ===
Provide lesson-specific instructional coaching feedback using labeled bullets:
- Key Findings: cite the most important observable patterns from this lesson.
- Missed Opportunities: identify concrete moves that were absent, incomplete, or underdeveloped in this lesson.
- Student Engagement Signals: describe what students appeared to be doing or not doing based on the lesson record.
- Suggested Next Steps: give coaching moves tailored to this lesson, not generic teacher advice.`;

  if (hasStandards) {
    systemPrompt += '\nProvide two distinct types of feedback: (1) Generic instructional quality coaching, and (2) Texas TEKS standards alignment analysis.';
    userPrompt = `Grade: ${grade}\nSubject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}${matchedBiologyObjectives.length ? `\nMatched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}` : ''}\n\n${teksContext}\n\n${waitTimeGuidance}${transcriptOnlyGuidance ? `\n\n${transcriptOnlyGuidance}` : ''}${waitTimeEvidence ? `\n\nAdditional audio timing evidence:\n${waitTimeEvidence}` : ''}\n\n${reportFormat}${higherEdBiologyFormat}${higherEdCustomTextFormat}`;

    if (isSTAAR) {
      userPrompt += `\n\n=== STAAR TEKS COVERAGE ===\nSummarize how well the lesson covered the most important TEKS for this STAAR-tested subject and grade. Use labeled bullets for:\n- Readiness Summary: ...\n- Standards Reinforced:\n  - CODE: exact TEKS description\n  - CODE: exact TEKS description\n- Standards That Need Stronger Assessment Evidence:\n  - CODE: exact TEKS description\n  - CODE: exact TEKS description\n- STAAR Readiness Recommendation: ...\nFor Standards Reinforced and Standards That Need Stronger Assessment Evidence, list only actual TEKS codes with their matching descriptions from the standards reference above. Do not use generic prose in those two fields. For the weaker-assessment field, choose TEKS that are directly related to the lesson topic and concept focus.`;
    }

    userPrompt += `\n\n=== TEXAS TEKS STANDARDS ALIGNMENT ===\nProvide specific curriculum alignment feedback using labeled bullets:
- Covered in the Lesson:
  - CODE: exact TEKS description
  - CODE: exact TEKS description
- Needs Reinforcement:
  - CODE: exact TEKS description
  - CODE: exact TEKS description
- Not Covered in the Lesson:
  - CODE: exact TEKS description
  - CODE: exact TEKS description
- Standards Mastery Notes: observations about depth and quality of standards instruction.
- Recommended Standards Follow-Up: how to better integrate missing or partially developed standards with concrete instructional moves.
For the three standards lists above, use the provided Primary TEKS first, then use the Related Supporting TEKS when they genuinely connect to the lesson. Do not invent codes outside the provided standards reference, and do not use generic prose in those list fields.
\nTranscript:\n${transcript}\n`;
  } else {
    userPrompt = `Grade: ${grade}\nSubject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}${matchedBiologyObjectives.length ? `\nMatched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}` : ''}\n\n${waitTimeGuidance}${transcriptOnlyGuidance ? `\n\n${transcriptOnlyGuidance}` : ''}${waitTimeEvidence ? `\n\nAdditional audio timing evidence:\n${waitTimeEvidence}` : ''}\n\n${reportFormat}${higherEdBiologyFormat}${higherEdCustomTextFormat}\n\nTranscript:\n${transcript}\n`;
  }

  await reportProgress(55, "Analyzing lesson content...");

  const completion = await callOpenAI(openai, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  let result =
    completion.choices[0]?.message?.content || "No result returned";

  result = normalizeStructuredReportText(result);

  await reportProgress(68, "Refining report and scoring...");

  if (shouldRepairMetricsBlock(result)) {
    const buildMetricsRepairPrompt = (strictCalibration = false) => `Based on the lesson transcript and the saved report draft below, return only this exact format with integer values:

Metrics:
Instructional Score (0-100): [number]
Coverage (0-100): [number]
Clarity (0-100): [number]
Engagement (0-100): [number]
Assessment Quality (0-100): [number]
Gaps Flagged: [number]

Calibrate each metric independently. Do not give all five instructional metrics the same number unless the evidence clearly supports that. Use the report draft and transcript together to infer the most defensible scores.
Coverage must be judged directly against the intended chapter/objective target or TEKS target, not simply from the count of listed gaps.
${strictCalibration ? 'Avoid a flat 75/75/75/75/75 block unless the transcript overwhelmingly supports identical middle-of-the-road performance across every category. When evidence differs by category, the numbers must differ.' : ''}

${metricCalibrationContext}

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}${matchedBiologyObjectives.length ? `\nMatched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

    const attemptMetricsRepair = async (strictCalibration = false) => {
      const metricsRepair = await callOpenAIMetricsRepair(openai, buildMetricsRepairPrompt(strictCalibration));
      const repairedMetricsText = metricsRepair.choices[0]?.message?.content || '';
      return parseOptionalMetricsFromResult(repairedMetricsText);
    };

    let repairedMetrics = await attemptMetricsRepair(false);

    if (
      Object.values(repairedMetrics).every((value) => value !== null) &&
      (hasSuspiciousDefaultMetrics(repairedMetrics) ||
        new Set([
          repairedMetrics.score,
          repairedMetrics.coverage_score,
          repairedMetrics.clarity_rating,
          repairedMetrics.engagement_level,
          repairedMetrics.assessment_quality,
        ]).size === 1)
    ) {
      repairedMetrics = await attemptMetricsRepair(true);
    }

    if (Object.values(repairedMetrics).every((value) => value !== null)) {
      result = `${buildMetricsBlock({
        score: repairedMetrics.score as number,
        coverage_score: repairedMetrics.coverage_score as number,
        clarity_rating: repairedMetrics.clarity_rating as number,
        engagement_level: repairedMetrics.engagement_level as number,
        assessment_quality: repairedMetrics.assessment_quality as number,
        gaps_detected: repairedMetrics.gaps_detected as number,
      })}\n\n${result}`;
    }
  }

  if (needsWhatWentWellRepair(result)) {
    const strengthsRepairPrompt = `Return only 3 bullets for the "WHAT WENT WELL" section of this lesson report.

Requirements:
- Each bullet must name a real strength that can be supported by the lesson transcript or report draft.
- Each bullet must be specific to this lesson, not generic teacher praise.
- Focus on instructional moves, student engagement signals, explanation choices, questioning, examples, modeling, or structure that actually helped the lesson.
- Keep each bullet to 1-2 sentences.
- Do not include a heading.
- Do not repeat the same point in multiple bullets.
- If the evidence is limited, still identify the strongest genuine positives you can support from the transcript.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

    const strengthsRepair = await callOpenAISectionRepair(openai, strengthsRepairPrompt);
    const repairedStrengthsText = String(strengthsRepair.choices[0]?.message?.content || "")
      .replace(/\r/g, "")
      .trim();

    if (repairedStrengthsText) {
      result = upsertStructuredSection(
        result,
        "WHAT WENT WELL",
        repairedStrengthsText,
        "WHAT CAN IMPROVE"
      );
    }
  }

  if (needsExecutiveSummaryRepair(result)) {
    const executiveSummaryRepairPrompt = `Return only the paragraph for the "EXECUTIVE SUMMARY" section of this lesson report.

Requirements:
- Write 1 to 2 sentences.
- Keep it specific to this lesson.
- Mention the strongest observed strength and the biggest instructional need.
- Ground the summary in actual lesson content, pacing, questioning, modeling, or student understanding evidence.
- Do not include a heading.
- Do not use generic summary wording.
- Keep it brief and direct.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

    const executiveSummaryRepair = await callOpenAISectionRepair(openai, executiveSummaryRepairPrompt);
    const repairedExecutiveSummaryText = String(executiveSummaryRepair.choices[0]?.message?.content || "")
      .replace(/\r/g, "")
      .trim();

    if (repairedExecutiveSummaryText) {
      result = upsertStructuredSection(
        result,
        "EXECUTIVE SUMMARY",
        repairedExecutiveSummaryText,
        "WHAT WENT WELL"
      );
    }
  }

  if (needsWhatCanImproveRepair(result)) {
    const improvementsRepairPrompt = `Return only 3 bullets for the "WHAT CAN IMPROVE" section of this lesson report.

Requirements:
- Each bullet must identify a real improvement need from this exact lesson.
- Make the bullets specific to the observed content, teacher moves, pacing, questioning, checks for understanding, or missed conceptual links.
- Do not use generic coaching phrases unless you tie them to the actual lesson topic.
- Keep each bullet to 1-2 sentences.
- Do not include a heading.
- Do not repeat the same idea across bullets.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

    const improvementsRepair = await callOpenAISectionRepair(openai, improvementsRepairPrompt);
    const repairedImprovementsText = String(improvementsRepair.choices[0]?.message?.content || "")
      .replace(/\r/g, "")
      .trim();

    if (repairedImprovementsText) {
      result = upsertStructuredSection(
        result,
        "WHAT CAN IMPROVE",
        repairedImprovementsText,
        "CONTENT GAPS TO REINFORCE"
      );
    }
  }

  if (needsContentGapsRepair(result)) {
    const contentGapsRepairPrompt = `Return only the numbered list for the "CONTENT GAPS TO REINFORCE" section of this lesson report.

Requirements:
- Provide 0 to 3 specific content gaps, and only include items that are clearly justified by the lesson evidence.
- Each item must name a concrete missing concept, misconception, weak conceptual link, or underdeveloped idea from this lesson.
- Ground the list in the actual lesson content.
- If there are no meaningful content gaps, return exactly: 1. No major content gaps identified.
- Do not include a heading.
- Do not mark a concept as missing if the transcript explicitly teaches it with basic accuracy. In that case, describe the issue as limited depth or incomplete precision instead.
- For Higher Ed Biology, if the transcript explicitly covers a biology concept, term set, or named process, do not list it as absent. Frame the issue as limited depth, incomplete distinction, or deferred follow-up instead.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}${matchedBiologyObjectives.length ? `\nMatched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

    const contentGapsRepair = await callOpenAISectionRepair(openai, contentGapsRepairPrompt);
    const repairedContentGapsText = String(contentGapsRepair.choices[0]?.message?.content || "")
      .replace(/\r/g, "")
      .trim();

    if (repairedContentGapsText) {
      result = upsertStructuredSection(
        result,
        "CONTENT GAPS TO REINFORCE",
        repairedContentGapsText,
        "RECOMMENDED NEXT STEP"
      );
    }
  }

  if (needsRecommendedNextStepRepair(result)) {
    const nextStepRepairPrompt = `Return only the paragraph for the "RECOMMENDED NEXT STEP" section of this lesson report.

Requirements:
- Write one concise paragraph of 2 to 3 sentences.
- Name the single highest-leverage next move for this exact lesson.
- Ground it in the actual lesson content, teacher moves, or missed concept work from the transcript.
- Do not use generic phrasing like "strengthen closure" or "add a quick mastery check" unless you explain what specifically needs to be checked or revisited in this lesson.
- Do not include a heading.
- Keep it brief and to the point.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

    const nextStepRepair = await callOpenAISectionRepair(openai, nextStepRepairPrompt);
    const repairedNextStepText = String(nextStepRepair.choices[0]?.message?.content || "")
      .replace(/\r/g, "")
      .trim();

    if (repairedNextStepText) {
      result = upsertStructuredSection(
        result,
        "RECOMMENDED NEXT STEP",
        repairedNextStepText
      );
    }
  }

  if ((isHigherEdBiology || (isHigherEdCustomText && book)) && needsHigherEdAlignmentRepair(result)) {
    const alignmentHeading = isHigherEdBiology
      ? "HIGHER ED BIOLOGY TEXTBOOK ALIGNMENT"
      : "HIGHER ED TEXTBOOK ALIGNMENT";
    const alignmentRepairPrompt = `Return only the labeled bullets for the "${alignmentHeading}" section of this lesson report.

Requirements:
- Use these exact labels:
  - Textbook Alignment:
  - Missing Conceptual Depth:
  - Terminology Precision:
  - College-Level Recommendation:
- Keep each field concise and specific to this lesson.
- Ground the response in the selected ${isHigherEdBiology ? 'Campbell Biology chapter' : 'textbook and chapter'}.
- Do not include a heading outside of the labeled bullets.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

    const alignmentRepair = await callOpenAISectionRepair(openai, alignmentRepairPrompt);
    const repairedAlignmentText = String(alignmentRepair.choices[0]?.message?.content || "")
      .replace(/\r/g, "")
      .trim();

    if (repairedAlignmentText) {
      result = upsertStructuredSection(
        result,
        alignmentHeading,
        repairedAlignmentText,
        "SUBMISSION CONTEXT"
      );
    }
  }

  const hasReportedContentGapClaims = hasSubstantiveContentGapClaims(result);

  const contradictedBiologyGapConcepts = isHigherEdBiology && hasReportedContentGapClaims
    ? getContradictedHigherEdBiologyGapConcepts(result, transcript)
    : [];
  const isSchoolGradeLesson = !isHigherEdBiology && !isHigherEdCustomText && hasStandards;
  const contradictedSchoolGapConcepts = isSchoolGradeLesson && hasReportedContentGapClaims
    ? getContradictedSchoolGradeGapConcepts(result, transcript)
    : [];

  if (isHigherEdBiology && hasReportedContentGapClaims && contradictedBiologyGapConcepts.length > 0) {
    const biologyConsistencyRepairPrompt = `The draft lesson report below likely overstates missing content. Some draft content gaps appear to overlap with biology concepts that were explicitly discussed in the transcript.

Potentially contradicted draft gaps:
${contradictedBiologyGapConcepts.map((item, index) => `${index + 1}. Draft gap: ${item.gap}\n   Transcript overlap: ${item.matchedTokens.join(", ")}`).join("\n")}

Return only these exact section headings with replacement content:

=== EXECUTIVE SUMMARY ===
[1 to 2 sentences]

=== WHAT CAN IMPROVE ===
- [bullet]
- [bullet]
- [bullet]

=== CONTENT GAPS TO REINFORCE ===
1. [gap]
2. [gap]
3. [gap]

=== RECOMMENDED NEXT STEP ===
[1 short paragraph]

Rules:
- Do not say a biology concept was missing or not covered when the transcript shows that concept, phrase, or terminology was explicitly taught.
- If a covered concept still needs refinement, frame that as limited depth, incomplete distinction, or uneven precision, not absence.
- Prefer concepts that were truly deferred, missing, or underdeveloped in this specific recording.
- Keep the report specific to this lesson and selected Campbell Biology chapter.
- Preserve a fair, evidence-based tone.

Grade: ${grade}
Subject: ${subject}
Book: Campbell Biology
Chapter / Unit: ${chapter}
Matched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}

Current Report Draft:
${result}

Transcript:
${transcript}`;

    const biologyConsistencyRepair = await callOpenAISectionRepair(openai, biologyConsistencyRepairPrompt);
    const repairedBiologySections = normalizeStructuredReportText(
      String(biologyConsistencyRepair.choices[0]?.message?.content || "")
        .replace(/\r/g, "")
        .trim()
    );

    const repairedExecutiveSummary = extractStructuredSectionBody(repairedBiologySections, "EXECUTIVE SUMMARY");
    if (repairedExecutiveSummary) {
      result = upsertStructuredSection(result, "EXECUTIVE SUMMARY", repairedExecutiveSummary, "WHAT WENT WELL");
    }

    const repairedImprovements = extractStructuredSectionBody(repairedBiologySections, "WHAT CAN IMPROVE");
    if (repairedImprovements) {
      result = upsertStructuredSection(result, "WHAT CAN IMPROVE", repairedImprovements, "CONTENT GAPS TO REINFORCE");
    }

    const repairedContentGaps = extractStructuredSectionBody(repairedBiologySections, "CONTENT GAPS TO REINFORCE");
    if (repairedContentGaps) {
      result = upsertStructuredSection(result, "CONTENT GAPS TO REINFORCE", repairedContentGaps, "RECOMMENDED NEXT STEP");
    }

    const repairedNextStep = extractStructuredSectionBody(repairedBiologySections, "RECOMMENDED NEXT STEP");
    if (repairedNextStep) {
      result = upsertStructuredSection(result, "RECOMMENDED NEXT STEP", repairedNextStep);
    }

    const existingMetrics = parseOptionalMetricsFromResult(result);
    const normalizedGapCount = getContentGapItems(result).length;
    if (
      existingMetrics.score !== null &&
      existingMetrics.coverage_score !== null &&
      existingMetrics.clarity_rating !== null &&
      existingMetrics.engagement_level !== null &&
      existingMetrics.assessment_quality !== null
    ) {
      result = upsertMetricsBlock(result, {
        score: calculateOverallScoreFromMetrics({
          coverage_score: existingMetrics.coverage_score,
          clarity_rating: existingMetrics.clarity_rating,
          engagement_level: existingMetrics.engagement_level,
          assessment_quality: existingMetrics.assessment_quality,
          gaps_detected: normalizedGapCount,
        }),
        coverage_score: existingMetrics.coverage_score,
        clarity_rating: existingMetrics.clarity_rating,
        engagement_level: existingMetrics.engagement_level,
        assessment_quality: existingMetrics.assessment_quality,
        gaps_detected: normalizedGapCount,
      });
    }
  }

  if (isSchoolGradeLesson && hasReportedContentGapClaims && contradictedSchoolGapConcepts.length > 0) {
    const schoolConsistencyRepairPrompt = `The draft lesson report below may overstate missing content. Some draft content gaps appear to overlap with concepts that were explicitly taught in the transcript for this school-grade lesson.

Potentially contradicted draft gaps:
${contradictedSchoolGapConcepts.map((item, index) => `${index + 1}. Draft gap: ${item.gap}\n   Transcript overlap: ${item.matchedTokens.join(", ")}`).join("\n")}

Return only these exact section headings with replacement content:

=== EXECUTIVE SUMMARY ===
[1 to 2 sentences]

=== WHAT CAN IMPROVE ===
- [bullet]
- [bullet]
- [bullet]

=== CONTENT GAPS TO REINFORCE ===
1. [gap]
2. [gap]
3. [gap]

=== RECOMMENDED NEXT STEP ===
[1 short paragraph]

Rules:
- Do not say a concept was missing or not covered when the transcript shows that concept, phrase, or vocabulary was explicitly taught.
- If a covered concept still needs work, frame that as limited depth, weak connection, incomplete precision, or weak student mastery evidence, not absence.
- Keep remaining content gaps anchored to the most relevant primary or related TEKS for this lesson.
- Prefer concepts that were truly missing, inaccurate, or underdeveloped in this specific recording.
- Preserve a fair, evidence-based tone.

Grade: ${grade}
Subject: ${subject}

Primary TEKS Most Directly Connected to This Lesson:
${primaryPromptStandards.map((standard) => `- ${standard.code}: ${standard.description}`).join("\n") || "- None identified"}

Related Supporting TEKS:
${relatedPromptStandards.map((standard) => `- ${standard.code}: ${standard.description}`).join("\n") || "- None identified"}

Current Report Draft:
${result}

Transcript:
${transcript}`;

    const schoolConsistencyRepair = await callOpenAISectionRepair(openai, schoolConsistencyRepairPrompt);
    const repairedSchoolSections = normalizeStructuredReportText(
      String(schoolConsistencyRepair.choices[0]?.message?.content || "")
        .replace(/\r/g, "")
        .trim()
    );

    const repairedExecutiveSummary = extractStructuredSectionBody(repairedSchoolSections, "EXECUTIVE SUMMARY");
    if (repairedExecutiveSummary) {
      result = upsertStructuredSection(result, "EXECUTIVE SUMMARY", repairedExecutiveSummary, "WHAT WENT WELL");
    }

    const repairedImprovements = extractStructuredSectionBody(repairedSchoolSections, "WHAT CAN IMPROVE");
    if (repairedImprovements) {
      result = upsertStructuredSection(result, "WHAT CAN IMPROVE", repairedImprovements, "CONTENT GAPS TO REINFORCE");
    }

    const repairedContentGaps = extractStructuredSectionBody(repairedSchoolSections, "CONTENT GAPS TO REINFORCE");
    if (repairedContentGaps) {
      result = upsertStructuredSection(result, "CONTENT GAPS TO REINFORCE", repairedContentGaps, "RECOMMENDED NEXT STEP");
    }

    const repairedNextStep = extractStructuredSectionBody(repairedSchoolSections, "RECOMMENDED NEXT STEP");
    if (repairedNextStep) {
      result = upsertStructuredSection(result, "RECOMMENDED NEXT STEP", repairedNextStep);
    }

    const existingMetrics = parseOptionalMetricsFromResult(result);
    const normalizedGapCount = getContentGapItems(result).length;
    if (
      existingMetrics.score !== null &&
      existingMetrics.coverage_score !== null &&
      existingMetrics.clarity_rating !== null &&
      existingMetrics.engagement_level !== null &&
      existingMetrics.assessment_quality !== null
    ) {
      result = upsertMetricsBlock(result, {
        score: calculateOverallScoreFromMetrics({
          coverage_score: existingMetrics.coverage_score,
          clarity_rating: existingMetrics.clarity_rating,
          engagement_level: existingMetrics.engagement_level,
          assessment_quality: existingMetrics.assessment_quality,
          gaps_detected: normalizedGapCount,
        }),
        coverage_score: existingMetrics.coverage_score,
        clarity_rating: existingMetrics.clarity_rating,
        engagement_level: existingMetrics.engagement_level,
        assessment_quality: existingMetrics.assessment_quality,
        gaps_detected: normalizedGapCount,
      });
    }
  }

  const submissionContext =
    observedTeacherId
      ? `\n\n=== SUBMISSION CONTEXT ===\n- Submitted by: ${(callerProfileName || 'Admin').trim()} (Admin Observation)\n- Saved to Teacher Profile: ${observedTeacherName || 'Selected Teacher'}`
      : "";
  let finalResult = normalizeStructuredReportText(`${result}${submissionContext}`);

  if (shouldRepairMetricsBlock(finalResult)) {
    const finalMetricsRepairPrompt = `Based on the transcript and report below, return only this exact metrics block with integers:

Metrics:
Instructional Score (0-100): [number]
Coverage (0-100): [number]
Clarity (0-100): [number]
Engagement (0-100): [number]
Assessment Quality (0-100): [number]
Gaps Flagged: [number]

Rules:
- Use the transcript and report together.
- Do not return a flat 75/75/75/75/75 block unless the evidence is genuinely identical across every category.
- If the evidence differs by category, the numbers must differ.
- Use the full scoring range when justified by the lesson evidence.
- Coverage must be judged directly against the intended chapter/objective target or TEKS target, not simply from the count of listed gaps.

${metricCalibrationContext}

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report:
${finalResult}

Transcript:
${transcript}`;

    const finalMetricsRepair = await callOpenAIMetricsRepair(openai, finalMetricsRepairPrompt);
    const repairedFinalMetrics = parseOptionalMetricsFromResult(
      String(finalMetricsRepair.choices[0]?.message?.content || "")
    );

    if (Object.values(repairedFinalMetrics).every((value) => value !== null)) {
      finalResult = normalizeStructuredReportText(
        `${buildMetricsBlock({
          score: repairedFinalMetrics.score as number,
          coverage_score: repairedFinalMetrics.coverage_score as number,
          clarity_rating: repairedFinalMetrics.clarity_rating as number,
          engagement_level: repairedFinalMetrics.engagement_level as number,
          assessment_quality: repairedFinalMetrics.assessment_quality as number,
          gaps_detected: repairedFinalMetrics.gaps_detected as number,
        })}\n\n${finalResult}`
      );
    }
  }

  const normalizedReportedMetrics = parseOptionalMetricsFromResult(finalResult);
  if (shouldNormalizeReportedScore(normalizedReportedMetrics)) {
    finalResult = normalizeStructuredReportText(
      `${buildMetricsBlock({
        score: calculateOverallScoreFromMetrics({
          coverage_score: normalizedReportedMetrics.coverage_score as number,
          clarity_rating: normalizedReportedMetrics.clarity_rating as number,
          engagement_level: normalizedReportedMetrics.engagement_level as number,
          assessment_quality: normalizedReportedMetrics.assessment_quality as number,
          gaps_detected: normalizedReportedMetrics.gaps_detected ?? 0,
        }),
        coverage_score: normalizedReportedMetrics.coverage_score as number,
        clarity_rating: normalizedReportedMetrics.clarity_rating as number,
        engagement_level: normalizedReportedMetrics.engagement_level as number,
        assessment_quality: normalizedReportedMetrics.assessment_quality as number,
        gaps_detected: normalizedReportedMetrics.gaps_detected ?? 0,
      })}\n\n${finalResult}`
    );
  }

  const score = extractScoreFromResult(finalResult);
  const metrics = extractMetricsFromResult(finalResult);

  await reportProgress(92, "Saving analysis...");

  const serviceSupabase = createServiceSupabaseClient();

  let dbSaved = false;
  let analysisId: string | null = null;

  const analysisRecord = {
    user_id: targetUserId,
    title: lessonContextTitle || null,
    grade,
    subject,
    coverage_score: metrics.coverage_score,
    clarity_rating: metrics.clarity_rating,
    engagement_level: metrics.engagement_level,
    assessment_quality: metrics.assessment_quality,
    gaps_detected: metrics.gaps_detected,
    transcript,
    result: finalResult,
    created_at: new Date().toISOString(),
  };

  const insertQuery = serviceSupabase
    .from("analyses")
    .insert([analysisRecord])
    .select()
    .single();

  let { data: insertedData, error: dbError } = await insertQuery;

  if (dbError && /assessment_quality/i.test(dbError.message || "")) {
    const legacyRecord = Object.fromEntries(
      Object.entries(analysisRecord).filter(([key]) => key !== "assessment_quality")
    ) as Omit<typeof analysisRecord, "assessment_quality">;
    ({ data: insertedData, error: dbError } = await serviceSupabase
      .from("analyses")
      .insert([legacyRecord])
      .select()
      .single());
  }

  if (dbError) {
    console.error("DB SAVE ERROR:", dbError);
    console.error("Record being saved:", analysisRecord);
  } else if (insertedData) {
    dbSaved = true;
    analysisId = insertedData.id;
  }

  await reportProgress(100, "Analysis complete.");

  return {
    result: finalResult,
    transcript,
    score,
    metrics: {
      score,
      coverage: metrics.coverage_score,
      clarity: metrics.clarity_rating,
      engagement: metrics.engagement_level,
      assessment: metrics.assessment_quality,
      gaps: metrics.gaps_detected,
    },
    analysisId,
    saved: dbSaved,
  };
}

async function processAnalysisJob(
  jobId: string,
  workflowInput: AnalysisWorkflowInput
) {
  await updateAnalysisJob(jobId, {
    status: "processing",
    progress_step: "Preparing analysis...",
    progress_percent: 3,
    error: null,
  });

  try {
    const output = await runAnalysisWorkflow({
      ...workflowInput,
      onProgress: async ({ percent, step }) => {
        await updateAnalysisJob(jobId, {
          status: "processing",
          progress_percent: percent,
          progress_step: step,
        });
      },
    });

    await updateAnalysisJob(jobId, {
      status: "completed",
      progress_percent: 100,
      progress_step: "Analysis complete.",
      result: output.result,
      transcript: output.transcript,
      score: output.metrics.score,
      coverage_score: output.metrics.coverage,
      clarity_rating: output.metrics.clarity,
      engagement_level: output.metrics.engagement,
      assessment_quality: output.metrics.assessment,
      gaps_detected: output.metrics.gaps,
      analysis_id: output.analysisId,
      error: null,
    });
  } catch (error) {
    const message = getErrorMessage(error, "Analysis failed");
    await updateAnalysisJob(jobId, {
      status: "failed",
      progress_step: "Analysis failed.",
      progress_percent: 100,
      error: message,
    });
  }
}

export async function legacyPOST(req: Request) {
  try {
    const formData = await req.formData();
    await cookies();
    const anonSupabase = await createServerClient();

    const { data: { user } } = await anonSupabase.auth.getUser();
    let callerProfile: { role?: string | null; name?: string | null } | null = null;
    let callerRole: string | null = null;
    const observedTeacherValue = formData.get("observedTeacherId");
    const observedTeacherId = typeof observedTeacherValue === "string"
      ? observedTeacherValue.trim()
      : "";
    let targetUserId = user?.id || null;

    if (user?.id) {
      const { data: loadedCallerProfile, error: callerProfileError } = await anonSupabase
        .from("profiles")
        .select("role, name")
        .eq("id", user.id)
        .maybeSingle();

      if (callerProfileError) {
        return safeJson({ result: null, error: callerProfileError.message }, 500);
      }

      callerProfile = loadedCallerProfile;
      callerRole = loadedCallerProfile?.role || null;
    }

    const adminRole = callerRole === 'admin' || callerRole === 'super_admin' ? callerRole : undefined;
    const isAdminCaller = Boolean(adminRole);

    if (isAdminCaller && !observedTeacherId) {
      return safeJson(
        {
          result: null,
          error: 'Admins must select a teacher from the observation flow so reports save to the correct teacher profile.',
        },
        400
      );
    }

    if (observedTeacherId) {
      if (!user?.id) {
        return safeJson({ result: null, error: 'Sign in is required for admin observation mode.' }, 401);
      }
      if (!isAdminCaller) {
        return safeJson({ result: null, error: 'Forbidden' }, 403);
      }

      const visibility = await getAdminVisibility(user.id, adminRole);
      if (!visibility.teacherIds.includes(observedTeacherId)) {
        return safeJson({ result: null, error: 'You can only observe teachers under your scope.' }, 403);
      }

      targetUserId = observedTeacherId;
    }

    let observedTeacherName = '';
    if (observedTeacherId) {
      const { data: observedTeacherProfile } = await anonSupabase
        .from("profiles")
        .select("name")
        .eq("id", observedTeacherId)
        .maybeSingle();

      observedTeacherName = observedTeacherProfile?.name || '';
    }

    const grade = String(formData.get("grade") || "");
    const subject = String(formData.get("subject") || "");
    const book = String(formData.get("book") || "").trim();
    const chapter = String(formData.get("chapter") || "").trim();
    const lectureText = String(formData.get("lecture") || "").trim();
    const waitTimeEvidence = String(formData.get("waitTimeEvidence") || "").trim();
    const audioDurationValue = formData.get("audioDuration");
    const audioDuration = audioDurationValue
      ? Number(audioDurationValue)
      : undefined;

    const files = formData
      .getAll("file")
      .filter(
        (entry): entry is File => entry instanceof File && entry.size > 0
      );

    if (audioDuration && audioDuration > 5400) {
      return safeJson(
        {
          result: null,
          error: "Audio is too long. Please upload a file shorter than 90 minutes.",
        },
        400
      );
    }

    const openai = createOpenAIClient();
    let transcript = lectureText;

    if (files.length > 0) {
      const spokenParts = await transcribeAudioFiles(openai, files, audioDuration);
      const spokenText = spokenParts.join("\n\n");
      if (spokenText) {
        transcript = transcript
          ? `${transcript}\n\nAudio Transcript:\n${spokenText}`
          : spokenText;
      }
    }

    if (!transcript || transcript.trim().length < 10) {
      return safeJson(
        {
          result: null,
          error: "Please provide lesson notes or upload an audio file for transcription.",
        },
        400
      );
    }

    if (!targetUserId) {
      return safeJson({ result: null, error: "Sign in is required to analyze and save lessons." }, 401);
    }

    // Load TEKS standards for this grade/subject combination
    const { standards, overview, found: hasStandards } = getTEKSStandards(grade, subject);

    // Check if this is a STAAR-tested subject/grade
    const isSTAAR = STAAR_SUBJECTS.some(
      (s) => s.grade.toLowerCase() === grade.toLowerCase() && s.subject.toLowerCase() === subject.toLowerCase()
    );
    const primaryPromptStandards = hasStandards
      ? getPrimaryTEKSStandards(grade, subject, transcript, {
          limit: isSTAAR ? 10 : 8,
        })
      : [];
    const relatedPromptStandards = hasStandards
      ? getRelatedTEKSStandards(grade, subject, transcript, {
          limit: isSTAAR ? 10 : 8,
          excludeCodes: primaryPromptStandards.map((standard) => standard.code),
        })
      : [];
    const teksContext = formatTEKSForPrompt(primaryPromptStandards, overview, {
      totalCount: standards.length,
      relatedStandards: relatedPromptStandards,
    });

    const isHigherEdBiology =
      grade.trim().toLowerCase() === 'higher ed' &&
      subject.trim().toLowerCase() === 'biology';
    const isHigherEdCustomText =
      grade.trim().toLowerCase() === 'higher ed' &&
      subject.trim().length > 0 &&
      subject.trim().toLowerCase() !== 'biology';
    const matchedBiologyObjectives = isHigherEdBiology ? getHigherEdBiologyObjectivesForChapter(chapter) : [];
    const lessonContextTitle = chapter
      ? isHigherEdBiology
        ? `Campbell Biology ${chapter}`
        : book
          ? `${book} ${chapter}`
          : chapter
      : '';

    let systemPrompt = `You are an elite instructional coach analyzing classroom teaching. Be specific, evidence-based, and actionable. Organize the report with clear sections, bullet points, and concise language so it is easy to follow.

Every report must feel unique to the lesson in front of you, not like a reusable template. Anchor feedback to concrete evidence from this specific lesson: teacher moves, student responses, task structure, checks for understanding, pacing, and standards alignment. Avoid generic praise or generic coaching phrases unless they are tied to an explicit lesson detail.

Use varied wording across sections. Do not repeat the same sentence frame in multiple sections. When possible, reference 3 or more distinct lesson moments across the report. You may quote short phrases from the transcript when it helps ground the feedback, but keep quotes brief.

Score the lesson with professional calibration. The scores do not need to match each other. Let strengths and weaknesses land where the evidence supports them. Only use the same number across multiple categories if the transcript truly supports that level across all of them.`;

    if (isHigherEdBiology) {
      systemPrompt += `\n\nFor Higher Ed Biology lessons, compare the instruction to a strong introductory undergraduate biology sequence using Campbell Biology as the reference frame. Evaluate whether the lesson reflects accurate biological terminology, concept depth, prerequisite logic, and textbook-level expectations for a college introductory biology course.${matchedBiologyObjectives.length ? ` Also evaluate whether the lesson advances these course objectives inferred from the selected chapter: ${matchedBiologyObjectives.join(' ')}` : ''} If the lesson appears to be one part of a larger sequence, evaluate the submitted recording on its own terms and avoid treating clearly deferred chapter content as missing unless the transcript shows that concept should already have been taught in this lesson.`;
    } else if (isHigherEdCustomText && book) {
      systemPrompt += `\n\nFor this Higher Ed lesson, compare the instruction to the expectations of the provided textbook and chapter. Evaluate whether the lesson reflects accurate terminology, concept depth, prerequisite logic, and chapter-level expectations for that course text.`;
    }

    const waitTimeGuidance = `Important wait-time rule: once the lesson is underway, assume the teacher typically allows about 8 to 10 seconds for student response after questions unless the transcript gives clear evidence that the teacher rushed, answered their own questions, cut students off, or rapidly moved on without space for thinking. Audio transcription often removes silence, pauses, and think time, so do not criticize wait time based only on the absence of transcribed silence. Only flag weak wait time when there is explicit evidence of it in the lesson record.`;
    const transcriptOnlyGuidance = waitTimeEvidence
      ? ''
      : `This lesson was submitted as transcript or notes without audio timing evidence. Do not score pacing, wait time, engagement, or assessment more harshly just because the written transcript is concise, omits pauses, or captures fewer student responses than a full audio transcription would. Judge those areas only from clear positive or negative evidence that appears in the submitted text.`;
    let userPrompt = '';

    const higherEdBiologyFormat = isHigherEdBiology
      ? `\n\n=== HIGHER ED BIOLOGY TEXTBOOK ALIGNMENT ===\nCompare this lesson to the expectations of an introductory college biology course using Campbell Biology as the benchmark. Use labeled bullets for:\n- Textbook Alignment: what chapter-level or concept-level expectations the lesson appears to address.\n- Missing Conceptual Depth: what a strong introductory biology lesson or textbook treatment would include that was missing or underdeveloped here.\n- Terminology Precision: whether the biological language and explanation depth are at the level expected in an introductory biology course.\n- College-Level Recommendation: the most important adjustment needed to better align the lesson to a Campbell Biology-style course sequence.`
      : '';
    const higherEdCustomTextFormat = isHigherEdCustomText && book
      ? `\n\n=== HIGHER ED TEXTBOOK ALIGNMENT ===\nCompare this lesson to ${book}${chapter ? `, ${chapter},` : ''} as the benchmark. Use labeled bullets for:\n- Textbook Alignment: what chapter-level or concept-level expectations the lesson appears to address.\n- Missing Conceptual Depth: what a strong textbook-aligned lesson for this course would include that was missing or underdeveloped here.\n- Terminology Precision: whether the course language and explanation depth are at the level expected for this textbook.\n- College-Level Recommendation: the most important adjustment needed to better align the lesson to this textbook and chapter.`
      : '';

    const reportFormat = `Analyze this lesson transcript and provide feedback in the following structured format. Use these exact section headers and keep the feedback evidence-based, specific, and unbiased.

Important writing rules:
- Make every major section lesson-specific, not generic.
- In each bullet, point to a concrete observed move, student behavior, question type, task design choice, or missed opportunity from this lesson.
- Avoid repeating the same praise or critique in multiple sections.
- If evidence is limited, say what was observable instead of inventing detail.
- Review the full transcript before judging coverage. Do not overweight the opening explanation or analogy if later chunks show broader content coverage.
- Treat the transcript as a full sequence. Check beginning, middle, and end before deciding a concept was omitted or underdeveloped.
- Prioritize the most distinctive strengths and weaknesses from this lesson, not the most common teacher coaching advice.
- Gaps Flagged must match the number of substantive bullets listed in CONTENT GAPS TO REINFORCE. If no meaningful gaps are visible, set Gaps Flagged to 0 and say so plainly.
- Calibrate each metric separately. Coverage, Clarity, Engagement, Assessment Quality, and the overall score should reflect different aspects of the lesson and should not default to the same number unless the evidence clearly supports that.
- EXECUTIVE SUMMARY should synthesize the lesson, not repeat later bullets.
- WHAT WENT WELL and WHAT CAN IMPROVE should contain the clearest distinct evidence, not generic coaching language.
- RECOMMENDED NEXT STEP should build directly from the top improvement need without repeating the same wording already used above.
- INSTRUCTIONAL COACHING FEEDBACK should summarize patterns and implications, not restate earlier bullets verbatim.
- For CONTENT GAPS TO REINFORCE, only include concepts that are truly absent, inaccurate, or materially underdeveloped across the lesson as a whole. If a concept is clearly taught later in the transcript, do not list it as a gap.
- If the recording is part one of a multi-part lesson sequence, distinguish between "not yet covered in this recording" and "incorrectly or inadequately taught."
- For Higher Ed Biology, do not claim mRNA, tRNA, rRNA, codons, transcription, or translation were missing if the transcript explicitly names them and gives their role with basic accuracy. In that case, you may note a need for added depth or precision, but not absence.
- Before naming a biology content gap, verify that the concept was not adequately addressed anywhere in the transcript. If it was taught with reasonable introductory accuracy, frame the issue as limited depth, incomplete distinction, or deferred follow-up instead of saying it was not covered.
- For Higher Ed Biology, anchor missing-content judgments to the selected Campbell Biology chapter and the matched course objective(s), not to every concept that could appear somewhere in a broader biology unit.

Metrics:
Instructional Score (0-100): [number]
Coverage (0-100): [number]
Clarity (0-100): [number]
Engagement (0-100): [number]
Assessment Quality (0-100): [number]
Gaps Flagged: [number]

=== EXECUTIVE SUMMARY ===
Provide a concise 1-2 sentence summary of overall lesson quality, student experience, and biggest instructional takeaway. Mention at least 1 concrete lesson detail. Keep it brief and avoid repeating later bullets.

=== WHAT WENT WELL ===
- [specific strength tied to a concrete lesson moment]
- [specific strength tied to a concrete lesson moment]
- [specific strength tied to a concrete lesson moment]

=== WHAT CAN IMPROVE ===
- [specific area for improvement tied to a concrete lesson moment]
- [specific area for improvement tied to a concrete lesson moment]
- [specific area for improvement tied to a concrete lesson moment]

=== CONTENT GAPS TO REINFORCE ===
Provide a numbered list of the exact content misunderstandings, missing ideas, weak prerequisite links, or underdeveloped biological concepts that need reteach. If there are no meaningful content gaps, write "1. No major content gaps identified."

=== RECOMMENDED NEXT STEP ===
Provide 1 short paragraph with the single highest-leverage next move for the teacher. Limit it to 2-3 sentences. It must directly address the most important weakness from this lesson and explain why it matters here without repeating the summary.

=== INSTRUCTIONAL COACHING FEEDBACK ===
Provide lesson-specific instructional coaching feedback using labeled bullets:
- Key Findings: cite the most important observable patterns from this lesson.
- Missed Opportunities: identify concrete moves that were absent, incomplete, or underdeveloped in this lesson.
- Student Engagement Signals: describe what students appeared to be doing or not doing based on the lesson record.
- Suggested Next Steps: give coaching moves tailored to this lesson, not generic teacher advice.`;

    if (hasStandards) {
      systemPrompt += '\nProvide two distinct types of feedback: (1) Generic instructional quality coaching, and (2) Texas TEKS standards alignment analysis.';
      userPrompt = `Grade: ${grade}\nSubject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}${matchedBiologyObjectives.length ? `\nMatched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}` : ''}\n\n${teksContext}\n\n${waitTimeGuidance}${transcriptOnlyGuidance ? `\n\n${transcriptOnlyGuidance}` : ''}${waitTimeEvidence ? `\n\nAdditional audio timing evidence:\n${waitTimeEvidence}` : ''}\n\n${reportFormat}${higherEdBiologyFormat}${higherEdCustomTextFormat}`;

      if (isSTAAR) {
        userPrompt += `\n\n=== STAAR TEKS COVERAGE ===\nSummarize how well the lesson covered the most important TEKS for this STAAR-tested subject and grade. Use labeled bullets for:\n- Readiness Summary: ...\n- Standards Reinforced:\n  - CODE: exact TEKS description\n  - CODE: exact TEKS description\n- Standards That Need Stronger Assessment Evidence:\n  - CODE: exact TEKS description\n  - CODE: exact TEKS description\n- STAAR Readiness Recommendation: ...\nFor Standards Reinforced and Standards That Need Stronger Assessment Evidence, list only actual TEKS codes with their matching descriptions from the standards reference above. Do not use generic prose in those two fields. For the weaker-assessment field, choose TEKS that are directly related to the lesson topic and concept focus.`;
      }

      userPrompt += `\n\n=== TEXAS TEKS STANDARDS ALIGNMENT ===\nProvide specific curriculum alignment feedback using labeled bullets:
- Covered in the Lesson:
  - CODE: exact TEKS description
  - CODE: exact TEKS description
- Needs Reinforcement:
  - CODE: exact TEKS description
  - CODE: exact TEKS description
- Not Covered in the Lesson:
  - CODE: exact TEKS description
  - CODE: exact TEKS description
- Standards Mastery Notes: observations about depth and quality of standards instruction.
- Recommended Standards Follow-Up: how to better integrate missing or partially developed standards with concrete instructional moves.
For the three standards lists above, use the provided Primary TEKS first, then use the Related Supporting TEKS when they genuinely connect to the lesson. Do not invent codes outside the provided standards reference, and do not use generic prose in those list fields.
\nTranscript:\n${transcript}\n`;
    } else {
      userPrompt = `Grade: ${grade}\nSubject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}${matchedBiologyObjectives.length ? `\nMatched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}` : ''}\n\n${waitTimeGuidance}${transcriptOnlyGuidance ? `\n\n${transcriptOnlyGuidance}` : ''}${waitTimeEvidence ? `\n\nAdditional audio timing evidence:\n${waitTimeEvidence}` : ''}\n\n${reportFormat}${higherEdBiologyFormat}${higherEdCustomTextFormat}\n\nTranscript:\n${transcript}\n`;
    }

    const completion = await callOpenAI(openai, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let result =
      completion.choices[0]?.message?.content || "No result returned";

    result = normalizeStructuredReportText(result);

    if (shouldRepairMetricsBlock(result)) {
      const buildMetricsRepairPrompt = (strictCalibration = false) => `Based on the lesson transcript and the saved report draft below, return only this exact format with integer values:

Metrics:
Instructional Score (0-100): [number]
Coverage (0-100): [number]
Clarity (0-100): [number]
Engagement (0-100): [number]
Assessment Quality (0-100): [number]
Gaps Flagged: [number]

Calibrate each metric independently. Do not give all five instructional metrics the same number unless the evidence clearly supports that. Use the report draft and transcript together to infer the most defensible scores.
${strictCalibration ? 'Avoid a flat 75/75/75/75/75 block unless the transcript overwhelmingly supports identical middle-of-the-road performance across every category. When evidence differs by category, the numbers must differ.' : ''}

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}${matchedBiologyObjectives.length ? `\nMatched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

      const attemptMetricsRepair = async (strictCalibration = false) => {
        const metricsRepair = await callOpenAIMetricsRepair(openai, buildMetricsRepairPrompt(strictCalibration));
        const repairedMetricsText = metricsRepair.choices[0]?.message?.content || '';
        return parseOptionalMetricsFromResult(repairedMetricsText);
      };

      let repairedMetrics = await attemptMetricsRepair(false);

      if (
        Object.values(repairedMetrics).every((value) => value !== null) &&
        (hasSuspiciousDefaultMetrics(repairedMetrics) ||
          new Set([
            repairedMetrics.score,
            repairedMetrics.coverage_score,
            repairedMetrics.clarity_rating,
            repairedMetrics.engagement_level,
            repairedMetrics.assessment_quality,
          ]).size === 1)
      ) {
        repairedMetrics = await attemptMetricsRepair(true);
      }

      if (Object.values(repairedMetrics).every((value) => value !== null)) {
        result = `${buildMetricsBlock({
          score: repairedMetrics.score as number,
          coverage_score: repairedMetrics.coverage_score as number,
          clarity_rating: repairedMetrics.clarity_rating as number,
          engagement_level: repairedMetrics.engagement_level as number,
          assessment_quality: repairedMetrics.assessment_quality as number,
          gaps_detected: repairedMetrics.gaps_detected as number,
        })}\n\n${result}`;
      }
    }

    if (needsWhatWentWellRepair(result)) {
      const strengthsRepairPrompt = `Return only 3 bullets for the "WHAT WENT WELL" section of this lesson report.

Requirements:
- Each bullet must name a real strength that can be supported by the lesson transcript or report draft.
- Each bullet must be specific to this lesson, not generic teacher praise.
- Focus on instructional moves, student engagement signals, explanation choices, questioning, examples, modeling, or structure that actually helped the lesson.
- Keep each bullet to 1-2 sentences.
- Do not include a heading.
- Do not repeat the same point in multiple bullets.
- If the evidence is limited, still identify the strongest genuine positives you can support from the transcript.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

      const strengthsRepair = await callOpenAISectionRepair(openai, strengthsRepairPrompt);
      const repairedStrengthsText = String(strengthsRepair.choices[0]?.message?.content || "")
        .replace(/\r/g, "")
        .trim();

      if (repairedStrengthsText) {
        result = upsertStructuredSection(
          result,
          "WHAT WENT WELL",
          repairedStrengthsText,
          "WHAT CAN IMPROVE"
        );
      }
    }

    if (needsExecutiveSummaryRepair(result)) {
      const executiveSummaryRepairPrompt = `Return only the paragraph for the "EXECUTIVE SUMMARY" section of this lesson report.

Requirements:
- Write 1 to 2 sentences.
- Keep it specific to this lesson.
- Mention the strongest observed strength and the biggest instructional need.
- Ground the summary in actual lesson content, pacing, questioning, modeling, or student understanding evidence.
- Do not include a heading.
- Do not use generic summary wording.
- Keep it brief and direct.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

      const executiveSummaryRepair = await callOpenAISectionRepair(openai, executiveSummaryRepairPrompt);
      const repairedExecutiveSummaryText = String(executiveSummaryRepair.choices[0]?.message?.content || "")
        .replace(/\r/g, "")
        .trim();

      if (repairedExecutiveSummaryText) {
        result = upsertStructuredSection(
          result,
          "EXECUTIVE SUMMARY",
          repairedExecutiveSummaryText,
          "WHAT WENT WELL"
        );
      }
    }

    if (needsWhatCanImproveRepair(result)) {
      const improvementsRepairPrompt = `Return only 3 bullets for the "WHAT CAN IMPROVE" section of this lesson report.

Requirements:
- Each bullet must identify a real improvement need from this exact lesson.
- Make the bullets specific to the observed content, teacher moves, pacing, questioning, checks for understanding, or missed conceptual links.
- Do not use generic coaching phrases unless you tie them to the actual lesson topic.
- Keep each bullet to 1-2 sentences.
- Do not include a heading.
- Do not repeat the same idea across bullets.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

      const improvementsRepair = await callOpenAISectionRepair(openai, improvementsRepairPrompt);
      const repairedImprovementsText = String(improvementsRepair.choices[0]?.message?.content || "")
        .replace(/\r/g, "")
        .trim();

      if (repairedImprovementsText) {
        result = upsertStructuredSection(
          result,
          "WHAT CAN IMPROVE",
          repairedImprovementsText,
          "CONTENT GAPS TO REINFORCE"
        );
      }
    }

    if (needsContentGapsRepair(result)) {
      const contentGapsRepairPrompt = `Return only the numbered list for the "CONTENT GAPS TO REINFORCE" section of this lesson report.

Requirements:
- Provide 0 to 3 specific content gaps, and only include items that are clearly justified by the lesson evidence.
- Each item must name a concrete missing concept, misconception, weak conceptual link, or underdeveloped idea from this lesson.
- Ground the list in the actual lesson content.
- If there are no meaningful content gaps, return exactly: 1. No major content gaps identified.
- Do not include a heading.
- Do not mark a concept as missing if the transcript explicitly teaches it with basic accuracy. In that case, describe the issue as limited depth or incomplete precision instead.
- For Higher Ed Biology, if the transcript explicitly covers a biology concept, term set, or named process, do not list it as absent. Frame the issue as limited depth, incomplete distinction, or deferred follow-up instead.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

      const contentGapsRepair = await callOpenAISectionRepair(openai, contentGapsRepairPrompt);
      const repairedContentGapsText = String(contentGapsRepair.choices[0]?.message?.content || "")
        .replace(/\r/g, "")
        .trim();

      if (repairedContentGapsText) {
        result = upsertStructuredSection(
          result,
          "CONTENT GAPS TO REINFORCE",
          repairedContentGapsText,
          "RECOMMENDED NEXT STEP"
        );
      }
    }

    if (needsRecommendedNextStepRepair(result)) {
      const nextStepRepairPrompt = `Return only the paragraph for the "RECOMMENDED NEXT STEP" section of this lesson report.

Requirements:
- Write one concise paragraph of 2 to 3 sentences.
- Name the single highest-leverage next move for this exact lesson.
- Ground it in the actual lesson content, teacher moves, or missed concept work from the transcript.
- Do not use generic phrasing like "strengthen closure" or "add a quick mastery check" unless you explain what specifically needs to be checked or revisited in this lesson.
- Do not include a heading.
- Keep it brief and to the point.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

      const nextStepRepair = await callOpenAISectionRepair(openai, nextStepRepairPrompt);
      const repairedNextStepText = String(nextStepRepair.choices[0]?.message?.content || "")
        .replace(/\r/g, "")
        .trim();

      if (repairedNextStepText) {
        result = upsertStructuredSection(
          result,
          "RECOMMENDED NEXT STEP",
          repairedNextStepText
        );
      }
    }

    if ((isHigherEdBiology || (isHigherEdCustomText && book)) && needsHigherEdAlignmentRepair(result)) {
      const alignmentHeading = isHigherEdBiology
        ? "HIGHER ED BIOLOGY TEXTBOOK ALIGNMENT"
        : "HIGHER ED TEXTBOOK ALIGNMENT";
      const alignmentRepairPrompt = `Return only the labeled bullets for the "${alignmentHeading}" section of this lesson report.

Requirements:
- Use these exact labels:
  - Textbook Alignment:
  - Missing Conceptual Depth:
  - Terminology Precision:
  - College-Level Recommendation:
- Keep each field concise and specific to this lesson.
- Ground the response in the selected ${isHigherEdBiology ? 'Campbell Biology chapter' : 'textbook and chapter'}.
- Do not include a heading outside of the labeled bullets.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report Draft:
${result}

Transcript:
${transcript}`;

      const alignmentRepair = await callOpenAISectionRepair(openai, alignmentRepairPrompt);
      const repairedAlignmentText = String(alignmentRepair.choices[0]?.message?.content || "")
        .replace(/\r/g, "")
        .trim();

      if (repairedAlignmentText) {
        result = upsertStructuredSection(
          result,
          alignmentHeading,
          repairedAlignmentText,
          "SUBMISSION CONTEXT"
        );
      }
    }

    const contradictedBiologyGapConcepts = isHigherEdBiology
      ? getContradictedHigherEdBiologyGapConcepts(result, transcript)
      : [];

    if (isHigherEdBiology && contradictedBiologyGapConcepts.length > 0) {
      console.warn("BIOLOGY CONSISTENCY REPAIR:", {
        chapter,
        contradictedConcepts: contradictedBiologyGapConcepts,
      });

      const biologyConsistencyRepairPrompt = `The draft lesson report below likely overstates missing content. Some draft content gaps appear to overlap with biology concepts that were explicitly discussed in the transcript.

Potentially contradicted draft gaps:
${contradictedBiologyGapConcepts.map((item, index) => `${index + 1}. Draft gap: ${item.gap}\n   Transcript overlap: ${item.matchedTokens.join(", ")}`).join("\n")}

Return only these exact section headings with replacement content:

=== EXECUTIVE SUMMARY ===
[1 to 2 sentences]

=== WHAT CAN IMPROVE ===
- [bullet]
- [bullet]
- [bullet]

=== CONTENT GAPS TO REINFORCE ===
1. [gap]
2. [gap]
3. [gap]

=== RECOMMENDED NEXT STEP ===
[1 short paragraph]

Rules:
- Do not say a biology concept was missing or not covered when the transcript shows that concept, phrase, or terminology was explicitly taught.
- If a covered concept still needs refinement, frame that as limited depth, incomplete distinction, or uneven precision, not absence.
- Prefer concepts that were truly deferred, missing, or underdeveloped in this specific recording.
- Keep the report specific to this lesson and selected Campbell Biology chapter.
- Preserve a fair, evidence-based tone.

Grade: ${grade}
Subject: ${subject}
Book: Campbell Biology
Chapter / Unit: ${chapter}
Matched Biology Course Objectives: ${matchedBiologyObjectives.join(' ')}

Current Report Draft:
${result}

Transcript:
${transcript}`;

      const biologyConsistencyRepair = await callOpenAISectionRepair(openai, biologyConsistencyRepairPrompt);
      const repairedBiologySections = normalizeStructuredReportText(
        String(biologyConsistencyRepair.choices[0]?.message?.content || "")
          .replace(/\r/g, "")
          .trim()
      );

      const repairedExecutiveSummary = extractStructuredSectionBody(repairedBiologySections, "EXECUTIVE SUMMARY");
      if (repairedExecutiveSummary) {
        result = upsertStructuredSection(result, "EXECUTIVE SUMMARY", repairedExecutiveSummary, "WHAT WENT WELL");
      }

      const repairedImprovements = extractStructuredSectionBody(repairedBiologySections, "WHAT CAN IMPROVE");
      if (repairedImprovements) {
        result = upsertStructuredSection(result, "WHAT CAN IMPROVE", repairedImprovements, "CONTENT GAPS TO REINFORCE");
      }

      const repairedContentGaps = extractStructuredSectionBody(repairedBiologySections, "CONTENT GAPS TO REINFORCE");
      if (repairedContentGaps) {
        result = upsertStructuredSection(result, "CONTENT GAPS TO REINFORCE", repairedContentGaps, "RECOMMENDED NEXT STEP");
      }

      const repairedNextStep = extractStructuredSectionBody(repairedBiologySections, "RECOMMENDED NEXT STEP");
      if (repairedNextStep) {
        result = upsertStructuredSection(result, "RECOMMENDED NEXT STEP", repairedNextStep);
      }

      const existingMetrics = parseOptionalMetricsFromResult(result);
      const normalizedGapCount = getContentGapItems(result).length;
      if (
        existingMetrics.score !== null &&
        existingMetrics.coverage_score !== null &&
        existingMetrics.clarity_rating !== null &&
        existingMetrics.engagement_level !== null &&
        existingMetrics.assessment_quality !== null
      ) {
        result = upsertMetricsBlock(result, {
          score: calculateOverallScoreFromMetrics({
            coverage_score: existingMetrics.coverage_score,
            clarity_rating: existingMetrics.clarity_rating,
            engagement_level: existingMetrics.engagement_level,
            assessment_quality: existingMetrics.assessment_quality,
            gaps_detected: normalizedGapCount,
          }),
          coverage_score: existingMetrics.coverage_score,
          clarity_rating: existingMetrics.clarity_rating,
          engagement_level: existingMetrics.engagement_level,
          assessment_quality: existingMetrics.assessment_quality,
          gaps_detected: normalizedGapCount,
        });
      }
    }

    const submissionContext =
      observedTeacherId
        ? `\n\n=== SUBMISSION CONTEXT ===\n- Submitted by: ${(callerProfile?.name || 'Admin').trim()} (Admin Observation)\n- Saved to Teacher Profile: ${observedTeacherName || 'Selected Teacher'}`
        : "";
    let finalResult = normalizeStructuredReportText(`${result}${submissionContext}`);

    if (shouldRepairMetricsBlock(finalResult)) {
      const finalMetricsRepairPrompt = `Based on the transcript and report below, return only this exact metrics block with integers:

Metrics:
Instructional Score (0-100): [number]
Coverage (0-100): [number]
Clarity (0-100): [number]
Engagement (0-100): [number]
Assessment Quality (0-100): [number]
Gaps Flagged: [number]

Rules:
- Use the transcript and report together.
- Do not return a flat 75/75/75/75/75 block unless the evidence is genuinely identical across every category.
- If the evidence differs by category, the numbers must differ.
- Use the full scoring range when justified by the lesson evidence.

Grade: ${grade}
Subject: ${subject}${book ? `\nBook: ${book}` : ''}${chapter ? `\nChapter / Unit: ${chapter}` : ''}

Report:
${finalResult}

Transcript:
${transcript}`;

      const finalMetricsRepair = await callOpenAIMetricsRepair(openai, finalMetricsRepairPrompt);
      const repairedFinalMetrics = parseOptionalMetricsFromResult(
        String(finalMetricsRepair.choices[0]?.message?.content || "")
      );

      if (Object.values(repairedFinalMetrics).every((value) => value !== null)) {
        finalResult = normalizeStructuredReportText(
          `${buildMetricsBlock({
            score: repairedFinalMetrics.score as number,
            coverage_score: repairedFinalMetrics.coverage_score as number,
            clarity_rating: repairedFinalMetrics.clarity_rating as number,
            engagement_level: repairedFinalMetrics.engagement_level as number,
            assessment_quality: repairedFinalMetrics.assessment_quality as number,
            gaps_detected: repairedFinalMetrics.gaps_detected as number,
          })}\n\n${finalResult}`
        );
      }
    }

    const normalizedReportedMetrics = parseOptionalMetricsFromResult(finalResult);
    if (shouldNormalizeReportedScore(normalizedReportedMetrics)) {
      finalResult = normalizeStructuredReportText(
        `${buildMetricsBlock({
          score: calculateOverallScoreFromMetrics({
            coverage_score: normalizedReportedMetrics.coverage_score as number,
            clarity_rating: normalizedReportedMetrics.clarity_rating as number,
            engagement_level: normalizedReportedMetrics.engagement_level as number,
            assessment_quality: normalizedReportedMetrics.assessment_quality as number,
            gaps_detected: normalizedReportedMetrics.gaps_detected ?? 0,
          }),
          coverage_score: normalizedReportedMetrics.coverage_score as number,
          clarity_rating: normalizedReportedMetrics.clarity_rating as number,
          engagement_level: normalizedReportedMetrics.engagement_level as number,
          assessment_quality: normalizedReportedMetrics.assessment_quality as number,
          gaps_detected: normalizedReportedMetrics.gaps_detected ?? 0,
        })}\n\n${finalResult}`
      );
    }

    const score = extractScoreFromResult(finalResult);
    const metrics = extractMetricsFromResult(finalResult);

    // Service role client to bypass RLS for the insert
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let dbSaved = false;
    let analysisId: string | null = null;

    const analysisRecord = {
      user_id: targetUserId,
      title: lessonContextTitle || null,
      grade,
      subject,
      coverage_score: metrics.coverage_score,
      clarity_rating: metrics.clarity_rating,
      engagement_level: metrics.engagement_level,
      assessment_quality: metrics.assessment_quality,
      gaps_detected: metrics.gaps_detected,
      transcript,
      result: finalResult,
      created_at: new Date().toISOString(),
    };

    const insertQuery = serviceSupabase
      .from("analyses")
      .insert([analysisRecord])
      .select()
      .single();

    let { data: insertedData, error: dbError } = await insertQuery;

    if (dbError && /assessment_quality/i.test(dbError.message || "")) {
      const legacyRecord = Object.fromEntries(
        Object.entries(analysisRecord).filter(([key]) => key !== "assessment_quality")
      ) as Omit<typeof analysisRecord, "assessment_quality">;
      ({ data: insertedData, error: dbError } = await serviceSupabase
        .from("analyses")
        .insert([legacyRecord])
        .select()
        .single());
    }

    if (dbError) {
      console.error("DB SAVE ERROR:", dbError);
      console.error("Record being saved:", analysisRecord);
    } else if (insertedData) {
      dbSaved = true;
      analysisId = insertedData.id;
    }

    return safeJson({
      result: finalResult,
      error: null,
      score,
      metrics: {
        score,
        coverage: metrics.coverage_score,
        clarity: metrics.clarity_rating,
        engagement: metrics.engagement_level,
        assessment: metrics.assessment_quality,
        gaps: metrics.gaps_detected,
      },
      saved: dbSaved,
      analysisId,
      transcript,
    });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);

    const message = getErrorMessage(err, "Analysis failed");
    const userError = message.includes("longer than")
      ? "Audio is too long for transcription. Please upload a file under 90 minutes."
      : message;

    return safeJson(
      {
        result: null,
        error: userError,
      },
      400
    );
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    await cookies();
    const anonSupabase = await createServerClient();

    const { data: { user } } = await anonSupabase.auth.getUser();
    let callerProfile: { role?: string | null; name?: string | null } | null = null;
    let callerRole: string | null = null;
    const observedTeacherValue = formData.get("observedTeacherId");
    const observedTeacherId = typeof observedTeacherValue === "string"
      ? observedTeacherValue.trim()
      : "";
    let targetUserId = user?.id || null;

    if (user?.id) {
      const { data: loadedCallerProfile, error: callerProfileError } = await anonSupabase
        .from("profiles")
        .select("role, name")
        .eq("id", user.id)
        .maybeSingle();

      if (callerProfileError) {
        return safeJson({ result: null, error: callerProfileError.message }, 500);
      }

      callerProfile = loadedCallerProfile;
      callerRole = loadedCallerProfile?.role || null;
    }

    const adminRole = callerRole === "admin" || callerRole === "super_admin" ? callerRole : undefined;
    const isAdminCaller = Boolean(adminRole);

    if (isAdminCaller && !observedTeacherId) {
      return safeJson(
        {
          result: null,
          error: "Admins must select a teacher from the observation flow so reports save to the correct teacher profile.",
        },
        400
      );
    }

    if (observedTeacherId) {
      if (!user?.id) {
        return safeJson({ result: null, error: "Sign in is required for admin observation mode." }, 401);
      }
      if (!isAdminCaller) {
        return safeJson({ result: null, error: "Forbidden" }, 403);
      }

      const visibility = await getAdminVisibility(user.id, adminRole);
      if (!visibility.teacherIds.includes(observedTeacherId)) {
        return safeJson({ result: null, error: "You can only observe teachers under your scope." }, 403);
      }

      targetUserId = observedTeacherId;
    }

    let observedTeacherName = "";
    if (observedTeacherId) {
      const { data: observedTeacherProfile } = await anonSupabase
        .from("profiles")
        .select("name")
        .eq("id", observedTeacherId)
        .maybeSingle();

      observedTeacherName = observedTeacherProfile?.name || "";
    }

    const grade = String(formData.get("grade") || "");
    const subject = String(formData.get("subject") || "");
    const book = String(formData.get("book") || "").trim();
    const chapter = String(formData.get("chapter") || "").trim();
    const lectureText = String(formData.get("lecture") || "").trim();
    const waitTimeEvidence = String(formData.get("waitTimeEvidence") || "").trim();
    const audioDurationValue = formData.get("audioDuration");
    const audioDuration = audioDurationValue
      ? Number(audioDurationValue)
      : undefined;

    const files = formData
      .getAll("file")
      .filter(
        (entry): entry is File => entry instanceof File && entry.size > 0
      );

    if (!targetUserId) {
      return safeJson({ result: null, error: "Sign in is required to analyze and save lessons." }, 401);
    }

    if (audioDuration && audioDuration > 5400) {
      return safeJson(
        {
          result: null,
          error: "Audio is too long. Please upload a file shorter than 90 minutes.",
        },
        400
      );
    }

    if (!lectureText && files.length === 0) {
      return safeJson(
        {
          result: null,
          error: "Please provide lesson notes or upload an audio file for transcription.",
        },
        400
      );
    }

    const serviceSupabase = createServiceSupabaseClient();
    const { data: insertedJob, error: jobInsertError } = await serviceSupabase
      .from("analysis_jobs")
      .insert([
        {
          submitted_by_user_id: user?.id || null,
          target_user_id: targetUserId,
          observed_teacher_id: observedTeacherId || null,
          observed_teacher_name: observedTeacherName || null,
          grade,
          subject,
          book,
          chapter,
          audio_duration_seconds: audioDuration ?? null,
          status: "queued",
          progress_step: files.length > 0 ? "Queued and preparing audio..." : "Queued for analysis...",
          progress_percent: 2,
        },
      ])
      .select("id")
      .single();

    if (jobInsertError || !insertedJob?.id) {
      console.error("ANALYSIS JOB INSERT FAILED, FALLING BACK TO DIRECT ANALYSIS:", jobInsertError);

      const fallbackOutput = await runAnalysisWorkflow({
        targetUserId,
        observedTeacherId,
        observedTeacherName,
        callerProfileName: callerProfile?.name || "",
        grade,
        subject,
        book,
        chapter,
        lectureText,
        waitTimeEvidence,
        audioDuration,
        files,
      });

      return safeJson({
        queued: false,
        jobId: null,
        result: fallbackOutput.result,
        transcript: fallbackOutput.transcript,
        score: fallbackOutput.score,
        metrics: fallbackOutput.metrics,
        saved: fallbackOutput.saved,
        warning:
          "Background analysis was unavailable, so the report was completed inline for this request.",
        error: null,
      });
    }

    const jobId = insertedJob.id as string;

    after(async () => {
      await processAnalysisJob(jobId, {
        targetUserId,
        observedTeacherId,
        observedTeacherName,
        callerProfileName: callerProfile?.name || "",
        grade,
        subject,
        book,
        chapter,
        lectureText,
        waitTimeEvidence,
        audioDuration,
        files,
      });
    });

    return safeJson({
      queued: true,
      jobId,
      status: "queued",
      progressStep: files.length > 0 ? "Queued and preparing audio..." : "Queued for analysis...",
      progressPercent: 2,
      error: null,
    });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);

    const message = getErrorMessage(err, "Analysis failed");
    const userError = message.includes("longer than")
      ? "Audio is too long for transcription. Please upload a file under 90 minutes."
      : message;

    return safeJson(
      {
        result: null,
        error: userError,
      },
      400
    );
  }
}
