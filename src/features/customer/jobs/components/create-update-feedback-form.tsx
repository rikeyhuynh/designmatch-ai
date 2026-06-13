"use client";

import { Loader2, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CreateUpdateFeedbackFormProps = {
  jobId: string;
  updateId: string;
};

export function CreateUpdateFeedbackForm({
  jobId,
  updateId,
}: CreateUpdateFeedbackFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/customer/jobs/${jobId}/updates/${updateId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
          }),
        },
      );

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Gửi phản hồi thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã gửi phản hồi", {
        description: result.message,
      });

      setMessage("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={isSubmitting}
        placeholder="Nhập feedback cho designer: cần chỉnh màu, bố cục, chữ, hình ảnh, CTA..."
        rows={3}
        className="rounded-xl border-blue-100 bg-white font-medium leading-7"
        required
      />

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded-xl bg-[#061a3a] px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(6,26,58,0.18)] hover:bg-[#0b2a61] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang gửi
            </>
          ) : (
            <>
              <MessageSquareText className="mr-2 size-4" />
              Gửi feedback
            </>
          )}
        </Button>
      </div>
    </form>
  );
}