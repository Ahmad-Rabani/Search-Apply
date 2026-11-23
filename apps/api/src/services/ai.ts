import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";
import { config } from "../config.js";

export type AiProvider = "gemini" | "anthropic";

export function getAiProvider(): AiProvider {
  if (config.geminiApiKey) return "gemini";
  if (config.anthropicApiKey) return "anthropic";
  throw new Error(
    "No AI key found. Add GEMINI_API_KEY (recommended) or ANTHROPIC_API_KEY to apps/api/.env"
  );
}

function geminiModelCandidates() {
  const primary = config.geminiModel || "gemini-2.5-flash";
  const fallbacks = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-pro",
  ];
  return Array.from(new Set([primary, ...fallbacks]));
}

function isRetryableGeminiError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|429|high demand|unavailable|quota|rate limit|timed out|timeout|ECONNRESET|fetch failed/i.test(
    msg
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type AiMediaPart = {
  mimeType: string;
  data: Buffer;
};

async function generateWithGemini(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
  media?: AiMediaPart[];
}): Promise<string> {
  const client = new GoogleGenerativeAI(config.geminiApiKey);
  const models = geminiModelCandidates();
  let lastError: unknown;
  const wantJson = params.json !== false;

  const mediaParts = (params.media || []).map((m) => ({
    inlineData: {
      mimeType: m.mimeType,
      data: m.data.toString("base64"),
    },
  }));

  for (const modelName of models) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: params.system,
          generationConfig: {
            temperature: params.temperature ?? 0.2,
            maxOutputTokens: params.maxTokens ?? 8192,
            ...(wantJson ? { responseMimeType: "application/json" as const } : {}),
          },
        });

        const result = await model.generateContent(
          mediaParts.length
            ? [{ text: params.user }, ...mediaParts]
            : params.user
        );
        const text = result.response.text()?.trim();
        if (!text) throw new Error("Gemini returned empty response");
        if (modelName !== config.geminiModel) {
          console.warn(`[gemini] fell back to model: ${modelName}`);
        }
        return text;
      } catch (err) {
        lastError = err;
        const retryable = isRetryableGeminiError(err);
        console.warn(
          `[gemini] ${modelName} attempt ${attempt} failed:`,
          err instanceof Error ? err.message : err
        );
        if (!retryable) break;
        await sleep(800 * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini request failed after retries");
}

async function generateWithAnthropic(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  media?: AiMediaPart[];
}): Promise<string> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  for (const m of params.media || []) {
    if (m.mimeType.startsWith("image/")) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: m.mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: m.data.toString("base64"),
        },
      });
    } else if (m.mimeType === "application/pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: m.data.toString("base64"),
        },
      });
    }
  }
  content.push({ type: "text", text: params.user });

  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: params.maxTokens ?? 8192,
    temperature: params.temperature ?? 0.2,
    system: params.system,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text");
  }
  return textBlock.text;
}

export async function generateJsonText(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const provider = getAiProvider();

  if (provider === "gemini") {
    return generateWithGemini({ ...params, json: true });
  }

  return generateWithAnthropic(params);
}

/** Free-form text (HTML, markdown, etc.) — not forced JSON. */
export async function generateText(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  media?: AiMediaPart[];
}): Promise<string> {
  const provider = getAiProvider();

  if (provider === "gemini") {
    return generateWithGemini({ ...params, json: false });
  }

  return generateWithAnthropic(params);
}

export function parseModelJson(raw: string): Record<string, unknown> {
  const candidates = buildJsonCandidates(raw);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch (err) {
      lastError = err;
      try {
        return JSON.parse(jsonrepair(candidate)) as Record<string, unknown>;
      } catch (repairErr) {
        lastError = repairErr;
      }
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : "Unknown JSON parse error";
  throw new Error(`Failed to parse model JSON response: ${detail}`);
}

export async function generateAndParseJson(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<Record<string, unknown>> {
  const text = await generateJsonText(params);
  try {
    return parseModelJson(text);
  } catch (firstErr) {
    const repaired = await generateJsonText({
      system:
        "You fix invalid JSON. Return ONLY valid minified JSON. No markdown, no comments, no trailing commas.",
      user: `Fix this into valid JSON only:\n\n${text.slice(0, 12000)}`,
      maxTokens: params.maxTokens ?? 8192,
      temperature: 0,
    });
    try {
      return parseModelJson(repaired);
    } catch {
      throw firstErr;
    }
  }
}

function buildJsonCandidates(raw: string): string[] {
  const cleaned = raw
    .replace(/^\uFEFF/, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const sliced =
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  const noTrailingCommas = sliced.replace(/,\s*([}\]])/g, "$1");
  const normalizedQuotes = noTrailingCommas
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  return Array.from(new Set([cleaned, sliced, noTrailingCommas, normalizedQuotes]));
}
