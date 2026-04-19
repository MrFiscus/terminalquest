import { supabase } from "@/integrations/supabase/client";
import { mauQuizForMechanic } from "./difficultyMechanics";
import type { DifficultyMechanic, MauQuiz } from "./types";
import { withAiFallback } from "./aiFallback";

const askedQuestions: string[] = [];
const askedAnswersByMechanic: Partial<Record<DifficultyMechanic, string[]>> = {};

const normalizeQuestion = (question: string) => question.trim().toLowerCase().replace(/\s+/g, " ");
const normalizeAnswer = (answer: string) => answer.trim().toLowerCase().replace(/\s+/g, " ");

function rememberQuiz(quiz: Pick<MauQuiz, "question" | "answer">, mechanic?: DifficultyMechanic) {
  const { question, answer } = quiz;
  const clean = question.trim();
  if (clean) {
    askedQuestions.push(clean);
    if (askedQuestions.length > 20) askedQuestions.shift();
  }
  if (mechanic) {
    const answers = askedAnswersByMechanic[mechanic] ?? [];
    askedAnswersByMechanic[mechanic] = [...answers, normalizeAnswer(answer)].slice(-8);
  }
}

function isValidAiQuiz(value: unknown): value is { question: string; answer: string; hint?: string } {
  if (!value || typeof value !== "object") return false;
  const quiz = value as Record<string, unknown>;
  return typeof quiz.question === "string" && quiz.question.trim().length > 0 &&
    typeof quiz.answer === "string" && quiz.answer.trim().length > 0;
}

function withQuestionMemory(quiz: MauQuiz, mechanic?: DifficultyMechanic): MauQuiz {
  rememberQuiz(quiz, mechanic);
  return quiz;
}

function pickFresh<T extends { question: string }>(pool: T[]): T {
  const previous = new Set(askedQuestions.map(normalizeQuestion));
  const fresh = pool.filter((quiz) => !previous.has(normalizeQuestion(quiz.question)));
  const options = fresh.length ? fresh : pool;
  return options[Math.floor(Math.random() * options.length)];
}

function hasRepeatedMechanicAnswer(mechanic: DifficultyMechanic, answer: string) {
  return (askedAnswersByMechanic[mechanic] ?? []).includes(normalizeAnswer(answer));
}

function fallbackMechanicQuiz(mechanic: DifficultyMechanic): MauQuiz {
  const pools: Partial<Record<DifficultyMechanic, MauQuiz[]>> = {
    rm: [
      {
        question: "What command removes a file or obstacle?",
        type: "input",
        answer: "rm",
        rewardCommand: "rm",
        hint: "It is two letters.",
      },
      {
        question: "In plain words, what does rm do to unwanted files?",
        type: "input",
        answer: "remove",
        rewardCommand: "rm",
        hint: "It does not create. It takes away.",
      },
      {
        question: "A cursed file must vanish. What action does rm perform?",
        type: "input",
        answer: "delete",
        rewardCommand: "rm",
        hint: "Another word for remove.",
      },
      {
        question: "What flag lets rm remove a directory and what lies within it?",
        type: "input",
        answer: "-r",
        rewardCommand: "rm",
        hint: "Short for recursive.",
      },
    ],
    mkdir: [
      {
        question: "What command creates a new directory?",
        type: "input",
        answer: "mkdir",
        rewardCommand: "mkdir",
        hint: "It means make directory.",
      },
      {
        question: "In plain words, what kind of place does mkdir create?",
        type: "input",
        answer: "directory",
        rewardCommand: "mkdir",
        hint: "Another word for a folder.",
      },
      {
        question: "A new chamber must be made. What common name describes what mkdir creates?",
        type: "input",
        answer: "folder",
        rewardCommand: "mkdir",
        hint: "A directory is also called this.",
      },
      {
        question: "What mkdir flag creates missing parent directories along the path?",
        type: "input",
        answer: "-p",
        rewardCommand: "mkdir",
        hint: "Think parents.",
      },
    ],
  };
  const pool = pools[mechanic] ?? [mauQuizForMechanic(mechanic)];
  const used = new Set(askedAnswersByMechanic[mechanic] ?? []);
  const fresh = pool.filter((quiz) => !used.has(normalizeAnswer(quiz.answer)));
  return pickFresh(fresh.length ? fresh : pool);
}

/**
 * Generates a Linux quiz question based on the provided difficulty (0-100).
 * Scales from 2-option multiple choice (low difficulty) to typed string answers (high difficulty).
 */
export async function generateMauQuiz(
  difficulty: number,
  mechanic?: DifficultyMechanic,
): Promise<MauQuiz> {
  const fallback = () => {
    if (!mechanic) return withQuestionMemory(fallbackMauQuiz(difficulty));
    for (let i = 0; i < 8; i++) {
      const quiz = fallbackMechanicQuiz(mechanic);
      if (!askedQuestions.map(normalizeQuestion).includes(normalizeQuestion(quiz.question))) {
        return withQuestionMemory(quiz, mechanic);
      }
    }
    return withQuestionMemory(fallbackMechanicQuiz(mechanic), mechanic);
  };

  return withAiFallback(async () => {
    const { data, error } = await supabase.functions.invoke("generate-quiz", {
      body: {
        difficulty,
        mechanic,
        previousQuestions: askedQuestions,
        previousAnswers: mechanic ? askedAnswersByMechanic[mechanic] ?? [] : [],
      },
    });

    if (error) throw error;
    if (!isValidAiQuiz(data)) throw new Error("Invalid Mau quiz response");
    if (mechanic && hasRepeatedMechanicAnswer(mechanic, data.answer)) {
      return withQuestionMemory(fallbackMechanicQuiz(mechanic), mechanic);
    }
    const answer = data.answer.trim();
    // Demo mode: present as multiple choice with a simple decoy
    if (difficulty === 0) {
      const decoys: Record<string, string> = {
        rm: "ls", mkdir: "cd", chmod: "cat", ls: "rm", cd: "pwd", pwd: "cat", cat: "ls", touch: "mkdir",
      };
      const decoy = decoys[answer.toLowerCase()] ?? (answer === "ls" ? "cd" : "ls");
      return withQuestionMemory({
        question: data.question.trim(),
        answer,
        hint: typeof data.hint === "string" ? data.hint.trim() : undefined,
        type: "choice",
        options: Math.random() < 0.5 ? [answer, decoy] : [decoy, answer],
        rewardCommand: mechanic,
      }, mechanic);
    }
    return withQuestionMemory({
      question: data.question.trim(),
      answer,
      hint: typeof data.hint === "string" ? data.hint.trim() : undefined,
      type: "input",
      rewardCommand: mechanic,
    }, mechanic);
  }, fallback, "generate-quiz");
}

function fallbackMauQuiz(difficulty: number): MauQuiz {
  if (difficulty === 0) {
    // Demo mode: ultra-simple multiple choice, 2 options, complete beginner
    const demoQuizzes = [
      {
        question: "Which command shows the files in a folder?",
        options: ["ls", "rm"],
        answer: "ls",
      },
      {
        question: "Which command moves you into a different folder?",
        options: ["cd", "pwd"],
        answer: "cd",
      },
      {
        question: "Which command prints your current location?",
        options: ["pwd", "cat"],
        answer: "pwd",
      },
      {
        question: "Which command displays the contents of a file?",
        options: ["cat", "mkdir"],
        answer: "cat",
      },
      {
        question: "Which command creates a new folder?",
        options: ["mkdir", "touch"],
        answer: "mkdir",
      },
      {
        question: "Which command creates a new empty file?",
        options: ["touch", "ls"],
        answer: "touch",
      },
    ];
    const pick = pickFresh(demoQuizzes);
    return { ...pick, type: "choice" };
  }

  if (difficulty <= 40) {
    // Low Difficulty: Multiple Choice (2 options)
    const lowQuizzes = [
      {
        question: "Which command lists what is inside a directory?",
        options: ["ls", "cat"],
        answer: "ls",
      },
      {
        question: "Which command shows your current path?",
        options: ["pwd", "whoami"],
        answer: "pwd",
      },
      {
        question: "Which command allows you to change directories?",
        options: ["cd", "mv"],
        answer: "cd",
      },
    ];
    const pick = pickFresh(lowQuizzes);
    return { ...pick, type: "choice" };
  } else {
    // High Difficulty: Typed Answer
    const highQuizzes = [
      {
        question: "What flag do you use with 'rm' to delete a directory and its contents?",
        answer: "-r",
      },
      {
        question: "Which command creates a new, empty file?",
        answer: "touch",
      },
      {
        question: "What is the symbol for your home directory?",
        answer: "~",
      },
      {
        question: "Which command is used to rename or move a file?",
        answer: "mv",
      },
    ];
    const pick = pickFresh(highQuizzes);
    return { ...pick, type: "input" };
  }
}
