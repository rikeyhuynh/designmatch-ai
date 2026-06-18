export type DeliverableKind =
  | "story"
  | "social_post"
  | "banner"
  | "facebook_cover"
  | "poster"
  | "price_list"
  | "menu_one_page"
  | "logo"
  | "packaging_label"
  | "voucher"
  | "standee"
  | "flyer"
  | "namecard"
  | "loyalty_card"
  | "product_visual"
  | "table_tent";

export type DeliverableSpec = {
  key: DeliverableKind;
  label: string;
  aspectRatio: string;
  previewMode: string;
  layoutFocus: string;
  typographyFocus: string;
  imageFocus: string;
  contentFocus: string;
  conceptGuardrails: string[];
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesAny(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

const SPECS: Record<DeliverableKind, DeliverableSpec> = {
  story: {
    key: "story",
    label: "Story",
    aspectRatio: "9:16",
    previewMode:
      "vertical mobile story concept preview optimized for quick-view consumption",
    layoutFocus:
      "Bố cục dọc 9:16, hook mạnh ở vùng trên, visual chính rõ, thông tin ngắn, CTA gọn và dễ nhìn trên mobile.",
    typographyFocus:
      "Typography lớn, dễ đọc nhanh trên màn hình điện thoại, headline ngắn và rõ nhịp.",
    imageFocus:
      "Hình ảnh hoặc visual hero chiếm vai trò chính, ưu tiên sự nổi bật khi xem toàn màn hình trên mobile.",
    contentFocus:
      "Nội dung rất ngắn, ưu tiên hook, offer hoặc một thông điệp duy nhất.",
    conceptGuardrails: [
      "Không mô tả như poster in ấn.",
      "Không dùng bố cục quá nhiều chữ.",
      "Phải thể hiện tư duy mobile-first.",
    ],
  },

  social_post: {
    key: "social_post",
    label: "Social Post",
    aspectRatio: "1:1",
    previewMode: "square social media concept preview for feed post",
    layoutFocus:
      "Bố cục vuông 1:1, hierarchy rõ, visual chính nổi bật, headline dễ đọc khi lướt feed.",
    typographyFocus:
      "Typography gọn, đủ mạnh để bắt mắt trên social nhưng không quá rối.",
    imageFocus:
      "Visual chính cần rõ, hút mắt và phù hợp hành vi lướt feed nhanh.",
    contentFocus:
      "Nội dung ngắn, ưu tiên thông điệp chính, lợi ích nổi bật hoặc CTA.",
    conceptGuardrails: [
      "Không mô tả như standee hay flyer.",
      "Không dùng bố cục dọc như story.",
    ],
  },

  banner: {
    key: "banner",
    label: "Banner",
    aspectRatio: "16:9",
    previewMode: "wide horizontal banner concept preview",
    layoutFocus:
      "Bố cục ngang rộng, chia vùng rõ giữa hero visual và thông điệp chính, phù hợp social/web banner.",
    typographyFocus:
      "Typography rõ, headline ngắn, cần đọc tốt trong không gian ngang.",
    imageFocus:
      "Visual chính hoặc sản phẩm cần được đặt như hero trong bố cục ngang.",
    contentFocus:
      "Thông tin cô đọng, tránh dài dòng vì banner cần nhịp nhìn nhanh.",
    conceptGuardrails: [
      "Không mô tả như poster dọc.",
      "Không dùng bố cục card vuông kiểu social post.",
    ],
  },

  facebook_cover: {
    key: "facebook_cover",
    label: "Facebook Cover",
    aspectRatio: "205:78",
    previewMode:
      "wide social cover concept preview suitable for Facebook or Zalo OA cover",
    layoutFocus:
      "Bố cục cover ngang rất rộng, ưu tiên vùng an toàn, tránh đặt thông tin quan trọng sát mép.",
    typographyFocus:
      "Typography headline ngắn, rõ, giữ cân bằng trong khung cover ngang.",
    imageFocus:
      "Hero visual hoặc key visual đặt lệch hoặc cân đối để phù hợp bố cục cover.",
    contentFocus:
      "Ít nội dung, ưu tiên nhận diện thương hiệu và thông điệp chính.",
    conceptGuardrails: [
      "Không mô tả như poster.",
      "Không dùng quá nhiều text block.",
    ],
  },

  poster: {
    key: "poster",
    label: "Poster",
    aspectRatio: "4:5",
    previewMode: "poster concept preview with strong visual hierarchy",
    layoutFocus:
      "Bố cục poster dọc, có hierarchy mạnh giữa headline, hero visual và thông tin phụ.",
    typographyFocus:
      "Typography cần có sức nặng thị giác, hỗ trợ truyền thông rõ ràng từ xa hoặc trên social.",
    imageFocus:
      "Hero visual cần có lực hút mạnh, đóng vai trò trung tâm của concept.",
    contentFocus:
      "Có thể chứa thông tin nhiều hơn social post nhưng vẫn phải rõ cấp bậc nội dung.",
    conceptGuardrails: [
      "Chỉ dùng logic poster khi sản phẩm thực sự là poster/flyer/event visual gần poster.",
    ],
  },

  price_list: {
    key: "price_list",
    label: "Price List",
    aspectRatio: "1000:1414",
    previewMode: "one-page price list concept preview",
    layoutFocus:
      "Bố cục một trang với danh mục giá rõ ràng, chia nhóm tốt, ưu tiên khả năng quét nhanh.",
    typographyFocus:
      "Typography phải rõ, dễ đọc, hỗ trợ phân cấp giữa tên mục, giá và ghi chú.",
    imageFocus:
      "Hình ảnh chỉ đóng vai trò hỗ trợ, không lấn át phần thông tin giá.",
    contentFocus:
      "Nội dung ưu tiên danh sách sản phẩm/dịch vụ, mức giá, nhóm thông tin và ghi chú cần thiết.",
    conceptGuardrails: [
      "Không mô tả như poster khuyến mãi.",
      "Không đặt CTA làm trọng tâm chính.",
      "Phải ưu tiên readability và information hierarchy.",
    ],
  },

  menu_one_page: {
    key: "menu_one_page",
    label: "Menu One-page",
    aspectRatio: "1000:1414",
    previewMode: "one-page menu concept preview",
    layoutFocus:
      "Bố cục một trang cho menu, chia section rõ, cân bằng giữa món/nhóm món/giá và hình minh họa.",
    typographyFocus:
      "Typography phải giúp menu dễ đọc, phân cấp rõ giữa tên nhóm, tên món và giá.",
    imageFocus:
      "Hình ảnh món hoặc visual thương hiệu chỉ nên hỗ trợ, không được phá khả năng đọc menu.",
    contentFocus:
      "Nội dung tập trung vào các nhóm món, tên món, giá và mô tả ngắn nếu cần.",
    conceptGuardrails: [
      "Không mô tả như social poster.",
      "Không để visual lớn lấn át danh mục món và giá.",
    ],
  },

  logo: {
    key: "logo",
    label: "Logo",
    aspectRatio: "1:1",
    previewMode: "logo concept presentation board",
    layoutFocus:
      "Bố cục dạng presentation board cho logo: logo mark, wordmark, lockup, phiên bản đơn sắc và ứng dụng cơ bản.",
    typographyFocus:
      "Typography tập trung vào wordmark, brand personality và khả năng nhận diện, không phải typography quảng cáo.",
    imageFocus:
      "Không dùng hero product photo như poster. Trọng tâm là logo symbol, construction, spacing và brand mark presentation.",
    contentFocus:
      "Nội dung tập trung vào ý tưởng logo, tính cách thương hiệu, hệ dấu hiệu và khả năng ứng dụng.",
    conceptGuardrails: [
      "Tuyệt đối không mô tả như poster/social post.",
      "Không nói CTA ở dưới, headline ở trên.",
      "Không yêu cầu ảnh sản phẩm làm trọng tâm.",
      "Phải thể hiện đúng bản chất logo design.",
    ],
  },

  packaging_label: {
    key: "packaging_label",
    label: "Packaging Label",
    aspectRatio: "4:5",
    previewMode:
      "packaging label concept preview with label applied on a product mockup",
    layoutFocus:
      "Bố cục ưu tiên mặt label, tên sản phẩm, biến thể, nhận diện thương hiệu và vùng thông tin cần thiết.",
    typographyFocus:
      "Typography cần hỗ trợ nhận diện nhãn hàng và đọc tốt ở kích thước bao bì.",
    imageFocus:
      "Trọng tâm là nhãn bao bì và cách nó xuất hiện trên mockup sản phẩm.",
    contentFocus:
      "Nội dung ưu tiên tên sản phẩm, dòng sản phẩm, biến thể, điểm nổi bật và vùng thông tin packaging.",
    conceptGuardrails: [
      "Không mô tả như poster quảng cáo.",
      "Phải có tư duy packaging/label application.",
    ],
  },

  voucher: {
    key: "voucher",
    label: "Voucher / Gift Card",
    aspectRatio: "85:55",
    previewMode: "voucher or gift card concept preview",
    layoutFocus:
      "Bố cục dạng voucher/card, cần rõ giá trị ưu đãi, thời hạn, điều kiện và nhận diện thương hiệu.",
    typographyFocus:
      "Typography cần nhấn mạnh giá trị ưu đãi hoặc nội dung trọng tâm của voucher.",
    imageFocus:
      "Hình ảnh hỗ trợ vừa phải, không được lấn át giá trị sử dụng của voucher.",
    contentFocus:
      "Nội dung ưu tiên mức ưu đãi, thông tin áp dụng, thương hiệu và ghi chú quan trọng.",
    conceptGuardrails: [
      "Không mô tả như poster khuyến mãi treo tường.",
      "Phải thể hiện bản chất card/voucher.",
    ],
  },

  standee: {
    key: "standee",
    label: "Standee",
    aspectRatio: "85:200",
    previewMode: "vertical standee concept preview",
    layoutFocus:
      "Bố cục dọc cao, truyền thông rõ từ trên xuống dưới, phù hợp vật phẩm in trưng bày.",
    typographyFocus:
      "Typography cần đủ mạnh để đọc từ xa, headline và info block rõ ràng.",
    imageFocus:
      "Visual chính hoặc sản phẩm phải nổi bật trong khung dọc cao.",
    contentFocus:
      "Nội dung nên có headline, thông tin chính, điểm nhấn và CTA/địa chỉ nếu cần.",
    conceptGuardrails: [
      "Không mô tả như social post hoặc story.",
      "Phải có tư duy vật phẩm trưng bày in ấn.",
    ],
  },

  flyer: {
    key: "flyer",
    label: "Flyer",
    aspectRatio: "1000:1414",
    previewMode: "flyer concept preview",
    layoutFocus:
      "Bố cục tờ rơi cần cân bằng giữa visual và lượng thông tin giới thiệu.",
    typographyFocus:
      "Typography rõ, hỗ trợ truyền tải thông tin đầy đủ hơn social post.",
    imageFocus:
      "Visual hỗ trợ thông tin, không chỉ làm nền trang trí.",
    contentFocus:
      "Nội dung gồm lợi ích, điểm nổi bật, giới thiệu ngắn và lời kêu gọi hành động.",
    conceptGuardrails: [
      "Không chỉ đơn thuần là poster; flyer thường có thông tin giới thiệu cụ thể hơn.",
    ],
  },

  namecard: {
    key: "namecard",
    label: "Namecard",
    aspectRatio: "85:55",
    previewMode: "business card front-and-back concept preview",
    layoutFocus:
      "Bố cục namecard cần gọn, chuyên nghiệp, rõ mặt trước/mặt sau hoặc 2 hướng xử lý thông tin.",
    typographyFocus:
      "Typography cần rõ, chuyên nghiệp, phù hợp thông tin liên hệ và thương hiệu cá nhân/doanh nghiệp.",
    imageFocus:
      "Không cần hero visual lớn; trọng tâm là information layout và brand mark.",
    contentFocus:
      "Nội dung tập trung vào tên, chức danh, thông tin liên hệ và dấu hiệu thương hiệu.",
    conceptGuardrails: [
      "Không mô tả như poster.",
      "Phải thể hiện đúng bản chất namecard.",
    ],
  },

  loyalty_card: {
    key: "loyalty_card",
    label: "Loyalty Card",
    aspectRatio: "85:55",
    previewMode: "membership or loyalty card concept preview",
    layoutFocus:
      "Bố cục card cần rõ thương hiệu, giá trị thành viên/tích điểm và khả năng ứng dụng hai mặt.",
    typographyFocus:
      "Typography gọn, hiện đại, hỗ trợ card format.",
    imageFocus:
      "Hình ảnh chỉ hỗ trợ vừa phải; card identity là trọng tâm.",
    contentFocus:
      "Nội dung tập trung vào tên card, cơ chế thành viên/tích điểm và nhận diện thương hiệu.",
    conceptGuardrails: ["Không mô tả như social post hay poster."],
  },

  product_visual: {
    key: "product_visual",
    label: "Product Visual",
    aspectRatio: "4:5",
    previewMode:
      "product hero visual concept preview for social commerce or e-commerce",
    layoutFocus:
      "Bố cục tập trung vào sản phẩm như hero, có thể có callout lợi ích, giá trị hoặc feature highlight.",
    typographyFocus:
      "Typography hỗ trợ visual bán hàng, ngắn gọn và rõ.",
    imageFocus: "Sản phẩm là trung tâm tuyệt đối của thiết kế.",
    contentFocus:
      "Nội dung ưu tiên sản phẩm, USP ngắn, benefit callout hoặc offer nhẹ.",
    conceptGuardrails: ["Không được biến thành poster sự kiện."],
  },

  table_tent: {
    key: "table_tent",
    label: "Table Tent",
    aspectRatio: "1414:1000",
    previewMode: "table tent concept preview for tabletop display",
    layoutFocus:
      "Bố cục phù hợp vật phẩm để bàn, cần nhìn rõ ở khoảng cách gần, rõ hai mặt hoặc một mặt chính.",
    typographyFocus:
      "Typography rõ, đủ nổi để đọc trên bàn/quầy.",
    imageFocus:
      "Visual gọn, phục vụ mục đích trưng bày tại chỗ.",
    contentFocus:
      "Thông tin ngắn gọn, ưu tiên sản phẩm nổi bật, QR/CTA hoặc thông điệp nhanh.",
    conceptGuardrails: [
      "Không mô tả như poster dọc.",
      "Phải có tư duy signage để bàn.",
    ],
  },
};

export function resolveDeliverableSpec(input: {
  designType?: string | null;
  packageName?: string | null;
  packageCode?: string | null;
  packageType?: string | null;
  requestTitle?: string | null;
}): DeliverableSpec {
  const joined = normalizeText(
    [
      input.packageCode,
      input.packageName,
      input.packageType,
      input.requestTitle,
      input.designType,
    ].join(" "),
  );

  if (includesAny(joined, ["logo"])) return SPECS.logo;
  if (includesAny(joined, ["story"])) return SPECS.story;
  if (includesAny(joined, ["facebook cover", "zalo cover", "cover"])) {
    return SPECS.facebook_cover;
  }
  if (includesAny(joined, ["banner"])) return SPECS.banner;
  if (includesAny(joined, ["menu one page", "one page menu", "menu"])) {
    return SPECS.menu_one_page;
  }
  if (includesAny(joined, ["price list", "bang gia", "bảng giá"])) {
    return SPECS.price_list;
  }
  if (includesAny(joined, ["voucher", "gift card", "coupon", "phieu uu dai"])) {
    return SPECS.voucher;
  }
  if (
    includesAny(joined, [
      "packaging",
      "label",
      "bao bi",
      "bao bì",
      "tem nhan",
      "tem nhãn",
    ])
  ) {
    return SPECS.packaging_label;
  }
  if (includesAny(joined, ["standee"])) return SPECS.standee;
  if (includesAny(joined, ["flyer", "to roi", "tờ rơi"])) return SPECS.flyer;
  if (includesAny(joined, ["namecard", "business card", "card visit"])) {
    return SPECS.namecard;
  }
  if (
    includesAny(joined, [
      "loyalty card",
      "membership card",
      "the thanh vien",
      "thẻ thành viên",
      "the tich diem",
      "thẻ tích điểm",
    ])
  ) {
    return SPECS.loyalty_card;
  }
  if (includesAny(joined, ["product visual", "product"])) {
    return SPECS.product_visual;
  }
  if (includesAny(joined, ["table tent"])) return SPECS.table_tent;
  if (includesAny(joined, ["event key visual", "key visual", "poster"])) {
    return SPECS.poster;
  }
  if (includesAny(joined, ["social post", "post"])) return SPECS.social_post;

  const normalizedType = normalizeText(input.designType);

  if (normalizedType.includes("logo")) return SPECS.logo;
  if (normalizedType.includes("menu")) return SPECS.menu_one_page;
  if (normalizedType.includes("banner")) return SPECS.banner;
  if (normalizedType.includes("packaging")) return SPECS.packaging_label;
  if (normalizedType.includes("poster")) return SPECS.poster;
  if (normalizedType.includes("social")) return SPECS.social_post;

  return SPECS.social_post;
}