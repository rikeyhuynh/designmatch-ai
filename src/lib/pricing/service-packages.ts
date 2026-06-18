export type PricingTier = "mini_design" | "custom_design";

export type PackageType = "template_assisted" | "custom";

export type ServicePackage = {
  code: string;
  tier: PricingTier;
  type: PackageType;
  name: string;
  description: string;
  priceMinVnd: number;
  priceMaxVnd: number;
  suggestedPriceVnd: number;
  revisionLimit: number | null;
  deliverableLimit: number | null;
  isTeamBooking: boolean;
  scopeNote: string;
  suitableFor: string[];
  notIncluded: string[];
};

export type PlatformFeeBreakdown = {
  selectedPriceVnd: number;
  platformFeePercent: number;
  platformFeeVnd: number;
  designerRevenueVnd: number;
};

export const servicePackages: ServicePackage[] = [
  {
    code: "mini_story",
    tier: "mini_design",
    type: "template_assisted",
    name: "Mini Story",
    description: "1 story social template-assisted cho thông báo nhanh.",
    priceMinVnd: 199000,
    priceMaxVnd: 199000,
    suggestedPriceVnd: 199000,
    revisionLimit: 1,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Mini Story là template-assisted, chỉ dành cho một story đơn lẻ, nội dung rõ ràng, chỉnh sửa giới hạn.",
    suitableFor: [
      "Story khuyến mãi nhanh",
      "Story thông báo giờ mở cửa",
      "Story giới thiệu món/sản phẩm mới",
    ],
    notIncluded: [
      "Không bao gồm thiết kế custom từ đầu",
      "Không bao gồm animation",
      "Không bao gồm nhiều kích thước",
    ],
  },
  {
    code: "mini_social_post",
    tier: "mini_design",
    type: "template_assisted",
    name: "Mini Social Post",
    description: "1 social post template-assisted cho nhu cầu truyền thông nhỏ.",
    priceMinVnd: 299000,
    priceMaxVnd: 299000,
    suggestedPriceVnd: 299000,
    revisionLimit: 1,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Mini Social Post là template-assisted, không phải thiết kế custom từ đầu. Designer tinh chỉnh layout/template phù hợp với nội dung và màu sắc cơ bản.",
    suitableFor: [
      "Bài đăng khai trương nhỏ",
      "Post ưu đãi đơn giản",
      "Post giới thiệu sản phẩm nhanh",
    ],
    notIncluded: [
      "Không bao gồm concept custom từ đầu",
      "Không bao gồm nhiều vòng sửa",
      "Không bao gồm campaign nhiều ấn phẩm",
    ],
  },
  {
    code: "mini_banner",
    tier: "mini_design",
    type: "template_assisted",
    name: "Mini Banner",
    description: "1 banner mini cho social, website hoặc thông báo đơn giản.",
    priceMinVnd: 299000,
    priceMaxVnd: 349000,
    suggestedPriceVnd: 299000,
    revisionLimit: 1,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Mini Banner dùng template/layout có sẵn được tinh chỉnh lại. Phù hợp nội dung ngắn, mục tiêu rõ.",
    suitableFor: [
      "Banner sale",
      "Banner thông báo chương trình",
      "Banner món mới/sản phẩm mới",
    ],
    notIncluded: [
      "Không bao gồm key visual campaign",
      "Không bao gồm motion banner",
      "Không bao gồm nhiều phiên bản kích thước",
    ],
  },
  {
    code: "mini_facebook_cover",
    tier: "mini_design",
    type: "template_assisted",
    name: "Mini Facebook Cover",
    description: "1 ảnh bìa Facebook hoặc Zalo OA đơn giản.",
    priceMinVnd: 299000,
    priceMaxVnd: 399000,
    suggestedPriceVnd: 299000,
    revisionLimit: 1,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói ảnh bìa mini tập trung vào một layout rõ ràng, chỉnh sửa nhẹ theo thương hiệu và nội dung có sẵn.",
    suitableFor: [
      "Ảnh bìa fanpage",
      "Ảnh bìa Zalo OA",
      "Cover cho chương trình nhỏ",
    ],
    notIncluded: [
      "Không bao gồm bộ social kit",
      "Không bao gồm thiết kế nhận diện đầy đủ",
      "Không bao gồm nhiều concept",
    ],
  },
  {
    code: "mini_poster",
    tier: "mini_design",
    type: "template_assisted",
    name: "Mini Poster",
    description: "1 poster mini template-assisted cho nhu cầu đơn giản.",
    priceMinVnd: 399000,
    priceMaxVnd: 499000,
    suggestedPriceVnd: 399000,
    revisionLimit: 1,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Mini Poster là template-assisted, giới hạn phạm vi, phù hợp nhu cầu nhanh và rõ nội dung. Không phải poster campaign custom chuyên sâu.",
    suitableFor: [
      "Poster khai trương nhỏ",
      "Poster ưu đãi đơn giản",
      "Poster thông báo sự kiện nhỏ",
    ],
    notIncluded: [
      "Không bao gồm key visual custom",
      "Không bao gồm nhiều kích thước triển khai",
      "Không bao gồm copywriting chuyên sâu",
    ],
  },
  {
    code: "mini_price_list",
    tier: "mini_design",
    type: "template_assisted",
    name: "Mini Price List",
    description: "1 bảng giá nhỏ cho sản phẩm hoặc dịch vụ.",
    priceMinVnd: 349000,
    priceMaxVnd: 499000,
    suggestedPriceVnd: 399000,
    revisionLimit: 1,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Price List mini dùng cho một bảng giá đơn giản, số lượng nội dung ít, không xử lý menu phức tạp.",
    suitableFor: [
      "Bảng giá spa nhỏ",
      "Bảng giá món bán chạy",
      "Bảng giá dịch vụ cơ bản",
    ],
    notIncluded: [
      "Không bao gồm menu nhiều trang",
      "Không bao gồm chụp ảnh sản phẩm",
      "Không bao gồm chỉnh sửa nhiều vòng",
    ],
  },
  {
    code: "mini_menu_one_page",
    tier: "mini_design",
    type: "template_assisted",
    name: "Mini Menu One-page",
    description: "1 trang menu mini dựa trên bố cục đơn giản.",
    priceMinVnd: 399000,
    priceMaxVnd: 599000,
    suggestedPriceVnd: 499000,
    revisionLimit: 1,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói này chỉ dành cho menu một trang/một mặt với lượng nội dung ít. Không phải thiết kế menu đầy đủ nhiều trang.",
    suitableFor: [
      "Menu món bán chạy",
      "Menu đồ uống ngắn",
      "Menu dịch vụ một trang",
    ],
    notIncluded: [
      "Không bao gồm menu nhiều trang",
      "Không bao gồm xử lý ảnh món phức tạp",
      "Không bao gồm thiết kế hệ nhận diện",
    ],
  },

  {
    code: "custom_social_post",
    tier: "custom_design",
    type: "custom",
    name: "Custom Social Post",
    description: "1 social post custom từ brief đã chốt.",
    priceMinVnd: 499000,
    priceMaxVnd: 799000,
    suggestedPriceVnd: 599000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Custom Social Post cho phép designer xây dựng hướng thiết kế riêng theo brief, không bị giới hạn ở template có sẵn.",
    suitableFor: [
      "Post sản phẩm quan trọng",
      "Post khai trương cần hình ảnh chỉn chu",
      "Post truyền thông có định hướng thương hiệu",
    ],
    notIncluded: [
      "Không bao gồm bộ campaign nhiều ấn phẩm",
      "Không bao gồm brand kit",
      "Không bao gồm chụp ảnh sản phẩm",
    ],
  },
  {
    code: "custom_story",
    tier: "custom_design",
    type: "custom",
    name: "Custom Story",
    description: "1 story custom theo brief và phong cách thương hiệu.",
    priceMinVnd: 399000,
    priceMaxVnd: 699000,
    suggestedPriceVnd: 499000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Custom Story phù hợp khi story cần hình ảnh riêng, có tinh chỉnh visual rõ hơn gói mini.",
    suitableFor: [
      "Story launch sản phẩm",
      "Story event nhỏ",
      "Story ưu đãi cần hình ảnh chỉn chu",
    ],
    notIncluded: [
      "Không bao gồm animation",
      "Không bao gồm nhiều story liên hoàn",
      "Không bao gồm quản trị nội dung",
    ],
  },
  {
    code: "custom_poster",
    tier: "custom_design",
    type: "custom",
    name: "Custom Poster",
    description: "1 poster custom cho truyền thông chính thức.",
    priceMinVnd: 799000,
    priceMaxVnd: 1200000,
    suggestedPriceVnd: 999000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Custom Poster là thiết kế poster riêng theo brief, có concept rõ hơn mini poster, phù hợp dùng làm ấn phẩm chính.",
    suitableFor: [
      "Poster sự kiện",
      "Poster khai trương quan trọng",
      "Poster ưu đãi chính",
    ],
    notIncluded: [
      "Không bao gồm nhiều poster khác nhau",
      "Không bao gồm landing page",
      "Không bao gồm quản trị truyền thông",
    ],
  },
  {
    code: "event_key_visual_single",
    tier: "custom_design",
    type: "custom",
    name: "Event Key Visual",
    description: "1 key visual chính cho sự kiện nhỏ hoặc workshop.",
    priceMinVnd: 1200000,
    priceMaxVnd: 2500000,
    suggestedPriceVnd: 1500000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói này tạo một hình ảnh chủ đạo cho sự kiện. Không bao gồm triển khai hàng loạt ấn phẩm khác.",
    suitableFor: [
      "Workshop",
      "Sự kiện sinh viên",
      "Mini festival",
      "Chương trình khai trương",
    ],
    notIncluded: [
      "Không bao gồm full event media kit",
      "Không bao gồm nhiều phiên bản ứng dụng",
      "Không bao gồm motion/video",
    ],
  },
  {
    code: "custom_menu_one_page",
    tier: "custom_design",
    type: "custom",
    name: "Custom Menu One-page",
    description: "1 trang menu custom cho quán/local business.",
    priceMinVnd: 1000000,
    priceMaxVnd: 1800000,
    suggestedPriceVnd: 1200000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói menu một trang phù hợp quán nhỏ cần menu rõ món, dễ đọc, dùng để in hoặc đăng digital.",
    suitableFor: [
      "Menu cafe/trà sữa một trang",
      "Menu đồ ăn nhanh",
      "Menu dịch vụ một trang",
    ],
    notIncluded: [
      "Không bao gồm menu nhiều trang",
      "Không bao gồm chụp ảnh món",
      "Không bao gồm brand identity đầy đủ",
    ],
  },
  {
    code: "logo_basic",
    tier: "custom_design",
    type: "custom",
    name: "Logo Basic",
    description: "1 logo custom cơ bản cho hộ kinh doanh nhỏ.",
    priceMinVnd: 1500000,
    priceMaxVnd: 3000000,
    suggestedPriceVnd: 2000000,
    revisionLimit: 3,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Logo Basic phù hợp thương hiệu nhỏ cần một logo custom đơn giản. Không bao gồm hệ nhận diện đầy đủ.",
    suitableFor: [
      "Quán mới mở",
      "Shop nhỏ",
      "Dịch vụ cá nhân",
    ],
    notIncluded: [
      "Không bao gồm brand strategy",
      "Không bao gồm nhiều concept phức tạp",
      "Không bao gồm brand guideline đầy đủ",
    ],
  },
  {
    code: "packaging_label_single",
    tier: "custom_design",
    type: "custom",
    name: "Packaging Label",
    description: "1 tem nhãn/bao bì nhỏ cho sản phẩm local.",
    priceMinVnd: 1200000,
    priceMaxVnd: 2500000,
    suggestedPriceVnd: 1800000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Packaging Label tập trung vào một mẫu tem nhãn hoặc bao bì nhỏ, phù hợp một sản phẩm local.",
    suitableFor: [
      "Nhãn chai",
      "Sticker sản phẩm",
      "Tem hộp bánh/trà/cafe",
    ],
    notIncluded: [
      "Không bao gồm mockup 3D phức tạp",
      "Không bao gồm nhiều SKU",
      "Không bao gồm in ấn",
    ],
  },
  {
    code: "voucher_single",
    tier: "custom_design",
    type: "custom",
    name: "Voucher / Gift Card",
    description: "1 voucher, gift card hoặc phiếu ưu đãi.",
    priceMinVnd: 499000,
    priceMaxVnd: 900000,
    suggestedPriceVnd: 699000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Voucher/Gift Card phù hợp thương hiệu cần một ấn phẩm nhỏ nhưng vẫn đồng bộ hình ảnh.",
    suitableFor: [
      "Voucher khai trương",
      "Phiếu giảm giá",
      "Gift card",
    ],
    notIncluded: [
      "Không bao gồm hệ thống mã tự động",
      "Không bao gồm in ấn",
      "Không bao gồm nhiều mẫu khác nhau",
    ],
  },
  {
    code: "standee_single",
    tier: "custom_design",
    type: "custom",
    name: "Standee",
    description: "1 standee in ấn cho cửa hàng hoặc sự kiện nhỏ.",
    priceMinVnd: 799000,
    priceMaxVnd: 1500000,
    suggestedPriceVnd: 1000000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Standee phù hợp nhu cầu offline, cần bố cục rõ, thông tin dễ đọc và file sẵn sàng cho in ấn.",
    suitableFor: [
      "Standee khai trương",
      "Standee ưu đãi",
      "Standee giới thiệu dịch vụ",
    ],
    notIncluded: [
      "Không bao gồm chi phí in",
      "Không bao gồm nhiều kích thước",
      "Không bao gồm thi công",
    ],
  },
  {
    code: "flyer_single",
    tier: "custom_design",
    type: "custom",
    name: "Flyer",
    description: "1 flyer/tờ rơi giới thiệu sản phẩm hoặc dịch vụ.",
    priceMinVnd: 699000,
    priceMaxVnd: 1500000,
    suggestedPriceVnd: 999000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Flyer phù hợp giới thiệu dịch vụ hoặc sản phẩm với lượng thông tin vừa phải trên một ấn phẩm đơn.",
    suitableFor: [
      "Flyer khai trương",
      "Flyer dịch vụ",
      "Tờ rơi sản phẩm",
    ],
    notIncluded: [
      "Không bao gồm copywriting dài",
      "Không bao gồm brochure nhiều trang",
      "Không bao gồm in ấn",
    ],
  },
  {
    code: "namecard_single",
    tier: "custom_design",
    type: "custom",
    name: "Namecard",
    description: "1 thiết kế namecard cho cá nhân hoặc local business.",
    priceMinVnd: 499000,
    priceMaxVnd: 900000,
    suggestedPriceVnd: 699000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Namecard phù hợp local business cần một ấn phẩm nhỏ, chuyên nghiệp và dễ in.",
    suitableFor: [
      "Namecard cá nhân",
      "Namecard chủ cửa hàng",
      "Namecard dịch vụ nhỏ",
    ],
    notIncluded: [
      "Không bao gồm in ấn",
      "Không bao gồm hệ thống nhận diện",
      "Không bao gồm nhiều mẫu khác nhau",
    ],
  },
  {
    code: "loyalty_card_single",
    tier: "custom_design",
    type: "custom",
    name: "Loyalty Card",
    description: "1 thẻ tích điểm/thẻ thành viên cho cửa hàng.",
    priceMinVnd: 499000,
    priceMaxVnd: 900000,
    suggestedPriceVnd: 699000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Loyalty Card dành cho một mẫu thẻ tích điểm hoặc thẻ thành viên đơn giản.",
    suitableFor: [
      "Thẻ tích điểm quán cafe",
      "Thẻ thành viên shop",
      "Thẻ khách hàng thân thiết",
    ],
    notIncluded: [
      "Không bao gồm hệ thống membership",
      "Không bao gồm in ấn",
      "Không bao gồm app/CRM",
    ],
  },
  {
    code: "product_visual_single",
    tier: "custom_design",
    type: "custom",
    name: "Product Visual",
    description: "1 visual sản phẩm cho social shop hoặc sàn TMĐT.",
    priceMinVnd: 499000,
    priceMaxVnd: 900000,
    suggestedPriceVnd: 699000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Product Visual dùng cho một sản phẩm/một visual bán hàng. Không phải bộ hình nhiều sản phẩm.",
    suitableFor: [
      "Visual sản phẩm mới",
      "Ảnh bán hàng social",
      "Ảnh sản phẩm Shopee/TikTok Shop",
    ],
    notIncluded: [
      "Không bao gồm chụp ảnh",
      "Không bao gồm nhiều SKU",
      "Không bao gồm video sản phẩm",
    ],
  },
  {
    code: "table_tent_single",
    tier: "custom_design",
    type: "custom",
    name: "Table Tent",
    description: "1 thiết kế table tent/standee bàn cho quán.",
    priceMinVnd: 699000,
    priceMaxVnd: 1200000,
    suggestedPriceVnd: 899000,
    revisionLimit: 2,
    deliverableLimit: 1,
    isTeamBooking: false,
    scopeNote:
      "Gói Table Tent phù hợp trưng bày tại bàn/quầy, dùng cho một chương trình hoặc một thông điệp chính.",
    suitableFor: [
      "Table tent món mới",
      "Table tent combo",
      "Thông báo tại quầy",
    ],
    notIncluded: [
      "Không bao gồm in ấn",
      "Không bao gồm nhiều mẫu khác nhau",
      "Không bao gồm thi công",
    ],
  },
];

export function getServicePackageByCode(code: string) {
  return servicePackages.find((item) => item.code === code) ?? null;
}

export function getPlatformFeePercent(selectedPriceVnd: number) {
  if (selectedPriceVnd < 500000) {
    return 15;
  }

  if (selectedPriceVnd < 2000000) {
    return 13;
  }

  if (selectedPriceVnd < 5000000) {
    return 12;
  }

  return 10;
}

export function calculatePlatformFee(
  selectedPriceVnd: number,
): PlatformFeeBreakdown {
  const normalizedPrice = Math.max(0, Math.round(selectedPriceVnd));
  const platformFeePercent = getPlatformFeePercent(normalizedPrice);
  const platformFeeVnd = Math.round(
    normalizedPrice * (platformFeePercent / 100),
  );

  return {
    selectedPriceVnd: normalizedPrice,
    platformFeePercent,
    platformFeeVnd,
    designerRevenueVnd: Math.max(0, normalizedPrice - platformFeeVnd),
  };
}

export function clampPackagePrice({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function getPriceDetailLevel({
  selectedPriceVnd,
  priceMinVnd,
  priceMaxVnd,
}: {
  selectedPriceVnd: number;
  priceMinVnd: number;
  priceMaxVnd: number;
}) {
  if (priceMinVnd === priceMaxVnd) {
    return {
      level: "fixed",
      label: "Phạm vi cố định",
      description:
        "Gói này có giá cố định nên brief sẽ tập trung đúng phạm vi đã quy định.",
    };
  }

  const ratio =
    (selectedPriceVnd - priceMinVnd) / Math.max(1, priceMaxVnd - priceMinVnd);

  if (ratio >= 0.75) {
    return {
      level: "high",
      label: "Brief chi tiết hơn",
      description:
        "Mức giá gần trần gói, brief nên rõ hơn về định hướng visual, nội dung, bố cục và tiêu chí bàn giao.",
    };
  }

  if (ratio >= 0.4) {
    return {
      level: "medium",
      label: "Brief tiêu chuẩn",
      description:
        "Mức giá trung bình trong gói, brief cần đủ rõ để designer triển khai đúng hướng.",
    };
  }

  return {
    level: "basic",
    label: "Brief gọn phạm vi",
    description:
      "Mức giá gần sàn gói, brief nên giới hạn phạm vi, tránh yêu cầu quá nhiều chi tiết ngoài gói.",
  };
}

export function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function getPricingTierLabel(tier: PricingTier) {
  if (tier === "mini_design") return "Mini Design";
  return "Custom Design";
}

export function getPackageTypeLabel(type: PackageType) {
  if (type === "template_assisted") return "Template-assisted";
  return "Custom";
}