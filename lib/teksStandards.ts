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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGrade(grade: string): string {
  const value = grade.trim().toLowerCase();
  if (!value) return '';

  const numericMatch = value.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade)?$/);
  if (numericMatch) {
    return numericMatch[1];
  }

  const aliases: Record<string, string> = {
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

  return aliases[value] || value;
}

function getKeywordTokens(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2);
}

function normalizeSubject(subject: string): string {
  const value = subject.trim().toLowerCase().replace(/\./g, '');

  const aliases: Record<string, string> = {
    ela: 'english language arts',
    english: 'english language arts',
    'english language arts': 'english language arts',
    math: 'mathematics',
    mathematics: 'mathematics',
    'algebra 1': 'algebra i',
    'algebra i': 'algebra i',
    'english 2': 'english ii',
    'english ii': 'english ii',
    'us history': 'us history',
    'u s history': 'us history',
    'u.s. history': 'us history',
  };

  return aliases[value] || value;
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

  // GRADE 3 MATHEMATICS
  {
    grade: "3rd Grade",
    subject: "Mathematics",
    overviewStatement:
      "Grade 3 Mathematics focuses on multiplication foundations, division concepts, fractions, measurement, geometry, and data reasoning.",
    standards: [
      {
        code: "3.1.A",
        description:
          "Represent and solve multiplication and division problems within real-world contexts.",
        category: "Multiplication & Division",
      },
      {
        code: "3.2.A",
        description:
          "Use arrays, equal groups, and number lines to model multiplication and division relationships.",
        category: "Multiplication & Division",
      },
      {
        code: "3.3.A",
        description:
          "Represent fractions as parts of a whole and locate simple fractions on a number line.",
        category: "Fractions",
      },
      {
        code: "3.4.A",
        description:
          "Solve problems involving perimeter, area, and measurement using appropriate tools and units.",
        category: "Measurement",
      },
      {
        code: "3.5.A",
        description:
          "Represent and interpret data using scaled pictographs, bar graphs, and frequency tables.",
        category: "Data Analysis",
      },
      {
        code: "3.6.A",
        description:
          "Classify and describe two-dimensional figures and their attributes.",
        category: "Geometry",
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

  // GRADE 4 ELA
  {
    grade: "4th Grade",
    subject: "English Language Arts",
    overviewStatement:
      "Grade 4 ELA emphasizes comprehension, text evidence, vocabulary, composition, revision, and communication across genres.",
    standards: [
      {
        code: "4.1.A",
        description:
          "Ask and respond to questions using relevant textual evidence to support understanding.",
        category: "Comprehension",
      },
      {
        code: "4.2.A",
        description:
          "Determine the meaning of unfamiliar words and figurative language using context and reference tools.",
        category: "Vocabulary",
      },
      {
        code: "4.3.A",
        description:
          "Summarize texts and explain how the author uses details to develop central ideas.",
        category: "Reading",
      },
      {
        code: "4.4.A",
        description:
          "Write extended responses with a clear controlling idea, organization, and supporting evidence.",
        category: "Writing",
      },
      {
        code: "4.5.A",
        description:
          "Revise drafts to improve organization, word choice, clarity, and sentence fluency.",
        category: "Revision",
      },
      {
        code: "4.6.A",
        description:
          "Edit writing for capitalization, punctuation, grammar, and spelling conventions.",
        category: "Editing",
      },
    ],
  },

  // GRADE 5 MATHEMATICS
  {
    grade: "5th Grade",
    subject: "Mathematics",
    overviewStatement:
      "Grade 5 Mathematics emphasizes multi-step operations, fractions, decimals, geometry, and data interpretation.",
    standards: [
      {
        code: "5.1.A",
        description:
          "Solve multi-step problems using addition, subtraction, multiplication, and division of whole numbers.",
        category: "Operations",
      },
      {
        code: "5.2.A",
        description:
          "Add and subtract fractions with like and unlike denominators using visual and numeric models.",
        category: "Fractions",
      },
      {
        code: "5.3.A",
        description:
          "Represent, compare, and operate with decimals through the hundredths place.",
        category: "Decimals",
      },
      {
        code: "5.4.A",
        description:
          "Solve problems involving area, volume, and coordinate graphing in the first quadrant.",
        category: "Measurement & Geometry",
      },
      {
        code: "5.5.A",
        description:
          "Represent and interpret data sets using numerical summaries and graphical models.",
        category: "Data Analysis",
      },
      {
        code: "5.6.A",
        description:
          "Use patterns and relationships to generate and analyze numerical expressions.",
        category: "Algebraic Reasoning",
      },
    ],
  },

  // GRADE 5 ELA
  {
    grade: "5th Grade",
    subject: "English Language Arts",
    overviewStatement:
      "Grade 5 ELA focuses on comprehension, theme, synthesis, written response, revision, and language conventions.",
    standards: [
      {
        code: "5.1.A",
        description:
          "Make inferences and support understanding of texts with relevant evidence.",
        category: "Comprehension",
      },
      {
        code: "5.2.A",
        description:
          "Analyze theme, author’s craft, and the development of characters and ideas in a text.",
        category: "Reading",
      },
      {
        code: "5.3.A",
        description:
          "Compare information across texts and synthesize ideas using evidence.",
        category: "Synthesis",
      },
      {
        code: "5.4.A",
        description:
          "Write organized responses and compositions with a thesis, evidence, and elaboration.",
        category: "Writing",
      },
      {
        code: "5.5.A",
        description:
          "Revise writing to improve clarity, transitions, structure, and precision of language.",
        category: "Revision",
      },
      {
        code: "5.6.A",
        description:
          "Edit writing for grammar, capitalization, punctuation, and spelling conventions.",
        category: "Editing",
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

  // GRADE 6 MATHEMATICS
  {
    grade: "6th Grade",
    subject: "Mathematics",
    overviewStatement:
      "Grade 6 Mathematics develops proportional reasoning, operations with rational numbers, expressions, equations, geometry, and statistics.",
    standards: [
      {
        code: "6.1.A",
        description:
          "Represent and solve problems involving ratios, rates, and proportional relationships.",
        category: "Proportionality",
      },
      {
        code: "6.2.A",
        description:
          "Apply operations with whole numbers, fractions, and decimals in mathematical and real-world contexts.",
        category: "Operations",
      },
      {
        code: "6.3.A",
        description:
          "Write, interpret, and evaluate algebraic expressions and numerical expressions.",
        category: "Expressions",
      },
      {
        code: "6.4.A",
        description:
          "Represent and solve one-variable equations and inequalities.",
        category: "Equations & Inequalities",
      },
      {
        code: "6.5.A",
        description:
          "Describe and solve problems involving area, surface area, and volume.",
        category: "Geometry & Measurement",
      },
      {
        code: "6.6.A",
        description:
          "Represent data and summarize distributions using measures of center and spread.",
        category: "Statistics",
      },
    ],
  },

  // GRADE 6 ELA
  {
    grade: "6th Grade",
    subject: "English Language Arts",
    overviewStatement:
      "Grade 6 ELA emphasizes close reading, author’s purpose, evidence-based writing, revision, and language development.",
    standards: [
      {
        code: "6.1.A",
        description:
          "Cite evidence to support inferences and analysis of literary and informational texts.",
        category: "Comprehension",
      },
      {
        code: "6.2.A",
        description:
          "Analyze how authors use structure, point of view, and craft to shape meaning.",
        category: "Author's Craft",
      },
      {
        code: "6.3.A",
        description:
          "Determine central idea, summarize texts, and explain supporting details.",
        category: "Reading",
      },
      {
        code: "6.4.A",
        description:
          "Write organized compositions and responses using clear claims, evidence, and elaboration.",
        category: "Writing",
      },
      {
        code: "6.5.A",
        description:
          "Revise writing for coherence, word choice, organization, and audience.",
        category: "Revision",
      },
      {
        code: "6.6.A",
        description:
          "Edit for grammar, punctuation, capitalization, spelling, and sentence correctness.",
        category: "Editing",
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

  // GRADE 7 MATHEMATICS
  {
    grade: "7th Grade",
    subject: "Mathematics",
    overviewStatement:
      "Grade 7 Mathematics focuses on proportionality, rational numbers, equations, probability, geometry, and financial literacy.",
    standards: [
      {
        code: "7.1.A",
        description:
          "Represent and solve problems involving proportional relationships and scale.",
        category: "Proportionality",
      },
      {
        code: "7.2.A",
        description:
          "Apply operations with rational numbers in multi-step mathematical and real-world situations.",
        category: "Operations",
      },
      {
        code: "7.3.A",
        description:
          "Represent linear relationships and solve one- and two-step equations and inequalities.",
        category: "Equations & Relationships",
      },
      {
        code: "7.4.A",
        description:
          "Solve problems involving area, circumference, surface area, and volume.",
        category: "Geometry & Measurement",
      },
      {
        code: "7.5.A",
        description:
          "Use probability and data analysis to make predictions and solve problems.",
        category: "Probability & Statistics",
      },
      {
        code: "7.6.A",
        description:
          "Apply mathematical reasoning to personal financial literacy contexts.",
        category: "Financial Literacy",
      },
    ],
  },

  // GRADE 7 ELA
  {
    grade: "7th Grade",
    subject: "English Language Arts",
    overviewStatement:
      "Grade 7 ELA emphasizes analysis of texts, synthesis, argument writing, revision, and language conventions.",
    standards: [
      {
        code: "7.1.A",
        description:
          "Use evidence to support analysis, inference, and interpretation of texts.",
        category: "Comprehension",
      },
      {
        code: "7.2.A",
        description:
          "Analyze how authors develop themes, claims, and ideas across a text.",
        category: "Reading",
      },
      {
        code: "7.3.A",
        description:
          "Compare and synthesize information across multiple texts and sources.",
        category: "Synthesis",
      },
      {
        code: "7.4.A",
        description:
          "Write argumentative and informational compositions using claims, evidence, and explanation.",
        category: "Writing",
      },
      {
        code: "7.5.A",
        description:
          "Revise writing for organization, coherence, transitions, and precision of language.",
        category: "Revision",
      },
      {
        code: "7.6.A",
        description:
          "Edit writing for grammar, punctuation, capitalization, and spelling conventions.",
        category: "Editing",
      },
    ],
  },

  // GRADE 8 MATHEMATICS
  {
    grade: "8th Grade",
    subject: "Mathematics",
    overviewStatement:
      "Grade 8 Mathematics develops linear relationships, functions, transformations, geometry, and data analysis.",
    standards: [
      {
        code: "8.1.A",
        description:
          "Represent proportional and linear relationships using tables, graphs, equations, and verbal descriptions.",
        category: "Linear Relationships",
      },
      {
        code: "8.2.A",
        description:
          "Analyze slope and rate of change in real-world and mathematical contexts.",
        category: "Linear Relationships",
      },
      {
        code: "8.3.A",
        description:
          "Represent, interpret, and solve linear equations and systems of equations.",
        category: "Equations & Systems",
      },
      {
        code: "8.4.A",
        description:
          "Use transformations to describe congruence, similarity, and relationships among figures.",
        category: "Geometry",
      },
      {
        code: "8.5.A",
        description:
          "Apply the Pythagorean Theorem and volume formulas to solve geometric problems.",
        category: "Geometry & Measurement",
      },
      {
        code: "8.6.A",
        description:
          "Construct and interpret scatterplots, bivariate data, and data patterns.",
        category: "Data Analysis",
      },
    ],
  },

  // GRADE 8 ELA
  {
    grade: "8th Grade",
    subject: "English Language Arts",
    overviewStatement:
      "Grade 8 ELA focuses on analysis of theme and argument, synthesis across texts, and sustained evidence-based writing.",
    standards: [
      {
        code: "8.1.A",
        description:
          "Analyze texts closely and support interpretations with relevant evidence.",
        category: "Comprehension",
      },
      {
        code: "8.2.A",
        description:
          "Analyze theme, central idea, author’s purpose, and rhetorical choices across genres.",
        category: "Reading",
      },
      {
        code: "8.3.A",
        description:
          "Evaluate arguments and synthesize information across multiple sources.",
        category: "Argument & Synthesis",
      },
      {
        code: "8.4.A",
        description:
          "Write extended responses and compositions with clear claims, evidence, counterclaims, and elaboration.",
        category: "Writing",
      },
      {
        code: "8.5.A",
        description:
          "Revise writing for coherence, organization, precision, and effectiveness for audience and purpose.",
        category: "Revision",
      },
      {
        code: "8.6.A",
        description:
          "Edit writing for grammar, punctuation, capitalization, spelling, and sentence variety.",
        category: "Editing",
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

  // BIOLOGY (HIGH SCHOOL)
  {
    grade: "10th Grade",
    subject: "Biology",
    overviewStatement:
      "Biology emphasizes structure and function of living systems, heredity, ecosystems, energy transfer, and scientific reasoning.",
    standards: [
      {
        code: "BIO.5.A",
        description:
          "Describe the structures of prokaryotic and eukaryotic cells, including cell membrane, cell wall, nucleus, and organelles.",
        category: "Cell Structure",
      },
      {
        code: "BIO.5.B",
        description:
          "Investigate and explain how cell structures and organelles contribute to cellular functions and homeostasis.",
        category: "Cell Function",
      },
      {
        code: "BIO.6.A",
        description:
          "Explain the relationship between photosynthesis and cellular respiration in energy transfer within living systems.",
        category: "Energy Transfer",
      },
      {
        code: "BIO.6.B",
        description:
          "Analyze the roles of enzymes in biochemical reactions and factors that affect enzyme activity.",
        category: "Biochemistry",
      },
      {
        code: "BIO.7.A",
        description:
          "Compare sexual and asexual reproduction and explain how traits are inherited through genetic processes.",
        category: "Genetics",
      },
      {
        code: "BIO.7.B",
        description:
          "Analyze the structure and function of DNA and its role in protein synthesis and inheritance.",
        category: "Genetics",
      },
      {
        code: "BIO.8.A",
        description:
          "Analyze how natural selection and adaptation contribute to survival and diversity of organisms.",
        category: "Evolution",
      },
      {
        code: "BIO.9.A",
        description:
          "Describe the flow of energy through food webs, food chains, and ecosystems.",
        category: "Ecosystems",
      },
      {
        code: "BIO.9.B",
        description:
          "Analyze interactions among organisms and environmental changes within ecosystems.",
        category: "Ecosystems",
      },
      {
        code: "BIO.10.A",
        description:
          "Construct and communicate scientific explanations and arguments using evidence from biological investigations.",
        category: "Scientific Reasoning",
      },
    ],
  },

  // ENGLISH II (HIGH SCHOOL)
  {
    grade: "10th Grade",
    subject: "English II",
    overviewStatement:
      "English II emphasizes literary and informational analysis, argument, synthesis, revision, and written communication.",
    standards: [
      {
        code: "E2.1.A",
        description:
          "Analyze literary and informational texts using evidence to support interpretation and conclusions.",
        category: "Reading Analysis",
      },
      {
        code: "E2.2.A",
        description:
          "Analyze author’s craft, structure, and rhetorical choices across texts.",
        category: "Author's Craft",
      },
      {
        code: "E2.3.A",
        description:
          "Evaluate arguments and synthesize ideas across sources using relevant evidence.",
        category: "Argument & Synthesis",
      },
      {
        code: "E2.4.A",
        description:
          "Write analytical and argumentative responses with a defensible thesis, evidence, and commentary.",
        category: "Writing",
      },
      {
        code: "E2.5.A",
        description:
          "Revise drafts to strengthen organization, style, transitions, and precision.",
        category: "Revision",
      },
      {
        code: "E2.6.A",
        description:
          "Edit writing for grammar, punctuation, capitalization, and spelling conventions.",
        category: "Editing",
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

  // U.S. HISTORY (HIGH SCHOOL)
  {
    grade: "11th Grade",
    subject: "U.S. History",
    overviewStatement:
      "U.S. History emphasizes major events, turning points, civic institutions, economic change, and the impact of historical decisions in the United States.",
    standards: [
      {
        code: "USH.1.A",
        description:
          "Analyze major political, economic, and social turning points in U.S. history from Reconstruction to the present.",
        category: "Historical Understanding",
      },
      {
        code: "USH.2.A",
        description:
          "Evaluate causes and effects of industrialization, urbanization, and reform movements in the United States.",
        category: "Industrialization & Reform",
      },
      {
        code: "USH.3.A",
        description:
          "Analyze the causes, major events, and consequences of U.S. involvement in international conflicts.",
        category: "Conflict & Foreign Policy",
      },
      {
        code: "USH.4.A",
        description:
          "Explain how constitutional principles, civic participation, and government institutions shaped historical developments.",
        category: "Government & Civics",
      },
      {
        code: "USH.5.A",
        description:
          "Analyze the impact of economic systems, labor, and innovation on U.S. society and policy.",
        category: "Economics",
      },
      {
        code: "USH.6.A",
        description:
          "Construct and communicate historical arguments using primary and secondary source evidence.",
        category: "Historical Thinking",
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
      normalizeGrade(ts.grade) === normalizeGrade(grade) &&
      normalizeSubject(ts.subject) === normalizeSubject(subject)
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

export function getRelatedTEKSStandards(
  grade: string,
  subject: string,
  contextText: string,
  options?: { limit?: number; excludeCodes?: string[] }
): TEKSStandard[] {
  const { standards } = getTEKSStandards(grade, subject);
  if (!standards.length) return [];

  const limit = options?.limit ?? 3;
  const excludeCodes = new Set(options?.excludeCodes || []);
  const contextTokens = new Set(getKeywordTokens(contextText));

  const scored = standards
    .filter((standard) => !excludeCodes.has(standard.code))
    .map((standard) => {
      const descriptionTokens = getKeywordTokens(`${standard.category} ${standard.description}`);
      const overlap = descriptionTokens.reduce(
        (score, token) => score + (contextTokens.has(token) ? 1 : 0),
        0
      );

      const exactPhraseBonus = normalizeText(contextText).includes(normalizeText(standard.category)) ? 2 : 0;

      return {
        standard,
        score: overlap + exactPhraseBonus,
      };
    })
    .sort((a, b) => b.score - a.score || a.standard.code.localeCompare(b.standard.code));

  const bestScore = scored[0]?.score ?? 0;
  const prioritized = bestScore > 0 ? scored : scored;

  return prioritized.slice(0, limit).map((entry) => entry.standard);
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
