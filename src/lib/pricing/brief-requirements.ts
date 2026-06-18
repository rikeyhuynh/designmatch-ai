import {
  getPackageTypeLabel,
  getPriceDetailLevel,
  getPricingTierLabel,
  type ServicePackage,
} from "@/lib/pricing/service-packages";

export type BriefRequirementLevel = "fixed" | "basic" | "medium" | "high";

export type PackageBriefContextInput = {
  servicePackage: ServicePackage;
  selectedPriceVnd: number;
};

export type PackageBriefContext = {
  packageSummary: string;
  productSpecificBriefRules: string;
  priceBasedBriefRules: string;
};

export function buildPackageBriefContext({
  servicePackage,
  selectedPriceVnd,
}: PackageBriefContextInput): PackageBriefContext {
  const priceDetail = getPriceDetailLevel({
    selectedPriceVnd,
    priceMinVnd: servicePackage.priceMinVnd,
    priceMaxVnd: servicePackage.priceMaxVnd,
  });

  const priceLevel = priceDetail.level as BriefRequirementLevel;

  return {
    packageSummary: buildPackageSummary({
      servicePackage,
      selectedPriceVnd,
      priceDetailLabel: priceDetail.label,
      priceDetailDescription: priceDetail.description,
    }),
    productSpecificBriefRules: getProductSpecificBriefRules(
      servicePackage.code,
    ),
    priceBasedBriefRules: getPriceBasedBriefRules(priceLevel),
  };
}

function buildPackageSummary({
  servicePackage,
  selectedPriceVnd,
  priceDetailLabel,
  priceDetailDescription,
}: {
  servicePackage: ServicePackage;
  selectedPriceVnd: number;
  priceDetailLabel: string;
  priceDetailDescription: string;
}) {
  return [
    `Tầng dịch vụ: ${getPricingTierLabel(servicePackage.tier)}`,
    `Tên gói: ${servicePackage.name}`,
    `Loại gói: ${getPackageTypeLabel(servicePackage.type)}`,
    `Giá người dùng dự kiến trả: ${selectedPriceVnd.toLocaleString(
      "vi-VN",
    )}đ`,
    `Khoảng giá gói: ${servicePackage.priceMinVnd.toLocaleString(
      "vi-VN",
    )}đ - ${servicePackage.priceMaxVnd.toLocaleString("vi-VN")}đ`,
    `Mức độ brief theo giá: ${priceDetailLabel}`,
    `Ý nghĩa mức độ brief: ${priceDetailDescription}`,
    `Số vòng sửa: ${
      servicePackage.revisionLimit === null
        ? "theo thỏa thuận"
        : `${servicePackage.revisionLimit} vòng`
    }`,
    `Số lượng bàn giao: ${
      servicePackage.deliverableLimit === null
        ? "theo phạm vi"
        : `${servicePackage.deliverableLimit} ấn phẩm`
    }`,
    `Scope note: ${servicePackage.scopeNote}`,
    "",
    "Việc phù hợp với gói:",
    ...servicePackage.suitableFor.map((item) => `- ${item}`),
    "",
    "Không bao gồm:",
    ...servicePackage.notIncluded.map((item) => `- ${item}`),
  ].join("\n");
}

export function getProductSpecificBriefRules(packageCode: string) {
  const map: Record<string, string> = {
    mini_story: storyBriefRules(),
    custom_story: storyBriefRules(),

    mini_social_post: socialPostBriefRules(),
    custom_social_post: socialPostBriefRules(),

    mini_banner: bannerBriefRules(),
    mini_facebook_cover: coverBriefRules(),

    mini_poster: posterBriefRules(),
    custom_poster: posterBriefRules(),

    mini_price_list: priceListBriefRules(),
    mini_menu_one_page: menuBriefRules(),
    custom_menu_one_page: menuBriefRules(),

    event_key_visual_single: eventKeyVisualBriefRules(),

    logo_basic: logoBriefRules(),

    packaging_label_single: packagingLabelBriefRules(),

    voucher_single: voucherBriefRules(),

    standee_single: standeeBriefRules(),

    flyer_single: flyerBriefRules(),

    namecard_single: namecardBriefRules(),

    loyalty_card_single: loyaltyCardBriefRules(),

    product_visual_single: productVisualBriefRules(),

    table_tent_single: tableTentBriefRules(),
  };

  return (
    map[packageCode] ??
    [
      "Brief phải áp dụng cho một ấn phẩm thiết kế đơn lẻ.",
      "Không được mở rộng thành bộ sản phẩm, campaign nhiều ấn phẩm hoặc team booking.",
      "Cần ghi rõ mục tiêu, nội dung chính, phong cách, yêu cầu kỹ thuật, giới hạn sửa và tiêu chí bàn giao.",
    ].join("\n")
  );
}

export function getPriceBasedBriefRules(level: BriefRequirementLevel) {
  if (level === "high") {
    return [
      "Mức giá đang ở phần cao của gói.",
      "Brief phải chi tiết hơn mức cơ bản nhưng vẫn chỉ nằm trong phạm vi một ấn phẩm đơn lẻ.",
      "Cần yêu cầu designer làm rõ hơn về visual hierarchy, mood, bố cục, xử lý hình ảnh, typography, màu sắc, file bàn giao và tiêu chí nghiệm thu.",
      "Có thể yêu cầu thêm một số đề xuất triển khai trong cùng một ấn phẩm, ví dụ: hướng layout chính, lưu ý crop-safe, phiên bản ready-to-post/ready-to-print nếu phù hợp với loại ấn phẩm.",
      "Không được tự mở rộng thành nhiều ấn phẩm khác nhau.",
    ].join("\n");
  }

  if (level === "medium") {
    return [
      "Mức giá đang ở phần giữa của gói.",
      "Brief phải rõ ràng, đủ thông tin để designer triển khai chính xác.",
      "Cần có mục tiêu thiết kế, thông điệp, nội dung cần đưa vào, phong cách, màu sắc, bố cục gợi ý, yêu cầu kỹ thuật và tiêu chí nghiệm thu.",
      "Không yêu cầu quá nhiều phương án hoặc phạm vi vượt gói.",
    ].join("\n");
  }

  if (level === "basic") {
    return [
      "Mức giá đang ở phần thấp của gói.",
      "Brief vẫn phải chi tiết và rõ ràng, không được sơ sài.",
      "Tuy nhiên yêu cầu phải gọn phạm vi, tránh đòi hỏi nhiều concept, nhiều phiên bản hoặc nhiều deliverable.",
      "Cần tập trung vào một hướng visual rõ nhất để designer làm hiệu quả trong scope nhỏ.",
    ].join("\n");
  }

  return [
    "Gói có giá cố định.",
    "Brief phải rõ ràng theo đúng phạm vi cố định của gói.",
    "Không được mở rộng yêu cầu vượt scope.",
  ].join("\n");
}

function socialPostBriefRules() {
  return [
    "Đây là brief cho 1 social post đơn lẻ.",
    "Brief cần ghi rõ: nền tảng đăng tải, tỷ lệ khung hình đề xuất, mục tiêu post, thông điệp chính, CTA nếu có.",
    "Cần xác định visual hierarchy: headline, sub-headline, hình sản phẩm/chủ thể, thông tin phụ, logo/thương hiệu.",
    "Cần ghi rõ mood thiết kế, màu sắc, typography, mức độ nổi bật của sản phẩm.",
    "Cần ghi rõ nội dung bắt buộc xuất hiện trên post và nội dung có thể rút gọn.",
    "Không được biến thành carousel, campaign hoặc bộ social post.",
  ].join("\n");
}

function storyBriefRules() {
  return [
    "Đây là brief cho 1 story đơn lẻ.",
    "Brief cần ghi rõ tỷ lệ 9:16, vùng an toàn cho text, mục tiêu story và hành động mong muốn.",
    "Cần ưu tiên thông điệp ngắn, dễ đọc trên màn hình điện thoại.",
    "Cần ghi rõ phần text chính, text phụ, sticker/CTA nếu có.",
    "Không được yêu cầu animation hoặc nhiều story liên hoàn nếu gói không bao gồm.",
  ].join("\n");
}

function bannerBriefRules() {
  return [
    "Đây là brief cho 1 banner đơn lẻ.",
    "Brief cần ghi rõ nơi sử dụng banner: social, website, Zalo, cover nhỏ hoặc quảng cáo digital.",
    "Cần nêu tỷ lệ/kích thước nếu biết, vùng text-safe, thông điệp chính, CTA.",
    "Cần xác định độ nổi bật của headline và sản phẩm.",
    "Không được yêu cầu nhiều kích thước khác nhau nếu gói không bao gồm.",
  ].join("\n");
}

function coverBriefRules() {
  return [
    "Đây là brief cho 1 ảnh bìa Facebook/Zalo OA đơn lẻ.",
    "Brief cần ghi rõ nền tảng sử dụng, thông điệp trên cover, logo/thương hiệu, thông tin liên hệ nếu có.",
    "Cần lưu ý vùng an toàn vì ảnh đại diện có thể che một phần cover.",
    "Cần yêu cầu bố cục rõ ràng, dễ đọc trên desktop và mobile.",
  ].join("\n");
}

function posterBriefRules() {
  return [
    "Đây là brief cho 1 poster đơn lẻ.",
    "Brief cần ghi rõ poster dùng để đăng digital hay in ấn.",
    "Cần có mục tiêu poster, thông điệp chính, headline, thông tin sự kiện/ưu đãi, thời gian, địa điểm, CTA nếu có.",
    "Cần xác định visual hierarchy rõ: thông tin nào lớn nhất, thông tin nào phụ.",
    "Cần ghi rõ phong cách hình ảnh, màu sắc, typography, chủ thể chính, cảm giác cần truyền tải.",
    "Nếu dùng để in, cần ghi rõ kích thước, hệ màu, bleed/safe margin ở mức cơ bản.",
    "Không được mở rộng thành key visual campaign nhiều ấn phẩm.",
  ].join("\n");
}

function priceListBriefRules() {
  return [
    "Đây là brief cho 1 bảng giá đơn lẻ.",
    "Brief cần ưu tiên tính dễ đọc, rõ nhóm dịch vụ/sản phẩm và giá.",
    "Cần ghi rõ số lượng mục giá, nhóm thông tin, đơn vị tiền tệ, thông tin phụ nếu có.",
    "Cần yêu cầu bố cục sạch, phân cấp rõ, tránh trang trí làm khó đọc.",
    "Không được mở rộng thành menu nhiều trang.",
  ].join("\n");
}

function menuBriefRules() {
  return [
    "Đây là brief cho 1 menu một trang/một mặt.",
    "Brief cần ghi rõ nhóm món/dịch vụ, tên món, giá, mô tả ngắn nếu có.",
    "Cần xác định ưu tiên: dễ đọc, thẩm mỹ, đồng bộ thương hiệu, in ấn hay digital.",
    "Cần nêu số lượng item dự kiến để designer bố trí hợp lý.",
    "Cần ghi rõ kích thước nếu dùng để in.",
    "Không được biến thành menu nhiều trang hoặc hệ thống menu đầy đủ nếu gói không bao gồm.",
  ].join("\n");
}

function eventKeyVisualBriefRules() {
  return [
    "Đây là brief cho 1 key visual sự kiện đơn lẻ.",
    "Brief cần ghi rõ tên sự kiện, chủ đề, thông điệp, đối tượng tham dự, mood tổng thể.",
    "Cần xác định hình ảnh chủ đạo, biểu tượng, màu sắc, typography và cảm giác sân khấu/truyền thông.",
    "Cần nêu rõ key visual này là hình ảnh chính, không bao gồm triển khai hàng loạt ấn phẩm.",
    "Cần có tiêu chí: dễ nhận diện, có khả năng mở rộng về sau nhưng chỉ bàn giao 1 key visual trong gói này.",
  ].join("\n");
}

function logoBriefRules() {
  return [
    "Đây là brief cho 1 logo basic.",
    "Brief cần ghi rõ tên thương hiệu, ngành, tính cách thương hiệu, đối tượng khách hàng.",
    "Cần xác định hướng logo mong muốn: chữ, biểu tượng, kết hợp, tối giản, dễ ứng dụng.",
    "Cần ghi rõ màu sắc nên dùng/tránh, cảm giác thương hiệu, các logo tham khảo nếu có.",
    "Cần nêu ứng dụng chính của logo: biển hiệu, avatar, bao bì, social.",
    "Không được yêu cầu brand guideline đầy đủ, nhiều concept phức tạp hoặc hệ nhận diện hoàn chỉnh.",
  ].join("\n");
}

function packagingLabelBriefRules() {
  return [
    "Đây là brief cho 1 tem nhãn/bao bì đơn lẻ.",
    "Brief cần ghi rõ loại sản phẩm, kích thước tem/nhãn nếu có, chất liệu/in ấn nếu biết.",
    "Cần có thông tin bắt buộc: tên sản phẩm, thương hiệu, mùi vị/phiên bản, dung tích/khối lượng, thông tin phụ nếu có.",
    "Cần xác định phong cách bao bì: cao cấp, handmade, organic, trẻ trung, tối giản...",
    "Cần lưu ý khả năng đọc khi in nhỏ.",
    "Không được mở rộng thành nhiều SKU hoặc bộ bao bì nhiều sản phẩm.",
  ].join("\n");
}

function voucherBriefRules() {
  return [
    "Đây là brief cho 1 voucher/gift card đơn lẻ.",
    "Brief cần ghi rõ giá trị ưu đãi, điều kiện sử dụng, thời hạn, thương hiệu, mã/QR nếu có.",
    "Cần ưu tiên tính rõ ràng và cảm giác quà tặng/khuyến mãi.",
    "Cần nêu kích thước hoặc kênh sử dụng: in ấn, digital, gửi online.",
    "Không được yêu cầu hệ thống mã tự động hoặc nhiều mẫu voucher.",
  ].join("\n");
}

function standeeBriefRules() {
  return [
    "Đây là brief cho 1 standee đơn lẻ.",
    "Brief cần ghi rõ kích thước dự kiến, nơi đặt standee, khoảng cách người xem, thông điệp chính.",
    "Cần ưu tiên headline lớn, thông tin phụ ngắn, CTA rõ.",
    "Cần ghi rõ yêu cầu in ấn cơ bản: file rõ, safe margin, không đặt text sát mép.",
    "Không bao gồm chi phí in hoặc nhiều kích thước khác nhau.",
  ].join("\n");
}

function flyerBriefRules() {
  return [
    "Đây là brief cho 1 flyer/tờ rơi đơn lẻ.",
    "Brief cần ghi rõ mục tiêu phát flyer, đối tượng nhận, thông tin chính, CTA, địa chỉ/liên hệ.",
    "Cần xác định kích thước nếu in ấn, mặt trước hay một mặt.",
    "Cần ưu tiên bố cục dễ scan nhanh, headline rõ, thông tin chia nhóm.",
    "Không được mở rộng thành brochure nhiều trang.",
  ].join("\n");
}

function namecardBriefRules() {
  return [
    "Đây là brief cho 1 namecard đơn lẻ.",
    "Brief cần ghi rõ tên, chức danh, số điện thoại, email, địa chỉ, social/QR nếu có.",
    "Cần xác định phong cách: chuyên nghiệp, tối giản, trẻ trung, cao cấp...",
    "Cần lưu ý tính dễ đọc khi in kích thước nhỏ.",
    "Không bao gồm hệ nhận diện thương hiệu đầy đủ.",
  ].join("\n");
}

function loyaltyCardBriefRules() {
  return [
    "Đây là brief cho 1 thẻ tích điểm/thẻ thành viên đơn lẻ.",
    "Brief cần ghi rõ số ô tích điểm, điều kiện đổi quà, thông tin thương hiệu, QR/liên hệ nếu có.",
    "Cần ưu tiên bố cục rõ, dễ dùng thực tế tại cửa hàng.",
    "Không bao gồm hệ thống CRM, app hoặc membership tự động.",
  ].join("\n");
}

function productVisualBriefRules() {
  return [
    "Đây là brief cho 1 product visual đơn lẻ.",
    "Brief cần ghi rõ sản phẩm chính, lợi ích nổi bật, giá/ưu đãi nếu có, kênh sử dụng.",
    "Cần xác định mức độ nổi bật của sản phẩm, bối cảnh, mood, màu nền, text overlay.",
    "Cần ưu tiên khả năng bán hàng và rõ thông tin.",
    "Không bao gồm chụp ảnh, nhiều SKU hoặc video sản phẩm.",
  ].join("\n");
}

function tableTentBriefRules() {
  return [
    "Đây là brief cho 1 table tent/standee bàn đơn lẻ.",
    "Brief cần ghi rõ nơi đặt, kích thước nếu có, thông điệp chính, ưu đãi/sản phẩm cần đẩy.",
    "Cần ưu tiên đọc gần, bố cục gọn, CTA rõ.",
    "Không bao gồm in ấn, thi công hoặc nhiều mẫu khác nhau.",
  ].join("\n");
}