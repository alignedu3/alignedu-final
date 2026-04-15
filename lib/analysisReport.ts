export type ReportSection = {
  title: string;
  content: string;
  bullets: string[];
};

const REPORT_HEADING_MAP: Record<string, string> = {
  "instructional coaching feedback": "Coaching Priorities",
  "texas teks standards alignment": "Standards Alignment",
  "staar teks coverage": "Assessment Readiness",
  metrics: "Performance Snapshot",
  summary: "Executive Summary",
};

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

  const cleaned = cleanDisplayText(text)
    .replace(/Metrics:\s*[\s\S]*?(?=\n(?:===|[A-Z][A-Za-z\s]+:)|$)/i, "")
    .replace(/===\s*EXECUTIVE SUMMARY\s*===/gi, "")
    .replace(/===\s*WHAT WENT WELL\s*===/gi, "")
    .replace(/===\s*WHAT CAN IMPROVE\s*===/gi, "")
    .replace(/===\s*RECOMMENDED NEXT STEP\s*===/gi, "")
    .replace(/===\s*INSTRUCTIONAL COACHING FEEDBACK\s*===/gi, "")
    .replace(/===\s*TEXAS TEKS STANDARDS ALIGNMENT\s*===/gi, "")
    .replace(/===\s*STAAR TEKS COVERAGE\s*===/gi, "")
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
  const match = text.match(new RegExp(`===\\s*${sectionName}\\s*===([\\s\\S]*?)(?====|$)`, "i"));
  return cleanDisplayText(match?.[1] || "");
}

function extractBulletSection(text: string, sectionName: string) {
  return extractSimpleSection(text, sectionName)
    .split(/\n+/)
    .map((line) => cleanBulletText(line))
    .filter(Boolean);
}

export function parseFeedbackSections(text: string) {
  const coachingMatch = text.match(/===\s*INSTRUCTIONAL COACHING FEEDBACK\s*===([\s\S]*?)(?====|$)/i);
  const teksMatch = text.match(/===\s*TEXAS TEKS STANDARDS ALIGNMENT\s*===([\s\S]*?)(?====|$)/i);
  const staarMatch = text.match(/===\s*STAAR TEKS COVERAGE\s*===([\s\S]*?)(?====|$)/i);

  return {
    executiveSummary: extractSimpleSection(text, "EXECUTIVE SUMMARY"),
    whatWentWell: extractBulletSection(text, "WHAT WENT WELL"),
    whatCanImprove: extractBulletSection(text, "WHAT CAN IMPROVE"),
    recommendedNextStep: extractSimpleSection(text, "RECOMMENDED NEXT STEP"),
    coaching: coachingMatch ? parseLabeledSection(coachingMatch[1]) : [],
    teks: teksMatch ? parseLabeledSection(teksMatch[1]) : [],
    staar: staarMatch ? parseLabeledSection(staarMatch[1]) : [],
  };
}

export function getScoreBand(score: number | null) {
  if (score === null) return { label: "Report Ready", tone: "#64748b" };
  if (score >= 85) return { label: "Strong Practice", tone: "#15803d" };
  if (score >= 70) return { label: "Solid With Refinements", tone: "#b45309" };
  return { label: "Priority Support Area", tone: "#b91c1c" };
}
