import { GoogleGenAI } from "@google/genai";

const REQUEST_TIMEOUT_MS = 20_000;
const GROQ_MODEL = "openai/gpt-oss-120b";

interface GenerateTextOptions {
  prompt: string;
  json?: boolean;
}

interface GroqChatCompletion {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

async function generateTextWithGroq(
  apiKey: string,
  { prompt, json = false }: GenerateTextOptions,
): Promise<string> {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Groq request failed (${response.status}): ${details || response.statusText}`,
    );
  }

  const result = (await response.json()) as GroqChatCompletion;
  const text = result.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned an empty response.");
  }
  return text;
}

export async function generateTextWithFallback(
  options: GenerateTextOptions,
): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          timeout: REQUEST_TIMEOUT_MS,
          retryOptions: { attempts: 1 },
        },
      });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
        contents: options.prompt,
        ...(options.json
          ? { config: { responseMimeType: "application/json" } }
          : {}),
      });
      const text = response.text?.trim();
      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }
      return text;
    } catch (error) {
      if (!groqApiKey) {
        throw new Error(
          "Gemini request failed and GROQ_API_KEY is not configured.",
          { cause: error },
        );
      }
      console.warn("[AI] Gemini request failed; using Groq fallback.");
    }
  }

  if (!groqApiKey) {
    throw new Error("GEMINI_API_KEY or GROQ_API_KEY is not configured.");
  }

  return generateTextWithGroq(groqApiKey, options);
}
