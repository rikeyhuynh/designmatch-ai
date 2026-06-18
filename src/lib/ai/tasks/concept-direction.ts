import "server-only";

import { createClient } from "@supabase/supabase-js";

import { stringifyForAI } from "@/lib/ai/json";
import type { JsonValue } from "@/lib/ai/types";
import {
  resolveDeliverableSpec,
  type DeliverableSpec,
} from "@/lib/ai/concept-deliverable-spec";

const CONCEPT_DIRECTION_PROMPT_VERSION =
  "ai-concept-direction-ai-only-deliverable-aware-v4";

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export type AIConceptDirectionInput = {
  designRequestId?: string | null;
  customerProfileId?: string | null;
  aiBriefId?: string | null;
  requestTitle?: string | null;
  businessName?: string | null;
  designType?: string | null;
  channel?: string | null;
  packageCode?: string | null;
  packageName?: string | null;
  packageType?: string | null;
  finalBriefJson?: Record<string, unknown> | null;
  briefText?: string | null;
  visualIntakeResult?: Record<string, unknown> | null;
  riskReport?: Record<string, unknown> | null;
  pricingPackage?: Record<string, unknown> | null;
};

export type AIConceptColor = {
  name: string;
  hex_guess: string | null;
  role: string;
};

export type AIConceptDirection = {
  concept_key: string;
  concept_name: string;
  concept_summary: string;
  strategic_role: string;
  best_for: string[];
  mood_tags: string[];
  style_tags: string[];
  color_palette: AIConceptColor[];
  typography_direction: string;
  layout_direction: string;
  image_direction: string;
  content_direction: string;
  preview_image_prompt: string;
  designer_guidance: string;
  customer_explanation: string;
  suitability_score: number;
  differentiation_score: number;
  risk_notes: string[];
};

export type AIConceptDirectionResult = {
  concept_set_summary: string;
  recommended_concept_key: string | null;
  selection_guidance: string;
  concepts: AIConceptDirection[];
};

export type GenerateAIConceptDirectionsResult = {
  provider: string;
  model: string;
  task: string;
  usage: unknown;
  aiModelRunId: string | null;
  savedConceptDirectionIds: string[];
  fallback: false;
  fallbackReason: null;
  result: AIConceptDirectionResult;
};

type BriefSource = {
  projectTitle: string;
  businessName: string;
  designObjective: string;
  targetAudience: string;
  keyMessage: string;
  designType: string;
  channel: string;
  packageCode: string | null;
  packageName: string | null;
  packageType: string | null;
  deliverableSpec: DeliverableSpec;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: unknown;
  usageMetadata?: unknown;
  error?: {
    message?: string;
  };
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

function getGeminiApiKey() {
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Thiếu GEMINI_API_KEY trong .env.local. Hãy kiểm tra lại biến môi trường.",
    );
  }

  return apiKey;
}

function getGeminiConceptModel() {
  return (
    process.env.GEMINI_CONCEPT_MODEL ??
    process.env.GEMINI_TEXT_MODEL ??
    process.env.GEMINI_MODEL ??
    DEFAULT_GEMINI_MODEL
  );
}

function normalizeScore(value: unknown, fallback = 70) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return fallback;
  }

  // AI trả 0.88 nghĩa là 88/100.
  if (score > 0 && score <= 1) {
    return Math.max(0, Math.min(100, Math.round(score * 100)));
  }

  // AI trả 7, 8, 9 hoặc 8.5 nghĩa là thang 10.
  if (score > 1 && score <= 10) {
    return Math.max(0, Math.min(100, Math.round(score * 10)));
  }

  // AI trả đúng thang 100.
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeStringArray(value: unknown, limit = 20) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const text = String(item ?? "").trim();

    if (!text) {
      continue;
    }

    const key = text.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(text);
    }
  }

  return result.slice(0, limit);
}

function normalizeHexGuess(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const hex = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.toUpperCase();
  }

  return null;
}

function normalizeColorRole(value: unknown) {
  const role = String(value ?? "").trim().toLowerCase();

  if (
    role === "primary" ||
    role === "secondary" ||
    role === "accent" ||
    role === "background" ||
    role === "text"
  ) {
    return role;
  }

  return "supporting";
}

function normalizeColorPalette(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 6)
    .map((item) => {
      const record = item && typeof item === "object" ? (item as any) : {};

      return {
        name: normalizeString(record.name, "Không xác định"),
        hex_guess: normalizeHexGuess(record.hex_guess),
        role: normalizeColorRole(record.role),
      };
    })
    .filter((item) => item.name.length > 0);
}

function getObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function truncateText(value: unknown, maxLength: number) {
  const text =
    typeof value === "string"
      ? value.trim()
      : value === null || value === undefined
        ? ""
        : String(value).trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function makeConceptKey(value: unknown, index: number) {
  const raw = normalizeString(value, `concept_${index + 1}`)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return raw || `concept_${index + 1}`;
}

function getBriefSource(input: AIConceptDirectionInput): BriefSource {
  const finalBriefJson = getObject(input.finalBriefJson);

  const deliverableSpec = resolveDeliverableSpec({
    designType: input.designType,
    packageCode: input.packageCode,
    packageName: input.packageName,
    packageType: input.packageType,
    requestTitle: input.requestTitle,
  });

  return {
    projectTitle: normalizeString(
      finalBriefJson.project_title ?? input.requestTitle,
      "Brief thiết kế",
    ),
    businessName: normalizeString(input.businessName, "Thương hiệu địa phương"),
    designObjective: normalizeString(
      finalBriefJson.design_objective,
      "Tạo một thiết kế rõ thông điệp, phù hợp kênh sử dụng và thu hút khách hàng mục tiêu.",
    ),
    targetAudience: normalizeString(
      finalBriefJson.target_audience,
      "Khách hàng mục tiêu của thương hiệu",
    ),
    keyMessage: normalizeString(
      finalBriefJson.key_message,
      "Thông điệp chính cần được làm rõ qua thiết kế.",
    ),
    designType: normalizeString(input.designType, "social_post"),
    channel: normalizeString(input.channel, "digital/social media"),
    packageCode: normalizeNullableString(input.packageCode),
    packageName: normalizeNullableString(input.packageName),
    packageType: normalizeNullableString(input.packageType),
    deliverableSpec,
  };
}

function buildDeliverableConceptInstructions(spec: DeliverableSpec) {
  return [
    `Loại sản phẩm khách đã chọn: ${spec.label}.`,
    `Deliverable dạng: ${spec.previewMode}.`,
    `Aspect ratio / format logic: ${spec.aspectRatio}.`,
    `Layout direction phải đúng với sản phẩm: ${spec.layoutFocus}`,
    `Typography direction phải đúng với sản phẩm: ${spec.typographyFocus}`,
    `Image direction phải đúng với sản phẩm: ${spec.imageFocus}`,
    `Content direction phải đúng với sản phẩm: ${spec.contentFocus}`,
    "Không được mô tả tất cả như poster/social poster nếu sản phẩm được chọn không phải poster.",
    ...spec.conceptGuardrails,
  ].join("\n");
}

function buildPreviewPromptBase(spec: DeliverableSpec, source: BriefSource) {
  const brand = source.businessName;
  const projectTitle = source.projectTitle;

  switch (spec.key) {
    case "logo":
      return `Create a premium logo concept presentation board for ${brand}. Show logo mark exploration, wordmark direction, monochrome version, color chips, spacing cues, and brand identity presentation. This must be a logo direction board, not poster or ad. concept preview only, not final design, no readable text required.`;

    case "story":
      return `Create a polished vertical 9:16 story concept preview for ${projectTitle} by ${brand}. Mobile-first layout, strong top hook, clear hero visual, short copy zones, clean CTA area. concept preview only, not final design, no readable text required.`;

    case "social_post":
      return `Create a polished square social post concept preview for ${projectTitle} by ${brand}. Feed-friendly hierarchy, hero visual, concise copy zones, clean layout blocks. concept preview only, not final design, no readable text required.`;

    case "banner":
      return `Create a polished horizontal banner concept preview for ${projectTitle} by ${brand}. Wide composition, balanced hero visual, concise headline area, clean message zones. concept preview only, not final design, no readable text required.`;

    case "facebook_cover":
      return `Create a polished Facebook or Zalo cover concept preview for ${projectTitle} by ${brand}. Very wide cover layout, safe zones, brand-forward hero placement. concept preview only, not final design, no readable text required.`;

    case "menu_one_page":
      return `Create a polished one-page menu concept preview for ${projectTitle} by ${brand}. Clear menu sections, item list placeholders, price placeholders, strong readability. It must read as a menu page, not a poster. concept preview only, not final design, no readable text required.`;

    case "price_list":
      return `Create a polished one-page price list concept preview for ${projectTitle} by ${brand}. Structured service/item sections, price placeholders, clean information hierarchy. It must read as a price list, not a poster. concept preview only, not final design, no readable text required.`;

    case "voucher":
      return `Create a polished voucher or gift card concept preview for ${projectTitle} by ${brand}. Card-based layout, offer area, brand identity, condition/info zones. concept preview only, not final design, no readable text required.`;

    case "packaging_label":
      return `Create a polished packaging label concept preview for ${projectTitle} by ${brand}. Show label direction applied on product packaging, with brand hierarchy and product naming zones. Not a poster. concept preview only, not final design, no readable text required.`;

    case "standee":
      return `Create a polished vertical standee concept preview for ${projectTitle} by ${brand}. Tall print-display composition with top-to-bottom hierarchy and readable info zones. concept preview only, not final design, no readable text required.`;

    case "flyer":
      return `Create a polished flyer concept preview for ${projectTitle} by ${brand}. Print-friendly one-page promotional layout with information hierarchy and supporting visuals. concept preview only, not final design, no readable text required.`;

    case "namecard":
      return `Create a polished business card concept preview for ${projectTitle} by ${brand}. Show front-and-back card direction with logo/wordmark area and contact info placeholders. concept preview only, not final design, no readable text required.`;

    case "loyalty_card":
      return `Create a polished loyalty card concept preview for ${projectTitle} by ${brand}. Branded membership card direction, front-and-back treatment, benefit area. concept preview only, not final design, no readable text required.`;

    case "product_visual":
      return `Create a polished product hero visual concept preview for ${projectTitle} by ${brand}. Product-focused composition, benefit callout zones, clean promotional framing. concept preview only, not final design, no readable text required.`;

    case "table_tent":
      return `Create a polished table tent concept preview for ${projectTitle} by ${brand}. Compact tabletop display composition with concise message zones and strong readability. concept preview only, not final design, no readable text required.`;

    case "poster":
    default:
      return `Create a polished poster concept preview for ${projectTitle} by ${brand}. Strong hero composition, clear hierarchy, editorial visual framing. concept preview only, not final design, no readable text required.`;
  }
}

function normalizeConceptDirection(
  value: unknown,
  index: number,
  source: BriefSource,
) {
  const record = getObject(value);
  const spec = source.deliverableSpec;

  return {
    concept_key: makeConceptKey(record.concept_key ?? record.concept_name, index),
    concept_name: normalizeString(record.concept_name, `Concept ${index + 1}`),
    concept_summary: normalizeString(
      record.concept_summary,
      `Concept này được tạo theo đúng sản phẩm ${spec.label}.`,
    ),
    strategic_role: normalizeString(
      record.strategic_role,
      `Giúp khách hàng hình dung một hướng ${spec.label} khả thi.`,
    ),
    best_for: normalizeStringArray(record.best_for, 5),
    mood_tags: normalizeStringArray(record.mood_tags, 6),
    style_tags: normalizeStringArray(record.style_tags, 6),
    color_palette: normalizeColorPalette(record.color_palette),
    typography_direction: normalizeString(
      record.typography_direction,
      spec.typographyFocus,
    ),
    layout_direction: normalizeString(record.layout_direction, spec.layoutFocus),
    image_direction: normalizeString(record.image_direction, spec.imageFocus),
    content_direction: normalizeString(record.content_direction, spec.contentFocus),
    preview_image_prompt: normalizeString(
      record.preview_image_prompt,
      buildPreviewPromptBase(spec, source),
    ),
    designer_guidance: normalizeString(
      record.designer_guidance,
      `Designer cần phát triển concept này thành thiết kế ${spec.label} hoàn chỉnh, không xem preview là file cuối.`,
    ),
    customer_explanation: normalizeString(
      record.customer_explanation,
      `Concept này giúp bạn hình dung hướng ${spec.label} trước khi chọn designer.`,
    ),
    suitability_score: normalizeScore(record.suitability_score, 75),
    differentiation_score: normalizeScore(record.differentiation_score, 70),
    risk_notes: normalizeStringArray(record.risk_notes, 3),
  };
}

function normalizeConceptDirectionJson(
  value: Record<string, JsonValue>,
  input: AIConceptDirectionInput,
): AIConceptDirectionResult {
  const source = getBriefSource(input);
  const rawConcepts = Array.isArray(value.concepts) ? value.concepts : [];

  const concepts = rawConcepts
    .map((item, index) => normalizeConceptDirection(item, index, source))
    .filter((item) => item.concept_name.trim().length > 0)
    .slice(0, 3);

  return {
    concept_set_summary: normalizeString(
      value.concept_set_summary,
      `AI đã tạo 3 hướng concept cho ${source.deliverableSpec.label}.`,
    ),
    recommended_concept_key: normalizeNullableString(
      value.recommended_concept_key,
    ),
    selection_guidance: normalizeString(
      value.selection_guidance,
      `Chọn concept gần nhất với cảm giác thương hiệu và đúng mục tiêu của ${source.deliverableSpec.label}.`,
    ),
    concepts,
  };
}

function buildAIInput(input: AIConceptDirectionInput) {
  const source = getBriefSource(input);
  const finalBriefJson = getObject(input.finalBriefJson);

  return {
    requestTitle: input.requestTitle,
    businessName: input.businessName,
    designType: input.designType,
    channel: input.channel,
    packageCode: input.packageCode,
    packageName: input.packageName,
    packageType: input.packageType,
    selectedDeliverable: {
      label: source.deliverableSpec.label,
      aspectRatio: source.deliverableSpec.aspectRatio,
      previewMode: source.deliverableSpec.previewMode,
      layoutFocus: source.deliverableSpec.layoutFocus,
      typographyFocus: source.deliverableSpec.typographyFocus,
      imageFocus: source.deliverableSpec.imageFocus,
      contentFocus: source.deliverableSpec.contentFocus,
    },
    finalBriefJson: {
      project_title: truncateText(finalBriefJson.project_title, 120),
      business_context: truncateText(finalBriefJson.business_context, 260),
      design_objective: truncateText(finalBriefJson.design_objective, 260),
      target_audience: truncateText(finalBriefJson.target_audience, 180),
      key_message: truncateText(finalBriefJson.key_message, 180),
      deliverables: Array.isArray(finalBriefJson.deliverables)
        ? finalBriefJson.deliverables.slice(0, 5)
        : [],
      designer_notes: truncateText(finalBriefJson.designer_notes, 220),
    },
    briefText: truncateText(input.briefText, 500),
    visualIntakeResult: input.visualIntakeResult
      ? {
          detected_industry: input.visualIntakeResult.detected_industry,
          detected_product_type: input.visualIntakeResult.detected_product_type,
          detected_mood_tags: input.visualIntakeResult.detected_mood_tags,
          suggested_style_tags: input.visualIntakeResult.suggested_style_tags,
          visual_summary: truncateText(
            input.visualIntakeResult.visual_summary,
            260,
          ),
        }
      : null,
    riskReport: input.riskReport
      ? {
          risk_level: input.riskReport.risk_level,
          risk_summary: truncateText(input.riskReport.risk_summary, 220),
          missing_information: input.riskReport.missing_information,
          unclear_points: input.riskReport.unclear_points,
        }
      : null,
    pricingPackage: input.pricingPackage,
  };
}

function buildInstructions(input: AIConceptDirectionInput) {
  const source = getBriefSource(input);
  const spec = source.deliverableSpec;

  return `
Bạn là AI Concept Direction Strategist của DesignMatch AI.

Nhiệm vụ:
Tạo đúng 3 concept direction dựa trên brief đã chốt.

Quan trọng:
Khách đã chọn sản phẩm: "${spec.label}".
Phải viết direction đúng bản chất sản phẩm này.
Không được quy tất cả về poster/social poster.

${buildDeliverableConceptInstructions(spec)}

Ba concept bắt buộc:
1. Safe concept: gần brief nhất, dễ dùng, ít rủi ro.
2. Bold concept: nổi bật hơn, nhưng vẫn đúng sản phẩm.
3. Premium/editorial concept: tinh tế hơn, nâng cảm giác thương hiệu nhưng vẫn đúng sản phẩm.

Giới hạn bắt buộc:
- concept_set_summary tối đa 35 từ.
- selection_guidance tối đa 35 từ.
- concept_summary tối đa 28 từ.
- strategic_role tối đa 24 từ.
- designer_guidance tối đa 28 từ.
- customer_explanation tối đa 28 từ.
- best_for tối đa 4 items.
- mood_tags tối đa 5 items.
- style_tags tối đa 5 items.
- color_palette tối đa 4 màu.
- risk_notes tối đa 2 items.
- preview_image_prompt dưới 65 từ.
- Không viết dài.

preview_image_prompt:
- Bằng tiếng Anh.
- Phải đúng deliverable: ${spec.label}.
- Phải có câu: "concept preview only, not final design, no readable text required".
- Phải có watermark: "DESIGNMATCH AI PREVIEW".
- Không biến thành final artwork.

Chỉ trả về JSON object hợp lệ.
Không markdown.
Không code fence.
Không giải thích ngoài JSON.
`.trim();
}

function buildResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      concept_set_summary: {
        type: "STRING",
      },
      recommended_concept_key: {
        type: "STRING",
      },
      selection_guidance: {
        type: "STRING",
      },
      concepts: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            concept_key: { type: "STRING" },
            concept_name: { type: "STRING" },
            concept_summary: { type: "STRING" },
            strategic_role: { type: "STRING" },
            best_for: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            mood_tags: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            style_tags: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            color_palette: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  hex_guess: { type: "STRING" },
                  role: { type: "STRING" },
                },
                required: ["name", "hex_guess", "role"],
              },
            },
            typography_direction: { type: "STRING" },
            layout_direction: { type: "STRING" },
            image_direction: { type: "STRING" },
            content_direction: { type: "STRING" },
            preview_image_prompt: { type: "STRING" },
            designer_guidance: { type: "STRING" },
            customer_explanation: { type: "STRING" },
            suitability_score: { type: "INTEGER" },
            differentiation_score: { type: "INTEGER" },
            risk_notes: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: [
            "concept_key",
            "concept_name",
            "concept_summary",
            "strategic_role",
            "best_for",
            "mood_tags",
            "style_tags",
            "color_palette",
            "typography_direction",
            "layout_direction",
            "image_direction",
            "content_direction",
            "preview_image_prompt",
            "designer_guidance",
            "customer_explanation",
            "suitability_score",
            "differentiation_score",
            "risk_notes",
          ],
        },
      },
    },
    required: [
      "concept_set_summary",
      "recommended_concept_key",
      "selection_guidance",
      "concepts",
    ],
  };
}

async function runGeminiConceptDirectionJson(input: AIConceptDirectionInput) {
  const apiKey = getGeminiApiKey();
  const model = getGeminiConceptModel();

  const prompt = [
    buildInstructions(input),
    "",
    "INPUT JSON:",
    stringifyForAI(buildAIInput(input)),
  ].join("\n");

  const generationConfig: Record<string, unknown> = {
    temperature: 0,
    topP: 0.6,
    topK: 10,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: buildResponseSchema(),
  };

  if (model.includes("2.5")) {
    generationConfig.thinkingConfig = {
      thinkingBudget: 0,
    };
  }

  const response = await fetch(
    `${GEMINI_API_ENDPOINT}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig,
      }),
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Gemini API lỗi ${response.status}: ${truncateText(responseText, 1200)}`,
    );
  }

  let data: GeminiGenerateContentResponse;

  try {
    data = JSON.parse(responseText) as GeminiGenerateContentResponse;
  } catch {
    throw new Error(
      `Không parse được response Gemini API: ${truncateText(responseText, 1200)}`,
    );
  }

  if (data.error?.message) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  const candidate = data.candidates?.[0];

  const rawText =
    candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!rawText) {
    throw new Error(
      `Gemini không trả JSON. finishReason=${candidate?.finishReason ?? "unknown"}`,
    );
  }

  try {
    return {
      json: JSON.parse(rawText) as Record<string, JsonValue>,
      model,
      usage: data.usageMetadata ?? null,
      finishReason: candidate?.finishReason ?? null,
    };
  } catch {
    throw new Error(
      `Gemini trả JSON không hoàn chỉnh. finishReason=${candidate?.finishReason ?? "unknown"}. raw=${truncateText(rawText, 1600)}`,
    );
  }
}

async function saveAIConceptDirections({
  input,
  result,
  aiModelRunId,
}: {
  input: AIConceptDirectionInput;
  result: AIConceptDirectionResult;
  aiModelRunId?: string | null;
}) {
  if (!input.designRequestId || result.concepts.length === 0) {
    return [];
  }

  const supabase = getSupabaseAIAdminClient();

  if (!supabase) {
    throw new Error(
      "Thiếu Supabase admin env nên không thể lưu ai_concept_directions.",
    );
  }

  await supabase
    .from("ai_concept_previews")
    .delete()
    .eq("design_request_id", input.designRequestId);

  await supabase
    .from("ai_concept_directions")
    .delete()
    .eq("design_request_id", input.designRequestId);

  const rows = result.concepts.map((concept, index) => ({
    design_request_id: input.designRequestId,
    customer_profile_id: input.customerProfileId ?? null,
    ai_brief_id: input.aiBriefId ?? null,
    ai_model_run_id: aiModelRunId ?? null,

    concept_key: concept.concept_key,
    concept_name: concept.concept_name,
    concept_summary: concept.concept_summary,
    strategic_role: concept.strategic_role,
    display_order: index + 1,

    best_for: concept.best_for,
    mood_tags: concept.mood_tags,
    style_tags: concept.style_tags,
    color_palette: concept.color_palette,
    typography_direction: concept.typography_direction,
    layout_direction: concept.layout_direction,
    image_direction: concept.image_direction,
    content_direction: concept.content_direction,

    preview_image_prompt: concept.preview_image_prompt,
    designer_guidance: concept.designer_guidance,
    customer_explanation: concept.customer_explanation,

    suitability_score: concept.suitability_score,
    differentiation_score: concept.differentiation_score,
    risk_notes: concept.risk_notes,

    prompt_version: CONCEPT_DIRECTION_PROMPT_VERSION,
    is_selected: false,
  }));

  const { data, error } = await supabase
    .from("ai_concept_directions")
    .insert(rows)
    .select("id");

  if (error) {
    throw new Error(`Không thể lưu ai_concept_directions: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => (typeof item?.id === "string" ? item.id : null))
    .filter(Boolean) as string[];
}

export async function generateAIConceptDirections(
  input: AIConceptDirectionInput,
): Promise<GenerateAIConceptDirectionsResult> {
  const aiResult = await runGeminiConceptDirectionJson(input);
  const normalizedResult = normalizeConceptDirectionJson(aiResult.json, input);

  if (normalizedResult.concepts.length !== 3) {
    throw new Error(
      `AI phải trả đúng 3 concept direction. Hiện nhận được ${normalizedResult.concepts.length}. Không dùng fallback vì hệ thống đang chạy AI 100%.`,
    );
  }

  const savedConceptDirectionIds = await saveAIConceptDirections({
    input,
    result: normalizedResult,
    aiModelRunId: null,
  });

  if (savedConceptDirectionIds.length === 0) {
    throw new Error(
      "AI đã tạo concept direction nhưng không lưu được vào database.",
    );
  }

  return {
    provider: "gemini",
    model: aiResult.model,
    task: "ai_concept_direction",
    usage: aiResult.usage,
    aiModelRunId: null,
    savedConceptDirectionIds,
    fallback: false,
    fallbackReason: null,
    result: normalizedResult,
  };
}