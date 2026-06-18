import "server-only";

import OpenAI from "openai";

import { parseAIJson } from "./json";
import { logAIModelRun } from "./model-run-logger";
import {
  AIProviderError,
  type AIEmbeddingInput,
  type AIEmbeddingResult,
  type AIImageGenerationInput,
  type AIImageGenerationResult,
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

let openAIClient: OpenAI | null = null;

function getEnvValue(key: string) {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

export function getAIModelConfig(): AIModelConfig {
  const textModel = getEnvValue("OPENAI_TEXT_MODEL") ?? "gpt-5.5";
  const visionModel = getEnvValue("OPENAI_VISION_MODEL") ?? textModel;
  const embeddingModel =
    getEnvValue("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
  const imageModel = getEnvValue("OPENAI_IMAGE_MODEL") ?? "gpt-image-1";

  return {
    textModel,
    visionModel,
    embeddingModel,
    imageModel,
  };
}

export function getOpenAIClient() {
  const apiKey = getEnvValue("OPENAI_API_KEY");

  if (!apiKey) {
    throw new AIProviderError(
      "OpenAI chưa được cấu hình. Hãy thêm OPENAI_API_KEY vào .env.local.",
      "OPENAI_API_KEY_MISSING",
    );
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey,
    });
  }

  return openAIClient;
}

function normalizeUsage(rawResponse: any) {
  const usage = rawResponse?.usage;

  return {
    inputTokens:
      typeof usage?.input_tokens === "number" ? usage.input_tokens : undefined,
    outputTokens:
      typeof usage?.output_tokens === "number" ? usage.output_tokens : undefined,
    totalTokens:
      typeof usage?.total_tokens === "number" ? usage.total_tokens : undefined,
  };
}

function getOutputText(rawResponse: any) {
  if (typeof rawResponse?.output_text === "string") {
    return rawResponse.output_text.trim();
  }

  const output = rawResponse?.output;

  if (Array.isArray(output)) {
    const textParts: string[] = [];

    for (const outputItem of output) {
      const content = outputItem?.content;

      if (!Array.isArray(content)) {
        continue;
      }

      for (const contentItem of content) {
        if (typeof contentItem?.text === "string") {
          textParts.push(contentItem.text);
        }
      }
    }

    return textParts.join("\n").trim();
  }

  return "";
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
          : "OPENAI_UNKNOWN_ERROR",
      message: error.message,
      status:
        typeof possibleError?.status === "number"
          ? possibleError.status
          : undefined,
      type:
        typeof possibleError?.type === "string"
          ? possibleError.type
          : undefined,
      param:
        typeof possibleError?.param === "string"
          ? possibleError.param
          : undefined,
      raw: possibleError?.error ?? null,
    };
  }

  return {
    code: "OPENAI_UNKNOWN_ERROR",
    message: "OpenAI request thất bại vì lỗi không xác định.",
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

function shouldOmitTemperature(model: string) {
  const normalizedModel = model.toLowerCase();

  return (
    normalizedModel.startsWith("gpt-5") ||
    normalizedModel.startsWith("o1") ||
    normalizedModel.startsWith("o3") ||
    normalizedModel.startsWith("o4")
  );
}

function buildResponseOptions({
  model,
  instructions,
  input,
  temperature,
  maxOutputTokens,
}: {
  model: string;
  instructions: string;
  input: unknown;
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const payload: Record<string, unknown> = {
    model,
    instructions,
    input,
  };

  if (typeof maxOutputTokens === "number") {
    payload.max_output_tokens = maxOutputTokens;
  }

  if (
    typeof temperature === "number" &&
    !Number.isNaN(temperature) &&
    !shouldOmitTemperature(model)
  ) {
    payload.temperature = temperature;
  }

  return payload;
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
    provider: "openai",
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

export async function runOpenAIText({
  task,
  instructions,
  input,
  model,
  temperature = 0.4,
  maxOutputTokens = 1800,
  runContext,
}: AITextRunInput): Promise<AITextRunResult> {
  const models = getAIModelConfig();
  const selectedModel = model ?? models.textModel;
  const startedAt = Date.now();

  const userInput = buildRunContextInput(
    {
      input,
    },
    runContext,
  );

  try {
    const client = getOpenAIClient();

    const response = await client.responses.create(
      buildResponseOptions({
        model: selectedModel,
        instructions,
        input,
        temperature,
        maxOutputTokens,
      }) as any,
    );

    const text = getOutputText(response);

    if (!text) {
      throw new AIProviderError(
        "OpenAI không trả về nội dung text.",
        "OPENAI_EMPTY_TEXT",
        response,
      );
    }

    const usage = normalizeUsage(response);

    const aiModelRunId = await logAIModelRun({
      provider: "openai",
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
      provider: "openai",
      model: selectedModel,
      task,
      text,
      usage,
      rawResponseId:
        typeof (response as any)?.id === "string" ? (response as any).id : undefined,
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
      `OpenAI text run thất bại cho task: ${task}`,
      "OPENAI_TEXT_RUN_FAILED",
      normalizeError(error),
    );
  }
}

export async function runOpenAIJson<T extends JsonValue>({
  task,
  instructions,
  input,
  model,
  temperature = 0.25,
  maxOutputTokens = 2200,
  jsonLabel = "OpenAI JSON",
  runContext,
}: AIJsonRunInput): Promise<AIJsonRunResult<T>> {
  const textResult = await runOpenAIText({
    task,
    instructions,
    input,
    model,
    temperature,
    maxOutputTokens,
    runContext,
  });

  const json = parseAIJson<T>(textResult.text, jsonLabel);

  return {
    ...textResult,
    json,
  };
}

export async function runOpenAIVisionJson<T extends JsonValue>({
  task,
  instructions,
  input,
  imageUrl,
  model,
  temperature = 0.25,
  maxOutputTokens = 2200,
  jsonLabel = "OpenAI Vision JSON",
  runContext,
}: AIVisionJsonRunInput): Promise<AIJsonRunResult<T>> {
  const models = getAIModelConfig();
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
    const client = getOpenAIClient();

    const responseInput = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: input,
          },
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "auto",
          },
        ],
      },
    ];

    const response = await client.responses.create(
      buildResponseOptions({
        model: selectedModel,
        instructions,
        input: responseInput,
        temperature,
        maxOutputTokens,
      }) as any,
    );

    const text = getOutputText(response);

    if (!text) {
      throw new AIProviderError(
        "OpenAI Vision không trả về nội dung text.",
        "OPENAI_EMPTY_VISION_TEXT",
        response,
      );
    }

    const json = parseAIJson<T>(text, jsonLabel);
    const usage = normalizeUsage(response);

    const aiModelRunId = await logAIModelRun({
      provider: "openai",
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
      provider: "openai",
      model: selectedModel,
      task,
      text,
      json,
      usage,
      rawResponseId:
        typeof (response as any)?.id === "string" ? (response as any).id : undefined,
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
      `OpenAI vision run thất bại cho task: ${task}`,
      "OPENAI_VISION_RUN_FAILED",
      normalizeError(error),
    );
  }
}

export async function createOpenAIEmbeddings({
  input,
  model,
  runContext,
}: AIEmbeddingInput): Promise<AIEmbeddingResult> {
  const models = getAIModelConfig();
  const selectedModel = model ?? models.embeddingModel;
  const startedAt = Date.now();

  const inputCount = Array.isArray(input) ? input.length : 1;

  const userInput = buildRunContextInput(
    {
      inputCount,
      input,
    },
    runContext,
  );

  try {
    const client = getOpenAIClient();

    const response = await client.embeddings.create({
      model: selectedModel,
      input,
    });

    const embeddings = response.data.map((item) => item.embedding);

    const usage = {
      inputTokens:
        typeof response.usage?.prompt_tokens === "number"
          ? response.usage.prompt_tokens
          : undefined,
      totalTokens:
        typeof response.usage?.total_tokens === "number"
          ? response.usage.total_tokens
          : undefined,
    };

    const aiModelRunId = await logAIModelRun({
      provider: "openai",
      model: selectedModel,
      purpose: getContextPurpose("embedding", runContext),
      task: runContext?.promptVersion ?? "create_embeddings",
      status: "success",
      promptVersion: getPromptVersion(runContext),
      systemPrompt: runContext?.systemPrompt ?? null,
      userInput,
      aiOutput: {
        embeddingCount: embeddings.length,
        dimensions: embeddings[0]?.length ?? 0,
      },
      inputTokens: usage.inputTokens,
      totalTokens: usage.totalTokens,
      latencyMs: Date.now() - startedAt,
      ...buildCommonLogContext(runContext),
    });

    return {
      provider: "openai",
      model: selectedModel,
      embeddings,
      usage,
      aiModelRunId,
    };
  } catch (error) {
    await logFailure({
      model: selectedModel,
      purpose: getContextPurpose("embedding", runContext),
      task: "create_embeddings",
      instructions: null,
      userInput,
      startedAt,
      error,
      runContext,
    });

    throw new AIProviderError(
      "Tạo OpenAI embedding thất bại.",
      "OPENAI_EMBEDDING_FAILED",
      normalizeError(error),
    );
  }
}

export async function generateOpenAIConceptImage({
  prompt,
  model,
  size = "1024x1024",
  quality = "medium",
  runContext,
}: AIImageGenerationInput): Promise<AIImageGenerationResult> {
  const models = getAIModelConfig();
  const selectedModel = model ?? models.imageModel;
  const startedAt = Date.now();

  const userInput = buildRunContextInput(
    {
      prompt,
      size,
      quality,
    },
    runContext,
  );

  try {
    const client = getOpenAIClient();

    const response = await client.images.generate({
      model: selectedModel,
      prompt,
      size,
      quality,
      n: 1,
    } as any);

    const firstImage = response.data?.[0];

    const imageBase64 =
      typeof firstImage?.b64_json === "string" ? firstImage.b64_json : undefined;

    const imageUrl =
      typeof firstImage?.url === "string" ? firstImage.url : undefined;

    const revisedPrompt =
      typeof (firstImage as any)?.revised_prompt === "string"
        ? (firstImage as any).revised_prompt
        : undefined;

    const aiModelRunId = await logAIModelRun({
      provider: "openai",
      model: selectedModel,
      purpose: getContextPurpose("image", runContext),
      task: "generate_concept_preview_image",
      status: "success",
      promptVersion: getPromptVersion(runContext),
      systemPrompt: runContext?.systemPrompt ?? null,
      userInput,
      aiOutput: {
        hasImageBase64: Boolean(imageBase64),
        hasImageUrl: Boolean(imageUrl),
        revisedPrompt,
      },
      latencyMs: Date.now() - startedAt,
      ...buildCommonLogContext(runContext),
    });

    return {
      provider: "openai",
      model: selectedModel,
      imageBase64,
      imageUrl,
      revisedPrompt,
      aiModelRunId,
    };
  } catch (error) {
    await logFailure({
      model: selectedModel,
      purpose: getContextPurpose("image", runContext),
      task: "generate_concept_preview_image",
      instructions: null,
      userInput,
      startedAt,
      error,
      runContext,
    });

    throw new AIProviderError(
      "Tạo OpenAI Concept Preview image thất bại.",
      "OPENAI_IMAGE_GENERATION_FAILED",
      normalizeError(error),
    );
  }
}

export function assertOpenAIReady() {
  const apiKey = getEnvValue("OPENAI_API_KEY");

  if (!apiKey) {
    throw new AIProviderError(
      "Thiếu OPENAI_API_KEY. Hãy thêm key vào .env.local trước khi dùng AI.",
      "OPENAI_API_KEY_MISSING",
    );
  }

  return true;
}