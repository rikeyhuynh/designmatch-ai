"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type PaymentReviewActionsProps = {
  paymentId: string;
  currentStatus: string;
};

export function PaymentReviewActions({
  paymentId,
  currentStatus,
}: PaymentReviewActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<"confirm" | "reject" | null>(
    null,
  );

  const isFinalStatus = ["paid", "confirmed", "completed", "rejected"].includes(
    currentStatus,
  );

  async function handleAction(action: "confirm" | "reject") {
    let note = "";

    if (action === "reject") {
      const rejectNote = window.prompt(
        "Nhập lý do từ chối payment này:",
        "Thông tin thanh toán chưa hợp lệ.",
      );

      if (rejectNote === null) return;

      note = rejectNote.trim();
    }

    if (action === "confirm") {
      const confirmed = window.confirm(
        "Xác nhận payment này là hợp lệ và cho phép job tiếp tục?",
      );

      if (!confirmed) return;
    }

    setIsSubmitting(action);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          note,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Không thể xử lý payment", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success(
        action === "confirm" ? "Đã xác nhận payment" : "Đã từ chối payment",
        {
          description: result.message,
        },
      );

      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  if (isFinalStatus) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={() => handleAction("confirm")}
        disabled={Boolean(isSubmitting)}
        className="rounded-full bg-emerald-600 px-5 font-extrabold text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isSubmitting === "confirm" ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Đang xác nhận
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 size-4" />
            Xác nhận thanh toán
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => handleAction("reject")}
        disabled={Boolean(isSubmitting)}
        className="rounded-full border-red-200 bg-red-50 px-5 font-extrabold text-red-600 hover:bg-red-100 hover:text-red-700 disabled:bg-slate-100 disabled:text-slate-400"
      >
        {isSubmitting === "reject" ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Đang từ chối
          </>
        ) : (
          <>
            <XCircle className="mr-2 size-4" />
            Từ chối
          </>
        )}
      </Button>
    </div>
  );
}