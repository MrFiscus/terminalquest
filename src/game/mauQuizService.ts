import { supabase } from "@/integrations/supabase/client";
import type { MauQuiz } from "./types";

/**
 * Generates a Linux quiz question based on the provided difficulty (0-100).
 * Scales from 2-option multiple choice (low difficulty) to typed string answers (high difficulty).
 */
export async function generateMauQuiz(difficulty: number): Promise<MauQuiz> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-quiz", {
      body: { difficulty },
    });

    if (error) throw error;
    return data as MauQuiz;
  } catch (err) {
    console.error("[mauQuizService] AI generation failed, using fallback:", err);
    return fallbackMauQuiz(difficulty);
  }
}

function fallbackMauQuiz(difficulty: number): MauQuiz {
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
    const pick = lowQuizzes[Math.floor(Math.random() * lowQuizzes.length)];
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
    const pick = highQuizzes[Math.floor(Math.random() * highQuizzes.length)];
    return { ...pick, type: "input" };
  }
}
