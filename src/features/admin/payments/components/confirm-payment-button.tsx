"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ConfirmPaymentButtonProps = {
  paymentId: string;
};

export function ConfirmPaymentButton({ paymentId }: ConfirmPaymentButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    setIsConfirming(true);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: "POST",
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Xác nhận thanh toán thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã xác nhận thanh toán", {
        description: result.message,
      });

      router.refresh();
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleConfirm}
      disabled={isConfirming}
      className="min-h-12 rounded-xl bg-[#061a3a] px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(6,26,58,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0b2a61] hover:shadow-[0_18px_36px_rgba(6,26,58,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
    >
      {isConfirming ? (
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
  );
}