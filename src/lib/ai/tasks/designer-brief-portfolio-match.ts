import "server-only";

export const DESIGNER_PORTFOLIO_MATCH_PROMPT_VERSION =
  "designer-ai-only-gemini-json-v6";

export type FinalBriefForAIMatch = {
  project_title: string;
  business_context: string;
  design_objective: string;
  target_audience: string;
  key_message: string;
  deliverables: string[];
  visual_direction: {
    mood: string[];
    style_tags: string[];
    color_direction: string[];
    typography_direction: string;
    layout_direction: string;
    image_direction: string;
  };
  content_requirements: string[];
  technical_requirements: string[];
  references_to_collect: string[];
  designer_notes: string;
};

export type SelectedConceptForAIMatch = {
  id: string;
  concept_key: string;
  concept_name: string;
  concept_summary: string;
  strategic_role: string;
  best_for: string[];
  mood_tags: string[];
  style_tags: string[];
  color_palette: Array<{
    name: string;
    hex_guess: string | null;
    role: string;
  }>;
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

export type VisualConceptPreviewForAIMatch = {
  id: string;
  concept_direction_id: string;
  provider: string;
  model: string;
  prompt: string;
  image_public_url: string;
  image_mime_type: string;
  preview_status: string;
  created_at: string;
};

export type DesignerProfileForAIMatch = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
  minimum_project_budget_vnd: number | null;
  specialties: string[];
  styles: string[];
};

export type DesignerStyleDNAForAIMatch = {
  analyzed_portfolio_count: number;
  style_tags: string[];
  industry_tags: string[];
  category_tags: string[];
  visual_strengths: string[];
  common_moods: string[];
  color_preferences: string[];
  typography_preferences: string[];
  layout_preferences: string[];
  dna_summary: string | null;
  confidence_score: number;
};

export type PortfolioEvidenceForAIMatch = {
  portfolio_item_id: string;
  title: string;
  declared_industry: string;
  declared_category: string;
  image_url: string | null;
  ai_visual_summary: string | null;
  ai_style_tags: string[];
  ai_mood_tags: string[];
  ai_industry_tags: string[];
  ai_category_tags: string[];
  ai_color_tags: string[];
  ai_typography_tags: string[];
  ai_layout_tags: string[];
  ai_visual_strengths: string[];
  ai_confidence_score: number;
};

export type ScoreDesignerBriefMatchInput = {
  requestId: string;
  aiBriefId: string | null;
  designerId: string;
  request: {
    title: string;
    business_name: string;
    industry: string;
    category: string;
    budget_min_vnd: number;
    budget_max_vnd: number;
    preferred_styles: string[];
  };
  finalBrief: FinalBriefForAIMatch;
  selectedConceptDirection?: SelectedConceptForAIMatch | null;
  visualConceptPreview?: VisualConceptPreviewForAIMatch | null;
  designerProfile: DesignerProfileForAIMatch;
  designerStyleDNA: DesignerStyleDNAForAIMatch | null;
  portfolioEvidence: PortfolioEvidenceForAIMatch[];
};

export type AIMatchedPortfolioEvidence = {
  portfolio_item_id: string;
  title: string;
  evidence: string;
  fit_reason: string;
};

export type AIDesignerBriefMatchResult = {
  match_score: number;
  portfolio_fit_score: number;
  style_fit_score: number;
  vibe_fit_score: number;
  industry_context_fit_score: number;
  budget_fit_score: number;
  not_same_style_but_same_vibe: boolean;
  match_reasons: string[];
  matched_portfolio_evidence: AIMatchedPortfolioEvidence[];
  risk_flags: string[];
  designer_positioning: string;
  fit_summary: string;
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
  error?: {
    message?: string;
  };
};

type GeminiGenerationConfig = {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  responseMimeType: string;
  responseSchema: Record<string, unknown>;
  thinkingConfig?: {
    thinkingBudget: number;
  };
};

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export async function scoreDesignerBriefMatchWithAI(
  input: ScoreDesignerBriefMatchInput,
) {
  const apiKey = getGeminiApiKey();
  const model = getGeminiTextModel();

  const attempts = [
    {
      mode: "minimal",
      maxOutputTokens: 8192,
    },
    {
      mode: "compact",
      maxOutputTokens: 8192,
    },
  ] as const;

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const aiInput = buildAIInput(input, attempt.mode);

      const json = await runGeminiJson({
        apiKey,
        model,
        prompt: buildPrompt(aiInput, attempt.mode),
        maxOutputTokens: attempt.maxOutputTokens,
      });

      return {
        provider: "gemini",
        model,
        aiModelRunId: null,
        result: normalizeAIMatchResult(json),
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`AI_MATCH_JSON_FAILED_AFTER_RETRY: ${errors.join(" | ")}`);
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

function getGeminiTextModel() {
  return process.env.GEMINI_MATCH_MODEL ?? DEFAULT_GEMINI_MODEL;
}

async function runGeminiJson({
  apiKey,
  model,
  prompt,
  maxOutputTokens,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  maxOutputTokens: number;
}) {
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
        generationConfig: buildGenerationConfig({
          model,
          maxOutputTokens,
        }),
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
      `Gemini không trả text JSON. finishReason=${candidate?.finishReason ?? "unknown"}`,
    );
  }

  return parseJsonObject(rawText, candidate?.finishReason);
}

function buildGenerationConfig({
  model,
  maxOutputTokens,
}: {
  model: string;
  maxOutputTokens: number;
}): GeminiGenerationConfig {
  const config: GeminiGenerationConfig = {
    temperature: 0,
    topP: 0.6,
    topK: 10,
    maxOutputTokens,
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        match_score: {
          type: "INTEGER",
        },
        portfolio_fit_score: {
          type: "INTEGER",
        },
        style_fit_score: {
          type: "INTEGER",
        },
        vibe_fit_score: {
          type: "INTEGER",
        },
        industry_context_fit_score: {
          type: "INTEGER",
        },
        budget_fit_score: {
          type: "INTEGER",
        },
        not_same_style_but_same_vibe: {
          type: "BOOLEAN",
        },
        match_reasons: {
          type: "ARRAY",
          items: {
            type: "STRING",
          },
        },
        matched_portfolio_evidence: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              portfolio_item_id: {
                type: "STRING",
              },
              title: {
                type: "STRING",
              },
              evidence: {
                type: "STRING",
              },
              fit_reason: {
                type: "STRING",
              },
            },
            required: [
              "portfolio_item_id",
              "title",
              "evidence",
              "fit_reason",
            ],
          },
        },
        risk_flags: {
          type: "ARRAY",
          items: {
            type: "STRING",
          },
        },
        designer_positioning: {
          type: "STRING",
        },
        fit_summary: {
          type: "STRING",
        },
      },
      required: [
        "match_score",
        "portfolio_fit_score",
        "style_fit_score",
        "vibe_fit_score",
        "industry_context_fit_score",
        "budget_fit_score",
        "not_same_style_but_same_vibe",
        "match_reasons",
        "matched_portfolio_evidence",
        "risk_flags",
        "designer_positioning",
        "fit_summary",
      ],
    },
  };

  if (model.includes("2.5")) {
    config.thinkingConfig = {
      thinkingBudget: 0,
    };
  }

  return config;
}

function buildPrompt(input: unknown, mode: "compact" | "minimal") {
  return `
Bạn là AI Creative Matching Expert của DesignMatch AI.

Chấm điểm 1 designer cho 1 brief thiết kế.

Luật bắt buộc:
- Chỉ trả về JSON object.
- Không markdown.
- Không code fence.
- Không giải thích ngoài JSON.
- Chuỗi trong JSON phải rất ngắn.
- match_reasons tối đa 3 câu.
- risk_flags tối đa 2 câu.
- matched_portfolio_evidence tối đa 2 item.
- Không cho tất cả designer cùng điểm nếu bằng chứng khác nhau.
- Brief logo/brand identity: ưu tiên portfolio/category/DNA liên quan logo, brand_identity, minimal, premium, editorial.
- Nếu thiếu bằng chứng, giảm điểm.

Thang điểm:
90-100: rất phù hợp.
80-89: phù hợp tốt.
70-79: có thể chọn.
55-69: tạm cân nhắc.
0-54: không nên ưu tiên.

Chế độ: ${mode}

Input:
${JSON.stringify(input)}
`.trim();
}

function buildAIInput(
  input: ScoreDesignerBriefMatchInput,
  mode: "compact" | "minimal",
) {
  const portfolioLimit = mode === "compact" ? 3 : 2;
  const textLimit = mode === "compact" ? 220 : 150;

  return {
    request: {
      title: input.request.title,
      business_name: input.request.business_name,
      industry: input.request.industry,
      category: input.request.category,
      budget_min_vnd: input.request.budget_min_vnd,
      budget_max_vnd: input.request.budget_max_vnd,
      preferred_styles: input.request.preferred_styles.slice(0, 4),
    },
    brief: {
      project_title: input.finalBrief.project_title,
      design_objective: truncateText(input.finalBrief.design_objective, textLimit),
      target_audience: truncateText(input.finalBrief.target_audience, textLimit),
      key_message: truncateText(input.finalBrief.key_message, textLimit),
      deliverables: input.finalBrief.deliverables.slice(0, 5),
      mood: input.finalBrief.visual_direction.mood.slice(0, 5),
      style_tags: input.finalBrief.visual_direction.style_tags.slice(0, 5),
      color_direction:
        input.finalBrief.visual_direction.color_direction.slice(0, 5),
      typography_direction: truncateText(
        input.finalBrief.visual_direction.typography_direction,
        textLimit,
      ),
      layout_direction: truncateText(
        input.finalBrief.visual_direction.layout_direction,
        textLimit,
      ),
    },
    selected_concept: input.selectedConceptDirection
      ? {
          concept_name: input.selectedConceptDirection.concept_name,
          concept_summary: truncateText(
            input.selectedConceptDirection.concept_summary,
            textLimit,
          ),
          best_for: input.selectedConceptDirection.best_for.slice(0, 4),
          mood_tags: input.selectedConceptDirection.mood_tags.slice(0, 5),
          style_tags: input.selectedConceptDirection.style_tags.slice(0, 5),
          typography_direction: truncateText(
            input.selectedConceptDirection.typography_direction,
            textLimit,
          ),
          layout_direction: truncateText(
            input.selectedConceptDirection.layout_direction,
            textLimit,
          ),
          designer_guidance: truncateText(
            input.selectedConceptDirection.designer_guidance,
            textLimit,
          ),
        }
      : null,
    visual_preview: input.visualConceptPreview
      ? {
          prompt: truncateText(input.visualConceptPreview.prompt, textLimit),
          has_image: Boolean(input.visualConceptPreview.image_public_url),
        }
      : null,
    designer: {
      id: input.designerProfile.id,
      display_name: input.designerProfile.display_name,
      headline: truncateText(input.designerProfile.headline, textLimit),
      rating: input.designerProfile.rating,
      completed_jobs: input.designerProfile.completed_jobs,
      response_time_hours: input.designerProfile.response_time_hours,
      minimum_project_budget_vnd:
        input.designerProfile.minimum_project_budget_vnd,
      specialties: input.designerProfile.specialties.slice(0, 6),
      styles: input.designerProfile.styles.slice(0, 6),
    },
    style_dna: input.designerStyleDNA
      ? {
          analyzed_portfolio_count:
            input.designerStyleDNA.analyzed_portfolio_count,
          style_tags: input.designerStyleDNA.style_tags.slice(0, 8),
          industry_tags: input.designerStyleDNA.industry_tags.slice(0, 6),
          category_tags: input.designerStyleDNA.category_tags.slice(0, 6),
          visual_strengths:
            input.designerStyleDNA.visual_strengths.slice(0, 6),
          common_moods: input.designerStyleDNA.common_moods.slice(0, 6),
          color_preferences:
            input.designerStyleDNA.color_preferences.slice(0, 6),
          typography_preferences:
            input.designerStyleDNA.typography_preferences.slice(0, 6),
          layout_preferences:
            input.designerStyleDNA.layout_preferences.slice(0, 6),
          dna_summary: truncateText(input.designerStyleDNA.dna_summary, textLimit),
          confidence_score: input.designerStyleDNA.confidence_score,
        }
      : null,
    portfolio_evidence: input.portfolioEvidence
      .slice(0, portfolioLimit)
      .map((item) => ({
        portfolio_item_id: item.portfolio_item_id,
        title: truncateText(item.title, 90),
        declared_industry: item.declared_industry,
        declared_category: item.declared_category,
        summary: truncateText(item.ai_visual_summary, textLimit),
        style_tags: item.ai_style_tags.slice(0, 6),
        mood_tags: item.ai_mood_tags.slice(0, 5),
        industry_tags: item.ai_industry_tags.slice(0, 5),
        category_tags: item.ai_category_tags.slice(0, 5),
        typography_tags: item.ai_typography_tags.slice(0, 5),
        layout_tags: item.ai_layout_tags.slice(0, 5),
        confidence_score: item.ai_confidence_score,
      })),
  };
}

function parseJsonObject(rawText: string, finishReason?: string) {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
  } catch {
    // thử extract bên dưới
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const possibleJson = cleaned.slice(firstBrace, lastBrace + 1);

    try {
      const parsed = JSON.parse(possibleJson);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      // ném lỗi bên dưới
    }
  }

  throw new Error(
    `Gemini trả JSON không hoàn chỉnh. finishReason=${finishReason ?? "unknown"}. raw=${truncateText(cleaned, 1200)}`,
  );
}

function normalizeAIMatchResult(value: Record<string, any>) {
  const result = {
    match_score: normalizeScore(value.match_score),
    portfolio_fit_score: normalizeScore(value.portfolio_fit_score),
    style_fit_score: normalizeScore(value.style_fit_score),
    vibe_fit_score: normalizeScore(value.vibe_fit_score),
    industry_context_fit_score: normalizeScore(
      value.industry_context_fit_score,
    ),
    budget_fit_score: normalizeScore(value.budget_fit_score),
    not_same_style_but_same_vibe: Boolean(
      value.not_same_style_but_same_vibe,
    ),
    match_reasons: stringArray(value.match_reasons).slice(0, 3),
    matched_portfolio_evidence: normalizePortfolioEvidence(
      value.matched_portfolio_evidence,
    ),
    risk_flags: stringArray(value.risk_flags).slice(0, 2),
    designer_positioning: stringValue(value.designer_positioning),
    fit_summary: stringValue(value.fit_summary),
  } satisfies AIDesignerBriefMatchResult;

  if (result.match_score <= 0) {
    result.match_score = Math.round(
      result.portfolio_fit_score * 0.3 +
        result.style_fit_score * 0.22 +
        result.vibe_fit_score * 0.2 +
        result.industry_context_fit_score * 0.15 +
        result.budget_fit_score * 0.13,
    );
  }

  result.match_score = normalizeScore(result.match_score);

  if (result.match_reasons.length === 0) {
    result.match_reasons = [
      "AI đánh giá dựa trên brief, portfolio evidence và Designer Style DNA.",
    ];
  }

  if (!result.fit_summary) {
    result.fit_summary =
      "AI đã chấm điểm dựa trên brief, concept, portfolio và Style DNA.";
  }

  return result;
}

function normalizePortfolioEvidence(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};

      return {
        portfolio_item_id: stringValue(record.portfolio_item_id),
        title: stringValue(record.title),
        evidence: stringValue(record.evidence),
        fit_reason: stringValue(record.fit_reason),
      };
    })
    .filter((item) => item.portfolio_item_id || item.title)
    .slice(0, 2);
}

function normalizeScore(value: unknown) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  if (score > 0 && score <= 1) {
    return Math.round(score * 100);
  }

  return Math.min(100, Math.max(0, Math.round(score)));
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

  return value.map((item) => stringValue(item)).filter(Boolean).slice(0, 30);
}

function truncateText(value: unknown, maxLength: number) {
  const text = stringValue(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}