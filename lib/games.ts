export type GameSlug = "number-rush" | "logic-grid" | "memory-match" | "word-connect";
export type Question = { prompt: string; options: string[]; answer: string; explanation: string };
export const gameCatalog: { slug: GameSlug; title: string; category: string; description: string; icon: string; minutes: string }[] = [
  { slug: "number-rush", title: "Number Rush", category: "NUMERICAL", description: "Find the missing number in a sequence.", icon: "∑", minutes: "3 min" },
  { slug: "logic-grid", title: "Logic Grid", category: "LOGIC", description: "Use clues and patterns to solve each puzzle.", icon: "◇", minutes: "4 min" },
  { slug: "memory-match", title: "Memory Match", category: "MEMORY", description: "Remember the pattern and choose what comes next.", icon: "▦", minutes: "2 min" },
  { slug: "word-connect", title: "Word Connect", category: "VERBAL", description: "Choose the word that best completes the relationship.", icon: "Aa", minutes: "3 min" }
];
const banks: Record<GameSlug, Question[]> = {
  "number-rush": [
    { prompt: "2, 4, 8, 16, ?", options: ["24", "30", "32", "36"], answer: "32", explanation: "Each number is multiplied by 2." },
    { prompt: "3, 6, 11, 18, 27, ?", options: ["36", "38", "40", "42"], answer: "38", explanation: "The differences are +3, +5, +7, +9, then +11." },
    { prompt: "1, 1, 2, 3, 5, 8, ?", options: ["11", "12", "13", "15"], answer: "13", explanation: "Each number is the sum of the two previous numbers." },
    { prompt: "100, 50, 25, 12.5, ?", options: ["5.25", "6.25", "7.5", "10"], answer: "6.25", explanation: "Each number is divided by 2." },
    { prompt: "5, 10, 20, 35, 55, ?", options: ["70", "75", "80", "85"], answer: "80", explanation: "Add 5, 10, 15, 20, then 25." }
  ],
  "logic-grid": [
    { prompt: "All tulips are flowers. Some flowers fade quickly. Which statement must be true?", options: ["All tulips fade quickly", "Some tulips fade quickly", "All tulips are flowers", "No flowers are tulips"], answer: "All tulips are flowers", explanation: "This is the only statement directly guaranteed by the premise." },
    { prompt: "If A is taller than B, and B is taller than C, who is shortest?", options: ["A", "B", "C", "Cannot tell"], answer: "C", explanation: "A > B > C, so C is shortest." },
    { prompt: "A clock shows 3:15. What is the smaller angle between its hands?", options: ["0°", "7.5°", "15°", "22.5°"], answer: "7.5°", explanation: "The minute hand is at 90°; the hour hand is at 97.5°." },
    { prompt: "Which item does not belong?", options: ["Square", "Triangle", "Circle", "Cube"], answer: "Cube", explanation: "A cube is three-dimensional; the others are 2D shapes." },
    { prompt: "If yesterday was Monday, what day is the day after tomorrow?", options: ["Wednesday", "Thursday", "Friday", "Saturday"], answer: "Thursday", explanation: "Yesterday Monday means today Tuesday; after tomorrow is Thursday." }
  ],
  "memory-match": [
    { prompt: "Which sequence matches: 4 – 9 – 2 – 7?", options: ["4 – 9 – 2 – 7", "4 – 2 – 9 – 7", "9 – 4 – 2 – 7", "4 – 9 – 7 – 2"], answer: "4 – 9 – 2 – 7", explanation: "The sequence is unchanged." },
    { prompt: "Remember the order: RED, BLUE, GREEN. Which was second?", options: ["RED", "BLUE", "GREEN", "YELLOW"], answer: "BLUE", explanation: "BLUE was the second item." },
    { prompt: "A pattern is: ▲ ● ■ ★. Which symbol was third?", options: ["▲", "●", "■", "★"], answer: "■", explanation: "The square was third in the pattern." },
    { prompt: "Remember: 8, 3, 6, 1, 9. What was the fourth number?", options: ["3", "6", "1", "9"], answer: "1", explanation: "The fourth number was 1." },
    { prompt: "Which pair appeared together: ORANGE, PURPLE, WHITE, BLACK?", options: ["ORANGE & PURPLE", "PURPLE & WHITE", "WHITE & BLACK", "ORANGE & BLACK"], answer: "WHITE & BLACK", explanation: "WHITE and BLACK were adjacent in the sequence." }
  ],
  "word-connect": [
    { prompt: "Bird is to nest as bee is to…", options: ["Web", "Hive", "Den", "Stable"], answer: "Hive", explanation: "A nest is a bird's home; a hive is a bee's home." },
    { prompt: "Choose the closest synonym of 'concise'.", options: ["Lengthy", "Brief", "Unclear", "Decorative"], answer: "Brief", explanation: "Concise means brief but complete." },
    { prompt: "Book is to reading as fork is to…", options: ["Drawing", "Writing", "Eating", "Running"], answer: "Eating", explanation: "A book is used for reading; a fork is used for eating." },
    { prompt: "Which word is the opposite of 'scarce'?", options: ["Rare", "Limited", "Abundant", "Small"], answer: "Abundant", explanation: "Scarce means in short supply; abundant means plentiful." },
    { prompt: "Seed is to tree as egg is to…", options: ["Bird", "Nest", "Feather", "Wing"], answer: "Bird", explanation: "A seed can grow into a tree; an egg can develop into a bird." }
  ]
};
export function getQuestions(slug: string, count = 5) {
  const bank = banks[slug as GameSlug];
  if (!bank) return null;
  return bank.map((q, originalIndex) => ({ q, originalIndex })).sort(() => Math.random() - 0.5).slice(0, count).map(({ q, originalIndex }) => ({ id: `${slug}-${originalIndex}`, prompt: q.prompt, options: q.options }));
}
export function gradeAnswers(slug: string, answers: { questionId: string; answer: string }[]) {
  const bank = banks[slug as GameSlug];
  if (!bank) return null;
  const seenQuestionIds = new Set<string>();
  const questions = answers.map((entry) => {
    const prefix = `${slug}-`;
    if (!entry.questionId.startsWith(prefix) || seenQuestionIds.has(entry.questionId)) return null;
    seenQuestionIds.add(entry.questionId);
    const indexText = entry.questionId.slice(prefix.length);
    if (!/^\d+$/.test(indexText)) return null;
    const originalIndex = Number(indexText);
    return bank[originalIndex] ? bank[originalIndex] : null;
  });
  if (questions.length !== 5 || questions.some((question) => question === null)) return null;
  const results = answers.map((entry, index) => {
    const question = questions[index];
    const correct = question?.answer === entry.answer;
    return { correct, explanation: question?.explanation ?? "Review the pattern and try again." };
  });
  const correct = results.filter((r) => r.correct).length;
  return { correct, total: answers.length, results, score: Math.round((correct / Math.max(answers.length, 1)) * 100) };
}
export function levelForXp(xp: number) {
  const levels = [{ name: "Beginner", min: 0 }, { name: "Thinker", min: 500 }, { name: "Strategist", min: 1500 }, { name: "Mastermind", min: 3500 }, { name: "Genius", min: 7000 }];
  return [...levels].reverse().find((level) => xp >= level.min) ?? levels[0];
}
