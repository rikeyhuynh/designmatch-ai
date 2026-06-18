import "server-only";

import { createClient } from "@supabase/supabase-js";

import type {
  AIModelPurpose,
  AIModelRunStatus,
  AIProviderName,
  JsonValue,
} from "./types";

type AIModelRunLogInput = {
  provider?: AIProviderName;
  model: string;
  purpose: AIModelPurpose;
  task?: string | null;
  status: AIModelRunStatus;

  promptVersion?: string | null;
  systemPrompt?: string | null;
  userInput?: unknown;
  aiOutput?: unknown;
  rawTextOutput?: string | null;

  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;

  latencyMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;

  createdBy?: string | null;
  relatedCustomerProfileId?: string | null;
  relatedDesignerProfileId?: string | null;
  relatedRequestId?: string | null;
  relatedPortfolioItemId?: string | null;
  relatedJobId?: string | null;
};

let supabaseAIAdminClient: any | null = null;

function getEnvValue(key: string) {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function getSupabaseAIAdminClient() {
  const supabaseUrl = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    getEnvValue("SUPABASE_SERVICE_ROLE_KEY") ??
    getEnvValue("SUPABASE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (!supabaseAIAdminClient) {
    supabaseAIAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as any;
  }

  return supabaseAIAdminClient;
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === "object") {
    const record: Record<string, JsonValue> = {};

    for (const [key, itemValue] of Object.entries(value)) {
      if (itemValue === undefined) {
        continue;
      }

      if (
        typeof itemValue === "function" ||
        typeof itemValue === "symbol" ||
        typeof itemValue === "bigint"
      ) {
        record[key] = String(itemValue);
        continue;
      }

      record[key] = toJsonValue(itemValue);
    }

    return record;
  }

  return String(value);
}

function normalizeInteger(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

function normalizeRequiredText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeNullableUuid(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      cleaned,
    );

  return isUuid ? cleaned : null;
}

export async function logAIModelRun(input: AIModelRunLogInput) {
  const supabase = getSupabaseAIAdminClient();

  if (!supabase) {
    console.warn(
      "[DesignMatch AI] Bỏ qua log ai_model_runs vì thiếu Supabase admin env.",
    );

    return null;
  }

  const normalizedTask = normalizeRequiredText(input.task, "unknown_ai_task");
  const normalizedModel = normalizeRequiredText(input.model, "unknown_model");

  const payload = {
    provider: input.provider ?? "openai",
    model: normalizedModel,
    purpose: input.purpose,
    task: normalizedTask,
    status: input.status,

    prompt_version: input.promptVersion ?? null,
    system_prompt: input.systemPrompt ?? null,
    user_input: toJsonValue(input.userInput ?? {}),
    ai_output: input.aiOutput === undefined ? null : toJsonValue(input.aiOutput),
    raw_text_output: input.rawTextOutput ?? null,

    input_tokens: normalizeInteger(input.inputTokens),
    output_tokens: normalizeInteger(input.outputTokens),
    total_tokens: normalizeInteger(input.totalTokens),

    latency_ms: normalizeInteger(input.latencyMs),
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,

    created_by: normalizeNullableUuid(input.createdBy),
    related_customer_profile_id: normalizeNullableUuid(
      input.relatedCustomerProfileId,
    ),
    related_designer_profile_id: normalizeNullableUuid(
      input.relatedDesignerProfileId,
    ),
    related_request_id: normalizeNullableUuid(input.relatedRequestId),
    related_portfolio_item_id: normalizeNullableUuid(
      input.relatedPortfolioItemId,
    ),
    related_job_id: normalizeNullableUuid(input.relatedJobId),
  };

  try {
    const { data, error } = await supabase
      .from("ai_model_runs")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[DesignMatch AI] Không thể ghi ai_model_runs:", error);
      return null;
    }

    return typeof data?.id === "string" ? data.id : null;
  } catch (error) {
    console.error("[DesignMatch AI] AI logger failed:", error);
    return null;
  }
}