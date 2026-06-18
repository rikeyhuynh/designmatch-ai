import "server-only";

import { buildCreativeIntelligenceInstructions } from "@/lib/ai/prompts/creative-intelligence";
import { logAIModelRun } from "@/lib/ai/model-run-logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PORTFOLIO_ANALYSIS_PROMPT_VERSION =
  "designer-portfolio-ai-style-dna-structured-v2";

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

type AnalyzeDesignerPortfolioInput = {
  portfolioItemId: string;
  designerId: string;
  title: string;
  description?: string | null;
  category: string;
  industry: string;
  imageUrl: string | null;
};

type PortfolioAnalysisResult = {
  visual_summary: string;
  style_tags: string[];
  mood_tags: string[];
  industry_tags: string[];
  category_tags: string[];
  color_tags: string[];
  typography_tags: string[];
  layout_tags: string[];
  visual_strengths: string[];
  best_fit_projects: string[];
  designer_dna_signals: string[];
  confidence_score: number;
};

type PortfolioAnalysisRow = {
  portfolio_item_id: string;
  designer_id: string;
  style_tags: string[] | null;
  mood_tags: string[] | null;
  industry_tags: string[] | null;
  category_tags: string[] | null;
  color_tags: string[] | null;
  typography_tags: string[] | null;
  layout_tags: string[] | null;
  visual_strengths: string[] | null;
  confidence_score: number | null;
};

type AggregatedDNA = {
  analyzed_portfolio_count: number;
  style_tags: string[];
  industry_tags: string[];
  category_tags: string[];
  visual_strengths: string[];
  common_moods: string[];
  color_preferences: string[];
  typography_preferences: string[];
  layout_preferences: string[];
  dna_summary: string;
  confidence_score: number;
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
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiPortfolioAnalysisRunResult = {
  provider: "gemini";
  model: string;
  aiModelRunId: string | null;
  json: Record<string, unknown>;
};

export async function analyzeDesignerPortfolio(
  input: AnalyzeDesignerPortfolioInput,
) {
  const supabase = createSupabaseAdminClient() as any;

  if (!input.imageUrl) {
    await supabase
      .from("portfolio_items")
      .update({
        ai_analysis_status: "skipped",
        ai_visual_summary:
          "Portfolio chưa có ảnh preview nên AI chưa thể phân tích phong cách thị giác.",
      })
      .eq("id", input.portfolioItemId)
      .eq("designer_id", input.designerId);

    return {
      status: "skipped",
      message: "Portfolio chưa có ảnh để AI phân tích.",
      analysis: null,
      dna: null,
    };
  }

  await supabase
    .from("portfolio_items")
    .update({
      ai_analysis_status: "processing",
    })
    .eq("id", input.portfolioItemId)
    .eq("designer_id", input.designerId);

  try {
    const aiResult = await runGeminiPortfolioAnalysis(input);
    const analysis = normalizePortfolioAnalysis(aiResult.json);

    validatePortfolioAnalysis(analysis);

    const now = new Date().toISOString();

    const { error: analysisUpsertError } = await supabase
      .from("portfolio_ai_analysis")
      .upsert(
        {
          portfolio_item_id: input.portfolioItemId,
          designer_id: input.designerId,
          designer_profile_id: input.designerId,
          ai_model_run_id: aiResult.aiModelRunId ?? null,
          style_tags: analysis.style_tags,
          mood_tags: analysis.mood_tags,
          industry_tags: analysis.industry_tags,
          category_tags: analysis.category_tags,
          color_tags: analysis.color_tags,
          typography_tags: analysis.typography_tags,
          layout_tags: analysis.layout_tags,
          visual_strengths: analysis.visual_strengths,
          visual_summary: analysis.visual_summary,
          confidence_score: analysis.confidence_score,
          analysis_json: analysis,
          prompt_version: PORTFOLIO_ANALYSIS_PROMPT_VERSION,
          updated_at: now,
        },
        {
          onConflict: "portfolio_item_id",
        },
      );

    if (analysisUpsertError) {
      throw new Error(analysisUpsertError.message);
    }

    const { error: portfolioUpdateError } = await supabase
      .from("portfolio_items")
      .update({
        ai_analysis_status: "success",
        ai_analyzed_at: now,
        ai_style_tags: analysis.style_tags,
        ai_industry_tags: analysis.industry_tags,
        ai_category_tags: analysis.category_tags,
        ai_visual_summary: analysis.visual_summary,
        ai_confidence_score: analysis.confidence_score,
      })
      .eq("id", input.portfolioItemId)
      .eq("designer_id", input.designerId);

    if (portfolioUpdateError) {
      throw new Error(portfolioUpdateError.message);
    }

    const dna = await rebuildDesignerStyleDNA({
      designerId: input.designerId,
      lastPortfolioItemId: input.portfolioItemId,
    });

    return {
      status: "success",
      message: "Đã phân tích portfolio và cập nhật Designer Style DNA.",
      provider: aiResult.provider,
      model: aiResult.model,
      aiModelRunId: aiResult.aiModelRunId ?? null,
      analysis,
      dna,
    };
  } catch (error) {
    await supabase
      .from("portfolio_items")
      .update({
        ai_analysis_status: "failed",
      })
      .eq("id", input.portfolioItemId)
      .eq("designer_id", input.designerId);

    throw error;
  }
}

async function runGeminiPortfolioAnalysis(
  input: AnalyzeDesignerPortfolioInput,
): Promise<GeminiPortfolioAnalysisRunResult> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiPortfolioModel();

  const startedAt = Date.now();
  const prompt = buildPortfolioAnalysisPrompt(input);
  const imagePart = await buildGeminiImagePart(input.imageUrl);

  const generationConfig: Record<string, unknown> = {
    temperature: 0,
    topP: 0.6,
    topK: 10,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
    responseSchema: buildPortfolioAnalysisResponseSchema(),
  };

  if (model.includes("2.5")) {
    generationConfig.thinkingConfig = {
      thinkingBudget: 0,
    };
  }

  let rawTextOutput: string | null = null;

  try {
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
                imagePart,
              ],
            },
          ],
          generationConfig,
        }),
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      await logAIModelRun({
        provider: "gemini",
        model,
        purpose: "vision",
        task: "designer_portfolio_style_analysis",
        status: "failed",
        promptVersion: PORTFOLIO_ANALYSIS_PROMPT_VERSION,
        systemPrompt: prompt,
        userInput: buildPortfolioAnalysisInputForLog(input),
        rawTextOutput: responseText,
        latencyMs: Date.now() - startedAt,
        errorCode: `GEMINI_${response.status}`,
        errorMessage: truncateText(responseText, 1800),
        relatedDesignerProfileId: input.designerId,
        relatedPortfolioItemId: input.portfolioItemId,
      });

      throw new Error(
        `Gemini portfolio analysis API lỗi ${response.status}: ${truncateText(
          responseText,
          1200,
        )}`,
      );
    }

    const data = JSON.parse(responseText) as GeminiGenerateContentResponse;

    if (data.error?.message) {
      await logAIModelRun({
        provider: "gemini",
        model,
        purpose: "vision",
        task: "designer_portfolio_style_analysis",
        status: "failed",
        promptVersion: PORTFOLIO_ANALYSIS_PROMPT_VERSION,
        systemPrompt: prompt,
        userInput: buildPortfolioAnalysisInputForLog(input),
        rawTextOutput: responseText,
        inputTokens: data.usageMetadata?.promptTokenCount ?? null,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
        totalTokens: data.usageMetadata?.totalTokenCount ?? null,
        latencyMs: Date.now() - startedAt,
        errorCode: data.error.status ?? "GEMINI_ERROR",
        errorMessage: data.error.message,
        relatedDesignerProfileId: input.designerId,
        relatedPortfolioItemId: input.portfolioItemId,
      });

      throw new Error(`Gemini portfolio analysis API error: ${data.error.message}`);
    }

    const candidate = data.candidates?.[0];

    rawTextOutput =
      candidate?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!rawTextOutput) {
      await logAIModelRun({
        provider: "gemini",
        model,
        purpose: "vision",
        task: "designer_portfolio_style_analysis",
        status: "failed",
        promptVersion: PORTFOLIO_ANALYSIS_PROMPT_VERSION,
        systemPrompt: prompt,
        userInput: buildPortfolioAnalysisInputForLog(input),
        rawTextOutput,
        inputTokens: data.usageMetadata?.promptTokenCount ?? null,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
        totalTokens: data.usageMetadata?.totalTokenCount ?? null,
        latencyMs: Date.now() - startedAt,
        errorCode: "GEMINI_EMPTY_OUTPUT",
        errorMessage: `Gemini không trả JSON. finishReason=${
          candidate?.finishReason ?? "unknown"
        }`,
        relatedDesignerProfileId: input.designerId,
        relatedPortfolioItemId: input.portfolioItemId,
      });

      throw new Error(
        `Gemini không trả JSON khi phân tích portfolio. finishReason=${
          candidate?.finishReason ?? "unknown"
        }`,
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawTextOutput);
    } catch (parseError) {
      await logAIModelRun({
        provider: "gemini",
        model,
        purpose: "vision",
        task: "designer_portfolio_style_analysis",
        status: "failed",
        promptVersion: PORTFOLIO_ANALYSIS_PROMPT_VERSION,
        systemPrompt: prompt,
        userInput: buildPortfolioAnalysisInputForLog(input),
        rawTextOutput,
        inputTokens: data.usageMetadata?.promptTokenCount ?? null,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
        totalTokens: data.usageMetadata?.totalTokenCount ?? null,
        latencyMs: Date.now() - startedAt,
        errorCode: "AI_JSON_PARSE_ERROR",
        errorMessage:
          parseError instanceof Error
            ? parseError.message
            : "Không parse được JSON portfolio analysis.",
        relatedDesignerProfileId: input.designerId,
        relatedPortfolioItemId: input.portfolioItemId,
      });

      throw new Error(
        `Designer portfolio AI analysis không phải JSON hợp lệ. raw=${truncateText(
          rawTextOutput,
          1600,
        )}`,
      );
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Designer portfolio AI analysis JSON không phải object.");
    }

    const aiModelRunId = await logAIModelRun({
      provider: "gemini",
      model,
      purpose: "vision",
      task: "designer_portfolio_style_analysis",
      status: "success",
      promptVersion: PORTFOLIO_ANALYSIS_PROMPT_VERSION,
      systemPrompt: prompt,
      userInput: buildPortfolioAnalysisInputForLog(input),
      aiOutput: parsed,
      rawTextOutput,
      inputTokens: data.usageMetadata?.promptTokenCount ?? null,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
      totalTokens: data.usageMetadata?.totalTokenCount ?? null,
      latencyMs: Date.now() - startedAt,
      relatedDesignerProfileId: input.designerId,
      relatedPortfolioItemId: input.portfolioItemId,
    });

    return {
      provider: "gemini",
      model,
      aiModelRunId,
      json: parsed as Record<string, unknown>,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Không parse được response Gemini portfolio analysis: ${error.message}`,
      );
    }

    throw error;
  }
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

function getGeminiPortfolioModel() {
  return (
    process.env.GEMINI_PORTFOLIO_MODEL ??
    process.env.GEMINI_VISION_MODEL ??
    process.env.GEMINI_MODEL ??
    DEFAULT_GEMINI_MODEL
  );
}

function buildPortfolioAnalysisPrompt(input: AnalyzeDesignerPortfolioInput) {
  const instructions = buildCreativeIntelligenceInstructions(`
Bạn là AI Portfolio Style Analyst của DesignMatch AI.

Nhiệm vụ:
Phân tích một ảnh portfolio thiết kế của designer để trích xuất tín hiệu phong cách thị giác phục vụ Designer Style DNA và AI matching.

Bạn cần nhìn vào ảnh và kết hợp metadata để xác định:
- Phong cách thiết kế chính.
- Mood/cảm xúc thị giác.
- Ngành/hạng mục phù hợp.
- Màu sắc nổi bật.
- Typography.
- Bố cục.
- Điểm mạnh thị giác.
- Loại project mà designer này có khả năng phù hợp.

Quy tắc:
- Không đánh giá đạo đức.
- Không chấm con người designer.
- Chỉ phân tích đặc điểm visual của sản phẩm portfolio.
- Không bịa thông tin ngoài ảnh và metadata.
- Nếu không chắc, confidence_score thấp hơn.
- Mỗi mảng chỉ nên có 3 đến 8 items, ngắn gọn, dễ dùng cho matching.
- style_tags nên dùng snake_case tiếng Anh ngắn, ví dụ: clean_modern, bold_branding, editorial_layout, playful_local, premium_minimal.
- industry_tags và category_tags nên ưu tiên taxonomy của hệ thống nếu phù hợp.
- Các trường mô tả còn lại viết bằng tiếng Việt.

Output:
- Chỉ trả JSON object hợp lệ.
- Không markdown.
- Không code fence.
- Không giải thích ngoài JSON.
`);

  return [
    instructions,
    "",
    "METADATA JSON:",
    JSON.stringify(
      {
        portfolioItemId: input.portfolioItemId,
        title: input.title,
        description: input.description,
        declaredCategory: input.category,
        declaredIndustry: input.industry,
      },
      null,
      2,
    ),
  ].join("\n");
}

function buildPortfolioAnalysisResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      visual_summary: {
        type: "STRING",
      },
      style_tags: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      mood_tags: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      industry_tags: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      category_tags: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      color_tags: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      typography_tags: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      layout_tags: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      visual_strengths: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      best_fit_projects: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      designer_dna_signals: {
        type: "ARRAY",
        items: {
          type: "STRING",
        },
      },
      confidence_score: {
        type: "INTEGER",
      },
    },
    required: [
      "visual_summary",
      "style_tags",
      "mood_tags",
      "industry_tags",
      "category_tags",
      "color_tags",
      "typography_tags",
      "layout_tags",
      "visual_strengths",
      "best_fit_projects",
      "designer_dna_signals",
      "confidence_score",
    ],
  };
}

async function buildGeminiImagePart(imageUrl: string | null) {
  if (!imageUrl) {
    throw new Error("Thiếu imageUrl để phân tích portfolio.");
  }

  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    throw new Error(
      `Không tải được ảnh portfolio để phân tích AI. HTTP ${imageResponse.status}`,
    );
  }

  const contentType =
    imageResponse.headers.get("content-type")?.split(";")[0]?.trim() ??
    "image/jpeg";

  const mimeType = normalizeImageMimeType(contentType);
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  if (!base64) {
    throw new Error("Không đọc được dữ liệu ảnh portfolio.");
  }

  return {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
}

function normalizeImageMimeType(contentType: string) {
  if (contentType === "image/png") return "image/png";
  if (contentType === "image/webp") return "image/webp";
  return "image/jpeg";
}

function buildPortfolioAnalysisInputForLog(input: AnalyzeDesignerPortfolioInput) {
  return {
    portfolioItemId: input.portfolioItemId,
    designerId: input.designerId,
    title: input.title,
    description: input.description,
    category: input.category,
    industry: input.industry,
    imageUrl: input.imageUrl,
  };
}

async function rebuildDesignerStyleDNA({
  designerId,
  lastPortfolioItemId,
}: {
  designerId: string;
  lastPortfolioItemId: string;
}) {
  const supabase = createSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("portfolio_ai_analysis")
    .select(
      `
      portfolio_item_id,
      designer_id,
      style_tags,
      mood_tags,
      industry_tags,
      category_tags,
      color_tags,
      typography_tags,
      layout_tags,
      visual_strengths,
      confidence_score
    `,
    )
    .eq("designer_id", designerId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as PortfolioAnalysisRow[];

  const dna = aggregateDesignerDNA(rows);
  const now = new Date().toISOString();

  const { error: dnaError } = await supabase
    .from("designer_style_dna")
    .upsert(
      {
        designer_id: designerId,
        designer_profile_id: designerId,
        analyzed_portfolio_count: dna.analyzed_portfolio_count,
        style_tags: dna.style_tags,
        industry_tags: dna.industry_tags,
        category_tags: dna.category_tags,
        visual_strengths: dna.visual_strengths,
        common_moods: dna.common_moods,
        color_preferences: dna.color_preferences,
        typography_preferences: dna.typography_preferences,
        layout_preferences: dna.layout_preferences,
        dna_summary: dna.dna_summary,
        confidence_score: dna.confidence_score,
        last_portfolio_item_id: lastPortfolioItemId,
        last_analyzed_at: now,
        updated_at: now,
      },
      {
        onConflict: "designer_id",
      },
    );

  if (dnaError) {
    throw new Error(dnaError.message);
  }

  return dna;
}

function aggregateDesignerDNA(rows: PortfolioAnalysisRow[]): AggregatedDNA {
  const analyzedCount = rows.length;

  const styleTags = topValues(rows.flatMap((row) => row.style_tags ?? []), 16);
  const industryTags = topValues(
    rows.flatMap((row) => row.industry_tags ?? []),
    12,
  );
  const categoryTags = topValues(
    rows.flatMap((row) => row.category_tags ?? []),
    12,
  );
  const visualStrengths = topValues(
    rows.flatMap((row) => row.visual_strengths ?? []),
    16,
  );
  const commonMoods = topValues(rows.flatMap((row) => row.mood_tags ?? []), 12);
  const colorPreferences = topValues(
    rows.flatMap((row) => row.color_tags ?? []),
    12,
  );
  const typographyPreferences = topValues(
    rows.flatMap((row) => row.typography_tags ?? []),
    12,
  );
  const layoutPreferences = topValues(
    rows.flatMap((row) => row.layout_tags ?? []),
    12,
  );

  const confidenceValues = rows
    .map((row) => Number(row.confidence_score ?? 0))
    .filter((score) => Number.isFinite(score) && score > 0);

  const confidenceScore =
    confidenceValues.length > 0
      ? Math.round(
          confidenceValues.reduce((sum, score) => sum + score, 0) /
            confidenceValues.length,
        )
      : 0;

  const dnaSummary = buildDnaSummary({
    analyzedCount,
    styleTags,
    industryTags,
    categoryTags,
    visualStrengths,
    commonMoods,
  });

  return {
    analyzed_portfolio_count: analyzedCount,
    style_tags: styleTags,
    industry_tags: industryTags,
    category_tags: categoryTags,
    visual_strengths: visualStrengths,
    common_moods: commonMoods,
    color_preferences: colorPreferences,
    typography_preferences: typographyPreferences,
    layout_preferences: layoutPreferences,
    dna_summary: dnaSummary,
    confidence_score: confidenceScore,
  };
}

function normalizePortfolioAnalysis(
  value: Record<string, unknown>,
): PortfolioAnalysisResult {
  return {
    visual_summary: stringValue(value.visual_summary),
    style_tags: stringArray(value.style_tags, 12),
    mood_tags: stringArray(value.mood_tags, 12),
    industry_tags: stringArray(value.industry_tags, 12),
    category_tags: stringArray(value.category_tags, 12),
    color_tags: stringArray(value.color_tags, 12),
    typography_tags: stringArray(value.typography_tags, 12),
    layout_tags: stringArray(value.layout_tags, 12),
    visual_strengths: stringArray(value.visual_strengths, 12),
    best_fit_projects: stringArray(value.best_fit_projects, 12),
    designer_dna_signals: stringArray(value.designer_dna_signals, 12),
    confidence_score: normalizeScore(value.confidence_score),
  };
}

function validatePortfolioAnalysis(analysis: PortfolioAnalysisResult) {
  if (!analysis.visual_summary) {
    throw new Error(
      "AI portfolio analysis trả JSON nhưng thiếu visual_summary.",
    );
  }

  if (analysis.style_tags.length === 0) {
    throw new Error(
      "AI portfolio analysis trả JSON nhưng thiếu style_tags.",
    );
  }

  if (analysis.visual_strengths.length === 0) {
    throw new Error(
      "AI portfolio analysis trả JSON nhưng thiếu visual_strengths.",
    );
  }

  if (analysis.confidence_score <= 0) {
    throw new Error(
      "AI portfolio analysis trả JSON nhưng confidence_score không hợp lệ.",
    );
  }
}

function buildDnaSummary({
  analyzedCount,
  styleTags,
  industryTags,
  categoryTags,
  visualStrengths,
  commonMoods,
}: {
  analyzedCount: number;
  styleTags: string[];
  industryTags: string[];
  categoryTags: string[];
  visualStrengths: string[];
  commonMoods: string[];
}) {
  if (analyzedCount === 0) {
    return "Designer chưa có portfolio nào được AI phân tích.";
  }

  const parts = [
    `Đã phân tích ${analyzedCount} portfolio.`,
    styleTags.length > 0
      ? `Phong cách nổi bật: ${styleTags.slice(0, 5).join(", ")}.`
      : "",
    commonMoods.length > 0
      ? `Mood thường gặp: ${commonMoods.slice(0, 4).join(", ")}.`
      : "",
    industryTags.length > 0
      ? `Ngành phù hợp: ${industryTags.slice(0, 4).join(", ")}.`
      : "",
    categoryTags.length > 0
      ? `Hạng mục mạnh: ${categoryTags.slice(0, 4).join(", ")}.`
      : "",
    visualStrengths.length > 0
      ? `Điểm mạnh visual: ${visualStrengths.slice(0, 4).join(", ")}.`
      : "",
  ];

  return parts.filter(Boolean).join(" ");
}

function topValues(items: string[], limit: number) {
  const frequency = new Map<string, number>();
  const displayValue = new Map<string, string>();

  for (const item of items) {
    const normalized = normalizeKey(item);

    if (!normalized) {
      continue;
    }

    frequency.set(normalized, (frequency.get(normalized) ?? 0) + 1);

    if (!displayValue.has(normalized)) {
      displayValue.set(normalized, item.trim());
    }
  }

  return Array.from(frequency.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([key]) => displayValue.get(key) ?? key);
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function stringArray(value: unknown, limit = 40) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => stringValue(item)).filter(Boolean).slice(0, limit);
}

function normalizeScore(value: unknown) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  if (score > 0 && score <= 1) {
    return Math.round(score * 100);
  }

  if (score > 1 && score <= 10) {
    return Math.round(score * 10);
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function truncateText(value: unknown, maxLength: number) {
  const text = stringValue(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}