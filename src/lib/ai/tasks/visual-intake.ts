import "server-only";

import { createClient } from "@supabase/supabase-js";

import { buildJsonOnlyInstruction, stringifyForAI } from "@/lib/ai/json";
import { runAIVisionJson } from "@/lib/ai/provider";
import { buildCreativeIntelligenceInstructions } from "@/lib/ai/prompts/creative-intelligence";
import type { JsonValue } from "@/lib/ai/types";

const VISUAL_INTAKE_PROMPT_VERSION =
  "ai-visual-intake-creative-strategy-v2";

export type AIVisualIntakeInput = {
  imageUrl: string;
  designRequestId?: string | null;
  customerProfileId?: string | null;
  sourceImageStoragePath?: string | null;
  extraContext?: {
    productDescription?: string | null;
    designType?: string | null;
    targetAudience?: string | null;
    preferredStyle?: string | null;
    preferredColors?: string | null;
    budget?: string | null;
    deadline?: string | null;
    channel?: string | null;
  };
};

export type AIVisualIntakeResult = {
  detected_industry: string | null;
  detected_product_type: string | null;
  detected_main_colors: Array<{
    name: string;
    hex_guess: string | null;
    role: string;
  }>;
  detected_mood_tags: string[];
  suggested_style_tags: string[];
  avoid_style_tags: string[];
  target_audience_suggestions: string[];
  recommended_design_types: string[];
  recommended_channels: string[];
  visual_summary: string;
  designer_matching_notes: string;
  confidence_score: number;
  missing_or_uncertain_points: string[];
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

function normalizeScore(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 70;
  }

  if (value >= 0 && value <= 1) {
    return Math.max(0, Math.min(100, Math.round(value * 100)));
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function dedupeStrings(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function normalizeStringArray(value: unknown, limit = 12) {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeStrings(
    value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean),
  ).slice(0, limit);
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

function normalizeColorArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 8)
    .map((item) => {
      const record = item && typeof item === "object" ? (item as any) : {};

      return {
        name: String(record.name ?? "").trim() || "Không xác định",
        hex_guess: normalizeHexGuess(record.hex_guess),
        role: normalizeColorRole(record.role),
      };
    })
    .filter((item) => item.name.length > 0);
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function normalizeNonEmptyString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeVisualIntakeJson(
  value: Record<string, JsonValue>,
): AIVisualIntakeResult {
  const detectedIndustry = normalizeNullableString(value.detected_industry);
  const detectedProductType = normalizeNullableString(
    value.detected_product_type,
  );

  const detectedMoodTags = normalizeStringArray(value.detected_mood_tags, 12);
  const suggestedStyleTags = normalizeStringArray(value.suggested_style_tags, 12);
  const avoidStyleTags = normalizeStringArray(value.avoid_style_tags, 12);

  return {
    detected_industry: detectedIndustry,
    detected_product_type: detectedProductType,
    detected_main_colors: normalizeColorArray(value.detected_main_colors),
    detected_mood_tags: detectedMoodTags,
    suggested_style_tags: suggestedStyleTags,
    avoid_style_tags: avoidStyleTags,
    target_audience_suggestions: normalizeStringArray(
      value.target_audience_suggestions,
      12,
    ),
    recommended_design_types: normalizeStringArray(
      value.recommended_design_types,
      10,
    ),
    recommended_channels: normalizeStringArray(value.recommended_channels, 10),
    visual_summary: normalizeNonEmptyString(
      value.visual_summary,
      "AI chưa tạo được tóm tắt hình ảnh đủ rõ.",
    ),
    designer_matching_notes: normalizeNonEmptyString(
      value.designer_matching_notes,
      "Chưa có ghi chú matching cho designer.",
    ),
    confidence_score: normalizeScore(value.confidence_score),
    missing_or_uncertain_points: normalizeStringArray(
      value.missing_or_uncertain_points,
      16,
    ),
  };
}

function getVisualIntakeFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "AI Visual Intake không trả về JSON hợp lệ.";
}

function splitTextToList(value?: string | null, limit = 8) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;\n|\/]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function inferIndustryFromText(value: string) {
  const text = value.toLowerCase();

  if (
    text.includes("cà phê") ||
    text.includes("coffee") ||
    text.includes("trà sữa") ||
    text.includes("trà") ||
    text.includes("bánh") ||
    text.includes("quán ăn") ||
    text.includes("nhà hàng") ||
    text.includes("food") ||
    text.includes("drink") ||
    text.includes("f&b")
  ) {
    return "F&B";
  }

  if (
    text.includes("spa") ||
    text.includes("salon") ||
    text.includes("beauty") ||
    text.includes("nail") ||
    text.includes("makeup")
  ) {
    return "Beauty / Spa";
  }

  if (
    text.includes("shop") ||
    text.includes("thời trang") ||
    text.includes("quần áo") ||
    text.includes("mỹ phẩm") ||
    text.includes("retail")
  ) {
    return "Retail / Local brand";
  }

  if (
    text.includes("workshop") ||
    text.includes("sự kiện") ||
    text.includes("event") ||
    text.includes("clb") ||
    text.includes("câu lạc bộ")
  ) {
    return "Event / Education";
  }

  return null;
}

function inferProductTypeFromText(input: AIVisualIntakeInput) {
  const designType = input.extraContext?.designType?.trim();

  if (designType) {
    return designType;
  }

  const productDescription = input.extraContext?.productDescription?.trim();

  if (productDescription) {
    return productDescription.slice(0, 120);
  }

  return "Sản phẩm/dịch vụ chưa xác định rõ";
}

function buildFallbackColors(input: AIVisualIntakeInput) {
  const preferredColors = splitTextToList(input.extraContext?.preferredColors);

  if (preferredColors.length > 0) {
    return preferredColors.map((color, index) => ({
      name: color,
      hex_guess: null,
      role: index === 0 ? "primary" : index === 1 ? "secondary" : "accent",
    }));
  }

  return [
    {
      name: "màu thương hiệu cần xác nhận",
      hex_guess: null,
      role: "primary",
    },
    {
      name: "nền sáng dễ đọc",
      hex_guess: "#FFFFFF",
      role: "background",
    },
    {
      name: "màu nhấn cho CTA",
      hex_guess: null,
      role: "accent",
    },
  ];
}

function buildFallbackMoodTags(input: AIVisualIntakeInput) {
  const preferredStyle = splitTextToList(input.extraContext?.preferredStyle);

  if (preferredStyle.length > 0) {
    return preferredStyle;
  }

  return ["rõ ràng", "dễ đọc", "thân thiện", "phù hợp kinh doanh nhỏ"];
}

function buildFallbackStyleTags(input: AIVisualIntakeInput) {
  const preferredStyle = splitTextToList(input.extraContext?.preferredStyle);

  if (preferredStyle.length > 0) {
    return preferredStyle.map((item) =>
      item
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\p{L}\p{N}_-]/gu, ""),
    );
  }

  const combinedText = [
    input.extraContext?.productDescription,
    input.extraContext?.designType,
    input.extraContext?.channel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    combinedText.includes("cà phê") ||
    combinedText.includes("trà") ||
    combinedText.includes("bánh")
  ) {
    return ["warm_minimal", "cozy_fnb", "clean_modern"];
  }

  if (combinedText.includes("sinh viên") || combinedText.includes("event")) {
    return ["gen_z_bold", "clean_modern", "social_first"];
  }

  return ["clean_modern", "local_business_friendly"];
}

function buildFallbackDesignTypes(input: AIVisualIntakeInput) {
  const designType = input.extraContext?.designType?.trim();

  if (designType) {
    return [designType];
  }

  return ["social post", "poster", "banner"];
}

function buildFallbackChannels(input: AIVisualIntakeInput) {
  const channel = input.extraContext?.channel?.trim();

  if (channel) {
    return [channel];
  }

  return ["Facebook", "Instagram", "Zalo"];
}

function buildFallbackVisualIntakeResult(
  input: AIVisualIntakeInput,
  failureReason: string,
): AIVisualIntakeResult {
  const contextText = [
    input.extraContext?.productDescription,
    input.extraContext?.designType,
    input.extraContext?.targetAudience,
    input.extraContext?.preferredStyle,
    input.extraContext?.preferredColors,
    input.extraContext?.channel,
  ]
    .filter(Boolean)
    .join(" ");

  const detectedIndustry = inferIndustryFromText(contextText);
  const productType = inferProductTypeFromText(input);
  const moodTags = buildFallbackMoodTags(input);
  const styleTags = buildFallbackStyleTags(input);
  const recommendedDesignTypes = buildFallbackDesignTypes(input);
  const recommendedChannels = buildFallbackChannels(input);

  const uncertainPoints = [
    "AI không phân tích được ảnh trực tiếp nên kết quả này được tạo từ thông tin form và fallback nội bộ.",
    "Cần kiểm tra lại ảnh sản phẩm, logo, màu sắc và nội dung trước khi chốt brief.",
    "Nếu ảnh là ảnh tham khảo phong cách, cần xác nhận rõ phần nào muốn giữ lại: màu, mood, bố cục hay typography.",
  ];

  if (!input.extraContext?.productDescription) {
    uncertainPoints.push("Thiếu mô tả sản phẩm/dịch vụ từ customer.");
  }

  if (!input.extraContext?.targetAudience) {
    uncertainPoints.push("Thiếu mô tả đối tượng khách hàng mục tiêu.");
  }

  if (!input.extraContext?.preferredColors) {
    uncertainPoints.push("Chưa có màu sắc thương hiệu hoặc màu mong muốn.");
  }

  if (!input.extraContext?.channel) {
    uncertainPoints.push("Chưa rõ kênh sử dụng chính của thiết kế.");
  }

  return {
    detected_industry: detectedIndustry,
    detected_product_type: productType,
    detected_main_colors: buildFallbackColors(input),
    detected_mood_tags: moodTags,
    suggested_style_tags: styleTags,
    avoid_style_tags: [
      "style quá rối nếu cần đọc nhanh trên mobile",
      "màu quá chói nếu chưa phù hợp thương hiệu",
      "bố cục quá nhiều chữ nếu thiếu hierarchy",
    ],
    target_audience_suggestions: input.extraContext?.targetAudience
      ? [input.extraContext.targetAudience]
      : [
          "Khách hàng mục tiêu cần được làm rõ thêm trước khi designer bắt đầu.",
        ],
    recommended_design_types: recommendedDesignTypes,
    recommended_channels: recommendedChannels,
    visual_summary: `Visual Intake được tạo bằng fallback vì AI không xử lý được ảnh hoặc không trả JSON hợp lệ. Lý do kỹ thuật: ${failureReason}. Hệ thống sẽ dùng dữ liệu form để tiếp tục tạo brief, nhưng customer nên kiểm tra lại thông tin hình ảnh trước khi chốt.`,
    designer_matching_notes: [
      `Nên match designer có kinh nghiệm với ${recommendedDesignTypes.join(
        ", ",
      )}.`,
      detectedIndustry
        ? `Ưu tiên portfolio liên quan đến ngành ${detectedIndustry}.`
        : "Ưu tiên designer có portfolio gần với ngành/sản phẩm của customer.",
      `Phong cách gợi ý: ${styleTags.join(", ")}.`,
      "Designer cần mạnh về hierarchy, màu sắc rõ ràng và khả năng làm visual dễ đọc trên kênh sử dụng chính.",
    ].join(" "),
    confidence_score: 45,
    missing_or_uncertain_points: uncertainPoints.slice(0, 16),
  };
}

async function saveAIVisualIntake({
  input,
  result,
  aiModelRunId,
}: {
  input: AIVisualIntakeInput;
  result: AIVisualIntakeResult;
  aiModelRunId?: string | null;
}) {
  if (!input.designRequestId) {
    return null;
  }

  const supabase = getSupabaseAIAdminClient();

  if (!supabase) {
    console.warn(
      "[DesignMatch AI] Bỏ qua lưu ai_visual_intakes vì thiếu Supabase admin env.",
    );
    return null;
  }

  const { data, error } = await supabase
    .from("ai_visual_intakes")
    .insert({
      design_request_id: input.designRequestId,
      customer_profile_id: input.customerProfileId ?? null,
      ai_model_run_id: aiModelRunId ?? null,

      source_image_url: input.imageUrl,
      source_image_storage_path: input.sourceImageStoragePath ?? null,

      detected_industry: result.detected_industry,
      detected_product_type: result.detected_product_type,
      detected_main_colors: result.detected_main_colors,
      detected_mood_tags: result.detected_mood_tags,
      suggested_style_tags: result.suggested_style_tags,
      avoid_style_tags: result.avoid_style_tags,
      target_audience_suggestions: result.target_audience_suggestions,
      recommended_design_types: result.recommended_design_types,
      recommended_channels: result.recommended_channels,

      visual_summary: result.visual_summary,
      designer_matching_notes: result.designer_matching_notes,

      confidence_score: result.confidence_score,
      user_edited_result: {
        missing_or_uncertain_points: result.missing_or_uncertain_points,
      },
      is_user_confirmed: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[DesignMatch AI] Không thể lưu ai_visual_intakes:", error);
    return null;
  }

  return typeof data?.id === "string" ? data.id : null;
}

export async function analyzeProductVisual(input: AIVisualIntakeInput) {
  const schemaDescription = `
{
  "detected_industry": "string hoặc null",
  "detected_product_type": "string hoặc null",
  "detected_main_colors": [
    {
      "name": "Tên màu bằng tiếng Việt, ví dụ: nâu sữa, kem, trắng, xanh mint",
      "hex_guess": "#RRGGBB hoặc null",
      "role": "primary | secondary | accent | background | text"
    }
  ],
  "detected_mood_tags": ["string"],
  "suggested_style_tags": ["string"],
  "avoid_style_tags": ["string"],
  "target_audience_suggestions": ["string"],
  "recommended_design_types": ["string"],
  "recommended_channels": ["string"],
  "visual_summary": "string",
  "designer_matching_notes": "string",
  "confidence_score": 0,
  "missing_or_uncertain_points": ["string"]
}
`;

  const instructions = buildCreativeIntelligenceInstructions(`
Nhiệm vụ:
Bạn là module AI Visual Intake của DesignMatch AI.

Bạn cần phân tích ảnh đầu vào như một Creative Strategist, Visual Design Analyst và Brand Communication Assistant cho hộ kinh doanh nhỏ tại Việt Nam.

Ảnh đầu vào có thể là:
- ảnh sản phẩm,
- ảnh món ăn hoặc thức uống,
- ảnh cửa hàng,
- ảnh bao bì,
- logo,
- ảnh thiết kế cũ,
- ảnh tham khảo phong cách,
- ảnh từ fanpage hoặc social media.

Mục tiêu của Visual Intake:
Không chỉ mô tả ảnh đang có gì, mà phải chuyển tín hiệu thị giác trong ảnh thành dữ liệu có ích cho:
1. AI Brief Builder.
2. AI Concept Direction.
3. Visual Concept Preview.
4. Style-fit Matching Engine.
5. Designer Style DNA matching.
6. Brief Risk Scanner.

Bạn cần phân tích theo 10 lớp:

1. Product / service understanding:
- Ảnh có khả năng là sản phẩm gì?
- Sản phẩm thuộc nhóm ngành/ngách nào?
- Nếu không chắc, ghi rõ mức không chắc trong missing_or_uncertain_points.

2. Visual attributes:
- Màu chủ đạo.
- Màu phụ.
- Màu nhấn.
- Độ sáng/tối.
- Cảm giác sạch, ấm, cao cấp, trẻ trung, năng động, handmade, local hay hiện đại.

3. Brand / business inference:
- Hình ảnh phù hợp với dạng hộ kinh doanh nào?
- Có vẻ là F&B, retail, beauty, event, education, local brand hay nhóm khác?
- Không bịa tên thương hiệu nếu ảnh không có thông tin.

4. Audience inference:
- Đối tượng khách hàng nào có thể phù hợp?
- Ví dụ: sinh viên, học sinh, nhân viên văn phòng trẻ, gia đình, khách du lịch, khách nữ 22-35, cộng đồng sinh viên.

5. Style recommendation:
- Đề xuất style thiết kế có khả năng phù hợp.
- Ưu tiên style taxonomy của DesignMatch AI như:
  korean_cafe, cozy_minimal, warm_minimal, pastel_soft, gen_z_bold, premium_fnb, handmade, clean_modern, bold_typography, local_cultural, editorial.
- Không đề xuất quá nhiều style trái ngược nhau nếu không có lý do.

6. Style to avoid:
- Nêu các style nên tránh nếu có cơ sở.
- Ví dụ: tránh luxury quá lạnh nếu sản phẩm local/ấm áp; tránh neon quá mạnh nếu ảnh mềm/pastel; tránh layout quá nhiều chữ nếu sản phẩm cần cảm giác premium.

7. Recommended design types:
- Dựa trên ảnh và ngữ cảnh, đề xuất loại ấn phẩm nên làm.
- Ví dụ: poster khai trương, social post, story, banner, menu mini, voucher, standee, brand kit mini.
- Nếu người dùng đã chọn designType, hãy ưu tiên designType đó nhưng vẫn có thể gợi ý thêm nếu hợp lý.

8. Recommended channels:
- Gợi ý kênh phù hợp.
- Ví dụ: Facebook, Instagram, Story, TikTok thumbnail, Zalo, in-store display, print, event booth.

9. Designer matching notes:
- Viết ghi chú giúp hệ thống match đúng designer.
- Ghi rõ designer nên có portfolio kiểu gì.
- Ví dụ: "Nên match designer có portfolio F&B, tone nâu kem, bố cục sản phẩm trung tâm, social post khai trương".

10. Uncertainty and risk:
- Ghi rõ điểm chưa chắc hoặc thiếu dữ liệu.
- Ví dụ: ảnh mờ, không thấy logo, không rõ sản phẩm, thiếu thông tin ưu đãi, thiếu đối tượng khách hàng, thiếu kênh sử dụng.

Yêu cầu chất lượng:
- Output phải cụ thể, không chung chung.
- Không chỉ nói "hiện đại, đẹp, bắt mắt" nếu không giải thích rõ.
- visual_summary phải là một đoạn ngắn nhưng có giá trị cho người làm brief.
- designer_matching_notes phải có ích trực tiếp cho Matching Engine.
- detected_mood_tags nên dùng tiếng Việt tự nhiên hoặc tag dễ hiểu.
- suggested_style_tags nên ưu tiên snake_case để phục vụ hệ thống.
- confidence_score dùng thang 0-100, không dùng 0-1.
- Nếu ảnh không đủ rõ, confidence_score phải giảm tương ứng.
- Không khẳng định chắc chắn nếu chỉ suy luận từ ảnh.
- Không nói AI đã thiết kế sản phẩm cuối cùng.
- Không thay designer, chỉ tạo dữ liệu phân tích để hỗ trợ brief và matching.

Ngữ cảnh bổ sung từ form người dùng:
- Nếu extraContext có productDescription, designType, targetAudience, preferredStyle, preferredColors, budget, deadline hoặc channel, hãy dùng chúng để tăng độ chính xác.
- Nếu ảnh và extraContext mâu thuẫn, ghi mâu thuẫn đó vào missing_or_uncertain_points.
- Nếu người dùng đã nói rõ ngành/đối tượng/phong cách, không phủ định tùy tiện chỉ vì ảnh không thể hiện đủ.

Output bắt buộc là JSON hợp lệ đúng schema.

${buildJsonOnlyInstruction(schemaDescription)}
`);

  const userInput = {
    imageUrl: input.imageUrl,
    extraContext: input.extraContext ?? {},
  };

  const aiInput = [
    "Phân tích ảnh này cho AI Visual Intake của DesignMatch AI.",
    "",
    "Mục tiêu: biến tín hiệu thị giác trong ảnh thành dữ liệu để tạo brief, concept direction, risk scan và matching designer.",
    "",
    "Ngữ cảnh bổ sung từ người dùng nếu có:",
    stringifyForAI(input.extraContext ?? {}),
  ].join("\n");

  let normalizedResult: AIVisualIntakeResult;
  let provider = "fallback";
  let model = "local-deterministic-visual-intake";
  let task = "ai_visual_intake";
  let usage: unknown = null;
  let aiModelRunId: string | null = null;
  let usedFallback = false;
  let fallbackReason: string | null = null;

  try {
    const aiResult = await runAIVisionJson<Record<string, JsonValue>>({
      task: "ai_visual_intake",
      instructions,
      input: aiInput,
      imageUrl: input.imageUrl,
      maxOutputTokens: 2200,
      jsonLabel: "AI Visual Intake JSON",
      runContext: {
        purpose: "vision",
        promptVersion: VISUAL_INTAKE_PROMPT_VERSION,
        userInput,
        relatedRequestId: input.designRequestId ?? null,
        relatedCustomerProfileId: input.customerProfileId ?? null,
      },
    });

    normalizedResult = normalizeVisualIntakeJson(aiResult.json);
    provider = aiResult.provider;
    model = aiResult.model;
    task = aiResult.task;
    usage = aiResult.usage;
    aiModelRunId = aiResult.aiModelRunId ?? null;
  } catch (error) {
    usedFallback = true;
    fallbackReason = getVisualIntakeFailureMessage(error);

    console.warn(
      "[DesignMatch AI] AI Visual Intake failed. Using fallback visual intake.",
      fallbackReason,
    );

    normalizedResult = buildFallbackVisualIntakeResult(input, fallbackReason);
  }

  const savedVisualIntakeId = await saveAIVisualIntake({
    input,
    result: normalizedResult,
    aiModelRunId,
  });

  return {
    provider,
    model,
    task,
    usage,
    aiModelRunId,
    savedVisualIntakeId,
    fallback: usedFallback,
    fallbackReason,
    result: normalizedResult,
  };
}