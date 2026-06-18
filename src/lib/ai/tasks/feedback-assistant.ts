import "server-only";

import { buildCreativeIntelligenceInstructions } from "../prompts/creative-intelligence";

type AnyRecord = Record<string, unknown>;

export const AI_FEEDBACK_ASSISTANT_PROMPT_VERSION =
  "ai-feedback-assistant-ai-only-structured-v3";

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export type AIJobFeedbackAssistInput = {
  rawFeedback: string;
  job: AnyRecord;
  jobUpdate: AnyRecord;
  designRequest: AnyRecord | null;
  aiBrief: AnyRecord | null;
  selectedConcept: AnyRecord | null;
  visualPreview: AnyRecord | null;
};

export type AIJobFeedbackAssistResult = {
  summary: string;
  improved_feedback: string;
  designer_friendly_feedback: string;
  scope_assessment: "within_scope" | "possible_scope_creep" | "unclear";
  scope_notes: string[];
  concrete_change_requests: string[];
  unclear_points_to_ask: string[];
  tone_notes: string[];
  priority: "low" | "medium" | "high";
  suggested_next_step: string;
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
  usageMetadata?: unknown;
  error?: {
    message?: string;
  };
};

export async function suggestAIJobFeedback(
  input: AIJobFeedbackAssistInput,
): Promise<AIJobFeedbackAssistResult> {
  const rawFeedback = input.rawFeedback.trim();

  if (rawFeedback.length < 5) {
    throw new Error("Nội dung feedback cần ít nhất 5 ký tự.");
  }

  const aiResult = await runGeminiFeedbackAssistJson(input);
  const normalizedResult = normalizeFeedbackAssistResult(aiResult);

  validateAIResult(normalizedResult);

  return normalizedResult;
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

function getGeminiFeedbackModel() {
  return (
    process.env.GEMINI_FEEDBACK_MODEL ??
    process.env.GEMINI_TEXT_MODEL ??
    process.env.GEMINI_MODEL ??
    DEFAULT_GEMINI_MODEL
  );
}

async function runGeminiFeedbackAssistJson(
  input: AIJobFeedbackAssistInput,
): Promise<Record<string, unknown>> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiFeedbackModel();

  const prompt = buildPrompt(input);

  const generationConfig: Record<string, unknown> = {
    temperature: 0,
    topP: 0.6,
    topK: 10,
    maxOutputTokens: 4096,
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
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig,
      }),
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Gemini Feedback Assistant API lỗi ${response.status}: ${truncateText(
        responseText,
        1200,
      )}`,
    );
  }

  let data: GeminiGenerateContentResponse;

  try {
    data = JSON.parse(responseText) as GeminiGenerateContentResponse;
  } catch {
    throw new Error(
      `Không parse được response Gemini Feedback Assistant API: ${truncateText(
        responseText,
        1200,
      )}`,
    );
  }

  if (data.error?.message) {
    throw new Error(`Gemini Feedback Assistant API error: ${data.error.message}`);
  }

  const candidate = data.candidates?.[0];

  const rawText =
    candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!rawText) {
    throw new Error(
      `Gemini không trả JSON cho Feedback Assistant. finishReason=${
        candidate?.finishReason ?? "unknown"
      }`,
    );
  }

  try {
    const parsed = JSON.parse(rawText);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Parsed JSON không phải object.");
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(
      `AI Feedback Assistant JSON không hợp lệ. finishReason=${
        candidate?.finishReason ?? "unknown"
      }. raw=${truncateText(rawText, 1600)}`,
    );
  }
}

function buildPrompt(input: AIJobFeedbackAssistInput) {
  const instructions = buildCreativeIntelligenceInstructions(`
Bạn là AI Feedback Assistant của DesignMatch AI.

Nhiệm vụ:
Biến feedback thô của customer thành feedback thiết kế rõ ràng, lịch sự, cụ thể và có thể hành động.

Bạn phải:
- Viết lại feedback để designer hiểu chính xác cần sửa gì.
- Làm rõ feedback theo các nhóm: màu sắc, bố cục, typography, hình ảnh, nội dung, CTA, format, mức độ đúng brief.
- So sánh feedback với brief đã chốt, concept direction và visual preview nếu có.
- Cảnh báo nếu feedback có dấu hiệu vượt scope ban đầu.
- Không được tự bịa nội dung không có trong input.
- Không được yêu cầu designer làm thêm ngoài phạm vi nếu chưa cảnh báo scope creep.
- Không phán xét designer.
- Không dùng giọng gay gắt.
- Không nói chung chung kiểu “làm đẹp hơn”, “xịn hơn”, “sáng tạo hơn” mà phải cụ thể hóa.

Quy tắc:
- Nếu customer nói “màu chưa phù hợp”, hãy diễn giải rõ hơn nhưng không được tự bịa màu cụ thể nếu input không có.
- Nếu thiếu thông tin, hãy đưa vào unclear_points_to_ask.
- Nếu feedback có thể nằm ngoài brief/concept đã chốt, scope_assessment là "possible_scope_creep" hoặc "unclear".
- Nếu feedback chỉ yêu cầu tinh chỉnh thiết kế hiện tại, scope_assessment thường là "within_scope".
- Tất cả nội dung phải bằng tiếng Việt.

Output:
- Chỉ trả về JSON object hợp lệ.
- Không markdown.
- Không code fence.
- Không giải thích ngoài JSON.
- Không fallback.
`);

  return [
    instructions,
    "",
    "INPUT JSON:",
    JSON.stringify(buildAIInput(input), null, 2),
  ].join("\n");
}

function buildAIInput(input: AIJobFeedbackAssistInput) {
  const job = asRecord(input.job);
  const jobUpdate = asRecord(input.jobUpdate);
  const designRequest = asRecord(input.designRequest);
  const aiBrief = asRecord(input.aiBrief);
  const selectedConcept = asRecord(input.selectedConcept);
  const visualPreview = asRecord(input.visualPreview);

  return {
    raw_customer_feedback: truncateText(input.rawFeedback, 600),

    job: {
      id: stringValue(job.id),
      title: truncateText(job.title, 160),
      status: stringValue(job.status),
      agreed_price_vnd: job.agreed_price_vnd ?? null,
    },

    job_update_from_designer: {
      id: stringValue(jobUpdate.id),
      update_type: stringValue(jobUpdate.update_type),
      title: truncateText(jobUpdate.title, 160),
      message: truncateText(jobUpdate.message, 800),
      attachment_url: stringValue(jobUpdate.attachment_url),
      created_at: stringValue(jobUpdate.created_at),
    },

    design_request: input.designRequest
      ? {
          id: stringValue(designRequest.id),
          title: truncateText(designRequest.title, 160),
          business_name: truncateText(designRequest.business_name, 120),
          industry: stringValue(designRequest.industry),
          category: stringValue(designRequest.category),
          description: truncateText(designRequest.description, 500),
          target_audience: truncateText(designRequest.target_audience, 260),
          preferred_styles: designRequest.preferred_styles ?? [],
          brief_review_status: stringValue(designRequest.brief_review_status),
        }
      : null,

    final_ai_brief: input.aiBrief
      ? {
          project_title: truncateText(aiBrief.project_title, 160),
          business_context: truncateText(aiBrief.business_context, 400),
          design_objective: truncateText(aiBrief.design_objective, 400),
          objective: truncateText(aiBrief.objective, 300),
          target_audience: truncateText(aiBrief.target_audience, 260),
          key_message: truncateText(aiBrief.key_message, 260),
          visual_direction: truncateText(aiBrief.visual_direction, 400),
          deliverables: aiBrief.deliverables ?? [],
          content_requirements: aiBrief.content_requirements ?? [],
          technical_requirements: aiBrief.technical_requirements ?? [],
          designer_notes: truncateText(aiBrief.designer_notes, 300),
          final_brief_json: compactObject(aiBrief.final_brief_json, 900),
        }
      : null,

    selected_concept_direction: input.selectedConcept
      ? {
          concept_name: truncateText(selectedConcept.concept_name, 120),
          concept_summary: truncateText(selectedConcept.concept_summary, 300),
          strategic_role: truncateText(selectedConcept.strategic_role, 260),
          mood_tags: selectedConcept.mood_tags ?? [],
          style_tags: selectedConcept.style_tags ?? [],
          typography_direction: truncateText(
            selectedConcept.typography_direction,
            260,
          ),
          layout_direction: truncateText(selectedConcept.layout_direction, 260),
          image_direction: truncateText(selectedConcept.image_direction, 260),
          content_direction: truncateText(selectedConcept.content_direction, 260),
          designer_guidance: truncateText(selectedConcept.designer_guidance, 260),
        }
      : null,

    visual_concept_preview: input.visualPreview
      ? {
          id: stringValue(visualPreview.id),
          image_public_url: stringValue(visualPreview.image_public_url),
          prompt: truncateText(visualPreview.prompt, 500),
          preview_status: stringValue(visualPreview.preview_status),
          note:
            "Nếu chỉ có URL hoặc prompt, không được giả vờ đã phân tích pixel ảnh. Chỉ dùng preview như ngữ cảnh direction.",
        }
      : null,
  };
}

function buildResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      summary: {
        type: "STRING",
      },
      improved_feedback: {
        type: "STRING",
      },
      designer_friendly_feedback: {
        type: "STRING",
      },
      scope_assessment: {
        type: "STRING",
      },
      scope_notes: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      concrete_change_requests: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      unclear_points_to_ask: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      tone_notes: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      priority: {
        type: "STRING",
      },
      suggested_next_step: {
        type: "STRING",
      },
    },
    required: [
      "summary",
      "improved_feedback",
      "designer_friendly_feedback",
      "scope_assessment",
      "scope_notes",
      "concrete_change_requests",
      "unclear_points_to_ask",
      "tone_notes",
      "priority",
      "suggested_next_step",
    ],
  };
}

function normalizeFeedbackAssistResult(
  value: AnyRecord,
): AIJobFeedbackAssistResult {
  const scopeAssessment = stringValue(value.scope_assessment);
  const priority = stringValue(value.priority);

  return {
    summary: stringValue(value.summary),
    improved_feedback: stringValue(value.improved_feedback),
    designer_friendly_feedback: stringValue(value.designer_friendly_feedback),
    scope_assessment:
      scopeAssessment === "possible_scope_creep" ||
      scopeAssessment === "unclear" ||
      scopeAssessment === "within_scope"
        ? scopeAssessment
        : "unclear",
    scope_notes: stringArray(value.scope_notes),
    concrete_change_requests: stringArray(value.concrete_change_requests),
    unclear_points_to_ask: stringArray(value.unclear_points_to_ask),
    tone_notes: stringArray(value.tone_notes),
    priority:
      priority === "low" || priority === "medium" || priority === "high"
        ? priority
        : "medium",
    suggested_next_step: stringValue(value.suggested_next_step),
  };
}

function validateAIResult(result: AIJobFeedbackAssistResult) {
  if (!result.summary.trim()) {
    throw new Error("AI Feedback Assistant trả JSON nhưng thiếu summary.");
  }

  if (!result.improved_feedback.trim()) {
    throw new Error(
      "AI Feedback Assistant trả JSON nhưng thiếu improved_feedback.",
    );
  }

  if (!result.designer_friendly_feedback.trim()) {
    throw new Error(
      "AI Feedback Assistant trả JSON nhưng thiếu designer_friendly_feedback.",
    );
  }

  if (!result.suggested_next_step.trim()) {
    throw new Error(
      "AI Feedback Assistant trả JSON nhưng thiếu suggested_next_step.",
    );
  }
}

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as AnyRecord;
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => stringValue(item)).filter(Boolean).slice(0, 10);
}

function truncateText(value: unknown, maxLength: number) {
  const text = stringValue(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function compactObject(value: unknown, maxLength: number) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const text = JSON.stringify(value);

  if (text.length <= maxLength) {
    return value;
  }

  return {
    compacted: true,
    preview: truncateText(text, maxLength),
  };
}