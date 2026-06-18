"use client";

import { ImageIcon, Loader2, Plus, Sparkles, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const categoryOptions = [
  {
    value: "poster",
    label: "Poster",
  },
  {
    value: "brand_identity",
    label: "Brand Identity",
  },
  {
    value: "logo",
    label: "Logo",
  },
  {
    value: "social_post",
    label: "Social Media Post",
  },
  {
    value: "banner",
    label: "Banner",
  },
  {
    value: "campaign_visual",
    label: "Campaign Visual",
  },
  {
    value: "menu",
    label: "Menu / Catalogue",
  },
  {
    value: "packaging",
    label: "Packaging",
  },
  {
    value: "ui_design",
    label: "UI Design",
  },
];

const industryOptions = [
  {
    value: "food_beverage",
    label: "F&B / Ăn uống",
  },
  {
    value: "beauty",
    label: "Beauty / Spa",
  },
  {
    value: "retail",
    label: "Bán lẻ",
  },
  {
    value: "education",
    label: "Giáo dục",
  },
  {
    value: "fashion",
    label: "Thời trang",
  },
  {
    value: "technology",
    label: "Công nghệ",
  },
  {
    value: "healthcare",
    label: "Sức khỏe",
  },
  {
    value: "real_estate",
    label: "Bất động sản",
  },
  {
    value: "event",
    label: "Sự kiện",
  },
  {
    value: "local_business",
    label: "Doanh nghiệp địa phương",
  },
];

type CreatePortfolioResponse = {
  message?: string;
  aiAnalysisStatus?: "completed" | "failed" | "skipped";
  portfolioItem?: {
    id: string;
    title: string;
  };
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];

export function CreatePortfolioItemForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categoryOptions[0].value);
  const [industry, setIndustry] = useState(industryOptions[0].value);
  const [image, setImage] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");

  const previewUrl = useMemo(() => {
    if (!image) return null;

    return URL.createObjectURL(image);
  }, [image]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setImage(null);
      return;
    }

    if (!allowedImageTypes.includes(selectedFile.type)) {
      toast.error("Ảnh không hợp lệ", {
        description: "Chỉ hỗ trợ PNG, JPG hoặc WEBP.",
      });

      event.target.value = "";
      setImage(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("Ảnh quá nặng", {
        description: "Dung lượng tối đa là 5MB.",
      });

      event.target.value = "";
      setImage(null);
      return;
    }

    setImage(selectedFile);
  }

  function clearImage() {
    setImage(null);
    setFileInputKey((current) => current + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (title.trim().length < 3) {
      toast.error("Tên portfolio quá ngắn", {
        description: "Vui lòng nhập ít nhất 3 ký tự.",
      });
      return;
    }

    if (!category) {
      toast.error("Thiếu category", {
        description: "Vui lòng chọn loại thiết kế cho portfolio.",
      });
      return;
    }

    if (!industry) {
      toast.error("Thiếu ngành", {
        description: "Vui lòng chọn ngành cho portfolio.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("category", category);
    formData.append("industry", industry);

    if (image) {
      formData.append("image", image);
    }

    setIsSubmitting(true);
    setSubmitStep(
      image
        ? "Đang upload portfolio và phân tích Style DNA..."
        : "Đang thêm portfolio...",
    );

    try {
      const response = await fetch("/api/designer/portfolio", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as CreatePortfolioResponse;

      if (!response.ok) {
        toast.error("Không thể thêm portfolio", {
          description: result.message ?? "Đã có lỗi xảy ra.",
        });
        return;
      }

      if (result.aiAnalysisStatus === "completed") {
        toast.success("Đã thêm portfolio và cập nhật Style DNA", {
          description: result.message,
        });
      } else if (result.aiAnalysisStatus === "failed") {
        toast.warning("Đã thêm portfolio nhưng AI chưa phân tích được", {
          description:
            result.message ??
            "Bạn có thể kiểm tra ảnh và phân tích lại portfolio sau.",
        });
      } else {
        toast.success("Đã thêm portfolio", {
          description:
            result.message ??
            "Portfolio chưa có ảnh nên chưa được dùng để cập nhật Style DNA.",
        });
      }

      setTitle("");
      setDescription("");
      setCategory(categoryOptions[0].value);
      setIndustry(industryOptions[0].value);
      setImage(null);
      setFileInputKey((current) => current + 1);

      router.refresh();
    } finally {
      setIsSubmitting(false);
      setSubmitStep("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
          <Plus className="size-5" />
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
            Add portfolio
          </p>

          <h3 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
            Thêm portfolio mới
          </h3>

          <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
            Mỗi portfolio sẽ có dữ liệu Style DNA riêng. Khi portfolio có ảnh,
            AI sẽ phân tích phong cách và cập nhật lại Style DNA tổng hợp.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-blue-600">
            <Sparkles className="size-4" />
            AI Style DNA
          </div>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Sau khi upload ảnh, AI sẽ trích xuất style tags, mood, màu sắc,
            typography, layout và điểm mạnh thị giác của portfolio này.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="portfolio-title" className="font-extrabold">
            Tên portfolio
          </Label>

          <Input
            id="portfolio-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ví dụ: Milk Tea Grand Opening Poster"
            className="min-h-12 rounded-2xl border-blue-100 bg-white"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="portfolio-industry" className="font-extrabold">
            Ngành
          </Label>

          <select
            id="portfolio-industry"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            disabled={isSubmitting}
            className="min-h-12 rounded-2xl border border-blue-100 bg-white px-3 text-sm font-semibold text-[#061a3a] outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          >
            {industryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="portfolio-category" className="font-extrabold">
            Loại thiết kế
          </Label>

          <select
            id="portfolio-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={isSubmitting}
            className="min-h-12 rounded-2xl border border-blue-100 bg-white px-3 text-sm font-semibold text-[#061a3a] outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="portfolio-description" className="font-extrabold">
            Mô tả
          </Label>

          <Textarea
            id="portfolio-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Mô tả mục tiêu thiết kế, phong cách, màu sắc, đối tượng sử dụng..."
            className="min-h-28 rounded-2xl border-blue-100 bg-white"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="portfolio-image" className="font-extrabold">
            Ảnh preview
          </Label>

          <Input
            key={fileInputKey}
            id="portfolio-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageChange}
            className="min-h-12 rounded-2xl border-blue-100 bg-white file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-blue-700"
            disabled={isSubmitting}
          />

          <p className="text-xs font-medium leading-5 text-slate-500">
            Hỗ trợ PNG, JPG, WEBP. Dung lượng tối đa 5MB. Nên upload ảnh rõ để
            AI phân tích chính xác hơn.
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.15rem] border border-blue-100 bg-white">
          <div className="grid aspect-[4/3] place-items-center bg-blue-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Portfolio preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid place-items-center text-center">
                <UploadCloud className="size-10 text-blue-700" />
                <p className="mt-3 text-sm font-bold text-blue-700">
                  Chưa chọn ảnh preview
                </p>
              </div>
            )}
          </div>

          {image ? (
            <div className="flex items-center justify-between gap-3 border-t border-blue-100 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#061a3a]">
                  {image.name}
                </p>

                <p className="text-xs font-medium text-slate-500">
                  {formatFileSize(image.size)}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={clearImage}
                disabled={isSubmitting}
                className="shrink-0 rounded-full border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                aria-label="Xóa ảnh đã chọn"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61] disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {submitStep || "Đang thêm portfolio"}
            </>
          ) : (
            <>
              <Plus className="mr-2 size-4" />
              Thêm portfolio
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${Math.round((size / 1024 / 1024) * 10) / 10} MB`;
}