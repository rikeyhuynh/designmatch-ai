import type {
  DatabaseRelationship,
  DatabaseTable,
} from "@/types/database-contract";

export const databaseTables: DatabaseTable[] = [
  {
    name: "profiles",
    group: "auth",
    purpose:
      "Lưu thông tin chung của mọi tài khoản sau khi đăng ký bằng Supabase Auth.",
    usedBy: ["customer", "designer", "admin", "system"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Trùng với auth.users.id.",
      },
      {
        name: "role",
        type: "customer | designer | admin",
        required: true,
        description: "Vai trò chính của tài khoản.",
      },
      {
        name: "full_name",
        type: "text",
        required: true,
        description: "Tên hiển thị của người dùng.",
      },
      {
        name: "avatar_url",
        type: "text",
        description: "Ảnh đại diện nếu có.",
      },
      {
        name: "created_at",
        type: "timestamp",
        required: true,
        description: "Thời điểm tạo tài khoản.",
      },
    ],
  },
  {
    name: "customer_profiles",
    group: "customer",
    purpose: "Lưu thông tin bổ sung của khách hàng/hộ kinh doanh.",
    usedBy: ["customer", "admin"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Khóa chính.",
      },
      {
        name: "profile_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới profiles.id.",
      },
      {
        name: "business_name",
        type: "text",
        description: "Tên thương hiệu/cửa hàng.",
      },
      {
        name: "business_industry",
        type: "text",
        description: "Ngành hàng chính.",
      },
      {
        name: "location",
        type: "text",
        description: "Khu vực hoạt động.",
      },
    ],
  },
  {
    name: "designer_profiles",
    group: "designer",
    purpose:
      "Lưu hồ sơ designer, ngân sách nhận job, lĩnh vực mạnh và trạng thái duyệt.",
    usedBy: ["designer", "admin", "ai"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Khóa chính.",
      },
      {
        name: "profile_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới profiles.id.",
      },
      {
        name: "display_name",
        type: "text",
        required: true,
        description: "Tên hiển thị của designer/studio.",
      },
      {
        name: "headline",
        type: "text",
        description: "Một câu mô tả chuyên môn.",
      },
      {
        name: "bio",
        type: "text",
        description: "Mô tả chi tiết về designer.",
      },
      {
        name: "min_budget_vnd",
        type: "integer",
        description: "Mức giá tối thiểu có thể nhận.",
      },
      {
        name: "max_budget_vnd",
        type: "integer",
        description: "Mức giá tối đa thường nhận.",
      },
      {
        name: "verification_status",
        type: "pending | approved | rejected",
        required: true,
        description: "Trạng thái duyệt hồ sơ bởi admin.",
      },
    ],
  },
  {
    name: "portfolio_items",
    group: "designer",
    purpose:
      "Lưu portfolio của designer để AI phân tích Style DNA và dùng cho matching.",
    usedBy: ["designer", "customer", "admin", "ai"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Khóa chính.",
      },
      {
        name: "designer_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới designer_profiles.id.",
      },
      {
        name: "title",
        type: "text",
        required: true,
        description: "Tên dự án portfolio.",
      },
      {
        name: "image_url",
        type: "text",
        description: "Ảnh portfolio lưu ở Supabase Storage.",
      },
      {
        name: "industry",
        type: "text",
        description: "Ngành hàng của portfolio.",
      },
      {
        name: "category",
        type: "text",
        description: "Loại thiết kế.",
      },
      {
        name: "styles",
        type: "text[]",
        description: "Các style chính của portfolio.",
      },
    ],
  },
  {
    name: "design_requests",
    group: "request",
    purpose:
      "Lưu yêu cầu thiết kế của customer trước khi AI tạo brief và matching designer.",
    usedBy: ["customer", "designer", "admin", "ai"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Khóa chính.",
      },
      {
        name: "customer_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới customer_profiles.id.",
      },
      {
        name: "title",
        type: "text",
        required: true,
        description: "Tên yêu cầu thiết kế.",
      },
      {
        name: "business_name",
        type: "text",
        required: true,
        description: "Tên thương hiệu/cửa hàng trong request.",
      },
      {
        name: "industry",
        type: "text",
        required: true,
        description: "Ngành hàng.",
      },
      {
        name: "category",
        type: "text",
        required: true,
        description: "Loại thiết kế cần làm.",
      },
      {
        name: "description",
        type: "text",
        required: true,
        description: "Mô tả nhu cầu bằng ngôn ngữ tự nhiên.",
      },
      {
        name: "budget_min_vnd",
        type: "integer",
        description: "Ngân sách tối thiểu.",
      },
      {
        name: "budget_max_vnd",
        type: "integer",
        description: "Ngân sách tối đa.",
      },
      {
        name: "status",
        type: "draft | ai_processing | ready_to_match | matched | in_progress | completed | cancelled",
        required: true,
        description: "Trạng thái request.",
      },
    ],
  },
  {
    name: "ai_briefs",
    group: "request",
    purpose:
      "Lưu brief đã được AI chuẩn hóa từ design request của customer.",
    usedBy: ["customer", "designer", "admin", "ai"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Khóa chính.",
      },
      {
        name: "request_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới design_requests.id.",
      },
      {
        name: "objective",
        type: "text",
        required: true,
        description: "Mục tiêu thiết kế.",
      },
      {
        name: "visual_direction",
        type: "text",
        required: true,
        description: "Định hướng hình ảnh.",
      },
      {
        name: "key_message",
        type: "text",
        description: "Thông điệp chính.",
      },
      {
        name: "deliverables",
        type: "text[]",
        description: "Danh sách đầu ra cần bàn giao.",
      },
      {
        name: "risk_level",
        type: "low | medium | high",
        description: "Mức rủi ro của brief.",
      },
      {
        name: "brief_completeness_score",
        type: "integer",
        description: "Điểm đầy đủ của brief.",
      },
    ],
  },
  {
    name: "designer_matches",
    group: "matching",
    purpose:
      "Lưu kết quả matching giữa request và designer, kèm lý do đề xuất.",
    usedBy: ["customer", "designer", "admin", "ai"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Khóa chính.",
      },
      {
        name: "request_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới design_requests.id.",
      },
      {
        name: "designer_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới designer_profiles.id.",
      },
      {
        name: "match_score",
        type: "integer",
        required: true,
        description: "Điểm phù hợp từ 0 đến 100.",
      },
      {
        name: "taste_gap",
        type: "integer",
        description: "Khoảng cách gu thị giác.",
      },
      {
        name: "reason",
        type: "text",
        description: "Lý do hệ thống đề xuất designer này.",
      },
    ],
  },
  {
    name: "jobs",
    group: "job",
    purpose:
      "Lưu dự án chính thức sau khi customer chọn designer và xác nhận proposal.",
    usedBy: ["customer", "designer", "admin"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Khóa chính.",
      },
      {
        name: "request_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới design_requests.id.",
      },
      {
        name: "customer_id",
        type: "uuid",
        required: true,
        description: "Customer tham gia job.",
      },
      {
        name: "designer_id",
        type: "uuid",
        required: true,
        description: "Designer nhận job.",
      },
      {
        name: "status",
        type: "proposal_pending | payment_pending | active | reviewing | completed | disputed",
        required: true,
        description: "Trạng thái job.",
      },
      {
        name: "agreed_price_vnd",
        type: "integer",
        required: true,
        description: "Giá đã thống nhất.",
      },
      {
        name: "due_at",
        type: "timestamp",
        description: "Deadline bàn giao.",
      },
    ],
  },
  {
    name: "payments",
    group: "payment",
    purpose:
      "Lưu trạng thái thanh toán thủ công trong MVP manual bank transfer.",
    usedBy: ["customer", "admin", "system"],
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        description: "Khóa chính.",
      },
      {
        name: "job_id",
        type: "uuid",
        required: true,
        description: "Liên kết tới jobs.id.",
      },
      {
        name: "amount_vnd",
        type: "integer",
        required: true,
        description: "Số tiền cần thanh toán.",
      },
      {
        name: "status",
        type: "waiting_transfer | waiting_admin_confirm | confirmed | rejected",
        required: true,
        description: "Trạng thái payment.",
      },
      {
        name: "transfer_note",
        type: "text",
        required: true,
        description: "Nội dung chuyển khoản.",
      },
      {
        name: "admin_note",
        type: "text",
        description: "Ghi chú đối soát của admin.",
      },
    ],
  },
];

export const databaseRelationships: DatabaseRelationship[] = [
  {
    from: "profiles.id",
    to: "customer_profiles.profile_id",
    type: "one-to-one",
    description: "Một tài khoản customer có một customer profile.",
  },
  {
    from: "profiles.id",
    to: "designer_profiles.profile_id",
    type: "one-to-one",
    description: "Một tài khoản designer có một designer profile.",
  },
  {
    from: "designer_profiles.id",
    to: "portfolio_items.designer_id",
    type: "one-to-many",
    description: "Một designer có nhiều portfolio.",
  },
  {
    from: "customer_profiles.id",
    to: "design_requests.customer_id",
    type: "one-to-many",
    description: "Một customer có thể tạo nhiều design request.",
  },
  {
    from: "design_requests.id",
    to: "ai_briefs.request_id",
    type: "one-to-one",
    description: "Một request có một AI brief chính.",
  },
  {
    from: "design_requests.id",
    to: "designer_matches.request_id",
    type: "one-to-many",
    description: "Một request có nhiều designer match.",
  },
  {
    from: "designer_profiles.id",
    to: "designer_matches.designer_id",
    type: "one-to-many",
    description: "Một designer có thể xuất hiện trong nhiều kết quả match.",
  },
  {
    from: "design_requests.id",
    to: "jobs.request_id",
    type: "one-to-one",
    description: "Một request sau khi chốt designer sẽ tạo thành một job.",
  },
  {
    from: "jobs.id",
    to: "payments.job_id",
    type: "one-to-one",
    description: "Một job có một payment record trong MVP.",
  },
];

export const databaseGroups = [
  {
    id: "auth",
    label: "Auth & Profile",
    description: "Tài khoản, vai trò, thông tin người dùng.",
  },
  {
    id: "designer",
    label: "Designer Data",
    description: "Hồ sơ designer và portfolio.",
  },
  {
    id: "request",
    label: "Request & AI Brief",
    description: "Yêu cầu thiết kế và brief AI.",
  },
  {
    id: "matching",
    label: "Matching",
    description: "Kết quả match designer.",
  },
  {
    id: "job",
    label: "Job Workflow",
    description: "Dự án sau khi customer chọn designer.",
  },
  {
    id: "payment",
    label: "Payment",
    description: "Thanh toán chuyển khoản thủ công.",
  },
] as const;