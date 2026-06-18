"use client";

import { Loader2, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ConfirmTransferButtonProps = {
  jobId: string;
  disabled?: boolean;
};

type ConfirmTransferResponse = {
  message?: string;
  payment?: {
    id: string;
    job_id: string;
    status: string;
  };
};

export function ConfirmTransferButton({
  jobId,
  disabled = false,
}: ConfirmTransferButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirmTransfer() {
    if (!jobId) {
      toast.error("Thiếu job ID.");
      return;
    }

    const confirmed = window.confirm(
      "Bạn xác nhận đã chuyển khoản đúng số tiền và đúng nội dung chuyển khoản?",
    );

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/customer/jobs/${jobId}/payment/confirm-transfer`,
        { method: "POST" },
      );

      const data = (await response.json()) as ConfirmTransferResponse;

      if (!response.ok) {
        toast.error("Không thể xác nhận chuyển khoản", {
          description:
            data.message ??
            "Hệ thống chưa ghi nhận được xác nhận thanh toán. Vui lòng thử lại.",
        });
        return;
      }

      toast.success("Đã xác nhận chuyển khoản", {
        description:
          data.message ?? "Payment đang chờ admin kiểm tra và xác nhận.",
      });

      router.refresh();
    } catch (error) {
      console.error("[DesignMatch AI] Confirm transfer failed:", error);
      toast.error("Không thể kết nối hệ thống thanh toán.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleConfirmTransfer}
      disabled={disabled || isSubmitting}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-[#061a3a] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#0b2a61] disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang gửi xác nhận...
        </>
      ) : (
        <>
          <WalletCards className="mr-2 size-4" />
          Tôi đã chuyển khoản
        </>
      )}
    </button>
  );
}