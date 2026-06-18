"use client";

import type {
  BusinessIndustry,
  DesignCategory,
  VisualStyle,
} from "@/types/domain";
import {
  CalendarDays,
  ImageIcon,
  LinkIcon,
  Loader2,
  PackageCheck,
  Sparkles,
  UploadCloud,
  XCircle,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  businessIndustryLabels,
  designCategoryLabels,
  visualStyleLabels,
} from "@/lib/domain/labels";
import { formatDateVi } from "@/lib/format";
import {
  calculatePlatformFee,
  clampPackagePrice,
  formatVnd,
  getPackageTypeLabel,
  getPriceDetailLevel,
  getPricingTierLabel,
  getServicePackageByCode,
  servicePackages,
  type PricingTier,
} from "@/lib/pricing/service-packages";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NewDesignRequestFormProps = {
  customerProfileId: string;
};

type VisualIntakeApiResponse = {
  status: string;
  result?: Record<string, unknown>;
  savedVisualIntakeId?: string | null;
  message?: string;
  error?: unknown;
};

type BriefBuilderApiResponse = {
  status: string;
  savedBriefId?: string | null;
  savedRiskReportId?: string | null;
  message?: string;
  error?: unknown;
};

const industryOptions = Object.entries(businessIndustryLabels) as Array<
  [BusinessIndustry, string]
>;

const styleOptions = Object.entries(visualStyleLabels) as Array<
  [VisualStyle, string]
>;

const pricingTierOrder: PricingTier[] = ["mini_design", "custom_design"];

const REQUEST_REFERENCE_BUCKET = "request-reference-images";
const MAX_REFERENCE_IMAGE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const NORMAL_MIN_DEADLINE_DAYS = 3;
const URGENT_MIN_DEADLINE_DAYS = 1;
const URGENT_FEE_PERCENT = 50;
const URGENT_PRICE_MULTIPLIER = 1.5;

function getDefaultServicePackage() {
  const packageItem = getServicePackageByCode("mini_social_post");

  if (!packageItem) {
    throw new Error("Thiếu gói mặc định mini_social_post.");
  }

  return packageItem;
}

function formatBudgetRange(min: string, max: string) {
  const minValue = Number(min);
  const maxValue = Number(max);

  if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
    return "";
  }

  return `${minValue.toLocaleString("vi-VN")}đ - ${maxValue.toLocaleString(
    "vi-VN",
  )}đ`;
}

function sanitizeFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${baseName || "reference-image"}.${extension}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

function isValidOptionalUrl(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return true;
  }

  try {
    const url = new URL(cleaned);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function parseMoneyValue(value: string) {
  const cleaned = normalizeMoneyInput(value);

  if (!cleaned) {
    return NaN;
  }

  return Number(cleaned);
}

function getDesignCategoryFromPackageCode(packageCode: string): DesignCategory {
  const normalizedCode = packageCode.toLowerCase();

  if (normalizedCode.includes("logo")) {
    return "logo" as DesignCategory;
  }

  if (normalizedCode.includes("banner")) {
    return "banner" as DesignCategory;
  }

  if (normalizedCode.includes("menu")) {
    return "menu" as DesignCategory;
  }

  if (normalizedCode.includes("packaging")) {
    return "packaging" as DesignCategory;
  }

  if (normalizedCode.includes("poster")) {
    return "poster" as DesignCategory;
  }

  if (normalizedCode.includes("social")) {
    return "poster" as DesignCategory;
  }

  return "poster" as DesignCategory;
}

async function safeReadJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function parseDateInput(value: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  return date;
}

function getMinimumDeadlineDate(isUrgent: boolean) {
  return addDays(
    new Date(),
    isUrgent ? URGENT_MIN_DEADLINE_DAYS : NORMAL_MIN_DEADLINE_DAYS,
  );
}

function getMinimumDeadlineValue(isUrgent: boolean) {
  return toDateInputValue(getMinimumDeadlineDate(isUrgent));
}

function getDeadlinePolicyText(isUrgent: boolean) {
  if (isUrgent) {
    return "Thời gian nhận hàng: 1 ngày. Phí sẽ tăng 50% vì đây là đơn gấp.";
  }

  return "Thời gian nhận hàng: ít nhất 3 ngày. Không có phụ phí đơn gấp.";
}

function isDeadlineValid(deadline: string, isUrgent: boolean) {
  const selectedDate = parseDateInput(deadline);
  const minimumDate = getMinimumDeadlineDate(isUrgent);

  if (!selectedDate) return false;

  return selectedDate.getTime() >= minimumDate.getTime();
}

function applyUrgencyFee(priceVnd: number, isUrgent: boolean) {
  if (!isUrgent) return priceVnd;

  return Math.round(priceVnd * URGENT_PRICE_MULTIPLIER);
}

export function NewDesignRequestForm({
  customerProfileId,
}: NewDesignRequestFormProps) {
  const router = useRouter();

  const defaultPackage = useMemo(() => getDefaultServicePackage(), []);

  const [title, setTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<BusinessIndustry>("fnb");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<VisualStyle[]>([
    "pastel",
    "korean",
  ]);

  const [selectedPackageCode, setSelectedPackageCode] = useState(
    defaultPackage.code,
  );

  const category = useMemo(() => {
    return getDesignCategoryFromPackageCode(selectedPackageCode);
  }, [selectedPackageCode]);

  const selectedPackage = useMemo(() => {
    return getServicePackageByCode(selectedPackageCode) ?? defaultPackage;
  }, [defaultPackage, selectedPackageCode]);

  const [selectedPriceVnd, setSelectedPriceVnd] = useState(
    String(defaultPackage.suggestedPriceVnd),
  );

  const selectedPriceNumber = useMemo(() => {
    return parseMoneyValue(selectedPriceVnd);
  }, [selectedPriceVnd]);

  const clampedBasePrice = useMemo(() => {
    return clampPackagePrice({
      value: Number.isFinite(selectedPriceNumber)
        ? selectedPriceNumber
        : selectedPackage.suggestedPriceVnd,
      min: selectedPackage.priceMinVnd,
      max: selectedPackage.priceMaxVnd,
    });
  }, [
    selectedPackage.priceMaxVnd,
    selectedPackage.priceMinVnd,
    selectedPackage.suggestedPriceVnd,
    selectedPriceNumber,
  ]);

  const finalSelectedPrice = useMemo(() => {
    return applyUrgencyFee(clampedBasePrice, isUrgent);
  }, [clampedBasePrice, isUrgent]);

  const finalBudgetMinVnd = useMemo(() => {
    return applyUrgencyFee(selectedPackage.priceMinVnd, isUrgent);
  }, [isUrgent, selectedPackage.priceMinVnd]);

  const finalBudgetMaxVnd = useMemo(() => {
    return applyUrgencyFee(selectedPackage.priceMaxVnd, isUrgent);
  }, [isUrgent, selectedPackage.priceMaxVnd]);

  const priceDetailLevel = useMemo(() => {
    return getPriceDetailLevel({
      selectedPriceVnd: clampedBasePrice,
      priceMinVnd: selectedPackage.priceMinVnd,
      priceMaxVnd: selectedPackage.priceMaxVnd,
    });
  }, [
    clampedBasePrice,
    selectedPackage.priceMaxVnd,
    selectedPackage.priceMinVnd,
  ]);

  const urgencyFeeVnd = useMemo(() => {
    return Math.max(finalSelectedPrice - clampedBasePrice, 0);
  }, [clampedBasePrice, finalSelectedPrice]);

  const minimumDeadlineValue = useMemo(() => {
    return getMinimumDeadlineValue(isUrgent);
  }, [isUrgent]);

  const budgetMinVnd = String(finalBudgetMinVnd);
  const budgetMaxVnd = String(finalBudgetMaxVnd);

  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreviewUrl, setReferenceImagePreviewUrl] =
    useState<string | null>(null);
  const [referenceImageDriveUrl, setReferenceImageDriveUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");

  const packagesByTier = useMemo(() => {
    return pricingTierOrder.map((tier) => ({
      tier,
      packages: servicePackages.filter((item) => item.tier === tier),
    }));
  }, []);

  function toggleStyle(style: VisualStyle) {
    setSelectedStyles((currentStyles) => {
      if (currentStyles.includes(style)) {
        return currentStyles.filter((item) => item !== style);
      }

      return [...currentStyles, style];
    });
  }

  function handleUrgentChange(nextIsUrgent: boolean) {
    setIsUrgent(nextIsUrgent);

    const currentDeadline = parseDateInput(deadline);
    const nextMinimumDeadline = getMinimumDeadlineDate(nextIsUrgent);

    if (
      !currentDeadline ||
      currentDeadline.getTime() < nextMinimumDeadline.getTime()
    ) {
      setDeadline(toDateInputValue(nextMinimumDeadline));
    }

    if (nextIsUrgent) {
      toast.info("Đã bật đơn gấp", {
        description:
          "Thời gian nhận hàng là 1 ngày và phí sẽ tăng 50%.",
      });
    } else {
      toast.info("Đã chuyển về đơn thường", {
        description:
          "Thời gian nhận hàng ít nhất 3 ngày và không có phụ phí đơn gấp.",
      });
    }
  }

  function handlePackageChange(packageCode: string) {
    const nextPackage = getServicePackageByCode(packageCode);

    if (!nextPackage) {
      return;
    }

    setSelectedPackageCode(packageCode);
    setSelectedPriceVnd(String(nextPackage.suggestedPriceVnd));
  }

  function handleSelectedPriceChange(value: string) {
    const cleanedValue = normalizeMoneyInput(value);

    setSelectedPriceVnd(cleanedValue);
  }

  function handleSelectedPriceBlur() {
    const rawPrice = parseMoneyValue(selectedPriceVnd);

    const nextPrice = clampPackagePrice({
      value: Number.isFinite(rawPrice)
        ? rawPrice
        : selectedPackage.suggestedPriceVnd,
      min: selectedPackage.priceMinVnd,
      max: selectedPackage.priceMaxVnd,
    });

    if (String(nextPrice) !== selectedPriceVnd) {
      toast.info("Giá đã được điều chỉnh về khoảng hợp lệ của gói.", {
        description: `Gói này chỉ cho phép từ ${formatVnd(
          selectedPackage.priceMinVnd,
        )} đến ${formatVnd(selectedPackage.priceMaxVnd)}.`,
      });
    }

    setSelectedPriceVnd(String(nextPrice));
  }

  function getSubmitBasePrice() {
    const rawPrice = parseMoneyValue(selectedPriceVnd);

    return clampPackagePrice({
      value: Number.isFinite(rawPrice)
        ? rawPrice
        : selectedPackage.suggestedPriceVnd,
      min: selectedPackage.priceMinVnd,
      max: selectedPackage.priceMaxVnd,
    });
  }

  function clearReferenceImage() {
    if (referenceImagePreviewUrl) {
      URL.revokeObjectURL(referenceImagePreviewUrl);
    }

    setReferenceImage(null);
    setReferenceImagePreviewUrl(null);
  }

  function handleReferenceImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      clearReferenceImage();
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("File ảnh không hợp lệ", {
        description: "Chỉ hỗ trợ JPG, PNG hoặc WebP.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_REFERENCE_IMAGE_SIZE) {
      toast.error("Ảnh quá nặng", {
        description: "Dung lượng tối đa là 10MB.",
      });
      event.target.value = "";
      return;
    }

    if (referenceImagePreviewUrl) {
      URL.revokeObjectURL(referenceImagePreviewUrl);
    }

    setReferenceImage(file);
    setReferenceImagePreviewUrl(URL.createObjectURL(file));
  }

  async function uploadReferenceImage({
    requestId,
    file,
  }: {
    requestId: string;
    file: File;
  }) {
    const supabase = createSupabaseBrowserClient();
    const safeFileName = sanitizeFileName(file.name);
    const storagePath = `${customerProfileId}/${requestId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(REQUEST_REFERENCE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(REQUEST_REFERENCE_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("design_requests")
      .update({
        reference_image_url: publicUrl,
        reference_image_storage_path: storagePath,
        reference_image_original_name: file.name,
        visual_intake_status: "not_started",
      })
      .eq("id", requestId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      publicUrl,
      storagePath,
      originalName: file.name,
    };
  }

  async function runVisualIntake({
    requestId,
    imageUrl,
    storagePath,
  }: {
    requestId: string;
    imageUrl: string;
    storagePath: string;
  }) {
    const supabase = createSupabaseBrowserClient();

    await supabase
      .from("design_requests")
      .update({
        visual_intake_status: "processing",
      })
      .eq("id", requestId);

    const response = await fetch("/api/ai/visual-intake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        designRequestId: requestId,
        customerProfileId,
        sourceImageStoragePath: storagePath,
        productDescription: description,
        designType: designCategoryLabels[category] ?? category,
        targetAudience,
        preferredStyle: selectedStyles
          .map((style) => visualStyleLabels[style] ?? style)
          .join(", "),
        preferredColors: "",
        budget: formatBudgetRange(budgetMinVnd, budgetMaxVnd),
        deadline,
        channel: "Facebook, Instagram, social media hoặc kênh digital",
      }),
    });

    const payload = (await safeReadJson(response)) as VisualIntakeApiResponse;

    if (!response.ok || payload.status !== "success") {
      await supabase
        .from("design_requests")
        .update({
          visual_intake_status: "failed",
        })
        .eq("id", requestId);

      throw new Error(
        payload.message || "AI Visual Intake chưa phân tích được ảnh.",
      );
    }

    await supabase
      .from("design_requests")
      .update({
        visual_intake_status: "completed",
      })
      .eq("id", requestId);

    return payload.result ?? null;
  }

  function buildPackageContextForAI({
    submitBasePriceVnd,
    submitFinalPriceVnd,
  }: {
    submitBasePriceVnd: number;
    submitFinalPriceVnd: number;
  }) {
    const submitPriceDetailLevel = getPriceDetailLevel({
      selectedPriceVnd: submitBasePriceVnd,
      priceMinVnd: selectedPackage.priceMinVnd,
      priceMaxVnd: selectedPackage.priceMaxVnd,
    });

    return [
      "Thông tin gói dịch vụ người dùng đã chọn:",
      `- Tầng dịch vụ: ${getPricingTierLabel(selectedPackage.tier)}`,
      `- Tên gói: ${selectedPackage.name}`,
      `- Loại gói: ${getPackageTypeLabel(selectedPackage.type)}`,
      `- Loại thiết kế suy ra từ gói: ${
        designCategoryLabels[category] ?? category
      }`,
      `- Giá gốc người dùng chọn trước phụ phí: ${formatVnd(
        submitBasePriceVnd,
      )}`,
      `- Nhận đơn gấp: ${isUrgent ? "Có" : "Không"}`,
      `- Thời gian nhận hàng: ${isUrgent ? "1 ngày" : "ít nhất 3 ngày"}`,
      `- Phụ phí đơn gấp: ${isUrgent ? `${URGENT_FEE_PERCENT}%` : "0%"}`,
      `- Số tiền cuối cùng khách dự kiến thanh toán: ${formatVnd(
        submitFinalPriceVnd,
      )}`,
      `- Deadline khách chọn: ${deadline}`,
      `- Quy định deadline: ${getDeadlinePolicyText(isUrgent)}`,
      `- Mức độ chi tiết brief theo giá gốc: ${submitPriceDetailLevel.label}`,
      `- Giải thích mức độ chi tiết: ${submitPriceDetailLevel.description}`,
      `- Giới hạn vòng sửa: ${
        selectedPackage.revisionLimit === null
          ? "theo thỏa thuận"
          : `${selectedPackage.revisionLimit} vòng`
      }`,
      `- Giới hạn deliverable: ${
        selectedPackage.deliverableLimit === null
          ? "theo phạm vi dự án"
          : `${selectedPackage.deliverableLimit} ấn phẩm`
      }`,
      "",
      "Scope note:",
      selectedPackage.scopeNote,
      "",
      "Những việc phù hợp với gói:",
      ...selectedPackage.suitableFor.map((item) => `- ${item}`),
      "",
      "Không bao gồm:",
      ...selectedPackage.notIncluded.map((item) => `- ${item}`),
      "",
      selectedPackage.type === "template_assisted"
        ? "Lưu ý rất quan trọng: Đây là gói Mini Design template-assisted, không phải thiết kế custom từ đầu. AI brief phải giới hạn phạm vi, không mô tả như một dự án custom lớn, không làm giảm giá trị designer."
        : "Lưu ý: Đây là gói Custom Design cho một ấn phẩm đơn lẻ. AI brief có thể chi tiết hơn Mini Design nhưng không được mở rộng thành bộ sản phẩm hoặc campaign nhiều ấn phẩm.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function buildProductDescriptionForAI({
    submitBasePriceVnd,
    submitFinalPriceVnd,
  }: {
    submitBasePriceVnd: number;
    submitFinalPriceVnd: number;
  }) {
    const cleanedDriveUrl = referenceImageDriveUrl.trim();

    return [
      description,
      "",
      buildPackageContextForAI({
        submitBasePriceVnd,
        submitFinalPriceVnd,
      }),
      "",
      cleanedDriveUrl
        ? [
            "Link Google Drive ảnh sản phẩm / ảnh tham khảo do khách cung cấp:",
            cleanedDriveUrl,
            "",
            "Ghi chú: Link Drive này dùng để designer xem thêm tài nguyên hình ảnh khi thiết kế. Nếu AI không thể truy cập trực tiếp vào Drive, hãy vẫn ghi nhận link này như một tài liệu tham khảo cần kiểm tra.",
          ].join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function runBriefBuilder({
    requestId,
    visualIntakeResult,
    submitBasePriceVnd,
    submitFinalPriceVnd,
  }: {
    requestId: string;
    visualIntakeResult: Record<string, unknown> | null;
    submitBasePriceVnd: number;
    submitFinalPriceVnd: number;
  }) {
    const supabase = createSupabaseBrowserClient();

    const submitPriceDetailLevel = getPriceDetailLevel({
      selectedPriceVnd: submitBasePriceVnd,
      priceMinVnd: selectedPackage.priceMinVnd,
      priceMaxVnd: selectedPackage.priceMaxVnd,
    });

    await supabase
      .from("design_requests")
      .update({
        ai_brief_status: "processing",
      })
      .eq("id", requestId);

    const response = await fetch("/api/ai/brief-builder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        designRequestId: requestId,
        customerProfileId,
        title,
        businessName,
        businessLocation: "",
        productDescription: buildProductDescriptionForAI({
          submitBasePriceVnd,
          submitFinalPriceVnd,
        }),
        designType: designCategoryLabels[category] ?? category,
        targetAudience,
        preferredStyle: selectedStyles
          .map((style) => visualStyleLabels[style] ?? style)
          .join(", "),
        preferredColors: "",
        budget: formatBudgetRange(budgetMinVnd, budgetMaxVnd),
        deadline,
        channel: "Facebook post, Instagram story, social media",
        visualIntakeResult,
        pricingPackage: {
          pricingTier: selectedPackage.tier,
          packageCode: selectedPackage.code,
          packageName: selectedPackage.name,
          packageType: selectedPackage.type,
          packageScopeNote: selectedPackage.scopeNote,
          packagePriceMinVnd: selectedPackage.priceMinVnd,
          packagePriceMaxVnd: selectedPackage.priceMaxVnd,
          selectedBasePriceVnd: submitBasePriceVnd,
          selectedPriceVnd: submitFinalPriceVnd,
          isUrgent,
          urgencyFeePercent: isUrgent ? URGENT_FEE_PERCENT : 0,
          urgencyFeeVnd: Math.max(submitFinalPriceVnd - submitBasePriceVnd, 0),
          receiveTime: isUrgent ? "1 ngày" : "ít nhất 3 ngày",
          priceDetailLevel: submitPriceDetailLevel.label,
          priceDetailDescription: submitPriceDetailLevel.description,
          revisionLimit: selectedPackage.revisionLimit,
          deliverableLimit: selectedPackage.deliverableLimit,
        },
      }),
    });

    const payload = (await safeReadJson(response)) as BriefBuilderApiResponse;

    if (!response.ok || payload.status !== "success") {
      await supabase
        .from("design_requests")
        .update({
          ai_brief_status: "failed",
        })
        .eq("id", requestId);

      throw new Error(payload.message || "AI Brief Builder chưa tạo được brief.");
    }

    await supabase
      .from("design_requests")
      .update({
        ai_brief_status: "completed",
      })
      .eq("id", requestId);

    return payload;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedStyles.length === 0) {
      toast.error("Hãy chọn ít nhất một phong cách thị giác.");
      return;
    }

    if (!deadline) {
      toast.error("Hãy chọn deadline cho request.", {
        description: getDeadlinePolicyText(isUrgent),
      });
      return;
    }

    if (!isDeadlineValid(deadline, isUrgent)) {
      toast.error("Deadline chưa hợp lệ", {
        description: getDeadlinePolicyText(isUrgent),
      });
      return;
    }

    if (!isValidOptionalUrl(referenceImageDriveUrl)) {
      toast.error("Link Drive không hợp lệ", {
        description: "Hãy nhập link bắt đầu bằng http:// hoặc https://.",
      });
      return;
    }

    const submitBasePriceVnd = getSubmitBasePrice();
    const submitFinalPriceVnd = applyUrgencyFee(submitBasePriceVnd, isUrgent);
    const submitPlatformFeeBreakdown =
      calculatePlatformFee(submitFinalPriceVnd);

    if (String(submitBasePriceVnd) !== selectedPriceVnd) {
      setSelectedPriceVnd(String(submitBasePriceVnd));
      toast.info("Giá đã được điều chỉnh về khoảng hợp lệ của gói.", {
        description: `Hệ thống sẽ tiếp tục tạo request với giá gốc ${formatVnd(
          submitBasePriceVnd,
        )}.`,
      });
    }

    setIsSubmitting(true);
    setSubmitStep("Đang tạo design request...");

    try {
      const supabase = createSupabaseBrowserClient();

      const { data: requestData, error } = await supabase
        .from("design_requests")
        .insert({
          customer_id: customerProfileId,
          title,
          business_name: businessName,
          industry,
          category,
          description,
          target_audience: targetAudience,
          original_budget_min_vnd: selectedPackage.priceMinVnd,
          original_budget_max_vnd: selectedPackage.priceMaxVnd,
          budget_min_vnd: finalBudgetMinVnd,
          budget_max_vnd: finalBudgetMaxVnd,
          deadline,
          is_urgent: isUrgent,
          urgency_fee_percent: isUrgent ? URGENT_FEE_PERCENT : 0,
          preferred_styles: selectedStyles,
          status: "draft",
          reference_image_drive_url: referenceImageDriveUrl.trim() || null,

          pricing_tier: selectedPackage.tier,
          package_code: selectedPackage.code,
          package_name: selectedPackage.name,
          package_type: selectedPackage.type,
          package_scope_note: selectedPackage.scopeNote,
          package_price_min_vnd: selectedPackage.priceMinVnd,
          package_price_max_vnd: selectedPackage.priceMaxVnd,
          selected_price_vnd: submitPlatformFeeBreakdown.selectedPriceVnd,
          platform_fee_percent: submitPlatformFeeBreakdown.platformFeePercent,
          platform_fee_vnd: submitPlatformFeeBreakdown.platformFeeVnd,
          designer_revenue_vnd: submitPlatformFeeBreakdown.designerRevenueVnd,
          is_team_booking: false,
          package_revision_limit: selectedPackage.revisionLimit,
          package_deliverable_limit: selectedPackage.deliverableLimit,

          visual_intake_status: referenceImage ? "not_started" : "skipped",
          ai_brief_status: "not_started",
        })
        .select("id")
        .single();

      if (error || !requestData?.id) {
        toast.error("Tạo request thất bại", {
          description: error?.message ?? "Không lấy được ID request.",
        });
        return;
      }

      const requestId = requestData.id as string;

      let visualIntakeResult: Record<string, unknown> | null = null;

      if (referenceImage) {
        try {
          setSubmitStep("Đang upload ảnh tham khảo...");

          const uploadedImage = await uploadReferenceImage({
            requestId,
            file: referenceImage,
          });

          setSubmitStep("AI đang phân tích ảnh tham khảo...");

          visualIntakeResult = await runVisualIntake({
            requestId,
            imageUrl: uploadedImage.publicUrl,
            storagePath: uploadedImage.storagePath,
          });
        } catch (imageOrVisualError) {
          toast.warning("Ảnh hoặc Visual Intake chưa xử lý được", {
            description: getErrorMessage(
              imageOrVisualError,
              "Hệ thống vẫn sẽ tạo AI brief dựa trên thông tin text và link Drive nếu có.",
            ),
          });
        }
      }

      setSubmitStep("AI đang tạo brief thiết kế theo gói đã chọn...");

      await runBriefBuilder({
        requestId,
        visualIntakeResult,
        submitBasePriceVnd,
        submitFinalPriceVnd,
      });

      toast.success("Đã tạo request và AI brief.");
      router.push(`/customer/requests/${requestId}/brief-review`);
      router.refresh();
    } catch (submitError) {
      toast.error("Tạo request hoặc AI brief thất bại", {
        description: getErrorMessage(
          submitError,
          "Vui lòng thử lại hoặc kiểm tra terminal server.",
        ),
      });
    } finally {
      setIsSubmitting(false);
      setSubmitStep("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
      <div className="rounded-3xl border border-blue-100 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <PackageCheck className="size-5" />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Single Design Request
            </p>

            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chọn một ấn phẩm thiết kế đơn lẻ
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              Form này chỉ dành cho một ấn phẩm đơn lẻ. Monthly Package và Team
              Booking sẽ được tách thành flow riêng, không nằm trong request cơ
              bản này.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          {packagesByTier.map(({ tier, packages }) => (
            <div
              key={tier}
              className="rounded-3xl border border-blue-100 bg-blue-50/50 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-black tracking-[-0.035em] text-[#061a3a]">
                    {getPricingTierLabel(tier)}
                  </h3>

                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                    {tier === "mini_design"
                      ? "Template-assisted, scope nhỏ, giới hạn vòng sửa. Không phải custom từ đầu."
                      : "Thiết kế custom thật cho một ấn phẩm đơn lẻ theo brief đã chốt."}
                  </p>
                </div>

                <StatusPill tone={tier === "mini_design" ? "warning" : "success"}>
                  {packages.length} ấn phẩm
                </StatusPill>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {packages.map((item) => {
                  const isSelected = selectedPackage.code === item.code;
                  const isFixedPrice = item.priceMinVnd === item.priceMaxVnd;

                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handlePackageChange(item.code)}
                      disabled={isSubmitting}
                      className={`rounded-3xl border p-4 text-left transition ${
                        isSelected
                          ? "border-[#061a3a] bg-[#061a3a] text-white shadow-[0_18px_45px_rgba(6,26,58,0.18)]"
                          : "border-blue-100 bg-white text-[#061a3a] hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black">{item.name}</p>

                          <p
                            className={`mt-1 text-xs font-medium leading-5 ${
                              isSelected ? "text-white/70" : "text-slate-500"
                            }`}
                          >
                            {getPackageTypeLabel(item.type)}
                          </p>
                        </div>

                        {isSelected ? (
                          <StatusPill tone="success">Đang chọn</StatusPill>
                        ) : null}
                      </div>

                      <p
                        className={`mt-3 text-lg font-black tracking-[-0.04em] ${
                          isSelected ? "text-white" : "text-blue-700"
                        }`}
                      >
                        {isFixedPrice
                          ? formatVnd(item.priceMinVnd)
                          : `${formatVnd(item.priceMinVnd)} - ${formatVnd(
                              item.priceMaxVnd,
                            )}`}
                      </p>

                      <p
                        className={`mt-2 line-clamp-2 text-xs font-medium leading-5 ${
                          isSelected ? "text-white/75" : "text-slate-600"
                        }`}
                      >
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.7fr]">
          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="info">
                {getPricingTierLabel(selectedPackage.tier)}
              </StatusPill>

              <StatusPill tone="neutral">
                {getPackageTypeLabel(selectedPackage.type)}
              </StatusPill>

              <StatusPill tone="success">1 ấn phẩm</StatusPill>

              {isUrgent ? (
                <StatusPill tone="warning">Đơn gấp +50%</StatusPill>
              ) : null}
            </div>

            <h3 className="mt-4 text-xl font-black tracking-[-0.04em] text-[#061a3a]">
              {selectedPackage.name}
            </h3>

            <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
              {selectedPackage.scopeNote}
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  Vòng sửa
                </p>
                <p className="mt-2 text-sm font-extrabold text-[#061a3a]">
                  {selectedPackage.revisionLimit === null
                    ? "Theo thỏa thuận"
                    : `${selectedPackage.revisionLimit} vòng`}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  Phạm vi
                </p>
                <p className="mt-2 text-sm font-extrabold text-[#061a3a]">
                  1 ấn phẩm đơn lẻ
                </p>
              </div>
            </div>

            {selectedPackage.type === "template_assisted" ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold leading-6 text-amber-900">
                  Gói Mini Design là template-assisted, không phải thiết kế
                  custom từ đầu. Gói này giới hạn phạm vi và số vòng sửa để bảo
                  vệ giá trị designer.
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-blue-700" />
              <h3 className="text-base font-black text-[#061a3a]">
                Số tiền cần thanh toán
              </h3>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="selectedPriceVnd">
                  Giá gốc dự kiến cho gói này
                </Label>

                <Input
                  id="selectedPriceVnd"
                  type="text"
                  inputMode="numeric"
                  value={selectedPriceVnd}
                  onChange={(event) =>
                    handleSelectedPriceChange(event.target.value)
                  }
                  onBlur={handleSelectedPriceBlur}
                  disabled={
                    isSubmitting ||
                    selectedPackage.priceMinVnd === selectedPackage.priceMaxVnd
                  }
                  placeholder={String(selectedPackage.suggestedPriceVnd)}
                />

                <p className="text-xs font-medium leading-5 text-slate-500">
                  Khoảng giá gốc: {formatVnd(selectedPackage.priceMinVnd)} -{" "}
                  {formatVnd(selectedPackage.priceMaxVnd)}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  Bạn dự kiến thanh toán
                </p>

                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#061a3a]">
                  {formatVnd(finalSelectedPrice)}
                </p>

                {isUrgent ? (
                  <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                    Đã bao gồm phụ phí đơn gấp +50%: {formatVnd(urgencyFeeVnd)}.
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                    Đơn thường không có phụ phí. Thời gian nhận hàng ít nhất 3 ngày.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Mức độ brief
                </p>

                <p className="mt-2 text-sm font-black text-[#061a3a]">
                  {priceDetailLevel.label}
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                  {priceDetailLevel.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Tên request</Label>
          <Input
            id="title"
            placeholder="Ví dụ: Poster khai trương quán trà sữa"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName">Tên thương hiệu / cửa hàng</Label>
          <Input
            id="businessName"
            placeholder="Ví dụ: Mây Milk Tea"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="industry">Ngành hàng</Label>
          <select
            id="industry"
            value={industry}
            onChange={(event) =>
              setIndustry(event.target.value as BusinessIndustry)
            }
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {industryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            Loại thiết kế
          </p>

          <p className="mt-2 text-sm font-extrabold text-[#061a3a]">
            {designCategoryLabels[category] ?? selectedPackage.name}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <CalendarDays className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">
                  Deadline
                </p>

                <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-[#061a3a]">
                  Chọn thời gian nhận hàng mong muốn
                </h3>

                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {getDeadlinePolicyText(isUrgent)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleUrgentChange(!isUrgent)}
                disabled={isSubmitting}
                className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-extrabold ring-1 transition ${
                  isUrgent
                    ? "bg-amber-500 text-white ring-amber-500 hover:bg-amber-600"
                    : "bg-white text-slate-700 ring-blue-100 hover:bg-blue-50"
                }`}
              >
                <Zap className="mr-2 size-4" />
                {isUrgent ? "Đang bật đơn gấp" : "Cần đơn gấp"}
              </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-2">
                <Label htmlFor="deadline">Ngày nhận hàng mong muốn</Label>

                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  min={minimumDeadlineValue}
                  onChange={(event) => setDeadline(event.target.value)}
                  disabled={isSubmitting}
                  required
                />

                <p className="text-xs font-medium leading-5 text-slate-500">
                  Ngày sớm nhất có thể chọn:{" "}
                  <span className="font-black text-[#061a3a]">
                    {formatDateVi(minimumDeadlineValue)}
                  </span>
                  .
                </p>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isUrgent
                    ? "border-amber-200 bg-amber-50"
                    : "border-blue-100 bg-blue-50"
                }`}
              >
                <p
                  className={`text-xs font-black uppercase tracking-[0.16em] ${
                    isUrgent ? "text-amber-700" : "text-blue-600"
                  }`}
                >
                  {isUrgent ? "Đơn gấp" : "Đơn thường"}
                </p>

                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                  {isUrgent
                    ? `Thời gian nhận hàng: 1 ngày. Phí sẽ tăng 50%, tương đương phụ phí ${formatVnd(
                        urgencyFeeVnd,
                      )}.`
                    : "Thời gian nhận hàng: ít nhất 3 ngày. Không có phụ phí đơn gấp."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả nhu cầu</Label>
        <Textarea
          id="description"
          placeholder="Mô tả bạn cần thiết kế gì, dùng ở đâu, muốn cảm giác như thế nào, có yêu cầu đặc biệt nào không..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetAudience">Đối tượng khách hàng</Label>
        <Textarea
          id="targetAudience"
          placeholder="Ví dụ: Sinh viên, học sinh cấp 3, dân văn phòng trẻ trong khu vực..."
          value={targetAudience}
          onChange={(event) => setTargetAudience(event.target.value)}
          rows={3}
        />
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="size-5 text-blue-700" />
              <Label htmlFor="referenceImage" className="text-base font-black">
                Ảnh sản phẩm / ảnh cửa hàng / logo / ảnh tham khảo
              </Label>
            </div>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Ảnh upload trực tiếp sẽ được AI Visual Intake phân tích. Link
              Google Drive bên dưới dùng để designer xem thêm nhiều ảnh sản phẩm,
              logo hoặc reference khi bắt đầu thiết kế.
            </p>
          </div>

          {referenceImage ? (
            <Button
              type="button"
              variant="outline"
              onClick={clearReferenceImage}
              disabled={isSubmitting}
              className="rounded-2xl"
            >
              <XCircle className="mr-2 size-4" />
              Xóa ảnh
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <label
            htmlFor="referenceImage"
            className="flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-blue-300 bg-white p-6 text-center transition hover:border-blue-500 hover:bg-blue-50"
          >
            <UploadCloud className="size-8 text-blue-700" />
            <p className="mt-3 text-sm font-extrabold text-[#061a3a]">
              Bấm để chọn ảnh tham khảo
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              JPG, PNG, WebP, tối đa 10MB
            </p>

            <Input
              id="referenceImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReferenceImageChange}
              disabled={isSubmitting}
              className="sr-only"
            />
          </label>

          <div className="rounded-3xl border border-blue-100 bg-white p-4">
            {referenceImagePreviewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceImagePreviewUrl}
                  alt="Ảnh tham khảo"
                  className="h-[220px] w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-center">
                <div>
                  <ImageIcon className="mx-auto size-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Chưa chọn ảnh upload trực tiếp
                  </p>
                </div>
              </div>
            )}

            {referenceImage ? (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-600">
                <p className="truncate">
                  <span className="font-black text-slate-800">File:</span>{" "}
                  {referenceImage.name}
                </p>
                <p className="mt-1">
                  <span className="font-black text-slate-800">Dung lượng:</span>{" "}
                  {(referenceImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="size-5 text-blue-700" />
            <Label htmlFor="referenceImageDriveUrl">
              Link Google Drive ảnh sản phẩm / tài nguyên thiết kế
            </Label>
          </div>

          <Input
            id="referenceImageDriveUrl"
            type="url"
            placeholder="Ví dụ: https://drive.google.com/drive/folders/..."
            value={referenceImageDriveUrl}
            onChange={(event) => setReferenceImageDriveUrl(event.target.value)}
            disabled={isSubmitting}
            className="mt-3"
          />

          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
            Hãy đặt quyền chia sẻ Drive là “Anyone with the link can view”.
            Link này giúp designer nhận được source sản phẩm của bạn để có thể
            hiểu rõ về phong cách thiết kế.
          </p>
        </div>
      </div>

      <div>
        <Label>Phong cách mong muốn</Label>

        <div className="mt-3 flex flex-wrap gap-2">
          {styleOptions.map(([style, label]) => {
            const isSelected = selectedStyles.includes(style);

            return (
              <button
                key={style}
                type="button"
                onClick={() => toggleStyle(style)}
                disabled={isSubmitting}
                className={`rounded-full px-3 py-1.5 text-sm font-extrabold ring-1 transition ${
                  isSelected
                    ? "bg-[#061a3a] text-white ring-[#061a3a]"
                    : "bg-white text-slate-700 ring-blue-100 hover:bg-blue-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedStyles.map((style) => (
            <StatusPill key={style} tone="info">
              {visualStyleLabels[style]}
            </StatusPill>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              Tổng kết trước khi tạo request
            </p>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              Gói đã chọn:{" "}
              <span className="font-black text-[#061a3a]">
                {selectedPackage.name}
              </span>
              . Thời gian nhận hàng:{" "}
              <span className="font-black text-[#061a3a]">
                {isUrgent ? "1 ngày" : "ít nhất 3 ngày"}
              </span>
              . Ngày nhận hàng mong muốn:{" "}
              <span className="font-black text-[#061a3a]">
                {deadline ? formatDateVi(deadline) : "Chưa chọn"}
              </span>
              . Số tiền dự kiến phải trả:{" "}
              <span className="font-black text-[#061a3a]">
                {formatVnd(finalSelectedPrice)}
              </span>
              .
            </p>

            {isUrgent ? (
              <p className="mt-2 text-sm font-bold leading-6 text-amber-700">
                Đơn gấp: thời gian nhận hàng 1 ngày và phí tăng 50%.
              </p>
            ) : (
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Đơn thường: thời gian nhận hàng ít nhất 3 ngày và không có phụ
                phí đơn gấp.
              </p>
            )}
          </div>

          <StatusPill tone={isUrgent ? "warning" : "success"}>
            {isUrgent ? "Đơn gấp" : "Đơn thường"}
          </StatusPill>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 rounded-2xl bg-[#061a3a] font-extrabold text-white hover:bg-[#0b2a61]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {submitStep || "Đang tạo request"}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4" />
            Tạo request + AI brief theo gói đã chọn
          </>
        )}
      </Button>

      <p className="text-center text-xs font-medium leading-6 text-slate-500">
        Sau khi tạo request, hệ thống sẽ tự tạo AI brief đúng phạm vi gói. Form
        này chỉ dành cho một ấn phẩm đơn lẻ. Mini Design là template-assisted và
        có giới hạn scope rõ ràng để bảo vệ giá trị designer.
      </p>
    </form>
  );
}