export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type AIModelPurpose =
  | "text"
  | "vision"
  | "embedding"
  | "image"
  | "local-fine-tune";

export type AIModelConfig = {
  textModel: string;
  visionModel: string;
  embeddingModel: string;
  imageModel: string;
};

export type AIProviderName = "openai" | "gemini";

export type AIModelRunStatus = "success" | "failed";

export type AIRawUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AIModelRunContext = {
  purpose?: AIModelPurpose;
  promptVersion?: string;
  systemPrompt?: string;
  userInput?: JsonValue;
  aiOutput?: JsonValue;

  createdBy?: string | null;
  relatedCustomerProfileId?: string | null;
  relatedDesignerProfileId?: string | null;
  relatedRequestId?: string | null;
  relatedPortfolioItemId?: string | null;
  relatedJobId?: string | null;
};

export type AITextRunInput = {
  task: string;
  instructions: string;
  input: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  runContext?: AIModelRunContext;
};

export type AIJsonRunInput = AITextRunInput & {
  jsonLabel?: string;
};

export type AIVisionJsonRunInput = {
  task: string;
  instructions: string;
  input: string;
  imageUrl: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonLabel?: string;
  runContext?: AIModelRunContext;
};

export type AIEmbeddingInput = {
  input: string | string[];
  model?: string;
  runContext?: AIModelRunContext;
};

export type AIImageGenerationInput = {
  prompt: string;
  model?: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
  runContext?: AIModelRunContext;
};

export type AITextRunResult = {
  provider: AIProviderName;
  model: string;
  task: string;
  text: string;
  usage: AIRawUsage;
  rawResponseId?: string;
  aiModelRunId?: string | null;
};

export type AIJsonRunResult<T extends JsonValue> = AITextRunResult & {
  json: T;
};

export type AIEmbeddingResult = {
  provider: AIProviderName;
  model: string;
  embeddings: number[][];
  usage: AIRawUsage;
  aiModelRunId?: string | null;
};

export type AIImageGenerationResult = {
  provider: AIProviderName;
  model: string;
  imageBase64?: string;
  imageUrl?: string;
  revisedPrompt?: string;
  aiModelRunId?: string | null;
};

export class AIProviderError extends Error {
  public readonly code: string;
  public readonly causeDetail?: unknown;

  constructor(message: string, code = "AI_PROVIDER_ERROR", causeDetail?: unknown) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.causeDetail = causeDetail;
  }
}