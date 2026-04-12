// Texas TEKS Standards Reference by Grade & Subject
// Organized for quick lookup during lesson analysis

export interface TEKSStandard {
  code: string;
  description: string;
  category: string;
}

export interface TEKSGradeSubject {
  grade: string;
  subject: string;
  standards: TEKSStandard[];
  overviewStatement: string;
}

const teksDatabase: TEKSGradeSubject[] = [
  // GRADE 3 ELA
  {
    grade: "3rd Grade",
    subject: "English Language Arts",
    overviewStatement:
      "Grade 3 ELA focuses on foundational reading, writing, and communication skills.",
    standards: [
      {
        code: "3.1.A",
        description:
          "Demonstrate phonemic awareness by identifying and manipulating phonemes in spoken words.",
        category: "Phonics & Fluency",
      },
      {
        code: "3.2.A",
        description:
          "Use context within and beyond sentences to determine the meaning of unfamiliar words.",
        category: "Vocabulary",
      },
      {
        code: "3.3.A",
        description:
          "Ask and answer questions using textual evidence to support understanding.",
        category: "Comprehension",
      },
      {
        code: "3.4.A",
        description:
          "Identify the main idea and supporting details in narrative and informational texts.",
        category: "Reading",
      },
      {
        code: "3.5.A",
        description:
          "Write narratives with a clear sequence of events and descriptive details.",
        category: "Writing",
      },
      {
        code: "3.6.A",
        description: "Write informative texts with facts and details organized by topic.",
        category: "Writing",
      },
      {
        code: "3.7.A",
        description:
          "Compose opinion pieces with reasons supporting the stated opinion.",
        category: "Writing",
      },
    ],
  },

  // GRADE 4 MATHEMATICS
  {
    grade: "4th Grade",
    subject: "Mathematics",
    overviewStatement:
      "Grade 4 Math emphasizes multi-digit multiplication, division, fractions, and measurement.",
    standards: [
      {
        code: "4.1.A",
        description: "Use place value understanding to fluently add and subtract multi-digit numbers.",
        category: "Number & Operations",
      },
      {
        code: "4.2.A",
        description:
          "Represent multiplication of numbers using arrays, area models, and repeated addition.",
        category: "Multiplication & Division",
      },
      {
        code: "4.3.A",
        description:
          "Apply multiplication and division facts to solve real-world problems.",
        category: "Multiplication & Division",
      },
      {
        code: "4.4.A",
        description:
          "Compare and order fractions with like and unlike denominators.",
        category: "Fractions",
      },
      {
        code: "4.5.A",
        description:
          "Identify and decompose fractions using unit fractions and array models.",
        category: "Fractions",
      },
      {
        code: "4.6.A",
        description:
          "Measure lengths and compute perimeter and area of rectangles.",
        category: "Measurement",
      },
      {
        code: "4.7.A",
        description: "Identify and classify two-dimensional shapes by their properties.",
        category: "Geometry",
      },
      {
        code: "4.8.A",
        description: "Collect, organize, and display categorical and measurement data.",
        category: "Data Analysis",
      },
    ],
  },

  // GRADE 5 SCIENCE
  {
    grade: "5th Grade",
    subject: "Science",
    overviewStatement:
      "Grade 5 Science covers matter, force & motion, energy, Earth & space, and life processes.",
    standards: [
      {
        code: "5.1.A",
        description:
          "Classify matter by physical properties such as color, texture, and shape.",
        category: "Matter & Properties",
      },
      {
        code: "5.2.A",
        description:
          "Investigate the effects of forces (push, pull) on the motion of objects.",
        category: "Force & Motion",
      },
      {
        code: "5.3.A",
        description:
          "Identify and describe the movement of objects using position and direction.",
        category: "Force & Motion",
      },
      {
        code: "5.4.A",
        description:
          "Describe and model the relationship between the Sun, Earth, and Moon.",
        category: "Earth & Space",
      },
      {
        code: "5.5.A",
        description:
          "Observe and identify the stages of the water cycle in nature.",
        category: "Earth & Space",
      },
      {
        code: "5.6.A",
        description:
          "Identify the structures of plants and describe their functions.",
        category: "Life Science",
      },
      {
        code: "5.7.A",
        description:
          "Compare and contrast the life cycles of plants and animals.",
        category: "Life Science",
      },
      {
        code: "5.8.A",
        description:
          "Describe how organisms depend on their environment to meet their needs.",
        category: "Ecosystems",
      },
    ],
  },

  // GRADE 6 SCIENCE
  {
    grade: "6th Grade",
    subject: "Science",
    overviewStatement:
      "Grade 6 Science covers energy, matter, forces, Earth structures, and ecosystems.",
    standards: [
      {
        code: "6.1.A",
        description:
          "Classify matter by chemical and physical properties and changes.",
        category: "Matter & Energy",
      },
      {
        code: "6.2.A",
        description: "Identify and describe forms of energy and energy transformations.",
        category: "Matter & Energy",
      },
      {
        code: "6.3.A",
        description:
          "Model the relationship between the structure of matter and physical properties.",
        category: "Matter & Energy",
      },
      {
        code: "6.4.A",
        description:
          "Analyze the relationship between force, motion, and energy.",
        category: "Force & Motion",
      },
      {
        code: "6.5.A",
        description:
          "Describe the structure of Earth's interior and the processes that shape it.",
        category: "Earth Structures",
      },
      {
        code: "6.6.A",
        description:
          "Interpret weather patterns and analyze data related to atmospheric changes.",
        category: "Atmosphere & Weather",
      },
      {
        code: "6.7.A",
        description:
          "Identify the characteristics of populations, communities, and ecosystems.",
        category: "Ecosystems",
      },
      {
        code: "6.8.A",
        description:
          "Analyze the flow of energy through food chains and food webs.",
        category: "Ecosystems",
      },
    ],
  },

  // GRADE 8 SCIENCE
  {
    grade: "8th Grade",
    subject: "Science",
    overviewStatement:
      "Grade 8 Science covers energy, matter, chemistry, waves, space, and heredity.",
    standards: [
      {
        code: "8.1.A",
        description:
          "Use the periodic table to classify elements and predict chemical properties.",
        category: "Chemistry",
      },
      {
        code: "8.2.A",
        description:
          "Identify the difference between physical and chemical changes in matter.",
        category: "Chemistry",
      },
      {
        code: "8.3.A",
        description:
          "Describe the relationship between energy and objects in motion.",
        category: "Energy & Motion",
      },
      {
        code: "8.4.A",
        description:
          "Investigate and describe simple machines and their mechanical advantage.",
        category: "Forces & Motion",
      },
      {
        code: "8.5.A",
        description:
          "Identify characteristics and behaviors of waves and their interactions.",
        category: "Waves & Sound",
      },
      {
        code: "8.6.A",
        description:
          "Describe Earth's structure and explain the process of plate tectonics.",
        category: "Earth Structures",
      },
      {
        code: "8.7.A",
        description:
          "Explain the roles of structure and function in obtaining and transporting materials.",
        category: "Life Science",
      },
      {
        code: "8.8.A",
        description:
          "Analyze how traits are inherited and expressed in organisms.",
        category: "Heredity & Genetics",
      },
    ],
  },

  // ALGEBRA I (HIGH SCHOOL)
  {
    grade: "9th Grade",
    subject: "Algebra I",
    overviewStatement:
      "Algebra I covers linear relationships, systems of equations, graphing, and polynomials.",
    standards: [
      {
        code: "A.1.A",
        description:
          "Understand and use the mathematical processes to acquire and demonstrate mathematical knowledge.",
        category: "Mathematical Process",
      },
      {
        code: "A.2.A",
        description:
          "Write, using function notation, linear functions that model real-world situations.",
        category: "Linear Functions",
      },
      {
        code: "A.2.B",
        description:
          "Determine the slope of a line given two points or a linear equation.",
        category: "Linear Functions",
      },
      {
        code: "A.3.A",
        description:
          "Solve linear equations and inequalities in one variable, including those with coefficients.",
        category: "Equations & Inequalities",
      },
      {
        code: "A.4.A",
        description:
          "Write and solve systems of equations using substitution and elimination.",
        category: "Systems of Equations",
      },
      {
        code: "A.5.A",
        description:
          "Solve quadratic equations using multiple methods including factoring and the quadratic formula.",
        category: "Quadratic Equations",
      },
      {
        code: "A.6.A",
        description:
          "Determine the domain and range of quadratic functions and interpret key features.",
        category: "Quadratic Functions",
      },
      {
        code: "A.7.A",
        description:
          "Perform arithmetic operations on polynomials and factor polynomials.",
        category: "Polynomials",
      },
      {
        code: "A.8.A",
        description:
          "Simplify rational expressions and identify restrictions on variables.",
        category: "Rational Expressions",
      },
      {
        code: "A.9.A",
        description:
          "Analyze functions, identify zeros, and sketch graphs of polynomial functions.",
        category: "Functions & Graphing",
      },
    ],
  },

  // GEOMETRY (HIGH SCHOOL)
  {
    grade: "10th Grade",
    subject: "Geometry",
    overviewStatement:
      "Geometry covers properties of shapes, proofs, transformations, area, volume, and trigonometry.",
    standards: [
      {
        code: "G.1.A",
        description:
          "Create conjectures about geometric relationships and prove theorems.",
        category: "Logic & Proofs",
      },
      {
        code: "G.2.A",
        description:
          "Identify and describe properties of triangles and quadrilaterals.",
        category: "Polygons",
      },
      {
        code: "G.3.A",
        description:
          "Determine congruence and similarity of figures using transformations.",
        category: "Congruence & Similarity",
      },
      {
        code: "G.4.A",
        description:
          "Use the Pythagorean Theorem to find lengths and distances.",
        category: "Right Triangles",
      },
      {
        code: "G.5.A",
        description:
          "Determine surface area and volume of three-dimensional figures.",
        category: "3D Figures",
      },
      {
        code: "G.6.A",
        description:
          "Identify and use the relationship between angles in various configurations.",
        category: "Angles & Lines",
      },
      {
        code: "G.7.A",
        description:
          "Apply trigonometric ratios to solve right triangle problems.",
        category: "Trigonometry",
      },
      {
        code: "G.8.A",
        description:
          "Use coordinate geometry and algebraic representations of geometric figures.",
        category: "Coordinate Geometry",
      },
    ],
  },

  // SOCIAL STUDIES - GRADES 3-5
  {
    grade: "3rd Grade",
    subject: "Social Studies",
    overviewStatement:
      "Grade 3 Social Studies covers communities, cultures, citizenship, and local geography.",
    standards: [
      {
        code: "3.1.A",
        description:
          "Identify and describe ways families are similar and different across cultures.",
        category: "Culture & Community",
      },
      {
        code: "3.2.A",
        description:
          "Describe the roles and responsibilities of community members and leaders.",
        category: "Citizenship",
      },
      {
        code: "3.3.A",
        description:
          "Identify and describe the relationship between people and their environments.",
        category: "Geography",
      },
      {
        code: "3.4.A",
        description:
          "Interpret maps and globes to locate places and identify geographic features.",
        category: "Geography",
      },
      {
        code: "3.5.A",
        description:
          "Identify the basic economic needs and wants of individuals and communities.",
        category: "Economics",
      },
    ],
  },

  // US HISTORY - GRADE 8
  {
    grade: "8th Grade",
    subject: "Social Studies",
    overviewStatement:
      "Grade 8 Social Studies focuses on U.S. history from exploration through the Civil War.",
    standards: [
      {
        code: "8.1.A",
        description:
          "Describe the characteristics of Native American societies before European contact.",
        category: "Native American History",
      },
      {
        code: "8.2.A",
        description:
          "Analyze the causes and effects of European exploration and colonization.",
        category: "Colonial Period",
      },
      {
        code: "8.3.A",
        description:
          "Identify the causes and explain the consequences of the American Revolution.",
        category: "Revolution",
      },
      {
        code: "8.4.A",
        description:
          "Analyze the formation and purpose of the Constitution.",
        category: "Government",
      },
      {
        code: "8.5.A",
        description:
          "Describe the political, economic, and social conflicts that led to westward expansion.",
        category: "Westward Expansion",
      },
      {
        code: "8.6.A",
        description:
          "Analyze the causes and consequences of the Civil War and identify its major events.",
        category: "Civil War",
      },
    ],
  },
];

/**
 * Retrieve TEKS standards for a given grade and subject
 * Returns matching standards or a fallback message
 */
export function getTEKSStandards(
  grade: string,
  subject: string
): {
  standards: TEKSStandard[];
  overview: string;
  found: boolean;
} {
  const match = teksDatabase.find(
    (ts) =>
      ts.grade.toLowerCase() === grade.toLowerCase() &&
      ts.subject.toLowerCase() === subject.toLowerCase()
  );

  if (match) {
    return {
      standards: match.standards,
      overview: match.overviewStatement,
      found: true,
    };
  }

  // Fallback for subjects that don't have a match yet
  return {
    standards: [],
    overview: `Standards for ${grade} ${subject} are not yet loaded in the system.`,
    found: false,
  };
}

/**
 * Format standards for inclusion in an AI prompt
 */
export function formatTEKSForPrompt(standards: TEKSStandard[], overview: string): string {
  if (standards.length === 0) {
    return `Standards reference: ${overview}`;
  }

  const standardsText = standards
    .map((s) => `  • ${s.code}: ${s.description}`)
    .join("\n");

  return `
TEXAS TEKS STANDARDS FOR THIS GRADE & SUBJECT:
${overview}

Key Standards to Address:
${standardsText}
`;
}
