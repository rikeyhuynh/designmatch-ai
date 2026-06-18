export type JobChatDesignFilterResult = {
  isDesignRelated: boolean;
  category:
    | "brief_clarification"
    | "visual_direction"
    | "design_feedback"
    | "deliverable"
    | "file_or_asset"
    | "deadline_or_revision"
    | "technical_requirement"
    | "scope_warning"
    | "irrelevant"
    | "unsafe"
    | "unknown";
  confidence: number;
  reason: string;
  warningMessage: string | null;
};

type JobChatDesignFilterInput = {
  message: string;
  jobTitle?: string;
  briefContext?: string;
};

const BLOCK_WARNING_MESSAGE =
  "Vui lòng chỉ trao đổi các thông tin liên quan đến thiết kế, brief, feedback, file bàn giao, deadline hoặc yêu cầu làm rõ trong dự án này.";

const DESIGN_ALLOWED_CATEGORIES = [
  "brief_clarification",
  "visual_direction",
  "design_feedback",
  "deliverable",
  "file_or_asset",
  "deadline_or_revision",
  "technical_requirement",
  "scope_warning",
] as const;

export async function classifyJobChatDesignRelevance({
  message,
  jobTitle,
  briefContext,
}: JobChatDesignFilterInput): Promise<JobChatDesignFilterResult> {
  const cleanedMessage = message.trim();

  if (!cleanedMessage) {
    return blockedResult("Tin nhắn rỗng hoặc không có nội dung.");
  }

  const heuristicResult = classifyByHeuristic(cleanedMessage);

  if (heuristicResult.confidence >= 85) {
    return heuristicResult;
  }

  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    "";

  if (!apiKey) {
    return heuristicResult;
  }

  try {
    const model =
      process.env.GEMINI_JOB_CHAT_FILTER_MODEL ?? "gemini-1.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
                  text: buildPrompt({
                    message: cleanedMessage,
                    jobTitle,
                    briefContext,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.4,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      return heuristicResult;
    }

    const data = await response.json();
    const rawText = String(
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    );

    const parsed = parseJsonObject(rawText);
    const isDesignRelated = Boolean(parsed.is_design_related);
    const category = normalizeCategory(parsed.category);
    const confidence = clampConfidence(Number(parsed.confidence ?? 0));
    const reason = stringValue(parsed.reason);

    if (
      isDesignRelated &&
      DESIGN_ALLOWED_CATEGORIES.includes(category as any)
    ) {
      return {
        isDesignRelated: true,
        category: category as JobChatDesignFilterResult["category"],
        confidence: confidence || 80,
        reason:
          reason ||
          "Tin nhắn liên quan đến brief, thiết kế, feedback hoặc yêu cầu làm rõ trong job.",
        warningMessage: null,
      };
    }

    return {
      isDesignRelated: false,
      category: category === "unsafe" ? "unsafe" : "irrelevant",
      confidence: confidence || 80,
      reason:
        reason ||
        "Tin nhắn không liên quan trực tiếp đến thiết kế hoặc phạm vi job.",
      warningMessage: BLOCK_WARNING_MESSAGE,
    };
  } catch {
    return heuristicResult;
  }
}

function buildPrompt({
  message,
  jobTitle,
  briefContext,
}: {
  message: string;
  jobTitle?: string;
  briefContext?: string;
}) {
  return `
Bạn là AI kiểm duyệt chat trong nền tảng DesignMatch AI.

Nhiệm vụ:
Phân loại tin nhắn giữa customer và designer xem có liên quan trực tiếp đến công việc thiết kế trong job hay không.

CHỈ CHO PHÉP nếu tin nhắn thuộc một trong các nhóm:
1. Làm rõ brief thiết kế.
2. Làm rõ nội dung, thông điệp, đối tượng khách hàng, brand/product.
3. Góp ý thiết kế: màu sắc, typography, layout, hình ảnh, bố cục, phong cách.
4. Bàn về file thiết kế, file bàn giao, format, kích thước, ảnh, logo, tài nguyên thiết kế.
5. Bàn về deadline, vòng sửa, tiến độ liên quan trực tiếp đến job thiết kế.
6. Cảnh báo yêu cầu mới có thể lệch brief hoặc vượt scope.

CHẶN nếu tin nhắn:
- Nói chuyện riêng không liên quan đến dự án.
- Xin số điện thoại/Zalo/Facebook để trao đổi ngoài nền tảng.
- Trao đổi thanh toán ngoài nền tảng, chuyển khoản riêng, giảm giá riêng.
- Nội dung tán gẫu, hẹn gặp cá nhân, ăn uống, chuyện đời tư.
- Nội dung chính trị, cờ bạc, vay tiền, tuyển dụng ngoài job, spam.
- Nội dung không giúp làm rõ hoặc thực hiện thiết kế.

Job title: ${jobTitle || "Không có"}
Brief context: ${briefContext || "Không có"}

Tin nhắn cần kiểm tra:
"""${message}"""

Trả về JSON duy nhất:
{
  "is_design_related": true | false,
  "category": "brief_clarification" | "visual_direction" | "design_feedback" | "deliverable" | "file_or_asset" | "deadline_or_revision" | "technical_requirement" | "scope_warning" | "irrelevant" | "unsafe" | "unknown",
  "confidence": 0-100,
  "reason": "lý do ngắn bằng tiếng Việt"
}
`.trim();
}

function classifyByHeuristic(message: string): JobChatDesignFilterResult {
  const normalized = normalizeText(message);

  const hardBlockKeywords = [
    "zalo",
    "facebook",
    "messenger",
    "instagram",
    "so dien thoai",
    "sdt",
    "phone",
    "goi rieng",
    "nhan tin rieng",
    "gap rieng",
    "chuyen khoan rieng",
    "thanh toan rieng",
    "tra ngoai",
    "khong qua nen tang",
    "an com",
    "di nhau",
    "di choi",
    "hen ho",
    "vay tien",
    "cho vay",
    "ca do",
    "casino",
    "co bac",
  ];

  if (hardBlockKeywords.some((keyword) => normalized.includes(keyword))) {
    return blockedResult(
      "Tin nhắn có dấu hiệu trao đổi ngoài phạm vi thiết kế hoặc ngoài nền tảng.",
      "unsafe",
      95,
    );
  }

  const designKeywords = [
    "brief",
    "thiet ke",
    "design",
    "logo",
    "brand",
    "branding",
    "poster",
    "banner",
    "social",
    "layout",
    "bo cuc",
    "mau",
    "color",
    "font",
    "typography",
    "chu",
    "headline",
    "hinh anh",
    "image",
    "visual",
    "mood",
    "tone",
    "style",
    "phong cach",
    "feedback",
    "sua",
    "chinh",
    "draft",
    "final",
    "file",
    "mockup",
    "png",
    "jpg",
    "pdf",
    "ai",
    "psd",
    "figma",
    "kich thuoc",
    "size",
    "deadline",
    "tien do",
    "ban giao",
    "noi dung",
    "thong diep",
    "target",
    "doi tuong",
    "in an",
    "print",
    "web",
    "ui",
    "ux",
  ];

  if (designKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      isDesignRelated: true,
      category: inferAllowedCategory(normalized),
      confidence: 88,
      reason:
        "Tin nhắn có nội dung liên quan đến brief, thiết kế, feedback, file hoặc tiến độ của job.",
      warningMessage: null,
    };
  }

  if (message.length <= 12) {
    return {
      isDesignRelated: true,
      category: "unknown",
      confidence: 45,
      reason:
        "Tin nhắn ngắn, chưa đủ ngữ cảnh; tạm cho phép để tránh chặn nhầm phản hồi ngắn.",
      warningMessage: null,
    };
  }

  return blockedResult(
    "Tin nhắn không có dấu hiệu liên quan trực tiếp đến thiết kế hoặc job hiện tại.",
    "irrelevant",
    75,
  );
}

function inferAllowedCategory(
  normalized: string,
): JobChatDesignFilterResult["category"] {
  if (
    normalized.includes("feedback") ||
    normalized.includes("sua") ||
    normalized.includes("chinh") ||
    normalized.includes("draft") ||
    normalized.includes("ban nhap")
  ) {
    return "design_feedback";
  }

  if (
    normalized.includes("file") ||
    normalized.includes("png") ||
    normalized.includes("jpg") ||
    normalized.includes("pdf") ||
    normalized.includes("figma") ||
    normalized.includes("mockup")
  ) {
    return "file_or_asset";
  }

  if (
    normalized.includes("deadline") ||
    normalized.includes("tien do") ||
    normalized.includes("ban giao") ||
    normalized.includes("ngay")
  ) {
    return "deadline_or_revision";
  }

  if (
    normalized.includes("mau") ||
    normalized.includes("font") ||
    normalized.includes("typography") ||
    normalized.includes("layout") ||
    normalized.includes("bo cuc") ||
    normalized.includes("visual") ||
    normalized.includes("style")
  ) {
    return "visual_direction";
  }

  if (
    normalized.includes("brief") ||
    normalized.includes("noi dung") ||
    normalized.includes("thong diep") ||
    normalized.includes("doi tuong") ||
    normalized.includes("target")
  ) {
    return "brief_clarification";
  }

  return "unknown";
}

function blockedResult(
  reason: string,
  category: JobChatDesignFilterResult["category"] = "irrelevant",
  confidence = 90,
): JobChatDesignFilterResult {
  return {
    isDesignRelated: false,
    category,
    confidence,
    reason,
    warningMessage: BLOCK_WARNING_MESSAGE,
  };
}

function parseJsonObject(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return {};
    }

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

function normalizeCategory(value: unknown): JobChatDesignFilterResult["category"] {
  const category = stringValue(value);

  const validCategories: JobChatDesignFilterResult["category"][] = [
    "brief_clarification",
    "visual_direction",
    "design_feedback",
    "deliverable",
    "file_or_asset",
    "deadline_or_revision",
    "technical_requirement",
    "scope_warning",
    "irrelevant",
    "unsafe",
    "unknown",
  ];

  if (validCategories.includes(category as JobChatDesignFilterResult["category"])) {
    return category as JobChatDesignFilterResult["category"];
  }

  return "unknown";
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}