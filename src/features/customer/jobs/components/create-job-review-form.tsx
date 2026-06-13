"use client";

import { Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CreateJobReviewFormProps = {
  jobId: string;
  initialRating?: number;
  initialComment?: string;
};

export function CreateJobReviewForm({
  jobId,
  initialRating = 5,
  initialComment = "",
}: CreateJobReviewFormProps) {
  const router = useRouter();

  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedComment = comment.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      toast.error("Rating không hợp lệ", {
        description: "Vui lòng chọn từ 1 đến 5 sao.",
      });
      return;
    }

    if (trimmedComment.length < 10) {
      toast.error("Nhận xét quá ngắn", {
        description: "Nhận xét cần ít nhất 10 ký tự.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/customer/jobs/${jobId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment: trimmedComment,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Không thể lưu đánh giá", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã lưu đánh giá", {
        description: result.message,
      });

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div>
        <p className="text-sm font-extrabold text-[#061a3a]">
          Chọn số sao đánh giá
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= rating;

            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                disabled={isSubmitting}
                className={`inline-flex h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold transition ${
                  isActive
                    ? "border-amber-300 bg-amber-100 text-amber-700"
                    : "border-blue-100 bg-white text-slate-500 hover:bg-blue-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <Star
                  className={`size-5 ${
                    isActive ? "fill-current" : "fill-none"
                  }`}
                />
                {star}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="comment"
          className="text-sm font-extrabold text-[#061a3a]"
        >
          Nhận xét cho designer
        </label>

        <Textarea
          id="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          disabled={isSubmitting}
          placeholder="Ví dụ: Designer phản hồi nhanh, hiểu brief tốt, bản thiết kế đúng phong cách và chỉnh sửa đúng feedback..."
          rows={6}
          className="mt-2 rounded-xl border-blue-100 bg-white font-medium leading-7"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-xl bg-[#061a3a] px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(6,26,58,0.22)] hover:bg-[#0b2a61] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang lưu đánh giá
            </>
          ) : (
            <>
              <Star className="mr-2 size-4" />
              Gửi đánh giá
            </>
          )}
        </Button>
      </div>
    </form>
  );
}