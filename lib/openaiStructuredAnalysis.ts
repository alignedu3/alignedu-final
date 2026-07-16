import OpenAI from "openai";

type LabeledSection = {
  label: string;
  content: string;
  bullets: string[];
};

type StructuredAnalysis = {
  metrics: {
    instructionalScore: number;
    coverage: number;
    clarity: number;
    engagement: number;
    assessmentQuality: number;
    gapsFlagged: number;
  };
  executiveSummary: string;
  whatWentWell: string[];
  whatCanImprove: string[];
  contentGapsToReinforce: string[];
  recommendedNextStep: string;
  lessonEvidence: LabeledSection[];
  teacherActionPlan: LabeledSection[];
  administratorCoachingPlan: LabeledSection[];
  instructionalCoachingFeedback: LabeledSection[];
  teksStandardsAlignment: LabeledSection[] | null;
  staarTeksCoverage: LabeledSection[] | null;
  higherEdAlignment: LabeledSection[] | null;
};

type GenerateStructuredAnalysisParams = {
  openai: OpenAI;
  systemPrompt: string;
  userPrompt: string;
  higherEdAlignmentTitle?: "HIGHER ED BIOLOGY TEXTBOOK ALIGNMENT" | "HIGHER ED TEXTBOOK ALIGNMENT";
};

export type StructuredAnalysisGenerationDiagnostics = {
  apiPath: "responses";
  model: string;
  attemptCount: number;
};

const STRUCTURED_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "metrics",
    "executiveSummary",
    "whatWentWell",
    "whatCanImprove",
    "contentGapsToReinforce",
    "recommendedNextStep",
    "lessonEvidence",
    "teacherActionPlan",
    "administratorCoachingPlan",
    "instructionalCoachingFeedback",
    "teksStandardsAlignment",
    "staarTeksCoverage",
    "higherEdAlignment",
  ],
  properties: {
    metrics: {
      type: "object",
      additionalProperties: false,
      required: [
        "instructionalScore",
        "coverage",
        "clarity",
        "engagement",
        "assessmentQuality",
        "gapsFlagged",
      ],
      properties: {
        instructionalScore: { type: "integer", minimum: 0, maximum: 100 },
        coverage: { type: "integer", minimum: 0, maximum: 100 },
        clarity: { type: "integer", minimum: 0, maximum: 100 },
        engagement: { type: "integer", minimum: 0, maximum: 100 },
        assessmentQuality: { type: "integer", minimum: 0, maximum: 100 },
        gapsFlagged: { type: "integer", minimum: 0, maximum: 25 },
      },
    },
    executiveSummary: { type: "string" },
    whatWentWell: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
    whatCanImprove: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
    contentGapsToReinforce: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    recommendedNextStep: { type: "string" },
    lessonEvidence: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "content", "bullets"],
        properties: {
          label: { type: "string" },
          content: { type: "string" },
          bullets: { type: "array", maxItems: 2, items: { type: "string" } },
        },
      },
    },
    teacherActionPlan: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "content", "bullets"],
        properties: {
          label: { type: "string" },
          content: { type: "string" },
          bullets: { type: "array", maxItems: 3, items: { type: "string" } },
        },
      },
    },
    administratorCoachingPlan: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "content", "bullets"],
        properties: {
          label: { type: "string" },
          content: { type: "string" },
          bullets: { type: "array", maxItems: 3, items: { type: "string" } },
        },
      },
    },
    instructionalCoachingFeedback: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "content", "bullets"],
        properties: {
          label: { type: "string" },
          content: { type: "string" },
          bullets: {
            type: "array",
            maxItems: 5,
            items: { type: "string" },
          },
        },
      },
    },
    teksStandardsAlignment: {
      anyOf: [
        {
          type: "array",
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "content", "bullets"],
            properties: {
              label: { type: "string" },
              content: { type: "string" },
              bullets: {
                type: "array",
                maxItems: 8,
                items: { type: "string" },
              },
            },
          },
        },
        { type: "null" },
      ],
    },
    staarTeksCoverage: {
      anyOf: [
        {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "content", "bullets"],
            properties: {
              label: { type: "string" },
              content: { type: "string" },
              bullets: {
                type: "array",
                maxItems: 8,
                items: { type: "string" },
              },
            },
          },
        },
        { type: "null" },
      ],
    },
    higherEdAlignment: {
      anyOf: [
        {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "content", "bullets"],
            properties: {
              label: { type: "string" },
              content: { type: "string" },
              bullets: {
                type: "array",
                maxItems: 5,
                items: { type: "string" },
              },
            },
          },
        },
        { type: "null" },
      ],
    },
  },
} as const;

function uniqueModels() {
  const configured = process.env.OPENAI_ANALYSIS_MODEL?.trim();
  return [...new Set([configured, "gpt-5.6", "gpt-5.6-terra", "gpt-5.6-luna"].filter(Boolean))] as string[];
}

function clampScore(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim()
    : "";
}

function cleanBullets(value: unknown, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanLabeledSections(value: unknown, maxItems = 6) {
  if (!Array.isArray(value)) return null;
  const sections = value
    .map((item) => {
      const typed = item as Partial<LabeledSection> | null;
      return {
        label: cleanText(typed?.label),
        content: cleanText(typed?.content),
        bullets: cleanBullets(typed?.bullets, 8),
      };
    })
    .filter((item) => item.label && (item.content || item.bullets.length))
    .slice(0, maxItems);

  return sections.length ? sections : null;
}

export function normalizeStructuredAnalysisPayload(payload: unknown): StructuredAnalysis {
  const typed = payload as Partial<StructuredAnalysis> | null;
  const contentGaps = cleanBullets(typed?.contentGapsToReinforce, 8);
  const noGapPlaceholder = contentGaps.length === 0 ? ["No major content gaps identified."] : contentGaps;
  const computedGapCount =
    noGapPlaceholder.length === 1 && /^no major content gaps identified\.?$/i.test(noGapPlaceholder[0])
      ? 0
      : noGapPlaceholder.length;

  return {
    metrics: {
      instructionalScore: clampScore(typed?.metrics?.instructionalScore, 75),
      coverage: clampScore(typed?.metrics?.coverage, 75),
      clarity: clampScore(typed?.metrics?.clarity, 75),
      engagement: clampScore(typed?.metrics?.engagement, 75),
      assessmentQuality: clampScore(typed?.metrics?.assessmentQuality, 75),
      gapsFlagged: clampScore(typed?.metrics?.gapsFlagged, computedGapCount),
    },
    executiveSummary: cleanText(typed?.executiveSummary),
    whatWentWell: cleanBullets(typed?.whatWentWell, 5).slice(0, 3),
    whatCanImprove: cleanBullets(typed?.whatCanImprove, 5).slice(0, 3),
    contentGapsToReinforce: noGapPlaceholder,
    recommendedNextStep: cleanText(typed?.recommendedNextStep),
    lessonEvidence: cleanLabeledSections(typed?.lessonEvidence, 5) || [],
    teacherActionPlan: cleanLabeledSections(typed?.teacherActionPlan, 4) || [],
    administratorCoachingPlan: cleanLabeledSections(typed?.administratorCoachingPlan, 4) || [],
    instructionalCoachingFeedback: cleanLabeledSections(typed?.instructionalCoachingFeedback, 6) || [],
    teksStandardsAlignment: cleanLabeledSections(typed?.teksStandardsAlignment, 6),
    staarTeksCoverage: cleanLabeledSections(typed?.staarTeksCoverage, 5),
    higherEdAlignment: cleanLabeledSections(typed?.higherEdAlignment, 5),
  };
}

function renderMetricsBlock(metrics: StructuredAnalysis["metrics"]) {
  return `Metrics:
Instructional Score (0-100): ${metrics.instructionalScore}
Coverage (0-100): ${metrics.coverage}
Clarity (0-100): ${metrics.clarity}
Engagement (0-100): ${metrics.engagement}
Assessment Quality (0-100): ${metrics.assessmentQuality}
Gaps Flagged: ${metrics.gapsFlagged}`;
}

function renderBulletSection(title: string, bullets: string[]) {
  const safeBullets = bullets.length ? bullets : ["No specific evidence returned."];
  return `=== ${title} ===
${safeBullets.map((bullet) => `- ${bullet}`).join("\n")}`;
}

function renderSimpleSection(title: string, content: string, fallback: string) {
  return `=== ${title} ===
${content || fallback}`;
}

function renderLabeledSection(title: string, sections: LabeledSection[] | null) {
  if (!sections?.length) return "";

  const body = sections
    .map((section) => {
      const lines = [`- ${section.label}: ${section.content || ""}`.trimEnd()];
      for (const bullet of section.bullets) {
        lines.push(`  - ${bullet}`);
      }
      return lines.join("\n");
    })
    .join("\n");

  return `=== ${title} ===
${body}`;
}

function renderContentGaps(items: string[]) {
  return `=== CONTENT GAPS TO REINFORCE ===
${items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;
}

export function renderStructuredAnalysisToLegacyText(
  result: StructuredAnalysis,
  higherEdAlignmentTitle: GenerateStructuredAnalysisParams["higherEdAlignmentTitle"]
) {
  const parts = [
    renderMetricsBlock({
      ...result.metrics,
      gapsFlagged:
        result.contentGapsToReinforce.length === 1 &&
        /^no major content gaps identified\.?$/i.test(result.contentGapsToReinforce[0])
          ? 0
          : result.contentGapsToReinforce.length,
    }),
    renderSimpleSection("EXECUTIVE SUMMARY", result.executiveSummary, "Lesson summary unavailable."),
    renderBulletSection("WHAT WENT WELL", result.whatWentWell),
    renderBulletSection("WHAT CAN IMPROVE", result.whatCanImprove),
    renderContentGaps(result.contentGapsToReinforce),
    renderSimpleSection("RECOMMENDED NEXT STEP", result.recommendedNextStep, "No next step recommendation returned."),
    renderLabeledSection("EVIDENCE FROM THE LESSON", result.lessonEvidence),
    renderLabeledSection("NEXT-LESSON ACTION PLAN", result.teacherActionPlan),
    renderLabeledSection("ADMINISTRATOR COACHING PLAN", result.administratorCoachingPlan),
    renderLabeledSection("INSTRUCTIONAL COACHING FEEDBACK", result.instructionalCoachingFeedback),
    renderLabeledSection("TEXAS TEKS STANDARDS ALIGNMENT", result.teksStandardsAlignment),
    renderLabeledSection("STAAR TEKS COVERAGE", result.staarTeksCoverage),
    renderLabeledSection(
      higherEdAlignmentTitle || "HIGHER ED BIOLOGY TEXTBOOK ALIGNMENT",
      result.higherEdAlignment
    ),
  ].filter(Boolean);

  return parts.join("\n\n").trim();
}

export async function generateStructuredAnalysisReport({
  openai,
  systemPrompt,
  userPrompt,
  higherEdAlignmentTitle,
}: GenerateStructuredAnalysisParams) {
  const models = uniqueModels();
  let lastError: unknown = null;

  for (const [index, model] of models.entries()) {
    try {
      const response = await openai.responses.create({
        model,
        instructions: `${systemPrompt}

Return a single JSON object that matches the provided schema exactly.
- Do not include markdown code fences.
- Put list-style lesson evidence into arrays instead of one large paragraph.
- If a section does not apply, return null for that section.
- Keep all claims evidence-based and lesson-specific.`,
        input: `${userPrompt}

Return the lesson analysis as structured JSON using the provided schema. Populate every required field. Keep metrics internally consistent with the content gaps and recommendations.`,
        reasoning: model.startsWith("gpt-5") ? { effort: "medium" } : { effort: "low" },
        text: {
          format: {
            type: "json_schema",
            name: "lesson_analysis_report",
            strict: true,
            schema: STRUCTURED_ANALYSIS_SCHEMA,
          },
        },
      });

      const raw = response.output_text?.trim();
      if (!raw) {
        throw new Error(`Responses API returned no output_text for model ${model}.`);
      }

      const parsed = JSON.parse(raw);
      return {
        reportText: renderStructuredAnalysisToLegacyText(
          normalizeStructuredAnalysisPayload(parsed),
          higherEdAlignmentTitle
        ),
        diagnostics: {
          apiPath: "responses" as const,
          model,
          attemptCount: index + 1,
        },
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Structured analysis generation failed for all configured models.");
}
