import type {
  BusinessIndustry,
  DesignCategory,
  VisualStyle,
} from "@/types/supabase";

export type SeedDesigner = {
  email: string;
  password: string;
  fullName: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  industries: BusinessIndustry[];
  categories: DesignCategory[];
  styles: VisualStyle[];
  minBudgetVnd: number;
  maxBudgetVnd: number;
  responseTimeHours: number;
  rating: number;
  completedJobs: number;
  portfolioItems: Array<{
    title: string;
    imageUrl: string | null;
    industry: BusinessIndustry;
    category: DesignCategory;
    styles: VisualStyle[];
    description: string;
    year: number;
  }>;
};

export const seedDesigners: SeedDesigner[] = [
  {
    email: "designer.linh@designmatch.local",
    password: "DesignMatch123!",
    fullName: "Linh Studio",
    displayName: "Linh Studio",
    headline: "F&B pastel social post designer",
    bio: "Chuyên thiết kế social post, poster khai trương và visual direction cho thương hiệu F&B trẻ.",
    location: "Đà Nẵng",
    industries: ["fnb", "retail"],
    categories: ["poster", "social_post", "menu"],
    styles: ["pastel", "korean", "minimal"],
    minBudgetVnd: 300000,
    maxBudgetVnd: 1500000,
    responseTimeHours: 12,
    rating: 4.8,
    completedJobs: 28,
    portfolioItems: [
      {
        title: "Milk Tea Opening Poster",
        imageUrl: null,
        industry: "fnb",
        category: "poster",
        styles: ["pastel", "korean"],
        description:
          "Poster khai trương cho thương hiệu trà sữa với mood Hàn Quốc, tone kem và bố cục sạch.",
        year: 2026,
      },
      {
        title: "Cafe Social Launch Pack",
        imageUrl: null,
        industry: "fnb",
        category: "social_post",
        styles: ["minimal", "pastel"],
        description:
          "Bộ post launch cho quán cafe local, tập trung headline rõ và màu sắc nhẹ nhàng.",
        year: 2026,
      },
    ],
  },
  {
    email: "designer.moc@designmatch.local",
    password: "DesignMatch123!",
    fullName: "Mộc Design",
    displayName: "Mộc Design",
    headline: "Warm minimal branding for local shops",
    bio: "Tập trung vào nhận diện thương hiệu nhỏ, poster, menu và ấn phẩm bán hàng có cảm giác ấm, gần gũi.",
    location: "Huế",
    industries: ["fnb", "beauty", "service"],
    categories: ["brand_identity", "poster", "menu"],
    styles: ["minimal", "local_warm", "premium"],
    minBudgetVnd: 500000,
    maxBudgetVnd: 3000000,
    responseTimeHours: 18,
    rating: 4.7,
    completedJobs: 35,
    portfolioItems: [
      {
        title: "Local Coffee Brand Direction",
        imageUrl: null,
        industry: "fnb",
        category: "brand_identity",
        styles: ["local_warm", "minimal"],
        description:
          "Brand direction cho quán cafe địa phương với mood ấm, màu nâu kem và chất liệu gần gũi.",
        year: 2025,
      },
      {
        title: "Spa Opening Poster",
        imageUrl: null,
        industry: "beauty",
        category: "poster",
        styles: ["premium", "minimal"],
        description:
          "Poster khai trương spa theo hướng sạch, sang, nhẹ và dễ dùng cho social.",
        year: 2026,
      },
    ],
  },
  {
    email: "designer.minh@designmatch.local",
    password: "DesignMatch123!",
    fullName: "Minh Creative",
    displayName: "Minh Creative",
    headline: "Bold campaign poster and promo visual",
    bio: "Thiết kế poster campaign, banner, visual khuyến mãi với bố cục mạnh, màu sắc nổi bật và nhịp điệu truyền thông rõ.",
    location: "TP. Hồ Chí Minh",
    industries: ["fashion", "retail", "education"],
    categories: ["poster", "banner", "social_post"],
    styles: ["bold", "editorial", "playful"],
    minBudgetVnd: 400000,
    maxBudgetVnd: 2500000,
    responseTimeHours: 24,
    rating: 4.6,
    completedJobs: 22,
    portfolioItems: [
      {
        title: "Fashion Sale Campaign",
        imageUrl: null,
        industry: "fashion",
        category: "banner",
        styles: ["bold", "editorial"],
        description:
          "Visual campaign sale cho shop thời trang, headline lớn, contrast mạnh và layout năng động.",
        year: 2025,
      },
      {
        title: "Education Workshop Poster",
        imageUrl: null,
        industry: "education",
        category: "poster",
        styles: ["playful", "bold"],
        description:
          "Poster workshop sinh viên với bố cục trẻ, nhiều năng lượng và CTA rõ.",
        year: 2026,
      },
    ],
  },
];