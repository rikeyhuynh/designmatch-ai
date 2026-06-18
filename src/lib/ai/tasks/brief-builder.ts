import "server-only";

import { createClient } from "@supabase/supabase-js";

import { buildJsonOnlyInstruction, stringifyForAI } from "@/lib/ai/json";
import { runAIJson } from "@/lib/ai/provider";
import { buildCreativeIntelligenceInstructions } from "@/lib/ai/prompts/creative-intelligence";
import type { JsonValue } from "@/lib/ai/types";
import { buildPackageBriefContext } from "@/lib/pricing/brief-requirements";
import {
  getPriceDetailLevel,
  getServicePackageByCode,
} from "@/lib/pricing/service-packages";

const BRIEF_BUILDER_PROMPT_VERSION =
  "ai-brief-builder-creative-strategy-v3";

export type AIBriefBuilderPricingPackage = {
  pricingTier?: string | null;
  packageCode?: string | null;
  packageName?: string | null;
  packageType?: string | null;
  packageScopeNote?: string | null;
  packagePriceMinVnd?: number | null;
  packagePriceMaxVnd?: number | null;
  selectedPriceVnd?: number | null;
  priceDetailLevel?: string | null;
  priceDetailDescription?: string | null;
  revisionLimit?: number | null;
  deliverableLimit?: number | null;
};

export type AIBriefBuilderInput = {
  designRequestId?: string | null;
  customerProfileId?: string | null;
  title?: string | null;
  productDescription?: string | null;
  designType?: string | null;
  targetAudience?: string | null;
  preferredStyle?: string | null;
  preferredColors?: string | null;
  budget?: string | null;
  deadline?: string | null;
  channel?: string | null;
  businessName?: string | null;
  businessLocation?: string | null;
  visualIntakeResult?: Record<string, unknown> | null;
  pricingPackage?: AIBriefBuilderPricingPackage | null;
};

export type AIBriefProductSpecificSection = {
  section_title: string;
  requirements: string[];
};

export type AIBriefBuilderResult = {
  brief: {
    project_title: string;
    business_context: string;
    design_objective: string;
    target_audience: string;
    key_message: string;
    deliverables: string[];
    package_scope: {
      package_name: string;
      package_type: string;
      pricing_tier: string;
      selected_price: string;
      price_level: string;
      scope_summary: string;
      revision_limit: string;
      deliverable_limit: string;
    };
    product_specific_requirements: AIBriefProductSpecificSection[];
    visual_direction: {
      mood: string[];
      style_tags: string[];
      color_direction: string[];
      typography_direction: string;
      layout_direction: string;
      image_direction: string;
    };
    layout_hierarchy: {
      priority_order: string[];
      composition_notes: string;
      readability_notes: string;
      print_or_platform_notes: string;
    };
    content_requirements: string[];
    technical_requirements: string[];
    references_to_collect: string[];
    acceptance_checklist: string[];
    out_of_scope_items: string[];
    designer_notes: string;
  };
  risk_report: {
    risk_score: number;
    risk_level: "low" | "medium" | "high";
    risk_summary: string;
    missing_information: string[];
    unclear_points: string[];
    scope_creep_risks: string[];
    budget_timeline_risks: string[];
    recommended_questions: string[];
  };
  matching_hints: {
    preferred_designer_styles: string[];
    designer_experience_needed: string[];
    avoid_designer_profiles: string[];
    matching_keywords: string[];
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

function normalizeScore(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 50;
  }

  if (value >= 0 && value <= 1) {
    return Math.max(0, Math.min(100, Math.round(value * 100)));
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeStringArray(value: unknown, limit = 40) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeRiskLevel(value: unknown): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function getObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function normalizeProductSpecificRequirements(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = getObject(item);

      return {
        section_title: normalizeString(
          record.section_title,
          "Yêu cầu thiết kế",
        ),
        requirements: normalizeStringArray(record.requirements, 12),
      };
    })
    .filter((item) => item.requirements.length > 0)
    .slice(0, 10);
}

function normalizeBriefBuilderJson(
  value: Record<string, JsonValue>,
): AIBriefBuilderResult {
  const brief = getObject(value.brief);
  const packageScope = getObject(brief.package_scope);
  const visualDirection = getObject(brief.visual_direction);
  const layoutHierarchy = getObject(brief.layout_hierarchy);
  const riskReport = getObject(value.risk_report);
  const matchingHints = getObject(value.matching_hints);

  return {
    brief: {
      project_title: normalizeString(
        brief.project_title,
        "Brief thiết kế mới",
      ),
      business_context: normalizeString(
        brief.business_context,
        "Chưa đủ thông tin về bối cảnh kinh doanh.",
      ),
      design_objective: normalizeString(
        brief.design_objective,
        "Làm rõ mục tiêu thiết kế và định hướng truyền thông.",
      ),
      target_audience: normalizeString(
        brief.target_audience,
        "Chưa xác định rõ đối tượng khách hàng.",
      ),
      key_message: normalizeString(
        brief.key_message,
        "Thông điệp chính cần được làm rõ.",
      ),
      deliverables: normalizeStringArray(brief.deliverables, 12),
      package_scope: {
        package_name: normalizeString(
          packageScope.package_name,
          "Chưa xác định gói dịch vụ.",
        ),
        package_type: normalizeString(
          packageScope.package_type,
          "Chưa xác định loại gói.",
        ),
        pricing_tier: normalizeString(
          packageScope.pricing_tier,
          "Chưa xác định tầng dịch vụ.",
        ),
        selected_price: normalizeString(
          packageScope.selected_price,
          "Chưa xác định giá.",
        ),
        price_level: normalizeString(
          packageScope.price_level,
          "Chưa xác định mức độ chi tiết.",
        ),
        scope_summary: normalizeString(
          packageScope.scope_summary,
          "Cần bám sát phạm vi một ấn phẩm đơn lẻ.",
        ),
        revision_limit: normalizeString(
          packageScope.revision_limit,
          "Theo giới hạn của gói.",
        ),
        deliverable_limit: normalizeString(
          packageScope.deliverable_limit,
          "Một ấn phẩm đơn lẻ.",
        ),
      },
      product_specific_requirements: normalizeProductSpecificRequirements(
        brief.product_specific_requirements,
      ),
      visual_direction: {
        mood: normalizeStringArray(visualDirection.mood, 16),
        style_tags: normalizeStringArray(visualDirection.style_tags, 16),
        color_direction: normalizeStringArray(
          visualDirection.color_direction,
          16,
        ),
        typography_direction: normalizeString(
          visualDirection.typography_direction,
          "Typography cần rõ ràng, dễ đọc, phù hợp kênh truyền thông.",
        ),
        layout_direction: normalizeString(
          visualDirection.layout_direction,
          "Bố cục cần ưu tiên thông tin chính và CTA.",
        ),
        image_direction: normalizeString(
          visualDirection.image_direction,
          "Hình ảnh cần làm nổi bật sản phẩm/dịch vụ chính.",
        ),
      },
      layout_hierarchy: {
        priority_order: normalizeStringArray(
          layoutHierarchy.priority_order,
          12,
        ),
        composition_notes: normalizeString(
          layoutHierarchy.composition_notes,
          "Bố cục cần rõ ràng, ưu tiên nội dung quan trọng nhất.",
        ),
        readability_notes: normalizeString(
          layoutHierarchy.readability_notes,
          "Thông tin cần dễ đọc trên kênh sử dụng chính.",
        ),
        print_or_platform_notes: normalizeString(
          layoutHierarchy.print_or_platform_notes,
          "Cần tối ưu theo kênh sử dụng hoặc in ấn nếu có.",
        ),
      },
      content_requirements: normalizeStringArray(
        brief.content_requirements,
        40,
      ),
      technical_requirements: normalizeStringArray(
        brief.technical_requirements,
        40,
      ),
      references_to_collect: normalizeStringArray(
        brief.references_to_collect,
        24,
      ),
      acceptance_checklist: normalizeStringArray(
        brief.acceptance_checklist,
        24,
      ),
      out_of_scope_items: normalizeStringArray(brief.out_of_scope_items, 24),
      designer_notes: "",
    },
    risk_report: {
      risk_score: normalizeScore(riskReport.risk_score),
      risk_level: normalizeRiskLevel(riskReport.risk_level),
      risk_summary: normalizeString(
        riskReport.risk_summary,
        "Brief còn một số điểm cần làm rõ trước khi bắt đầu thiết kế.",
      ),
      missing_information: normalizeStringArray(
        riskReport.missing_information,
        24,
      ),
      unclear_points: normalizeStringArray(riskReport.unclear_points, 24),
      scope_creep_risks: normalizeStringArray(
        riskReport.scope_creep_risks,
        24,
      ),
      budget_timeline_risks: normalizeStringArray(
        riskReport.budget_timeline_risks,
        24,
      ),
      recommended_questions: normalizeStringArray(
        riskReport.recommended_questions,
        24,
      ),
    },
    matching_hints: {
      preferred_designer_styles: normalizeStringArray(
        matchingHints.preferred_designer_styles,
        24,
      ),
      designer_experience_needed: normalizeStringArray(
        matchingHints.designer_experience_needed,
        24,
      ),
      avoid_designer_profiles: normalizeStringArray(
        matchingHints.avoid_designer_profiles,
        24,
      ),
      matching_keywords: normalizeStringArray(
        matchingHints.matching_keywords,
        32,
      ),
    },
  };
}

function buildVisualDirectionText(result: AIBriefBuilderResult) {
  const direction = result.brief.visual_direction;

  return [
    `Mood: ${direction.mood.join(", ") || "Chưa xác định"}`,
    `Style: ${direction.style_tags.join(", ") || "Chưa xác định"}`,
    `Màu sắc: ${direction.color_direction.join(", ") || "Chưa xác định"}`,
    `Typography: ${direction.typography_direction}`,
    `Bố cục: ${direction.layout_direction}`,
    `Hình ảnh: ${direction.image_direction}`,
  ].join("\n");
}

function buildRiskNotes(result: AIBriefBuilderResult) {
  const risk = result.risk_report;

  return [
    ...risk.missing_information.map((item) => `Thiếu thông tin: ${item}`),
    ...risk.unclear_points.map((item) => `Chưa rõ: ${item}`),
    ...risk.scope_creep_risks.map((item) => `Scope creep: ${item}`),
    ...risk.budget_timeline_risks.map(
      (item) => `Ngân sách/thời gian: ${item}`,
    ),
  ].slice(0, 32);
}

function buildProductSpecificText(result: AIBriefBuilderResult) {
  const sections = result.brief.product_specific_requirements;

  if (sections.length === 0) {
    return "Chưa có yêu cầu riêng theo loại ấn phẩm.";
  }

  return sections
    .map((section) =>
      [
        `${section.section_title}:`,
        ...section.requirements.map((item) => `- ${item}`),
      ].join("\n"),
    )
    .join("\n\n");
}

function buildLayoutHierarchyText(result: AIBriefBuilderResult) {
  const layout = result.brief.layout_hierarchy;

  return [
    "Thứ tự ưu tiên thông tin:",
    ...layout.priority_order.map((item) => `- ${item}`),
    "",
    `Ghi chú bố cục: ${layout.composition_notes}`,
    `Ghi chú khả năng đọc: ${layout.readability_notes}`,
    `Ghi chú kênh/in ấn: ${layout.print_or_platform_notes}`,
  ].join("\n");
}

function buildBriefPlainText(result: AIBriefBuilderResult) {
  const brief = result.brief;
  const risk = result.risk_report;

  return [
    `Tên dự án: ${brief.project_title}`,
    "",
    "1. Bối cảnh kinh doanh",
    brief.business_context,
    "",
    "2. Mục tiêu thiết kế",
    brief.design_objective,
    "",
    "3. Đối tượng mục tiêu",
    brief.target_audience,
    "",
    "4. Thông điệp chính",
    brief.key_message,
    "",
    "5. Phạm vi gói dịch vụ",
    `- Gói: ${brief.package_scope.package_name}`,
    `- Loại gói: ${brief.package_scope.package_type}`,
    `- Tầng dịch vụ: ${brief.package_scope.pricing_tier}`,
    `- Giá dự kiến: ${brief.package_scope.selected_price}`,
    `- Mức độ chi tiết: ${brief.package_scope.price_level}`,
    `- Phạm vi: ${brief.package_scope.scope_summary}`,
    `- Vòng sửa: ${brief.package_scope.revision_limit}`,
    `- Bàn giao: ${brief.package_scope.deliverable_limit}`,
    "",
    "6. Deliverables",
    ...brief.deliverables.map((item) => `- ${item}`),
    "",
    "7. Yêu cầu riêng theo loại ấn phẩm",
    buildProductSpecificText(result),
    "",
    "8. Định hướng thị giác",
    buildVisualDirectionText(result),
    "",
    "9. Layout & hierarchy",
    buildLayoutHierarchyText(result),
    "",
    "10. Yêu cầu nội dung",
    ...brief.content_requirements.map((item) => `- ${item}`),
    "",
    "11. Yêu cầu kỹ thuật",
    ...brief.technical_requirements.map((item) => `- ${item}`),
    "",
    "12. Tài liệu cần thu thập",
    ...brief.references_to_collect.map((item) => `- ${item}`),
    "",
    "13. Checklist nghiệm thu",
    ...brief.acceptance_checklist.map((item) => `- ${item}`),
    "",
    "14. Ngoài phạm vi gói",
    ...brief.out_of_scope_items.map((item) => `- ${item}`),
    "",
    "15. Ghi chú cho designer",
    brief.designer_notes,
    "",
    "Risk report:",
    `- Risk score: ${risk.risk_score}`,
    `- Risk level: ${risk.risk_level}`,
    `- Summary: ${risk.risk_summary}`,
  ].join("\n");
}

function getBriefCompletenessScore(result: AIBriefBuilderResult) {
  return Math.max(0, Math.min(100, 100 - result.risk_report.risk_score));
}

function buildPricingGuidance(input: AIBriefBuilderInput) {
  const pricingPackage = input.pricingPackage;
  const packageCode = pricingPackage?.packageCode ?? null;
  const servicePackage = packageCode
    ? getServicePackageByCode(packageCode)
    : null;

  if (!servicePackage) {
    return [
      "Chưa có packageCode hợp lệ.",
      "Hãy vẫn tạo brief chi tiết cho một ấn phẩm thiết kế đơn lẻ.",
      "Không được mở rộng thành bộ sản phẩm, monthly package hoặc team booking.",
    ].join("\n");
  }

  const selectedPriceVnd =
    typeof pricingPackage?.selectedPriceVnd === "number"
      ? pricingPackage.selectedPriceVnd
      : servicePackage.suggestedPriceVnd;

  const packageBriefContext = buildPackageBriefContext({
    servicePackage,
    selectedPriceVnd,
  });

  const priceDetail = getPriceDetailLevel({
    selectedPriceVnd,
    priceMinVnd: servicePackage.priceMinVnd,
    priceMaxVnd: servicePackage.priceMaxVnd,
  });

  return [
    "PACKAGE CONTEXT:",
    packageBriefContext.packageSummary,
    "",
    "PRODUCT-SPECIFIC BRIEF RULES:",
    packageBriefContext.productSpecificBriefRules,
    "",
    "PRICE-BASED BRIEF RULES:",
    packageBriefContext.priceBasedBriefRules,
    "",
    "PRICE DETAIL SIGNAL:",
    `- Level: ${priceDetail.level}`,
    `- Label: ${priceDetail.label}`,
    `- Description: ${priceDetail.description}`,
    "",
    "QUY TẮC BẮT BUỘC:",
    "- Giá thấp nhất trong khoảng gói vẫn phải tạo brief rõ ràng, đủ để designer làm được.",
    "- Giá cao hơn không có nghĩa là mở rộng thành nhiều ấn phẩm; chỉ làm brief kỹ hơn, yêu cầu rõ hơn, tiêu chí nghiệm thu chặt hơn trong phạm vi một ấn phẩm.",
    "- Không tự thêm deliverable ngoài gói.",
    "- Không biến request đơn lẻ thành campaign, bộ sản phẩm, monthly package hoặc team booking.",
  ].join("\n");
}

function getBriefBuilderFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "AI Brief Builder không trả về JSON hợp lệ.";
}

function formatFallbackVnd(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Chưa xác định";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function splitTextToList(value?: string | null, limit = 10) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;\n|\/]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function getFallbackRiskLevel(score: number): "low" | "medium" | "high" {
  if (score <= 35) return "low";
  if (score <= 70) return "medium";
  return "high";
}

function buildFallbackPackageScope(input: AIBriefBuilderInput) {
  const pricingPackage = input.pricingPackage;

  const selectedPrice =
    typeof pricingPackage?.selectedPriceVnd === "number"
      ? formatFallbackVnd(pricingPackage.selectedPriceVnd)
      : typeof pricingPackage?.packagePriceMinVnd === "number" &&
          typeof pricingPackage?.packagePriceMaxVnd === "number"
        ? `${formatFallbackVnd(
            pricingPackage.packagePriceMinVnd,
          )} - ${formatFallbackVnd(pricingPackage.packagePriceMaxVnd)}`
        : input.budget || "Chưa xác định";

  return {
    package_name:
      pricingPackage?.packageName || input.designType || "Gói thiết kế đơn lẻ",
    package_type: pricingPackage?.packageType || "single_design_request",
    pricing_tier: pricingPackage?.pricingTier || "standard",
    selected_price: selectedPrice,
    price_level:
      pricingPackage?.priceDetailLevel ||
      pricingPackage?.priceDetailDescription ||
      "standard",
    scope_summary:
      pricingPackage?.packageScopeNote ||
      "Tập trung vào một ấn phẩm thiết kế chính theo yêu cầu đã nhập, không tự mở rộng thành chiến dịch nhiều ấn phẩm.",
    revision_limit:
      typeof pricingPackage?.revisionLimit === "number"
        ? `${pricingPackage.revisionLimit} vòng chỉnh sửa`
        : "Theo giới hạn của gói đã chọn",
    deliverable_limit:
      typeof pricingPackage?.deliverableLimit === "number"
        ? `${pricingPackage.deliverableLimit} deliverable`
        : "01 thiết kế chính",
  };
}

function buildFallbackProductSpecificRequirements(
  input: AIBriefBuilderInput,
): AIBriefProductSpecificSection[] {
  const designType = `${input.designType ?? ""} ${
    input.pricingPackage?.packageName ?? ""
  }`.toLowerCase();

  if (designType.includes("logo")) {
    return [
      {
        section_title: "Yêu cầu cho logo",
        requirements: [
          "Làm rõ tên thương hiệu cần xuất hiện trong logo.",
          "Xác định cảm giác thương hiệu cần truyền tải: thân thiện, cao cấp, trẻ trung, tối giản hoặc thủ công.",
          "Chuẩn bị ví dụ logo thích và không thích để designer tránh lệch gu.",
          "Ưu tiên logo dễ nhận diện khi dùng trên avatar, bảng hiệu nhỏ hoặc social media.",
        ],
      },
    ];
  }

  if (designType.includes("menu")) {
    return [
      {
        section_title: "Yêu cầu cho menu",
        requirements: [
          "Cần có danh sách món/dịch vụ, giá và nhóm danh mục rõ ràng.",
          "Bố cục phải dễ đọc, không nhồi quá nhiều chữ trong một khu vực.",
          "Ưu tiên phân cấp thông tin: nhóm món, tên món, mô tả ngắn, giá.",
          "Cần xác định menu dùng để in, đăng social hay hiển thị màn hình.",
        ],
      },
    ];
  }

  if (
    designType.includes("poster") ||
    designType.includes("post") ||
    designType.includes("banner") ||
    designType.includes("social")
  ) {
    return [
      {
        section_title: "Yêu cầu cho ấn phẩm truyền thông",
        requirements: [
          "Headline hoặc thông điệp chính cần nổi bật nhất.",
          "CTA cần rõ ràng, dễ thấy và phù hợp kênh đăng.",
          "Hình ảnh sản phẩm/dịch vụ nên là điểm thu hút chính nếu có ảnh.",
          "Bố cục cần đọc nhanh trên mobile, tránh quá nhiều chữ nhỏ.",
          "Cần bổ sung thông tin bắt buộc như thời gian, địa điểm, ưu đãi, hotline hoặc link nếu có.",
        ],
      },
    ];
  }

  if (designType.includes("voucher") || designType.includes("coupon")) {
    return [
      {
        section_title: "Yêu cầu cho voucher",
        requirements: [
          "Ưu đãi chính phải nổi bật và dễ hiểu.",
          "Cần có điều kiện áp dụng, thời hạn, mã ưu đãi hoặc QR nếu có.",
          "Thiết kế phải tạo cảm giác đáng tin cậy, tránh quá rối.",
          "CTA hoặc hướng dẫn sử dụng voucher cần rõ ràng.",
        ],
      },
    ];
  }

  return [
    {
      section_title: "Yêu cầu thiết kế chính",
      requirements: [
        "Làm rõ nội dung bắt buộc cần xuất hiện trên thiết kế.",
        "Ưu tiên thông điệp chính, sản phẩm/dịch vụ chính và CTA.",
        "Bố cục cần dễ đọc, phù hợp kênh sử dụng.",
        "Không tự mở rộng thành nhiều ấn phẩm nếu khách hàng chưa yêu cầu.",
      ],
    },
  ];
}

function buildFallbackBriefBuilderResult(
  input: AIBriefBuilderInput,
  failureReason: string,
): AIBriefBuilderResult {
  const visualIntake = getObject(input.visualIntakeResult);

  const detectedMood = normalizeStringArray(
    visualIntake.detected_mood_tags,
    10,
  );
  const suggestedStyleTags = normalizeStringArray(
    visualIntake.suggested_style_tags,
    10,
  );
  const detectedColors = normalizeStringArray(
    visualIntake.detected_main_colors,
    10,
  );
  const recommendedDesignTypes = normalizeStringArray(
    visualIntake.recommended_design_types,
    8,
  );
  const recommendedChannels = normalizeStringArray(
    visualIntake.recommended_channels,
    8,
  );

  const preferredStyleList = splitTextToList(input.preferredStyle, 10);
  const preferredColorList = splitTextToList(input.preferredColors, 10);

  const businessName =
    input.businessName?.trim() ||
    input.title?.trim() ||
    "Thương hiệu/đơn vị chưa xác định";

  const designType =
    input.designType?.trim() ||
    recommendedDesignTypes[0] ||
    input.pricingPackage?.packageName ||
    "ấn phẩm thiết kế";

  const channel =
    input.channel?.trim() ||
    recommendedChannels[0] ||
    "kênh truyền thông chính chưa xác định";

  const targetAudience =
    input.targetAudience?.trim() ||
    "Nhóm khách hàng mục tiêu chưa được mô tả rõ.";

  const productDescription =
    input.productDescription?.trim() ||
    "Sản phẩm/dịch vụ chưa được mô tả chi tiết.";

  const mood =
    detectedMood.length > 0
      ? detectedMood
      : ["rõ ràng", "dễ đọc", "phù hợp thương hiệu nhỏ"];

  const styleTags =
    suggestedStyleTags.length > 0
      ? suggestedStyleTags
      : preferredStyleList.length > 0
        ? preferredStyleList
        : ["clean_modern", "local_business_friendly"];

  const colorDirection =
    detectedColors.length > 0
      ? detectedColors
      : preferredColorList.length > 0
        ? preferredColorList
        : ["màu chủ đạo cần được khách hàng xác nhận"];

  const missingInformation: string[] = [];

  if (!input.businessName) {
    missingInformation.push("Tên thương hiệu hoặc đơn vị kinh doanh.");
  }

  if (!input.productDescription) {
    missingInformation.push("Mô tả sản phẩm/dịch vụ chi tiết.");
  }

  if (!input.targetAudience) {
    missingInformation.push("Đối tượng khách hàng mục tiêu cụ thể.");
  }

  if (!input.channel) {
    missingInformation.push("Kênh sử dụng chính của thiết kế.");
  }

  if (!input.preferredColors) {
    missingInformation.push("Màu sắc mong muốn hoặc màu thương hiệu.");
  }

  const riskScore = Math.max(
    30,
    Math.min(85, 30 + missingInformation.length * 10),
  );

  const riskLevel = getFallbackRiskLevel(riskScore);

  const keyMessage = input.title
    ? `Truyền tải rõ thông điệp chính của ${input.title}.`
    : "Cần làm rõ thông điệp chính trước khi designer bắt đầu.";

  const projectTitle = `${designType} cho ${businessName}`;

  return {
    brief: {
      project_title: projectTitle,
      business_context: [
        `${businessName} cần một thiết kế phục vụ cho ${channel}.`,
        `Bối cảnh sản phẩm/dịch vụ: ${productDescription}`,
        input.businessLocation
          ? `Khu vực hoạt động: ${input.businessLocation}.`
          : "Khu vực hoạt động chưa được mô tả rõ.",
      ].join(" "),
      design_objective: input.title
        ? `Tạo thiết kế giúp truyền tải rõ nội dung "${input.title}", làm nổi bật sản phẩm/dịch vụ và hỗ trợ khách hàng ra quyết định nhanh hơn.`
        : "Tạo thiết kế rõ ràng, dễ hiểu, có khả năng hỗ trợ truyền thông cho sản phẩm/dịch vụ.",
      target_audience: targetAudience,
      key_message: keyMessage,
      deliverables: [
        `01 thiết kế chính cho ${designType}`,
        `File hình ảnh phù hợp để sử dụng trên ${channel}`,
      ],
      package_scope: buildFallbackPackageScope(input),
      product_specific_requirements:
        buildFallbackProductSpecificRequirements(input),
      visual_direction: {
        mood,
        style_tags: styleTags,
        color_direction: colorDirection,
        typography_direction:
          "Typography cần dễ đọc, phân cấp rõ giữa headline, nội dung phụ và CTA. Không nên dùng quá nhiều font trong cùng một thiết kế.",
        layout_direction:
          "Bố cục nên ưu tiên thông điệp chính, hình ảnh sản phẩm/dịch vụ và CTA. Cần giữ khoảng thở để thiết kế không bị rối.",
        image_direction:
          "Hình ảnh nên làm rõ sản phẩm/dịch vụ chính. Nếu chưa có ảnh chất lượng cao, cần yêu cầu khách hàng bổ sung ảnh, logo hoặc tư liệu tham khảo.",
      },
      layout_hierarchy: {
        priority_order: [
          "Thông điệp chính/headline",
          "Sản phẩm hoặc dịch vụ chính",
          "Lợi ích/ưu đãi hoặc thông tin hỗ trợ",
          "CTA hoặc thông tin liên hệ",
          "Logo/thương hiệu",
        ],
        composition_notes:
          "Thiết kế nên chia bố cục rõ ràng, tránh dàn đều mọi thông tin. Nội dung quan trọng nhất cần nằm ở vùng dễ nhìn đầu tiên.",
        readability_notes:
          "Cần đảm bảo đọc tốt trên mobile hoặc kích thước sử dụng chính. Tránh chữ quá nhỏ, tương phản yếu hoặc nền làm chìm nội dung.",
        print_or_platform_notes: `Tối ưu theo kênh sử dụng: ${channel}. Nếu dùng để in, cần chuẩn bị file chất lượng cao và kiểm tra vùng an toàn.`,
      },
      content_requirements: [
        input.title
          ? `Nội dung chính: ${input.title}`
          : "Cần bổ sung headline hoặc nội dung chính.",
        `Tên thương hiệu/đơn vị: ${businessName}`,
        "CTA hoặc hành động mong muốn từ người xem.",
        "Thông tin liên hệ, địa chỉ, thời gian hoặc ưu đãi nếu có.",
      ],
      technical_requirements: [
        `Tỷ lệ/kích thước cần phù hợp với ${channel}.`,
        "File xuất nên rõ nét, phù hợp đăng tải hoặc in ấn theo nhu cầu.",
        "Cần kiểm tra chính tả, khoảng cách chữ và độ tương phản trước khi bàn giao.",
      ],
      references_to_collect: [
        "Logo hoặc tên thương hiệu chính xác.",
        "Ảnh sản phẩm/dịch vụ chất lượng tốt.",
        "Nội dung chữ bắt buộc xuất hiện trên thiết kế.",
        "Màu thương hiệu hoặc ví dụ màu khách hàng thích.",
        "Mẫu tham khảo thích và không thích nếu có.",
      ],
      acceptance_checklist: [
        "Thông điệp chính đọc được nhanh.",
        "CTA hoặc thông tin quan trọng đủ nổi bật.",
        "Thiết kế đúng mood/style đã thống nhất.",
        "Sản phẩm/dịch vụ chính không bị chìm.",
        "Không thiếu thông tin bắt buộc.",
        "Không có lỗi chính tả.",
      ],
      out_of_scope_items: [
        "Không bao gồm thiết kế thêm nhiều kích thước nếu gói không hỗ trợ.",
        "Không bao gồm thiết kế logo mới nếu request không phải logo.",
        "Không bao gồm chỉnh sửa không giới hạn.",
        "Không mở rộng thành chiến dịch nhiều ấn phẩm nếu khách hàng chưa chọn gói phù hợp.",
      ],
      designer_notes: "",
    },
    risk_report: {
      risk_score: riskScore,
      risk_level: riskLevel,
      risk_summary: `Brief này được tạo bằng fallback nội bộ vì AI không trả JSON hợp lệ. Lý do kỹ thuật: ${failureReason}. Nội dung vẫn đủ để customer review, nhưng nên kiểm tra kỹ các điểm còn thiếu trước khi chốt.`,
      missing_information: missingInformation,
      unclear_points: [
        "Cần xác nhận nội dung chữ cuối cùng sẽ xuất hiện trên thiết kế.",
        "Cần xác nhận màu sắc, logo và ảnh sản phẩm/dịch vụ.",
        "Cần xác nhận kênh sử dụng và kích thước đầu ra chính.",
      ],
      scope_creep_risks: [
        "Khách hàng có thể yêu cầu thêm nhiều phiên bản/kích thước ngoài phạm vi gói.",
        "Nếu chưa có nội dung rõ, designer có thể phải làm thêm phần copywriting ngoài phạm vi.",
      ],
      budget_timeline_risks: [
        input.deadline
          ? `Deadline đã nhập: ${input.deadline}. Cần xác nhận có đủ thời gian để chỉnh sửa.`
          : "Deadline chưa rõ, dễ ảnh hưởng đến kỳ vọng thời gian bàn giao.",
      ],
      recommended_questions: [
        "Thiết kế sẽ dùng chính ở kênh nào?",
        "Có logo, ảnh sản phẩm và nội dung chữ chính thức chưa?",
        "Khách hàng thích hoặc không thích phong cách nào?",
        "CTA chính muốn người xem thực hiện là gì?",
      ],
    },
    matching_hints: {
      preferred_designer_styles: styleTags,
      designer_experience_needed: [
        `Có kinh nghiệm thiết kế ${designType}`,
        "Biết xử lý hierarchy, màu sắc và typography rõ ràng cho thương hiệu nhỏ.",
        "Có portfolio phù hợp với ngành hàng hoặc mood tương tự.",
      ],
      avoid_designer_profiles: [
        "Designer chỉ mạnh về style quá phức tạp nếu brief cần đọc nhanh.",
        "Designer không có portfolio liên quan đến ngành hoặc loại ấn phẩm tương tự.",
      ],
      matching_keywords: [
        businessName,
        designType,
        channel,
        ...mood,
        ...styleTags,
        ...colorDirection,
      ]
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 32),
    },
  };
}

async function saveAIBrief({
  input,
  result,
  aiModelRunId,
}: {
  input: AIBriefBuilderInput;
  result: AIBriefBuilderResult;
  aiModelRunId?: string | null;
}) {
  if (!input.designRequestId) {
    return null;
  }

  const supabase = getSupabaseAIAdminClient();

  if (!supabase) {
    console.warn(
      "[DesignMatch AI] Bỏ qua lưu ai_briefs vì thiếu Supabase admin env.",
    );
    return null;
  }

  const brief = result.brief;
  const risk = result.risk_report;
  const content = buildBriefPlainText(result);
  const visualDirectionText = buildVisualDirectionText(result);
  const riskNotes = buildRiskNotes(result);
  const completenessScore = getBriefCompletenessScore(result);

  const payload = {
    request_id: input.designRequestId,
    objective: brief.design_objective,
    visual_direction: visualDirectionText,
    key_message: brief.key_message,
    deliverables: brief.deliverables,
    risk_level: risk.risk_level,
    risk_notes: riskNotes,
    brief_completeness_score: completenessScore,

    design_request_id: input.designRequestId,
    customer_profile_id: input.customerProfileId ?? null,
    ai_model_run_id: aiModelRunId ?? null,

    project_title: brief.project_title,
    business_context: brief.business_context,
    design_objective: brief.design_objective,
    target_audience: brief.target_audience,

    content_requirements: brief.content_requirements,
    technical_requirements: brief.technical_requirements,
    references_to_collect: brief.references_to_collect,
    designer_notes: brief.designer_notes,

    brief_json: brief,
    generated_brief: brief,
    content,
    summary: brief.design_objective,
    status: "draft",
    prompt_version: BRIEF_BUILDER_PROMPT_VERSION,
    is_user_confirmed: false,
  };

  const { data, error } = await supabase
    .from("ai_briefs")
    .upsert(payload, {
      onConflict: "request_id",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[DesignMatch AI] Không thể lưu ai_briefs:", error);
    return null;
  }

  return typeof data?.id === "string" ? data.id : null;
}

async function saveAIBriefRiskReport({
  input,
  result,
  aiModelRunId,
}: {
  input: AIBriefBuilderInput;
  result: AIBriefBuilderResult;
  aiModelRunId?: string | null;
}) {
  if (!input.designRequestId) {
    return null;
  }

  const supabase = getSupabaseAIAdminClient();

  if (!supabase) {
    console.warn(
      "[DesignMatch AI] Bỏ qua lưu ai_brief_risk_reports vì thiếu Supabase admin env.",
    );
    return null;
  }

  const risk = result.risk_report;

  const { data, error } = await supabase
    .from("ai_brief_risk_reports")
    .insert({
      design_request_id: input.designRequestId,
      customer_profile_id: input.customerProfileId ?? null,
      ai_model_run_id: aiModelRunId ?? null,

      risk_score: risk.risk_score,
      risk_level: risk.risk_level,
      risk_summary: risk.risk_summary,
      missing_information: risk.missing_information,
      unclear_points: risk.unclear_points,
      scope_creep_risks: risk.scope_creep_risks,
      budget_timeline_risks: risk.budget_timeline_risks,
      recommended_questions: risk.recommended_questions,

      matching_hints: result.matching_hints,
      risk_json: risk,
      prompt_version: BRIEF_BUILDER_PROMPT_VERSION,
      is_resolved: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      "[DesignMatch AI] Không thể lưu ai_brief_risk_reports:",
      error,
    );
    return null;
  }

  return typeof data?.id === "string" ? data.id : null;
}

export async function buildAIDesignBrief(input: AIBriefBuilderInput) {
  const schemaDescription = `
{
  "brief": {
    "project_title": "string",
    "business_context": "string",
    "design_objective": "string",
    "target_audience": "string",
    "key_message": "string",
    "deliverables": ["string"],
    "package_scope": {
      "package_name": "string",
      "package_type": "string",
      "pricing_tier": "string",
      "selected_price": "string",
      "price_level": "string",
      "scope_summary": "string",
      "revision_limit": "string",
      "deliverable_limit": "string"
    },
    "product_specific_requirements": [
      {
        "section_title": "string",
        "requirements": ["string"]
      }
    ],
    "visual_direction": {
      "mood": ["string"],
      "style_tags": ["string"],
      "color_direction": ["string"],
      "typography_direction": "string",
      "layout_direction": "string",
      "image_direction": "string"
    },
    "layout_hierarchy": {
      "priority_order": ["string"],
      "composition_notes": "string",
      "readability_notes": "string",
      "print_or_platform_notes": "string"
    },
    "content_requirements": ["string"],
    "technical_requirements": ["string"],
    "references_to_collect": ["string"],
    "acceptance_checklist": ["string"],
    "out_of_scope_items": ["string"],
    "designer_notes": "string"
  },
  "risk_report": {
    "risk_score": 0,
    "risk_level": "low | medium | high",
    "risk_summary": "string",
    "missing_information": ["string"],
    "unclear_points": ["string"],
    "scope_creep_risks": ["string"],
    "budget_timeline_risks": ["string"],
    "recommended_questions": ["string"]
  },
  "matching_hints": {
    "preferred_designer_styles": ["string"],
    "designer_experience_needed": ["string"],
    "avoid_designer_profiles": ["string"],
    "matching_keywords": ["string"]
  }
}
`;

  const pricingGuidance = buildPricingGuidance(input);

  const instructions = buildCreativeIntelligenceInstructions(`
Nhiệm vụ:
Bạn là AI Brief Builder V3 và Brief Risk Scanner của DesignMatch AI.

Bạn không chỉ viết lại yêu cầu của khách hàng.
Bạn phải biến dữ liệu thô từ khách hàng, kết quả AI Visual Intake và package đã chọn thành một creative brief đủ rõ để designer có thể bắt đầu làm việc với ít vòng hỏi lại nhất.

Mục tiêu của module:
1. Làm rõ nhu cầu thiết kế mơ hồ.
2. Chuyển ngôn ngữ cảm tính của khách thành ngôn ngữ thiết kế cụ thể.
3. Tạo brief đủ dùng cho designer.
4. Tạo dữ liệu có cấu trúc để phục vụ Concept Direction, Visual Concept Preview, Taste Gap và Matching Engine.
5. Phát hiện rủi ro brief trước khi gửi cho designer.
6. Giới hạn phạm vi đúng package, tránh scope creep.

Ngữ cảnh sản phẩm:
DesignMatch AI phục vụ hộ kinh doanh nhỏ tại Việt Nam như quán cà phê, trà sữa, tiệm bánh, quán ăn, shop online, local brand nhỏ, CLB/sự kiện sinh viên, startup sinh viên, homestay, spa, salon, studio nhỏ.

Người dùng thường mô tả rất mơ hồ, ví dụ:
- "Làm cho đẹp."
- "Làm trẻ trung."
- "Làm sang hơn."
- "Làm bắt mắt."
- "Chưa đúng gu."
- "Làm giống mẫu này nhưng khác chút."

Bạn phải chuyển các câu mơ hồ đó thành tiêu chí thiết kế cụ thể:
- Màu sắc nên theo hướng nào.
- Typography nên mạnh, mềm, tối giản hay thân thiện.
- Bố cục nên ưu tiên thông tin nào.
- CTA cần nổi bật ra sao.
- Hình ảnh sản phẩm nên đặt vai trò gì.
- Kênh đăng ảnh hưởng đến kích thước, độ đọc và mật độ chữ thế nào.

Quy tắc quan trọng:
- Không viết brief chung chung.
- Không dùng các câu rỗng như "thiết kế đẹp, hiện đại, bắt mắt" nếu không giải thích rõ bằng tiêu chí.
- Không bịa tên thương hiệu, giá, ưu đãi, logo, địa chỉ, số điện thoại hoặc thông tin chưa có.
- Nếu thiếu thông tin, vẫn tạo brief tốt nhất có thể nhưng phải đưa phần thiếu vào missing_information.
- Nếu điểm nào còn mơ hồ, đưa vào unclear_points.
- Nếu có nguy cơ phát sinh ngoài gói, đưa vào scope_creep_risks.
- Nếu ngân sách/deadline không tương xứng, đưa vào budget_timeline_risks.
- Nếu cần hỏi khách trước khi làm, đưa vào recommended_questions.
- Không biến request một ấn phẩm thành campaign nhiều ấn phẩm.
- Không tự thêm deliverable ngoài package.
- Không tự mở rộng thành monthly package, team booking hoặc bộ nhận diện nếu form không yêu cầu.
- Nếu dữ liệu Visual Intake có style/mood/màu sắc, phải tận dụng để làm brief cụ thể hơn.
- Nếu Visual Intake và input khách hàng mâu thuẫn, không tự chọn một bên tuyệt đối; hãy ghi nhận mâu thuẫn trong risk_report.

Cách viết brief:

1. project_title:
- Ngắn, rõ, có loại ấn phẩm và tên thương hiệu/sản phẩm nếu có.
- Ví dụ: "Poster khai trương quán trà sữa Mây Nâu".

2. business_context:
- Mô tả bối cảnh kinh doanh cụ thể.
- Ai là khách hàng?
- Sản phẩm/dịch vụ là gì?
- Bối cảnh địa phương hoặc kênh truyền thông là gì?
- Không viết quá dài, nhưng phải đủ để designer hiểu brand.

3. design_objective:
- Nêu mục tiêu truyền thông cụ thể.
- Ví dụ: tăng nhận biết khai trương, làm nổi bật ưu đãi, giới thiệu sản phẩm mới, tăng đặt hàng, tạo cảm giác chuyên nghiệp.

4. target_audience:
- Không chỉ chép lại input.
- Hãy làm rõ insight thị giác của nhóm đó.
- Ví dụ: sinh viên cần visual trẻ, đọc nhanh trên mobile, CTA rõ, màu thân thiện.

5. key_message:
- Một câu thông điệp chính cần thiết kế truyền tải.
- Nếu khách chưa cung cấp headline, hãy viết dạng định hướng, không bịa ưu đãi cụ thể.

6. deliverables:
- Bám sát package.
- Ghi rõ số lượng và định dạng hợp lý.
- Nếu không chắc, dùng deliverable an toàn như "01 thiết kế chính" và "file PNG/JPG dùng cho kênh đã chọn".

7. package_scope:
- Phải phản ánh đúng gói đã chọn.
- Không mở rộng phạm vi.
- scope_summary phải giúp khách hiểu gói này bao gồm gì và không bao gồm gì.

8. product_specific_requirements:
- Đây là phần quan trọng.
- Phải khác nhau theo loại ấn phẩm.
- Nếu là poster khai trương: cần headline, ưu đãi, thời gian, địa chỉ, CTA, sản phẩm chính.
- Nếu là social post: cần hook, visual thumb-stopping, caption/message, CTA, tính đọc nhanh trên mobile.
- Nếu là banner: cần đọc nhanh, ít chữ, hierarchy mạnh, phù hợp kích thước ngang/dọc.
- Nếu là menu: cần phân nhóm món, giá, khả năng đọc, cấu trúc thông tin.
- Nếu là voucher: cần ưu đãi, điều kiện áp dụng, hạn dùng, mã/QR nếu có.
- Nếu là logo: cần tính nhận diện, mood thương hiệu, ứng dụng cơ bản.
- Nếu là brand kit mini: cần màu, typography, logo usage, pattern/icon, social direction.

9. visual_direction:
- mood: mảng mood rõ ràng.
- style_tags: ưu tiên taxonomy của DesignMatch AI, ví dụ korean_cafe, warm_minimal, pastel_soft, gen_z_bold, clean_modern, handmade.
- color_direction: ghi màu và vai trò, ví dụ "nâu sữa làm màu chính", "kem/trắng làm nền", "cam nhạt làm accent CTA".
- typography_direction: nêu rõ font nên tạo cảm giác gì, headline/body nên ra sao.
- layout_direction: nêu rõ bố cục nên tổ chức thế nào.
- image_direction: nêu vai trò của ảnh sản phẩm, logo, texture, background, props.

10. layout_hierarchy:
- priority_order phải là thứ tự thông tin designer nên ưu tiên.
- composition_notes phải chỉ ra cách chia bố cục.
- readability_notes phải nói về độ đọc trên mobile/in ấn.
- print_or_platform_notes phải gắn với channel.

11. content_requirements:
- Liệt kê nội dung bắt buộc xuất hiện.
- Nếu thiếu nội dung, ghi dạng "Cần bổ sung..." thay vì bịa.

12. technical_requirements:
- Gợi ý kích thước/tỷ lệ phù hợp theo channel.
- Ví dụ: 1:1 cho Facebook/Instagram post, 9:16 cho story, banner ngang nếu dùng website/màn hình.
- Nếu dùng in ấn, nhắc file chất lượng cao, vùng an toàn, CMYK nếu cần.
- Không đưa yêu cầu quá chuyên sâu nếu gói thấp.

13. references_to_collect:
- Logo, ảnh sản phẩm, bảng giá, thông tin ưu đãi, địa chỉ, hotline, brand color, mẫu thích/không thích.

14. acceptance_checklist:
- Checklist nghiệm thu rõ ràng.
- Ví dụ: headline đọc được trên mobile, CTA nổi bật, sản phẩm là trọng tâm, đúng màu/mood, đủ thông tin bắt buộc, không lỗi chính tả.

15. out_of_scope_items:
- Ghi rõ những thứ ngoài phạm vi để tránh phát sinh.
- Ví dụ: không bao gồm thiết kế thêm kích thước nếu gói không có, không bao gồm logo mới, không bao gồm menu, không bao gồm chỉnh sửa không giới hạn.

16. designer_notes:
- Luôn trả về chuỗi rỗng "".
- Không tự viết ghi chú ở đây.
- Không nhắc trực tiếp về giá, phí nền tảng, gói, hạn chế gói hoặc template-assisted trong designer_notes.

Brief Risk Scanner:
Bạn phải chấm risk_score theo logic:
- 0-20: brief rõ, ít rủi ro.
- 21-45: brief tương đối rõ nhưng còn thiếu vài thông tin.
- 46-70: brief dùng được nhưng cần hỏi thêm đáng kể.
- 71-100: brief thiếu nhiều, dễ lệch kỳ vọng hoặc phát sinh scope.

risk_level:
- low nếu risk_score <= 35.
- medium nếu risk_score từ 36 đến 70.
- high nếu risk_score > 70.

Các nhóm rủi ro cần kiểm tra:
1. Mục tiêu thiết kế có rõ không.
2. Đối tượng khách hàng có rõ không.
3. Phong cách có cụ thể không.
4. Nội dung chữ/headline/CTA đã đủ chưa.
5. Logo/ảnh sản phẩm/tài liệu tham khảo có thiếu không.
6. Deadline có gấp không.
7. Ngân sách có phù hợp phạm vi không.
8. Scope có dễ bị mở rộng không.
9. Kênh sử dụng có rõ không.
10. Có mâu thuẫn giữa style mong muốn và ảnh/input không.

Matching hints:
matching_hints phải phục vụ Style-fit Matching Engine.
- preferred_designer_styles: style designer nên mạnh.
- designer_experience_needed: kinh nghiệm/ngách nên có.
- avoid_designer_profiles: kiểu designer có thể không phù hợp.
- matching_keywords: từ khóa dùng để match brief với portfolio/Style DNA.

Yêu cầu chất lượng matching_hints:
- Không chỉ viết "designer sáng tạo".
- Phải cụ thể như: "portfolio F&B", "tone pastel", "social post khai trương", "layout sản phẩm trung tâm", "typography rõ CTA".
- matching_keywords nên bao gồm ngành, loại ấn phẩm, mood, style, channel, yêu cầu visual.

${pricingGuidance}

Output bắt buộc là JSON hợp lệ đúng schema.

${buildJsonOnlyInstruction(schemaDescription)}
`);

  const aiInput = [
    "Hãy tạo creative brief chi tiết, risk report và matching hints cho yêu cầu thiết kế sau:",
    "",
    stringifyForAI({
      title: input.title,
      productDescription: input.productDescription,
      designType: input.designType,
      targetAudience: input.targetAudience,
      preferredStyle: input.preferredStyle,
      preferredColors: input.preferredColors,
      budget: input.budget,
      deadline: input.deadline,
      channel: input.channel,
      businessName: input.businessName,
      businessLocation: input.businessLocation,
      visualIntakeResult: input.visualIntakeResult,
      pricingPackage: input.pricingPackage,
    }),
  ].join("\n");

  let normalizedResult: AIBriefBuilderResult;
  let provider = "fallback";
  let model = "local-deterministic-brief-builder";
  let task = "ai_brief_builder_and_risk_scanner";
  let usage: unknown = null;
  let aiModelRunId: string | null = null;
  let usedFallback = false;
  let fallbackReason: string | null = null;

  try {
    const result = await runAIJson<Record<string, JsonValue>>({
      task: "ai_brief_builder_and_risk_scanner",
      instructions,
      input: aiInput,
      maxOutputTokens: 6200,
      jsonLabel: "AI Creative Brief Builder JSON",
      runContext: {
        purpose: "text",
        promptVersion: BRIEF_BUILDER_PROMPT_VERSION,
        userInput: {
          title: input.title ?? null,
          productDescription: input.productDescription ?? null,
          designType: input.designType ?? null,
          targetAudience: input.targetAudience ?? null,
          preferredStyle: input.preferredStyle ?? null,
          preferredColors: input.preferredColors ?? null,
          budget: input.budget ?? null,
          deadline: input.deadline ?? null,
          channel: input.channel ?? null,
          businessName: input.businessName ?? null,
          businessLocation: input.businessLocation ?? null,
          visualIntakeResult: input.visualIntakeResult ?? null,
          pricingPackage: input.pricingPackage ?? null,
        } as JsonValue,
        relatedRequestId: input.designRequestId ?? null,
        relatedCustomerProfileId: input.customerProfileId ?? null,
      },
    });

    normalizedResult = normalizeBriefBuilderJson(result.json);
    provider = result.provider;
    model = result.model;
    task = result.task;
    usage = result.usage;
    aiModelRunId = result.aiModelRunId ?? null;
  } catch (error) {
    usedFallback = true;
    fallbackReason = getBriefBuilderFailureMessage(error);

    console.warn(
      "[DesignMatch AI] AI Brief Builder failed. Using fallback brief.",
      fallbackReason,
    );

    normalizedResult = buildFallbackBriefBuilderResult(input, fallbackReason);
  }

  const savedBriefId = await saveAIBrief({
    input,
    result: normalizedResult,
    aiModelRunId,
  });

  const savedRiskReportId = await saveAIBriefRiskReport({
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
    savedBriefId,
    savedRiskReportId,
    fallback: usedFallback,
    fallbackReason,
    result: normalizedResult,
  };
}