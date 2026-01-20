import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// 🔒 Validate API key early
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in .env");
  process.exit(1);
}

// ✅ Initialize Gemini client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ✅ Always use a supported model (DO NOT CHANGE)
const MODEL_NAME = "gemini-2.5-flash";

/**
 * Internal helper to generate text safely
 */
const generateText = async (prompt) => {
  const response = await genAI.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  return response.text;
};

/**
 * Generate flashcards
 */
export const generateFlashcards = async (text, count = 10) => {
  try {
    const prompt = `
Generate exactly ${count} educational flashcards.

Format:
Q: Question
A: Answer
D: easy | medium | hard

Separate each with "---"

Text:
${text.substring(0, 15000)}
`;

    const output = await generateText(prompt);

    const cards = output.split("---").filter(Boolean);
    const flashcards = [];

    for (const card of cards) {
      const lines = card.trim().split("\n");

      let question = "";
      let answer = "";
      let difficulty = "medium";

      for (const line of lines) {
        if (line.startsWith("Q:")) question = line.slice(2).trim();
        if (line.startsWith("A:")) answer = line.slice(2).trim();
        if (line.startsWith("D:")) {
          const d = line.slice(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(d)) difficulty = d;
        }
      }

      if (question && answer) {
        flashcards.push({ question, answer, difficulty });
      }
    }

    return flashcards.slice(0, count);
  } catch (error) {
    console.error("Gemini Flashcard Error:", error);
    throw new Error("Failed to generate flashcards");
  }
};
/**
 * Generate quiz questions from text
 */
export const generateQuiz = async (text, numQuestions = 5) => {
  try {
    const prompt = `
Generate exactly ${numQuestions} MCQs.

Format:
Q:
01:
02:
03:
04:
C:
E:
D: easy | medium | hard

Separate each question with ---
Text:
${text.substring(0, 15000)}
`;

    const output = await generateText(prompt);
    const blocks = output.split("---").filter(Boolean);

    const questions = [];

    for (const block of blocks) {
      const lines = block.trim().split("\n");

      let question = "";
      let options = [];
      let correctIndex = "";
      let explanation = "";
      let difficulty = "medium";

      for (const line of lines) {
        if (line.startsWith("Q:")) {
          question = line.slice(2).trim();
        }
        else if (/^0\d:/.test(line)) {
          options.push(line.slice(3).trim());
        }
        else if (line.startsWith("C:")) {
          correctIndex = line.slice(2).trim(); // "03"
        }
        else if (line.startsWith("E:")) {
          explanation = line.slice(2).trim();
        }
        else if (line.startsWith("D:")) {
          const d = line.slice(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(d)) {
            difficulty = d;
          }
        }
      }

      if (question && options.length === 4 && correctIndex) {
        const index = parseInt(correctIndex, 10) - 1;
        const correctText = options[index] || "";

        questions.push({
          question,
          options,
          correctAnswer: `${correctIndex}: ${correctText}`,
          explanation,
          difficulty
        });
      }
    }

    return questions.slice(0, numQuestions);

  } catch (error) {
    console.error("Gemini Quiz Error:", error);
    throw new Error("Failed to generate quiz");
  }
};

/**
 * Generate summary
 */
export const generateSummary = async (text) => {
  try {
    const prompt = `
Summarize the following text clearly and concisely:

${text.substring(0, 4000)}
`;

    return await generateText(prompt);
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    throw new Error("Failed to generate summary");
  }
};

/**
 * Chat with context
 */
export const chatWithContext = async (question, chunks) => {
  try {
    const context = chunks
      .map((c, i) => `[Chunk ${i + 1}]\n${c.content}`)
      .join("\n\n");

    const prompt = `
Context:
${context}

Question: ${question}
Answer:
`;

    return await generateText(prompt);
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw new Error("Failed to process chat");
  }
};

/**
 * Explain concept
 */
export const explainConcept = async (concept, context) => {
  try {
    const prompt = `
Explain "${concept}" using the context below in simple terms.

Context:
${context.substring(0, 10000)}
`;

    return await generateText(prompt);
  } catch (error) {
    console.error("Gemini Explain Error:", error);
    throw new Error("Failed to explain concept");
  }
};
