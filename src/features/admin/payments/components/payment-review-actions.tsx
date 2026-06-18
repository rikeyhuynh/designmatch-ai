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

type PaymentActionResponse = {
  message?: string;
  warning?: string;
};

const ACTIONABLE_STATUSES = ["waiting_admin_confirm"];

export function PaymentReviewActions({
  paymentId,
  currentStatus,
}: PaymentReviewActionsProps) {
  const router = useRouter();

  const [isConfirming, setIsConfirming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const canReview = ACTIONABLE_STATUSES.includes(currentStatus);

  async function handleConfirm() {
    if (!paymentId) {
      toast.error("Thiếu payment ID.");
      return;
    }

    const shouldConfirm = window.confirm(
      "Xác nhận payment này đã khớp với giao dịch ngân hàng? Sau khi xác nhận, job sẽ được kích hoạt cho designer.",
    );

    if (!shouldConfirm) return;

    setIsConfirming(true);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: "POST",
      });

      const result = (await response.json()) as PaymentActionResponse;

      if (!response.ok) {
        toast.error("Xác nhận payment thất bại", {
          description:
            result.message ??
            "Hệ thống chưa thể xác nhận payment. Vui lòng thử lại.",
        });
        return;
      }

      toast.success("Đã xác nhận payment", {
        description:
          result.message ??
          "Payment đã được xác nhận và job đã được chuyển sang trạng thái active.",
      });

      if (result.warning) {
        toast.warning("Có cảnh báo sau khi xác nhận", {
          description: result.warning,
        });
      }

      router.refresh();
    } catch (error) {
      console.error("[DesignMatch AI] Confirm payment failed:", error);
      toast.error("Không thể kết nối hệ thống xác nhận payment.");
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleReject() {
    if (!paymentId) {
      toast.error("Thiếu payment ID.");
      return;
    }

    const shouldReject = window.confirm(
      "Bạn chắc chắn muốn từ chối payment này? Job sẽ chưa được mở cho designer.",
    );

    if (!shouldReject) return;

    setIsRejecting(true);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminNote: "Admin từ chối payment từ trang Payments.",
        }),
      });

      const result = (await response.json()) as PaymentActionResponse;

      if (!response.ok) {
        toast.error("Từ chối payment thất bại", {
          description:
            result.message ??
            "Hệ thống chưa thể từ chối payment. Vui lòng thử lại.",
        });
        return;
      }

      toast.success("Đã từ chối payment", {
        description:
          result.message ?? "Payment đã được đánh dấu là rejected.",
      });

      router.refresh();
    } catch (error) {
      console.error("[DesignMatch AI] Reject payment failed:", error);
      toast.error("Không thể kết nối hệ thống từ chối payment.");
    } finally {
      setIsRejecting(false);
    }
  }

  if (!canReview) {
    return (
      <div className="mt-5 rounded-[1.15rem] border border-blue-100 bg-white/80 p-4">
        <p className="text-sm font-semibold leading-6 text-slate-600">
          {getNonActionableMessage(currentStatus)}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-[1.15rem] border border-blue-100 bg-white/80 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        Admin action
      </p>

      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
        Xác nhận payment nếu đã đối chiếu đúng số tiền và đúng nội dung chuyển
        khoản trong tài khoản ngân hàng. Từ chối nếu giao dịch chưa hợp lệ hoặc
        chưa tìm thấy giao dịch tương ứng.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={isConfirming || isRejecting}
          className="min-h-11 rounded-full bg-emerald-600 px-5 font-extrabold text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang xác nhận
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 size-4" />
              Xác nhận payment
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleReject}
          disabled={isConfirming || isRejecting}
          className="min-h-11 rounded-full border-amber-200 bg-amber-50 px-5 font-extrabold text-amber-800 hover:bg-amber-100 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {isRejecting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang từ chối
            </>
          ) : (
            <>
              <XCircle className="mr-2 size-4" />
              Từ chối payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function getNonActionableMessage(status: string) {
  if (status === "waiting_transfer") {
    return "Payment đang chờ customer chuyển khoản và bấm xác nhận đã chuyển. Admin chưa cần xử lý payment này.";
  }

  if (status === "confirmed") {
    return "Payment này đã được xác nhận. Job tương ứng đã hoặc sẽ được kích hoạt cho designer.";
  }

  if (status === "rejected") {
    return "Payment này đã bị từ chối. Customer cần kiểm tra lại thông tin thanh toán.";
  }

  if (status === "not_required") {
    return "Payment này không yêu cầu thanh toán.";
  }

  return "Payment này hiện không còn cần thao tác xác nhận hoặc từ chối.";
}