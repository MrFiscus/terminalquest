const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mechanic = "rm" | "mkdir" | "chmod";

type QuizResponse = {
  question: string;
  answer: string;
  hint?: string;
};

const quizCache = new Map<string, QuizResponse[]>();

const isMechanic = (value: unknown): value is Mechanic =>
  value === "rm" || value === "mkdir" || value === "chmod";

const clampDifficulty = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 50;

const normalizeQuestion = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function fallbackQuiz(
  mechanic: Mechanic,
  _difficulty: number,
  previousQuestions: string[],
  previousAnswers: string[],
): QuizResponse {
  const pools: Record<Mechanic, QuizResponse[]> = {
    rm: [
      { question: "Mau asks: what command removes a file from these cursed halls?", answer: "rm", hint: "It is two letters." },
      { question: "In plain words, what does rm do to unwanted files?", answer: "remove", hint: "It takes them away." },
      { question: "A cursed file must vanish. What action does rm perform?", answer: "delete", hint: "Another word for remove." },
      { question: "What flag lets rm remove a directory and what lies within it?", answer: "-r", hint: "Short for recursive." },
    ],
    mkdir: [
      { question: "Mau asks: what command creates a new directory?", answer: "mkdir", hint: "It means make directory." },
      { question: "In plain words, what kind of place does mkdir create?", answer: "directory", hint: "Another word for a folder." },
      { question: "A new chamber must be made. What common name describes what mkdir creates?", answer: "folder", hint: "A directory is also called this." },
      { question: "What mkdir flag creates missing parent directories along the path?", answer: "-p", hint: "Think parents." },
    ],
    chmod: [
      { question: "Mau asks: what command changes file permissions?", answer: "chmod", hint: "It means change mode." },
      { question: "A sealed scroll needs new reading rights. Which command changes permissions?", answer: "chmod", hint: "Change mode." },
      { question: "What shell spell grants or removes permission from a file?", answer: "chmod", hint: "It begins with ch." },
    ],
  };
  const previous = new Set(previousQuestions.map(normalizeQuestion));
  const previousAnswerSet = new Set(previousAnswers.map(normalizeAnswer));
  const available = pools[mechanic].filter(
    (quiz) =>
      !previous.has(normalizeQuestion(quiz.question)) &&
      !previousAnswerSet.has(normalizeAnswer(quiz.answer)),
  );
  const pool = available.length ? available : pools[mechanic];
  return pool[Math.floor(Math.random() * pool.length)];
}

function extractJson(text: string): QuizResponse | null {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "";
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as Partial<QuizResponse>;
    if (typeof parsed.question !== "string" || typeof parsed.answer !== "string") return null;
    const question = parsed.question.trim();
    const answer = parsed.answer.trim();
    if (!question || !answer) return null;
    return {
      question,
      answer,
      hint: typeof parsed.hint === "string" ? parsed.hint.trim() : undefined,
    };
  } catch {
    return null;
  }
}

async function generateQuiz(
  mechanic: Mechanic,
  difficulty: number,
  previousQuestions: string[],
  previousAnswers: string[],
): Promise<QuizResponse> {
  const previous = new Set(previousQuestions.map(normalizeQuestion));
  const previousAnswerSet = new Set(previousAnswers.map(normalizeAnswer));
  const cacheKey = `${mechanic}:${difficulty}`;
  const cached = quizCache.get(cacheKey)?.find(
    (quiz) =>
      !previous.has(normalizeQuestion(quiz.question)) &&
      !previousAnswerSet.has(normalizeAnswer(quiz.answer)),
  );
  if (cached) return cached;

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
  if (!ANTHROPIC_API_KEY) return fallbackQuiz(mechanic, difficulty, previousQuestions, previousAnswers);

  const isDemoMode = difficulty === 0;

  const system = `You are Mau, a wise mystical cat who guards a Linux dungeon.
You ask adventurers quiz questions about Linux commands to test their knowledge before granting them special powers.

Generate ONE quiz question based on the mechanic provided.
The question must:
- Be about the specific Linux command for the mechanic
- Be phrased in a medieval/mystical dungeon style
- Not repeat any previously asked questions
- Have a clear single-word or short answer
- Be appropriate for the difficulty level:
  0: DEMO MODE — absolute beginner. Ask the most basic possible question about what the command does. Plain English, no jargon. The answer must be the command name itself (e.g. "rm", "mkdir"). Keep it so simple a first-time computer user could answer it.
  1-33: very beginner, simple direct questions
  34-67: intermediate, slightly more creative phrasing
  68-100: advanced, more conceptual questions

${isDemoMode ? `IMPORTANT: This is demo mode (difficulty 0). Ask something like "Which command removes a file?" with answer "rm", or "Which command creates a directory?" with answer "mkdir". Maximum simplicity.` : ""}

Mechanic context:
- rm: questions about removing/deleting files
- mkdir: questions about creating directories
- chmod: questions about file permissions

Vary the correct answer across attempts when possible.
- For rm, valid answer styles include rm, remove, delete, or a relevant rm flag such as -r.
- For mkdir, valid answer styles include mkdir, directory, folder, or a relevant mkdir flag such as -p.

Output ONLY valid JSON:
{
  "question": "the question Mau asks",
  "answer": "the correct answer",
  "hint": "a subtle hint if player is stuck"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 180,
      temperature: 0.75,
      system,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            mechanic,
            difficulty,
            previousQuestions,
            previousAnswers,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Anthropic quiz error", response.status, await response.text());
    return fallbackQuiz(mechanic, difficulty, previousQuestions, previousAnswers);
  }

  const data = await response.json();
  const text = data?.content
    ?.map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text ?? "" : ""))
    ?.join("")
    ?.trim() ?? "";
  const parsedQuiz = extractJson(text);
  const quiz =
    parsedQuiz && !previousAnswerSet.has(normalizeAnswer(parsedQuiz.answer))
      ? parsedQuiz
      : fallbackQuiz(mechanic, difficulty, previousQuestions, previousAnswers);
  const list = quizCache.get(cacheKey) ?? [];
  if (!list.some((cachedQuiz) => normalizeQuestion(cachedQuiz.question) === normalizeQuestion(quiz.question))) {
    quizCache.set(cacheKey, [...list, quiz].slice(-8));
  }
  return quiz;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const mechanic = isMechanic(body.mechanic) ? body.mechanic : "mkdir";
    const difficulty = clampDifficulty(body.difficulty);
    const previousQuestions = Array.isArray(body.previousQuestions)
      ? body.previousQuestions.filter((question: unknown): question is string => typeof question === "string").slice(-20)
      : [];
    const previousAnswers = Array.isArray(body.previousAnswers)
      ? body.previousAnswers.filter((answer: unknown): answer is string => typeof answer === "string").slice(-20)
      : [];
    const quiz = await generateQuiz(mechanic, difficulty, previousQuestions, previousAnswers);
    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-quiz error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
