"use client";

import { ImagePlus, Loader2, SendHorizonal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CreateJobUpdateFormProps = {
  jobId: string;
  disabled?: boolean;
};

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];

export function CreateJobUpdateForm({
  jobId,
  disabled,
}: CreateJobUpdateFormProps) {
  const router = useRouter();

  const [updateType, setUpdateType] = useState("progress");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      toast.error("Định dạng ảnh không hợp lệ", {
        description: "Chỉ hỗ trợ PNG, JPG/JPEG hoặc WEBP.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > maxImageSize) {
      toast.error("Ảnh quá lớn", {
        description: "Dung lượng ảnh không được vượt quá 5MB.",
      });
      event.target.value = "";
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function clearImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(null);
    setImagePreviewUrl(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("updateType", updateType);
      formData.append("title", title);
      formData.append("message", message);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await fetch(`/api/designer/jobs/${jobId}/updates`, {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Gửi cập nhật thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã gửi cập nhật tiến độ", {
        description: result.message,
      });

      setTitle("");
      setMessage("");
      setUpdateType("progress");
      clearImage();

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <label
            htmlFor="updateType"
            className="text-sm font-extrabold text-[#061a3a]"
          >
            Loại cập nhật
          </label>

          <select
            id="updateType"
            value={updateType}
            onChange={(event) => setUpdateType(event.target.value)}
            disabled={disabled || isSubmitting}
            className="h-12 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="progress">Cập nhật tiến độ</option>
            <option value="draft">Gửi bản nháp</option>
            <option value="final">Gửi bản hoàn thiện</option>
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-extrabold text-[#061a3a]"
          >
            Tiêu đề
          </label>

          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={disabled || isSubmitting}
            placeholder="Ví dụ: Đã hoàn thành concept poster lần 1"
            className="h-12 rounded-xl border-blue-100 font-semibold"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="message"
          className="text-sm font-extrabold text-[#061a3a]"
        >
          Nội dung cập nhật
        </label>

        <Textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={disabled || isSubmitting}
          placeholder="Mô tả bạn đã làm gì, đang cần feedback gì, hoặc trạng thái hiện tại của thiết kế..."
          rows={5}
          className="rounded-xl border-blue-100 font-medium leading-7"
          required
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-extrabold text-[#061a3a]">
          Ảnh tiến độ / mockup
        </p>

        {imagePreviewUrl ? (
          <div className="overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white">
            <div className="relative aspect-[16/10] w-full bg-blue-50">
              <img
                src={imagePreviewUrl}
                alt="Preview ảnh tiến độ"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#061a3a]">
                  {imageFile?.name ?? "Ảnh đã chọn"}
                </p>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Ảnh này sẽ được gửi kèm cập nhật tiến độ.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={clearImage}
                disabled={disabled || isSubmitting}
                className="shrink-0 rounded-full border-red-200 bg-white font-extrabold text-red-600 hover:bg-red-50"
              >
                <X className="mr-2 size-4" />
                Xóa ảnh
              </Button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="image"
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-blue-200 bg-blue-50/70 p-6 text-center transition hover:bg-blue-50 ${
              disabled || isSubmitting
                ? "pointer-events-none cursor-not-allowed opacity-60"
                : ""
            }`}
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
              <ImagePlus className="size-5" aria-hidden="true" />
            </div>

            <p className="mt-3 text-sm font-extrabold text-[#061a3a]">
              Tải ảnh tiến độ lên
            </p>

            <p className="mt-1 max-w-md text-xs font-medium leading-6 text-slate-500">
              Dùng ảnh mockup, screenshot thiết kế hoặc bản nháp để khách hàng
              hiểu bạn đang làm đến bước nào. Hỗ trợ PNG, JPG, WEBP, tối đa 5MB.
            </p>

            <input
              id="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
              disabled={disabled || isSubmitting}
              className="sr-only"
            />
          </label>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={disabled || isSubmitting}
          className="min-h-12 rounded-xl bg-[#061a3a] px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(6,26,58,0.22)] hover:bg-[#0b2a61] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang gửi cập nhật
            </>
          ) : (
            <>
              <SendHorizonal className="mr-2 size-4" />
              Gửi cập nhật
            </>
          )}
        </Button>
      </div>
    </form>
  );
}