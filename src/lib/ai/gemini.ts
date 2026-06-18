import "server-only";

import { GoogleGenAI } from "@google/genai";

import { parseAIJson } from "./json";
import { logAIModelRun } from "./model-run-logger";
import {
  AIProviderError,
  type AIJsonRunInput,
  type AIJsonRunResult,
  type AIModelConfig,
  type AIModelPurpose,
  type AIModelRunContext,
  type AITextRunInput,
  type AITextRunResult,
  type AIVisionJsonRunInput,
  type JsonValue,
} from "./types";

let geminiClient: GoogleGenAI | null = null;

function getEnvValue(key: string) {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

export function getGeminiModelConfig(): AIModelConfig {
  const textModel = getEnvValue("GEMINI_TEXT_MODEL") ?? "gemini-2.5-flash";
  const visionModel = getEnvValue("GEMINI_VISION_MODEL") ?? textModel;
  const embeddingModel =
    getEnvValue("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-2";
  const imageModel =
    getEnvValue("GEMINI_IMAGE_MODEL") ?? "gemini-2.5-flash-image";

  return {
    textModel,
    visionModel,
    embeddingModel,
    imageModel,
  };
}

export function getGeminiClient() {
  const apiKey = getEnvValue("GEMINI_API_KEY");

  if (!apiKey) {
    throw new AIProviderError(
      "Gemini chưa được cấu hình. Hãy thêm GEMINI_API_KEY vào .env.local.",
      "GEMINI_API_KEY_MISSING",
    );
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
    });
  }

  return geminiClient;
}

function getGeminiText(response: any) {
  if (typeof response?.text === "string") {
    return response.text.trim();
  }

  if (typeof response?.text === "function") {
    const text = response.text();

    if (typeof text === "string") {
      return text.trim();
    }
  }

  const candidates = response?.candidates;

  if (Array.isArray(candidates)) {
    const parts: string[] = [];

    for (const candidate of candidates) {
      const contentParts = candidate?.content?.parts;

      if (!Array.isArray(contentParts)) {
        continue;
      }

      for (const part of contentParts) {
        if (typeof part?.text === "string") {
          parts.push(part.text);
        }
      }
    }

    return parts.join("\n").trim();
  }

  return "";
}

function normalizeUsage(response: any) {
  const usage = response?.usageMetadata ?? response?.usage_metadata;

  return {
    inputTokens:
      typeof usage?.promptTokenCount === "number"
        ? usage.promptTokenCount
        : undefined,
    outputTokens:
      typeof usage?.candidatesTokenCount === "number"
        ? usage.candidatesTokenCount
        : undefined,
    totalTokens:
      typeof usage?.totalTokenCount === "number"
        ? usage.totalTokenCount
        : undefined,
  };
}

function normalizeError(error: unknown) {
  if (error instanceof AIProviderError) {
    return {
      code: error.code,
      message: error.message,
      detail: error.causeDetail,
    };
  }

  if (error instanceof Error) {
    const possibleError = error as any;

    return {
      code:
        typeof possibleError?.code === "string"
          ? possibleError.code
          : "GEMINI_UNKNOWN_ERROR",
      message: error.message,
      status:
        typeof possibleError?.status === "number"
          ? possibleError.status
          : undefined,
      raw: possibleError?.error ?? possibleError,
    };
  }

  return {
    code: "GEMINI_UNKNOWN_ERROR",
    message: "Gemini request thất bại vì lỗi không xác định.",
  };
}

function buildRunContextInput(
  fallbackInput: JsonValue,
  runContext?: AIModelRunContext,
) {
  return runContext?.userInput ?? fallbackInput;
}

function getContextPurpose(
  fallbackPurpose: AIModelPurpose,
  runContext?: AIModelRunContext,
) {
  return runContext?.purpose ?? fallbackPurpose;
}

function getPromptVersion(runContext?: AIModelRunContext) {
  return runContext?.promptVersion ?? "creative-intelligence-v1";
}

function buildCommonLogContext(runContext?: AIModelRunContext) {
  return {
    createdBy: runContext?.createdBy ?? null,
    relatedCustomerProfileId: runContext?.relatedCustomerProfileId ?? null,
    relatedDesignerProfileId: runContext?.relatedDesignerProfileId ?? null,
    relatedRequestId: runContext?.relatedRequestId ?? null,
    relatedPortfolioItemId: runContext?.relatedPortfolioItemId ?? null,
    relatedJobId: runContext?.relatedJobId ?? null,
  };
}

async function logFailure({
  model,
  purpose,
  task,
  instructions,
  userInput,
  startedAt,
  error,
  runContext,
}: {
  model: string;
  purpose: AIModelPurpose;
  task: string;
  instructions: string | null;
  userInput: JsonValue;
  startedAt: number;
  error: unknown;
  runContext?: AIModelRunContext;
}) {
  const normalizedError = normalizeError(error);

  await logAIModelRun({
    provider: "gemini",
    model,
    purpose,
    task,
    status: "failed",
    promptVersion: getPromptVersion(runContext),
    systemPrompt: runContext?.systemPrompt ?? instructions,
    userInput,
    latencyMs: Date.now() - startedAt,
    errorCode: normalizedError.code,
    errorMessage: normalizedError.message,
    ...buildCommonLogContext(runContext),
  });
}

function buildGeminiConfig({
  instructions,
  temperature,
  maxOutputTokens,
  responseMimeType,
}: {
  instructions: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}) {
  const config: Record<string, unknown> = {
    systemInstruction: instructions,
  };

  if (typeof temperature === "number" && !Number.isNaN(temperature)) {
    config.temperature = temperature;
  }

  if (typeof maxOutputTokens === "number") {
    config.maxOutputTokens = maxOutputTokens;
  }

  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  return config;
}

async function fetchImageAsInlineData(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new AIProviderError(
      `Không thể tải ảnh cho Gemini Vision. HTTP ${response.status}`,
      "GEMINI_IMAGE_FETCH_FAILED",
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const data = Buffer.from(arrayBuffer).toString("base64");

  return {
    inlineData: {
      data,
      mimeType: contentType,
    },
  };
}

export async function runGeminiText({
  task,
  instructions,
  input,
  model,
  temperature = 0.4,
  maxOutputTokens = 1800,
  runContext,
}: AITextRunInput): Promise<AITextRunResult> {
  const models = getGeminiModelConfig();
  const selectedModel = model ?? models.textModel;
  const startedAt = Date.now();

  const userInput = buildRunContextInput(
    {
      input,
    },
    runContext,
  );

  try {
    const client = getGeminiClient();

    const response = await client.models.generateContent({
      model: selectedModel,
      contents: input,
      config: buildGeminiConfig({
        instructions,
        temperature,
        maxOutputTokens,
      }),
    } as any);

    const text = getGeminiText(response);

    if (!text) {
      throw new AIProviderError(
        "Gemini không trả về nội dung text.",
        "GEMINI_EMPTY_TEXT",
        response,
      );
    }

    const usage = normalizeUsage(response);

    const aiModelRunId = await logAIModelRun({
      provider: "gemini",
      model: selectedModel,
      purpose: getContextPurpose("text", runContext),
      task,
      status: "success",
      promptVersion: getPromptVersion(runContext),
      systemPrompt: runContext?.systemPrompt ?? instructions,
      userInput,
      aiOutput: runContext?.aiOutput ?? {
        text,
      },
      rawTextOutput: text,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      latencyMs: Date.now() - startedAt,
      ...buildCommonLogContext(runContext),
    });

    return {
      provider: "gemini",
      model: selectedModel,
      task,
      text,
      usage,
      aiModelRunId,
    };
  } catch (error) {
    await logFailure({
      model: selectedModel,
      purpose: getContextPurpose("text", runContext),
      task,
      instructions,
      userInput,
      startedAt,
      error,
      runContext,
    });

    if (error instanceof AIProviderError) {
      throw error;
    }

    throw new AIProviderError(
      `Gemini text run thất bại cho task: ${task}`,
      "GEMINI_TEXT_RUN_FAILED",
      normalizeError(error),
    );
  }
}

export async function runGeminiJson<T extends JsonValue>({
  task,
  instructions,
  input,
  model,
  temperature = 0.25,
  maxOutputTokens = 2200,
  jsonLabel = "Gemini JSON",
  runContext,
}: AIJsonRunInput): Promise<AIJsonRunResult<T>> {
  const models = getGeminiModelConfig();
  const selectedModel = model ?? models.textModel;
  const startedAt = Date.now();

  const userInput = buildRunContextInput(
    {
      input,
    },
    runContext,
  );

  try {
    const client = getGeminiClient();

    const response = await client.models.generateContent({
      model: selectedModel,
      contents: input,
      config: buildGeminiConfig({
        instructions,
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
      }),
    } as any);

    const text = getGeminiText(response);

    if (!text) {
      throw new AIProviderError(
        "Gemini không trả về JSON text.",
        "GEMINI_EMPTY_JSON_TEXT",
        response,
      );
    }

    const json = parseAIJson<T>(text, jsonLabel);
    const usage = normalizeUsage(response);

    const aiModelRunId = await logAIModelRun({
      provider: "gemini",
      model: selectedModel,
      purpose: getContextPurpose("text", runContext),
      task,
      status: "success",
      promptVersion: getPromptVersion(runContext),
      systemPrompt: runContext?.systemPrompt ?? instructions,
      userInput,
      aiOutput: json,
      rawTextOutput: text,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      latencyMs: Date.now() - startedAt,
      ...buildCommonLogContext(runContext),
    });

    return {
      provider: "gemini",
      model: selectedModel,
      task,
      text,
      json,
      usage,
      aiModelRunId,
    };
  } catch (error) {
    await logFailure({
      model: selectedModel,
      purpose: getContextPurpose("text", runContext),
      task,
      instructions,
      userInput,
      startedAt,
      error,
      runContext,
    });

    if (error instanceof AIProviderError) {
      throw error;
    }

    throw new AIProviderError(
      `Gemini JSON run thất bại cho task: ${task}`,
      "GEMINI_JSON_RUN_FAILED",
      normalizeError(error),
    );
  }
}

export async function runGeminiVisionJson<T extends JsonValue>({
  task,
  instructions,
  input,
  imageUrl,
  model,
  temperature = 0.25,
  maxOutputTokens = 2200,
  jsonLabel = "Gemini Vision JSON",
  runContext,
}: AIVisionJsonRunInput): Promise<AIJsonRunResult<T>> {
  const models = getGeminiModelConfig();
  const selectedModel = model ?? models.visionModel;
  const startedAt = Date.now();

  const userInput = buildRunContextInput(
    {
      input,
      imageUrl,
    },
    runContext,
  );

  try {
    const client = getGeminiClient();
    const inlineImage = await fetchImageAsInlineData(imageUrl);

    const response = await client.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          inlineImage,
          {
            text: input,
          },
        ],
      },
      config: buildGeminiConfig({
        instructions,
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
      }),
    } as any);

    const text = getGeminiText(response);

    if (!text) {
      throw new AIProviderError(
        "Gemini Vision không trả về JSON text.",
        "GEMINI_EMPTY_VISION_JSON_TEXT",
        response,
      );
    }

    const json = parseAIJson<T>(text, jsonLabel);
    const usage = normalizeUsage(response);

    const aiModelRunId = await logAIModelRun({
      provider: "gemini",
      model: selectedModel,
      purpose: getContextPurpose("vision", runContext),
      task,
      status: "success",
      promptVersion: getPromptVersion(runContext),
      systemPrompt: runContext?.systemPrompt ?? instructions,
      userInput,
      aiOutput: json,
      rawTextOutput: text,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      latencyMs: Date.now() - startedAt,
      ...buildCommonLogContext(runContext),
    });

    return {
      provider: "gemini",
      model: selectedModel,
      task,
      text,
      json,
      usage,
      aiModelRunId,
    };
  } catch (error) {
    await logFailure({
      model: selectedModel,
      purpose: getContextPurpose("vision", runContext),
      task,
      instructions,
      userInput,
      startedAt,
      error,
      runContext,
    });

    if (error instanceof AIProviderError) {
      throw error;
    }

    throw new AIProviderError(
      `Gemini Vision JSON run thất bại cho task: ${task}`,
      "GEMINI_VISION_JSON_RUN_FAILED",
      normalizeError(error),
    );
  }
}

export function assertGeminiReady() {
  const apiKey = getEnvValue("GEMINI_API_KEY");

  if (!apiKey) {
    throw new AIProviderError(
      "Thiếu GEMINI_API_KEY. Hãy thêm key vào .env.local trước khi dùng Gemini.",
      "GEMINI_API_KEY_MISSING",
    );
  }

  return true;
}