import type {
  BusinessIndustry,
  DesignCategory,
  VisualStyle,
} from "@/types/domain";
import {
  getCategoryLabel,
  getIndustryLabel,
  getStyleLabel,
} from "@/lib/domain/labels";

export type MockBriefInput = {
  title: string;
  business_name: string;
  industry: BusinessIndustry;
  category: DesignCategory;
  description: string;
  target_audience: string | null;
  budget_min_vnd: number;
  budget_max_vnd: number;
  deadline: string | null;
  preferred_styles: VisualStyle[];
};

export type MockBriefOutput = {
  objective: string;
  visual_direction: string;
  key_message: string;
  deliverables: string[];
  recommended_styles: VisualStyle[];
  risk_level: "low" | "medium" | "high";
  risk_notes: string[];
  brief_completeness_score: number;
  raw_ai_output: {
    source: "mock-brief-builder";
    generated_at: string;
    input_summary: string;
    reasoning: string[];
  };
};

const deliverablesByCategory: Record<DesignCategory, string[]> = {
  social_post: [
    "01 thiết kế social post",
    "01 caption gợi ý",
    "File PNG/JPG đăng mạng xã hội",
  ],
  poster: [
    "01 poster chính",
    "01 phiên bản story",
    "01 phiên bản square post",
    "File PNG/JPG sẵn sàng đăng tải",
  ],
  logo: [
    "01 logo concept chính",
    "01 phiên bản đơn sắc",
    "01 phiên bản nền sáng/nền tối",
  ],
  brand_identity: [
    "01 moodboard thương hiệu",
    "01 logo direction",
    "01 bộ màu và font gợi ý",
    "01 guideline mini",
  ],
  menu: [
    "01 thiết kế menu chính",
    "01 phiên bản in ấn",
    "01 phiên bản digital",
  ],
  banner: [
    "01 banner chính",
    "01 phiên bản desktop",
    "01 phiên bản mobile",
  ],
  packaging: [
    "01 concept packaging",
    "01 mockup trình bày",
    "01 file trình bày ý tưởng",
  ],
};

export function buildMockAiBrief(input: MockBriefInput): MockBriefOutput {
  const industryLabel = getIndustryLabel(input.industry);
  const categoryLabel = getCategoryLabel(input.category);
  const styleLabels = input.preferred_styles.map(getStyleLabel);

  const recommendedStyles =
    input.preferred_styles.length > 0
      ? input.preferred_styles
      : (["minimal", "local_warm"] satisfies VisualStyle[]);

  const riskNotes: string[] = [];

  if (!input.target_audience) {
    riskNotes.push("Chưa mô tả rõ đối tượng khách hàng mục tiêu.");
  }

  if (!input.deadline) {
    riskNotes.push("Chưa có deadline cụ thể để designer ước lượng tiến độ.");
  }

  if (input.description.length < 80) {
    riskNotes.push("Mô tả nhu cầu còn ngắn, dễ khiến designer hiểu thiếu ngữ cảnh.");
  }

  if (input.budget_max_vnd < 500000) {
    riskNotes.push("Ngân sách khá thấp, nên giới hạn phạm vi thiết kế để đảm bảo chất lượng.");
  }

  if (riskNotes.length === 0) {
    riskNotes.push("Brief tương đối đầy đủ, có thể chuyển sang bước matching designer.");
  }

  const score = calculateCompletenessScore(input);
  const riskLevel = score >= 80 ? "low" : score >= 55 ? "medium" : "high";

  const styleDirection =
    styleLabels.length > 0
      ? styleLabels.join(", ")
      : "sạch, rõ ràng, dễ ứng dụng";

  return {
    objective: `Tạo ${categoryLabel.toLowerCase()} cho ${input.business_name} nhằm truyền tải thông điệp rõ ràng, phù hợp ngành ${industryLabel} và thu hút đúng nhóm khách hàng mục tiêu.`,
    visual_direction: `Định hướng thị giác nên đi theo phong cách ${styleDirection}. Bố cục cần rõ điểm nhấn, ưu tiên nhận diện thương hiệu, headline dễ đọc và cảm giác phù hợp với nhóm khách hàng của ${input.business_name}.`,
    key_message: `${input.business_name} cần một thiết kế ${categoryLabel.toLowerCase()} nổi bật, dễ hiểu, có khả năng thu hút khách hàng và tạo cảm giác chuyên nghiệp ngay từ lần nhìn đầu tiên.`,
    deliverables: deliverablesByCategory[input.category],
    recommended_styles: recommendedStyles,
    risk_level: riskLevel,
    risk_notes: riskNotes,
    brief_completeness_score: score,
    raw_ai_output: {
      source: "mock-brief-builder",
      generated_at: new Date().toISOString(),
      input_summary: `${input.title} · ${input.business_name} · ${industryLabel} · ${categoryLabel}`,
      reasoning: [
        "Phân tích ngành hàng, loại thiết kế và mô tả nhu cầu.",
        "Đánh giá độ đầy đủ của brief theo audience, deadline, budget và description.",
        "Tạo visual direction dựa trên preferred styles.",
        "Sinh deliverables phù hợp với design category.",
      ],
    },
  };
}

function calculateCompletenessScore(input: MockBriefInput) {
  let score = 35;

  if (input.title) score += 8;
  if (input.business_name) score += 8;
  if (input.description.length >= 80) score += 18;
  if (input.target_audience) score += 12;
  if (input.deadline) score += 8;
  if (input.budget_min_vnd > 0 && input.budget_max_vnd > 0) score += 7;
  if (input.preferred_styles.length > 0) score += 12;

  return Math.min(score, 100);
}