import "server-only";

import {
  runGeminiJson,
  runGeminiText,
  runGeminiVisionJson,
} from "./gemini";
import {
  runOpenAIJson,
  runOpenAIText,
  runOpenAIVisionJson,
} from "./openai";
import type {
  AIJsonRunInput,
  AIJsonRunResult,
  AIProviderName,
  AITextRunInput,
  AITextRunResult,
  AIVisionJsonRunInput,
  JsonValue,
} from "./types";

export function getActiveAIProvider(): AIProviderName {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (provider === "gemini") {
    return "gemini";
  }

  return "openai";
}

export async function runAIText(
  input: AITextRunInput,
): Promise<AITextRunResult> {
  const provider = getActiveAIProvider();

  if (provider === "gemini") {
    return runGeminiText(input);
  }

  return runOpenAIText(input);
}

export async function runAIJson<T extends JsonValue>(
  input: AIJsonRunInput,
): Promise<AIJsonRunResult<T>> {
  const provider = getActiveAIProvider();

  if (provider === "gemini") {
    return runGeminiJson<T>(input);
  }

  return runOpenAIJson<T>(input);
}

export async function runAIVisionJson<T extends JsonValue>(
  input: AIVisionJsonRunInput,
): Promise<AIJsonRunResult<T>> {
  const provider = getActiveAIProvider();

  if (provider === "gemini") {
    return runGeminiVisionJson<T>(input);
  }

  return runOpenAIVisionJson<T>(input);
}