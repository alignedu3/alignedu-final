export type ReportSection = {
  title: string;
  content: string;
  bullets: string[];
};

export type StandardEntry = {
  code: string;
  description: string;
  raw: string;
};

const REPORT_HEADING_MAP: Record<string, string> = {
  "instructional coaching feedback": "Coaching Priorities",
  "texas teks standards alignment": "Standards Alignment",
  "staar teks coverage": "Assessment Readiness",
  metrics: "Performance Snapshot",
  summary: "Executive Summary",
};

const STRUCTURED_SECTION_HEADINGS = [
  'EXECUTIVE SUMMARY',
  'WHAT WENT WELL',
  'WHAT CAN IMPROVE',
  'CONTENT GAPS TO REINFORCE',
  'RECOMMENDED NEXT STEP',
  'INSTRUCTIONAL COACHING FEEDBACK',
  'TEXAS TEKS STANDARDS ALIGNMENT',
  'STAAR TEKS COVERAGE',
  'HIGHER ED BIOLOGY TEXTBOOK ALIGNMENT',
  'HIGHER ED TEXTBOOK ALIGNMENT',
  'SUBMISSION CONTEXT',
] as const;

export function cleanDisplayText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-•*]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeStructuredReportText(text: string) {
  if (!text) return '';
  const lines = text.replace(/\r/g, '').split('\n');

  const normalizedLines = lines.flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) return [line];

    for (const heading of STRUCTURED_SECTION_HEADINGS) {
      const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = trimmed.match(new RegExp(`^${escapedHeading}\\s*:?\\s*(.*)$`, 'i'));

      if (!match) continue;

      const remainder = cleanDisplayText(match[1] || '');
      if (remainder) {
        return [`=== ${heading} ===`, remainder];
      }

      return [`=== ${heading} ===`];
    }

    return [line];
  });

  return normalizedLines.join('\n');
}

function normalizeTitle(title: string) {
  const cleaned = cleanDisplayText(title)
    .replace(/^=+\s*/, "")
    .replace(/\s*=+$/, "")
    .replace(/:+$/, "")
    .trim();

  const mapped = REPORT_HEADING_MAP[cleaned.toLowerCase()];
  if (mapped) return mapped;
  if (!cleaned) return "Summary";
  return cleaned;
}

function normalizeSectionLookup(value: string) {
  return cleanDisplayText(value).toLowerCase().trim();
}

function cleanBulletText(line: string) {
  return cleanDisplayText(line)
    .replace(/^[-•*]\s*/, "")
    .replace(/^[0-9]+\.\s*/, "")
    .trim();
}

export function parseLabeledSection(content: string): ReportSection[] {
  if (!content.trim()) return [];

  const matches = Array.from(
    content.matchAll(/(?:^|\n)\s*[-•*]\s*([^:\n]+):\s*([\s\S]*?)(?=(?:\n\s*[-•*]\s*[^:\n]+:\s*)|$)/g)
  );

  if (matches.length > 0) {
    return matches
      .map((match) => {
        const body = cleanDisplayText(match[2] || "");
        const bullets = body
          .split(/\n+/)
          .map((line) => cleanBulletText(line))
          .filter(Boolean);

        return {
          title: normalizeTitle(match[1] || "Summary"),
          content: body,
          bullets: bullets.length > 1 ? bullets : [],
        };
      })
      .filter((section) => section.content || section.bullets.length);
  }

  const fallback = cleanDisplayText(content);
  return fallback
    ? [{ title: "Summary", content: fallback, bullets: [] }]
    : [];
}

export function parseAnalysisResult(text: string): ReportSection[] {
  if (!text) return [];

  const cleaned = cleanDisplayText(normalizeStructuredReportText(text))
    .replace(/Metrics:\s*[\s\S]*?(?=\n(?:===|[A-Z][A-Za-z\s]+:)|$)/i, "")
    .replace(/===\s*EXECUTIVE SUMMARY\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*WHAT WENT WELL\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*WHAT CAN IMPROVE\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*CONTENT GAPS TO REINFORCE\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*RECOMMENDED NEXT STEP\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*INSTRUCTIONAL COACHING FEEDBACK\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*TEXAS TEKS STANDARDS ALIGNMENT\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*STAAR TEKS COVERAGE\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*HIGHER ED BIOLOGY TEXTBOOK ALIGNMENT\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*HIGHER ED TEXTBOOK ALIGNMENT\s*===[\s\S]*?(?====|$)/gi, "")
    .replace(/===\s*SUBMISSION CONTEXT\s*===[\s\S]*?(?====|$)/gi, "")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const firstLine = lines[0] || "";
      const bodyLines = lines.slice(1);
      const isHeading =
        lines.length > 1 &&
        !/^[-•*]/.test(firstLine) &&
        !/^[0-9]+\./.test(firstLine) &&
        firstLine.length < 80;

      const content = cleanDisplayText(isHeading ? bodyLines.join("\n") : lines.join("\n"));
      const bullets = (isHeading ? bodyLines : lines)
        .filter((line) => /^[-•*]/.test(line) || /^[0-9]+\./.test(line))
        .map((line) => cleanBulletText(line))
        .filter(Boolean);

      return {
        title: normalizeTitle(isHeading ? firstLine : "Summary"),
        content,
        bullets: bullets.length === lines.length || bullets.length > 1 ? bullets : [],
      };
    })
    .filter((section) => section.content || section.bullets.length);
}

export function parseAnalysisMetrics(text: string) {
  const stringValue = (match: RegExpMatchArray | null) =>
    match ? Number(match[1]) : null;

  const score = stringValue(text.match(/Instructional Score[\s\S]*?:\s*([0-9]{1,3})/i));
  const coverage = stringValue(text.match(/Coverage[\s\S]*?:\s*([0-9]{1,3})/i));
  const clarity = stringValue(text.match(/Clarity[\s\S]*?:\s*([0-9]{1,3})/i));
  const engagement = stringValue(text.match(/Engagement[\s\S]*?:\s*([0-9]{1,3})/i));
  const assessment = stringValue(text.match(/Assessment Quality[\s\S]*?:\s*([0-9]{1,3})/i));
  const gaps = stringValue(text.match(/Gaps(?:\s*Flagged)?[\s\S]*?:\s*([0-9]{1,3})/i));

  return {
    score: score ?? null,
    coverage: coverage ?? null,
    clarity: clarity ?? null,
    engagement: engagement ?? null,
    assessment: assessment ?? null,
    gaps: gaps ?? null,
  };
}

function extractSimpleSection(text: string, sectionName: string) {
  const normalized = normalizeStructuredReportText(text);
  const match = normalized.match(new RegExp(`===\\s*${sectionName}\\s*===([\\s\\S]*?)(?====|$)`, "i"));
  return cleanDisplayText(match?.[1] || "");
}

function extractBulletSection(text: string, sectionName: string) {
  return extractSimpleSection(text, sectionName)
    .split(/\n+/)
    .map((line) => cleanBulletText(line))
    .filter(Boolean);
}

export function parseFeedbackSections(text: string) {
  const normalized = normalizeStructuredReportText(text);
  const coachingMatch = normalized.match(/===\s*INSTRUCTIONAL COACHING FEEDBACK\s*===([\s\S]*?)(?====|$)/i);
  const teksMatch = normalized.match(/===\s*TEXAS TEKS STANDARDS ALIGNMENT\s*===([\s\S]*?)(?====|$)/i);
  const staarMatch = normalized.match(/===\s*STAAR TEKS COVERAGE\s*===([\s\S]*?)(?====|$)/i);
  const contentGapsMatch = normalized.match(/===\s*CONTENT GAPS TO REINFORCE\s*===([\s\S]*?)(?====|$)/i);
  const submissionContextMatch = normalized.match(/===\s*SUBMISSION CONTEXT\s*===([\s\S]*?)(?====|$)/i);

  return {
    executiveSummary: extractSimpleSection(normalized, "EXECUTIVE SUMMARY"),
    whatWentWell: extractBulletSection(normalized, "WHAT WENT WELL"),
    whatCanImprove: extractBulletSection(normalized, "WHAT CAN IMPROVE"),
    recommendedNextStep: extractSimpleSection(normalized, "RECOMMENDED NEXT STEP"),
    contentGaps: contentGapsMatch ? parseLabeledSection(contentGapsMatch[1]) : parseLabeledSection(extractSimpleSection(normalized, "CONTENT GAPS TO REINFORCE")),
    coaching: coachingMatch ? parseLabeledSection(coachingMatch[1]) : [],
    teks: teksMatch ? parseLabeledSection(teksMatch[1]) : [],
    staar: staarMatch ? parseLabeledSection(staarMatch[1]) : [],
    submissionContext: submissionContextMatch ? parseLabeledSection(submissionContextMatch[1]) : [],
  };
}

export function findReportSection(
  sections: ReportSection[],
  titles: string[]
) {
  const normalizedTitles = new Set(titles.map(normalizeSectionLookup));
  return sections.find((section) => normalizedTitles.has(normalizeSectionLookup(section.title)));
}

export function extractSectionText(
  sections: ReportSection[],
  titles: string[]
) {
  const section = findReportSection(sections, titles);
  if (!section) return '';
  return cleanDisplayText(section.content || section.bullets.join('\n'));
}

export function extractStandardEntries(
  sections: ReportSection[],
  titles: string[]
) {
  const section = findReportSection(sections, titles);
  if (!section) return [] as StandardEntry[];

  const sourceLines = section.bullets.length
    ? section.bullets
    : cleanDisplayText(section.content)
        .split(/\n+/)
        .map((line) => cleanBulletText(line))
        .filter(Boolean);

  return sourceLines
    .map((line) => {
      const match = line.match(/^([^:\s][^:]*)\s*:\s*(.+)$/);
      if (!match) return null;
      return {
        code: match[1].trim(),
        description: match[2].trim(),
        raw: line,
      } satisfies StandardEntry;
    })
    .filter((entry): entry is StandardEntry => Boolean(entry));
}

export function getScoreBand(score: number | null) {
  if (score === null) return { label: "Report Ready", tone: "#64748b" };
  if (score >= 85) return { label: "Strong Practice", tone: "#15803d" };
  if (score >= 70) return { label: "Solid With Refinements", tone: "#b45309" };
  return { label: "Priority Support Area", tone: "#b91c1c" };
}
