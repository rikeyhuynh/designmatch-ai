"use client";

import { ImageIcon, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
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
];

export function CreatePortfolioItemForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categoryOptions[0].value);
  const [industry, setIndustry] = useState(industryOptions[0].value);
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewUrl = useMemo(() => {
    if (!image) return null;

    return URL.createObjectURL(image);
  }, [image]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setImage(null);
      return;
    }

    setImage(selectedFile);
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
        description: "Vui lòng chọn category cho portfolio.",
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

    try {
      const response = await fetch("/api/designer/portfolio", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Không thể thêm portfolio", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã thêm portfolio", {
        description: result.message,
      });

      setTitle("");
      setDescription("");
      setCategory(categoryOptions[0].value);
      setIndustry(industryOptions[0].value);
      setImage(null);

      router.refresh();
    } finally {
      setIsSubmitting(false);
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
            Portfolio này sẽ được lưu thật vào Supabase và dùng làm dữ liệu cho
            Style DNA.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
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
            Category
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
            id="portfolio-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageChange}
            className="min-h-12 rounded-2xl border-blue-100 bg-white file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-blue-700"
            disabled={isSubmitting}
          />

          <p className="text-xs font-medium leading-5 text-slate-500">
            Hỗ trợ PNG, JPG, WEBP. Dung lượng tối đa 5MB.
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.15rem] border border-blue-100 bg-white">
          <div className="grid aspect-[4/3] place-items-center bg-blue-50">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Portfolio preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid place-items-center text-center">
                <ImageIcon className="size-10 text-blue-700" />
                <p className="mt-3 text-sm font-bold text-blue-700">
                  Chưa chọn ảnh preview
                </p>
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61] disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang thêm portfolio
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