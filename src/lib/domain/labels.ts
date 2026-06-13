import type {
  BusinessIndustry,
  DesignCategory,
  JobStatus,
  PaymentStatus,
  RequestStatus,
  VisualStyle,
} from "@/types/domain";

export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

export const businessIndustryLabels: Record<BusinessIndustry, string> = {
  fnb: "F&B",
  beauty: "Beauty / Spa",
  fashion: "Thời trang",
  education: "Giáo dục",
  retail: "Bán lẻ",
  service: "Dịch vụ",
  other: "Khác",
};

export const designCategoryLabels: Record<DesignCategory, string> = {
  social_post: "Social Post",
  poster: "Poster",
  logo: "Logo",
  brand_identity: "Brand Identity",
  menu: "Menu",
  banner: "Banner",
  packaging: "Packaging",
};

export const visualStyleLabels: Record<VisualStyle, string> = {
  minimal: "Minimal",
  pastel: "Pastel",
  bold: "Bold",
  editorial: "Editorial",
  premium: "Premium",
  playful: "Playful",
  retro: "Retro",
  korean: "Korean",
  local_warm: "Local Warm",
};

export const requestStatusMeta: Record<
  RequestStatus,
  {
    label: string;
    tone: StatusTone;
    description: string;
  }
> = {
  draft: {
    label: "Bản nháp",
    tone: "neutral",
    description: "Request đang được customer chỉnh sửa.",
  },
  ai_processing: {
    label: "AI đang xử lý",
    tone: "info",
    description: "AI đang phân tích dữ liệu và tạo brief.",
  },
  ready_to_match: {
    label: "Sẵn sàng matching",
    tone: "info",
    description: "Brief đã đủ dữ liệu để gợi ý designer.",
  },
  matched: {
    label: "Đã có designer phù hợp",
    tone: "success",
    description: "Hệ thống đã tìm được designer phù hợp.",
  },
  in_progress: {
    label: "Đang thực hiện",
    tone: "warning",
    description: "Job đã bắt đầu và đang được designer xử lý.",
  },
  completed: {
    label: "Hoàn thành",
    tone: "success",
    description: "Dự án đã hoàn tất.",
  },
  cancelled: {
    label: "Đã hủy",
    tone: "danger",
    description: "Request đã bị hủy.",
  },
};

export const jobStatusMeta: Record<
  JobStatus,
  {
    label: string;
    tone: StatusTone;
    description: string;
  }
> = {
  proposal_pending: {
    label: "Chờ proposal",
    tone: "warning",
    description: "Đang chờ designer gửi đề xuất.",
  },
  payment_pending: {
    label: "Chờ thanh toán",
    tone: "warning",
    description: "Customer cần hoàn tất thanh toán để job bắt đầu.",
  },
  active: {
    label: "Đang thực hiện",
    tone: "info",
    description: "Designer đang thực hiện dự án.",
  },
  reviewing: {
    label: "Đang review",
    tone: "warning",
    description: "Customer đang kiểm tra sản phẩm bàn giao.",
  },
  completed: {
    label: "Hoàn thành",
    tone: "success",
    description: "Job đã hoàn tất.",
  },
  disputed: {
    label: "Có tranh chấp",
    tone: "danger",
    description: "Job cần admin can thiệp.",
  },
};

export const paymentStatusMeta: Record<
  PaymentStatus,
  {
    label: string;
    tone: StatusTone;
    description: string;
  }
> = {
  not_required: {
    label: "Không cần thanh toán",
    tone: "neutral",
    description: "Job không yêu cầu thanh toán.",
  },
  waiting_transfer: {
    label: "Chờ chuyển khoản",
    tone: "warning",
    description: "Customer cần chuyển khoản theo nội dung được cung cấp.",
  },
  waiting_admin_confirm: {
    label: "Chờ admin xác nhận",
    tone: "warning",
    description: "Admin cần đối soát giao dịch chuyển khoản.",
  },
  confirmed: {
    label: "Đã xác nhận",
    tone: "success",
    description: "Thanh toán đã được xác nhận.",
  },
  rejected: {
    label: "Không hợp lệ",
    tone: "danger",
    description: "Thanh toán bị từ chối hoặc chưa khớp.",
  },
};

export function getRequestStatusMeta(status: RequestStatus) {
  return requestStatusMeta[status];
}

export function getJobStatusMeta(status: JobStatus) {
  return jobStatusMeta[status];
}

export function getPaymentStatusMeta(status: PaymentStatus) {
  return paymentStatusMeta[status];
}

export function getIndustryLabel(industry: BusinessIndustry) {
  return businessIndustryLabels[industry];
}

export function getCategoryLabel(category: DesignCategory) {
  return designCategoryLabels[category];
}

export function getStyleLabel(style: VisualStyle) {
  return visualStyleLabels[style];
}