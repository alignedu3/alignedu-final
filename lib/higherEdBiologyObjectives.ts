export const HIGHER_ED_BIOLOGY_OBJECTIVES = [
  '1. Demonstrate an understanding of life characteristics, the structural levels of biology, and the scientific method.',
  '2. Summarize the basic chemical concepts.',
  '3. Explain the basic energy concepts.',
  '4. Demonstrate an understanding of cell membrane structure, organelles, and their functions.',
  '5. Demonstrate an understanding of the process of cellular respiration.',
  '6. Demonstrate an understanding of the process of photosynthesis.',
  '7. Demonstrate an understanding of DNA structure and protein synthesis.',
  '8. Demonstrate an understanding of the structures, reproduction, and characteristics of viruses, prokaryotic cells, and eukaryotic cells.',
  '9. Demonstrate an understanding of the principles of inheritance and solve classical genetic problems.',
  '10. Demonstrate an understanding of the importance of global cooperation and the development of plausible solutions to global issues in biology.',
] as const;

function extractChapterNumber(chapter: string) {
  const match = String(chapter || '').match(/chapter\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function getHigherEdBiologyObjectivesForChapter(chapter: string) {
  const chapterNumber = extractChapterNumber(chapter);
  if (!chapterNumber) return [] as string[];

  if (chapterNumber === 1) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[0]];
  }

  if (chapterNumber >= 2 && chapterNumber <= 5) {
    return [
      HIGHER_ED_BIOLOGY_OBJECTIVES[1],
      HIGHER_ED_BIOLOGY_OBJECTIVES[2],
    ];
  }

  if (chapterNumber >= 6 && chapterNumber <= 8) {
    return [
      HIGHER_ED_BIOLOGY_OBJECTIVES[2],
      HIGHER_ED_BIOLOGY_OBJECTIVES[3],
    ];
  }

  if (chapterNumber === 9) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[4]];
  }

  if (chapterNumber === 10) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[5]];
  }

  if (chapterNumber >= 11 && chapterNumber <= 12) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[8]];
  }

  if (chapterNumber >= 13 && chapterNumber <= 15) {
    return [
      HIGHER_ED_BIOLOGY_OBJECTIVES[7],
      HIGHER_ED_BIOLOGY_OBJECTIVES[8],
    ];
  }

  if (chapterNumber >= 16 && chapterNumber <= 18) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[6]];
  }

  if (chapterNumber >= 19 && chapterNumber <= 21) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[7]];
  }

  if (chapterNumber >= 22 && chapterNumber <= 30) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[0]];
  }

  if (chapterNumber >= 31 && chapterNumber <= 34) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[8]];
  }

  if (chapterNumber >= 35 && chapterNumber <= 44) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[0]];
  }

  if (chapterNumber >= 45 && chapterNumber <= 51) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[9]];
  }

  if (chapterNumber >= 52 && chapterNumber <= 56) {
    return [HIGHER_ED_BIOLOGY_OBJECTIVES[9]];
  }

  return [] as string[];
}
