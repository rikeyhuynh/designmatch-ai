import type { AiBrief, DesignRequest, DesignerMatch } from "@/types/domain";

export const mockDesignRequests: DesignRequest[] = [
  {
    id: "request_milktea_opening",
    customerId: "customer_demo_01",
    title: "Poster khai trương quán trà sữa",
    businessName: "Mây Milk Tea",
    industry: "fnb",
    category: "poster",
    description:
      "Tôi cần làm poster khai trương cho quán trà sữa. Muốn phong cách trẻ trung, sạch, hơi Hàn Quốc, nhìn dễ thương nhưng không quá trẻ con.",
    targetAudience: "Sinh viên, học sinh cấp 3, dân văn phòng trẻ trong khu vực.",
    budgetMinVnd: 300000,
    budgetMaxVnd: 600000,
    deadline: "2026-06-21",
    preferredStyles: ["pastel", "korean", "minimal"],
    status: "ready_to_match",
    createdAt: "2026-06-12T10:00:00.000Z",
  },
];

export const mockAiBriefs: AiBrief[] = [
  {
    id: "brief_milktea_opening",
    requestId: "request_milktea_opening",
    objective:
      "Tạo poster khai trương giúp quán trà sữa mới thu hút nhóm khách trẻ và truyền đạt ưu đãi rõ ràng.",
    visualDirection:
      "Korean cafe mood, tone nâu kem, trắng sữa, xanh nhạt. Bố cục sạch, có điểm nhấn sản phẩm và headline khai trương.",
    keyMessage: "Khai trương Mây Milk Tea — ưu đãi tuần đầu cho khách mới.",
    deliverables: [
      "Poster social 1:1",
      "Story 9:16",
      "File PNG xuất bản",
      "File thiết kế có thể chỉnh sửa",
    ],
    recommendedStyles: ["pastel", "korean", "minimal"],
    riskLevel: "medium",
    riskNotes: [
      "CTA ưu đãi chưa có con số cụ thể.",
      "Chưa có hình sản phẩm thật.",
      "Deadline cần xác nhận lại với designer trước khi nhận job.",
    ],
    briefCompletenessScore: 82,
  },
];

export const mockDesignerMatches: DesignerMatch[] = [
  {
    id: "match_01",
    requestId: "request_milktea_opening",
    designerId: "designer_linh_studio",
    matchScore: 92,
    tasteGap: 18,
    reason:
      "Portfolio F&B pastel và Korean cafe gần với hướng visual khách chọn. Ngân sách và deadline phù hợp.",
    matchedPortfolioIds: ["portfolio_linh_01", "portfolio_linh_02"],
  },
  {
    id: "match_02",
    requestId: "request_milktea_opening",
    designerId: "designer_moc_design",
    matchScore: 86,
    tasteGap: 24,
    reason:
      "Phong cách local warm và minimal phù hợp nếu khách muốn poster sang hơn, ít trẻ con hơn.",
    matchedPortfolioIds: ["portfolio_moc_01"],
  },
  {
    id: "match_03",
    requestId: "request_milktea_opening",
    designerId: "designer_minh_creative",
    matchScore: 78,
    tasteGap: 35,
    reason:
      "Mạnh về poster campaign nổi bật, phù hợp nếu brief chuyển sang hướng khai trương năng động hơn.",
    matchedPortfolioIds: ["portfolio_minh_01"],
  },
];