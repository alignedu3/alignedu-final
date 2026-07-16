export type AnalysisQualityResult = {
  passed: boolean;
  score: number;
  issues: string[];
};

function sectionBody(report: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return report.match(new RegExp(`===\\s*${escaped}\\s*===([\\s\\S]*?)(?====|$)`, "i"))?.[1]?.trim() || "";
}

function labeledItemCount(body: string) {
  return (body.match(/^\s*[-•*]\s*[^:\n]+:/gm) || []).length;
}

function normalizedSentences(report: string) {
  return report
    .replace(/Metrics:[\s\S]*?(?====|$)/i, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/^\s*[-•*\d.]+\s*/, "").toLowerCase().replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 45);
}

export function evaluateAnalysisQuality(report: string): AnalysisQualityResult {
  const issues: string[] = [];
  const evidence = sectionBody(report, "EVIDENCE FROM THE LESSON");
  const teacherPlan = sectionBody(report, "NEXT-LESSON ACTION PLAN");
  const adminPlan = sectionBody(report, "ADMINISTRATOR COACHING PLAN");
  const nextStep = sectionBody(report, "RECOMMENDED NEXT STEP");

  if (labeledItemCount(evidence) < 3) issues.push("Fewer than three lesson-evidence records were provided.");
  if (labeledItemCount(teacherPlan) < 4) issues.push("The next-lesson plan is incomplete.");
  if (labeledItemCount(adminPlan) < 4) issues.push("The administrator coaching plan is incomplete.");
  if (nextStep.length < 80) issues.push("The recommended next step is not sufficiently developed.");

  const sentences = normalizedSentences(report);
  if (new Set(sentences).size < sentences.length) issues.push("The report repeats one or more substantive sentences.");

  const unsupportedCertainty = report.match(/\b(all|every) students? (understood|mastered|were engaged|learned)\b/gi) || [];
  if (unsupportedCertainty.length > 0) issues.push("The report makes an unsupported whole-class certainty claim.");

  const score = Math.max(0, 100 - issues.length * 20);
  return { passed: issues.length === 0, score, issues };
}
