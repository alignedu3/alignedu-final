const CHUNK_MARKER = /\[Transcript chunk\s+(\d+)\s+of\s+(\d+)\]\s*/gi;

function normalizedWords(value: string) {
  return value
    .replace(/\[Transcript chunk\s+\d+\s+of\s+\d+\]/gi, " ")
    .replace(/\[(?:Earlier|Additional) lesson evidence\]/gi, " ")
    .replace(/\[Lesson part:\s*\d+\]/gi, " ")
    .replace(/Audio Transcript:/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(value: string) {
  const words = normalizedWords(value).split(" ").filter(Boolean);
  const result = new Set<string>();
  for (let index = 0; index <= words.length - 5; index += 1) {
    result.add(words.slice(index, index + 5).join(" "));
  }
  return result;
}

export function transcriptSimilarity(first: string, second: string) {
  const firstSet = shingles(first);
  const secondSet = shingles(second);
  if (!firstSet.size || !secondSet.size) return 0;
  let overlap = 0;
  for (const item of firstSet) {
    if (secondSet.has(item)) overlap += 1;
  }
  return overlap / (firstSet.size + secondSet.size - overlap);
}

export function extractLessonPartNumber(value: string) {
  const normalized = String(value || "").toLowerCase().replace(/[_-]+/g, " ");
  const match = normalized.match(
    /(?:\blesson\s*)?\bpart\s*[-_#:]?\s*(\d{1,2})\b|\b(\d{1,2})(?:st|nd|rd|th)\s+(?:lesson\s+)?part\b/
  );
  const part = Number(match?.[1] || match?.[2]);
  return Number.isInteger(part) && part > 0 && part <= 20 ? part : null;
}

type ChunkBlock = { number: number; total: number; text: string };

function parseChunkBlocks(value: string): ChunkBlock[] {
  const matches = [...value.matchAll(CHUNK_MARKER)];
  if (!matches.length) return [];
  return matches.map((match, index) => ({
    number: Number(match[1]),
    total: Number(match[2]),
    text: value.slice((match.index || 0) + match[0].length, matches[index + 1]?.index ?? value.length).trim(),
  }));
}

// Mobile retries and reselected files can append a complete chunk sequence twice.
// Retain the first occurrence of each near-identical numbered chunk.
export function deduplicateTranscript(value: string) {
  const blocks = parseChunkBlocks(value);
  if (blocks.length < 2) return value.trim();
  const firstMarkerIndex = value.search(CHUNK_MARKER);
  const prefix = firstMarkerIndex > 0 ? value.slice(0, firstMarkerIndex).trim() : "";

  const retained: ChunkBlock[] = [];
  for (const block of blocks) {
    const duplicate = retained.some((candidate) =>
      candidate.number === block.number &&
      candidate.total === block.total &&
      transcriptSimilarity(candidate.text, block.text) >= 0.96
    );
    if (!duplicate) retained.push(block);
  }

  if (retained.length === blocks.length) return value.trim();
  const retainedChunks = retained
    .map((block) => `[Transcript chunk ${block.number} of ${block.total}]\n${block.text}`)
    .join("\n\n");
  return [prefix, retainedChunks].filter(Boolean).join("\n\n");
}

function flattenEvidence(value: string) {
  return value
    .split(/\[(?:Earlier|Additional) lesson evidence\]\s*/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

export type MergeLessonEvidenceResult = {
  transcript: string;
  duplicateOnly: boolean;
  reordered: boolean;
};

export function mergeLessonEvidence(
  previousTranscript: string,
  currentTranscript: string,
  currentPartNumber: number | null = null
): MergeLessonEvidenceResult {
  const previousParts = flattenEvidence(previousTranscript).map(deduplicateTranscript);
  const cleanedCurrent = deduplicateTranscript(currentTranscript);
  const currentPart = currentPartNumber || extractLessonPartNumber(cleanedCurrent);

  const duplicateOnly = previousParts.some(
    (part) => transcriptSimilarity(part, cleanedCurrent) >= 0.96
  );
  if (duplicateOnly) {
    return { transcript: previousTranscript.trim(), duplicateOnly: true, reordered: false };
  }

  const entries = [
    ...previousParts.map((text, index) => ({
      text,
      part: extractLessonPartNumber(text),
      insertionIndex: index,
    })),
    { text: cleanedCurrent, part: currentPart, insertionIndex: previousParts.length },
  ];

  const canOrder = entries.every((entry) => entry.part !== null) &&
    new Set(entries.map((entry) => entry.part)).size === entries.length;
  const ordered = canOrder
    ? [...entries].sort((a, b) => (a.part as number) - (b.part as number))
    : entries;
  const reordered = ordered.some((entry, index) => entry.insertionIndex !== index);

  return {
    transcript: ordered
      .map((entry, index) => `${index === 0 ? "[Earlier lesson evidence]" : "[Additional lesson evidence]"}\n${entry.part ? `[Lesson part: ${entry.part}]\n` : ""}${entry.text}`)
      .join("\n\n"),
    duplicateOnly: false,
    reordered,
  };
}
