"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ConfirmAdminPaymentButtonProps = {
  paymentId: string;
  disabled?: boolean;
};

type ConfirmAdminPaymentResponse = {
  message?: string;
  payment?: {
    id: string;
    job_id: string;
    status: string;
    amount_vnd: number;
    transfer_note: string | null;
    platform_fee_percent: number | null;
    platform_fee_vnd: number | null;
    designer_revenue_vnd: number | null;
  };
  job?: {
    id: string;
    request_id: string;
    status: string;
    started_at: string | null;
  };
};

export function ConfirmAdminPaymentButton({
  paymentId,
  disabled = false,
}: ConfirmAdminPaymentButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirmPayment() {
    if (!paymentId) {
      toast.error("Thiếu payment ID.");
      return;
    }

    const confirmed = window.confirm(
      "Xác nhận payment này đã khớp với giao dịch ngân hàng? Job sẽ được kích hoạt cho designer.",
    );

    if (!confirmed) return;

    setIsConfirming(true);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: "POST",
      });

      const data = (await response.json()) as ConfirmAdminPaymentResponse;

      if (!response.ok) {
        toast.error("Không thể xác nhận payment", {
          description:
            data.message ??
            "Hệ thống chưa thể xác nhận payment. Vui lòng thử lại.",
        });
        return;
      }

      toast.success("Đã xác nhận payment", {
        description: data.message ?? "Job đã được kích hoạt.",
      });

      router.refresh();
    } catch (error) {
      console.error("[DesignMatch AI] Admin confirm payment failed:", error);
      toast.error("Không thể kết nối hệ thống xác nhận payment.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleConfirmPayment}
      disabled={disabled || isConfirming}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {isConfirming ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang xác nhận...
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-2 size-4" />
          Xác nhận payment
        </>
      )}
    </button>
  );
}