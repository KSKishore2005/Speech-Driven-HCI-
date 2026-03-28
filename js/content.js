// ============================================================
// content.js — Built-in lesson & quiz database
// Smart Learning Assistant
// ============================================================

const CONTENT_DB = {
  subjects: [
    {
      id: "cs",
      title: "Computer Science",
      icon: "💻",
      color: "#6c63ff",
      lessons: [
        {
          id: "cs_1",
          title: "What is a Computer?",
          summary: "A computer is an electronic device that processes data.",
          voiceText: `A computer is an electronic device that processes data and produces meaningful results.
            It takes input from the user, processes it using the CPU, stores data in memory, and displays output.
            The four main functions of a computer are: Input, Processing, Storage, and Output.
            Modern computers are used in almost every field — from education to medicine to entertainment.`,
          keyPoints: [
            "Computers process data electronically",
            "Four functions: Input, Process, Store, Output",
            "CPU is the brain of the computer",
            "Used in every major industry",
          ],
          quiz: [
            {
              question: "What does CPU stand for?",
              options: ["Central Processing Unit", "Computer Power Unit", "Central Program Utility", "Core Processing Unit"],
              answer: 0,
              hint: "It's the brain of the computer",
            },
            {
              question: "Which of the following is an OUTPUT device?",
              options: ["Keyboard", "Mouse", "Monitor", "Scanner"],
              answer: 2,
              hint: "You see results on it",
            },
            {
              question: "What are the four main functions of a computer?",
              options: ["Run, Jump, Fly, Stop", "Input, Process, Store, Output", "Type, Print, Save, Send", "Open, Close, Edit, Delete"],
              answer: 1,
              hint: "Think about what happens when you use a computer",
            },
          ],
        },
        {
          id: "cs_2",
          title: "Programming Basics",
          summary: "Programming is giving instructions to a computer.",
          voiceText: `Programming is the process of giving instructions to a computer to perform tasks.
            A program is a set of step-by-step instructions written in a programming language.
            Popular programming languages include Python, JavaScript, Java, and C++.
            Every program follows a logic: take input, make decisions, repeat actions, and produce output.
            Learning to program helps you solve real-world problems using computers.`,
          keyPoints: [
            "Programming means giving computers instructions",
            "Programs are written in programming languages",
            "Python is beginner-friendly",
            "Logic: Input → Decision → Loop → Output",
          ],
          quiz: [
            {
              question: "Which programming language is known as beginner-friendly?",
              options: ["Assembly", "Python", "C++", "Rust"],
              answer: 1,
              hint: "It's named after a snake",
            },
            {
              question: "What is a program?",
              options: ["A TV show", "A set of instructions for a computer", "A type of hardware", "An operating system"],
              answer: 1,
              hint: "Think about what you tell a computer to do",
            },
          ],
        },
      ],
    },
    {
      id: "math",
      title: "Mathematics",
      icon: "📐",
      color: "#f59e0b",
      lessons: [
        {
          id: "math_1",
          title: "Number Systems",
          summary: "Numbers can be represented in different systems.",
          voiceText: `A number system is a way to represent numbers using symbols or digits.
            The most common is the Decimal system, which uses 10 digits: 0 through 9.
            Computers use the Binary system, with only two digits: 0 and 1.
            The Hexadecimal system uses 16 symbols: digits 0 to 9 and letters A to F.
            Converting between these systems is a key skill in computer science and mathematics.`,
          keyPoints: [
            "Decimal: 10 digits (0-9), base 10",
            "Binary: 2 digits (0,1), base 2 — used by computers",
            "Hexadecimal: 16 symbols, base 16",
            "Number systems are fundamental to computing",
          ],
          quiz: [
            {
              question: "How many digits does the binary number system have?",
              options: ["10", "16", "2", "8"],
              answer: 2,
              hint: "Computers use only zeros and ones",
            },
            {
              question: "What is the decimal equivalent of binary 1010?",
              options: ["8", "10", "12", "14"],
              answer: 1,
              hint: "1×8 + 0×4 + 1×2 + 0×1",
            },
          ],
        },
        {
          id: "math_2",
          title: "Basic Algebra",
          summary: "Algebra uses letters to represent unknown numbers.",
          voiceText: `Algebra is a branch of mathematics where we use letters to represent unknown values.
            For example, in the equation x plus 5 equals 10, the letter x represents the unknown number 5.
            We solve algebra problems by isolating the unknown variable on one side of the equation.
            Algebra is used in physics, engineering, economics, and everyday problem-solving.
            Key concepts include: variables, constants, expressions, and equations.`,
          keyPoints: [
            "Variables are letters representing unknowns",
            "Equations show two equal expressions",
            "Solve by isolating the variable",
            "Used in science, engineering, and finance",
          ],
          quiz: [
            {
              question: "If x + 5 = 12, what is x?",
              options: ["5", "7", "17", "6"],
              answer: 1,
              hint: "Subtract 5 from both sides",
            },
            {
              question: "What is a variable in algebra?",
              options: ["A fixed number", "A letter representing an unknown", "A mathematical operation", "A type of graph"],
              answer: 1,
              hint: "It can change or is unknown",
            },
          ],
        },
      ],
    },
    {
      id: "science",
      title: "Science",
      icon: "🔬",
      color: "#10b981",
      lessons: [
        {
          id: "sci_1",
          title: "States of Matter",
          summary: "Matter exists as solid, liquid, gas, and plasma.",
          voiceText: `Matter is anything that has mass and takes up space.
            Matter exists in four main states: solid, liquid, gas, and plasma.
            In a solid, particles are tightly packed and vibrate in place — like ice.
            In a liquid, particles are close but can flow past each other — like water.
            In a gas, particles are far apart and move freely — like steam.
            Plasma is a high-energy state found in stars and lightning.
            Matter changes state when energy is added or removed — melting, freezing, evaporating, condensing.`,
          keyPoints: [
            "4 states: solid, liquid, gas, plasma",
            "Particles behave differently in each state",
            "State changes involve energy transfer",
            "Plasma is the most common state in the universe",
          ],
          quiz: [
            {
              question: "How many main states of matter are there?",
              options: ["2", "3", "4", "5"],
              answer: 2,
              hint: "Solid, liquid, gas, and one more",
            },
            {
              question: "What happens when water is heated to 100 degrees Celsius?",
              options: ["It freezes", "It evaporates", "It becomes plasma", "Nothing"],
              answer: 1,
              hint: "It turns into steam",
            },
          ],
        },
      ],
    },
    {
      id: "english",
      title: "English",
      icon: "📝",
      color: "#ec4899",
      lessons: [
        {
          id: "eng_1",
          title: "Parts of Speech",
          summary: "Words are classified into 8 parts of speech.",
          voiceText: `In English grammar, words are classified into 8 parts of speech based on their function.
            Nouns name people, places, or things — like book, city, or teacher.
            Pronouns replace nouns — like he, she, it, or they.
            Verbs show action or state — like run, think, or is.
            Adjectives describe nouns — like beautiful, large, or fast.
            Adverbs modify verbs, adjectives, or other adverbs — like quickly, very, or well.
            Prepositions show relationships — like in, on, at, or under.
            Conjunctions connect words or clauses — like and, but, or because.
            Interjections express emotion — like oh, wow, or ouch.`,
          keyPoints: [
            "8 parts: Noun, Pronoun, Verb, Adjective, Adverb, Preposition, Conjunction, Interjection",
            "Nouns name things; Verbs show action",
            "Adjectives describe nouns; Adverbs modify verbs",
            "Conjunctions connect ideas",
          ],
          quiz: [
            {
              question: "Which part of speech shows action?",
              options: ["Noun", "Adjective", "Verb", "Pronoun"],
              answer: 2,
              hint: "Running, jumping, thinking...",
            },
            {
              question: "How many parts of speech are there in English?",
              options: ["6", "7", "8", "10"],
              answer: 2,
              hint: "Count carefully: noun, pronoun, verb...",
            },
          ],
        },
      ],
    },
    {
      id: "gk",
      title: "General Knowledge",
      icon: "🌍",
      color: "#3b82f6",
      lessons: [
        {
          id: "gk_1",
          title: "World Geography",
          summary: "Earth has 7 continents and 5 major oceans.",
          voiceText: `Earth, our planet, is divided into 7 continents and surrounded by 5 major oceans.
            The seven continents are: Asia, Africa, North America, South America, Antarctica, Europe, and Australia.
            Asia is the largest continent, covering about 30 percent of Earth's land area.
            The five oceans are: Pacific, Atlantic, Indian, Southern, and Arctic.
            The Pacific Ocean is the largest and deepest ocean on Earth.
            There are 195 countries in the world, and they are home to over 8 billion people.`,
          keyPoints: [
            "7 continents, 5 oceans",
            "Asia is the largest continent",
            "Pacific is the largest ocean",
            "195 countries, 8 billion+ people",
          ],
          quiz: [
            {
              question: "How many continents are on Earth?",
              options: ["5", "6", "7", "8"],
              answer: 2,
              hint: "Asia, Africa, Americas, Antarctica, Europe, Australia",
            },
            {
              question: "Which is the largest ocean?",
              options: ["Atlantic", "Indian", "Arctic", "Pacific"],
              answer: 3,
              hint: "It covers more than half of Earth's ocean area",
            },
          ],
        },
      ],
    },
  ],
};

// Flatten all lessons for easy lookup
const ALL_LESSONS = CONTENT_DB.subjects.flatMap((s) =>
  s.lessons.map((l) => ({ ...l, subjectId: s.id, subjectTitle: s.title, subjectIcon: s.icon, subjectColor: s.color }))
);

// Intent keyword map
const INTENT_MAP = {
  learn: ["learn", "teach", "explain", "tell me", "what is", "study", "lesson", "topic", "start"],
  quiz: ["quiz", "test", "question", "challenge", "exam", "practice", "assess"],
  next: ["next", "continue", "go on", "move on", "proceed", "forward"],
  repeat: ["repeat", "again", "say again", "come again", "once more", "replay"],
  help: ["help", "how", "what can", "capabilities", "features", "guide"],
  stop: ["stop", "quit", "exit", "pause", "end", "cancel", "done"],
  yes: ["yes", "yeah", "yep", "sure", "okay", "ok", "correct", "right", "true"],
  no: ["no", "nope", "nah", "wrong", "false", "incorrect", "not"],
  subjects: {
    cs: ["computer", "programming", "coding", "software", "algorithm", "cpu", "python", "code"],
    math: ["math", "mathematics", "algebra", "numbers", "binary", "calculate", "equation"],
    science: ["science", "physics", "chemistry", "biology", "matter", "atom", "element"],
    english: ["english", "grammar", "language", "speech", "noun", "verb", "writing"],
    gk: ["geography", "world", "general", "countries", "continents", "ocean", "capital"],
  },
};

export { CONTENT_DB, ALL_LESSONS, INTENT_MAP };
