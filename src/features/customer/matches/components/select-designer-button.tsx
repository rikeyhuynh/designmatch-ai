"use client";

import { Loader2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type SelectDesignerButtonProps = {
  requestId: string;
  matchId: string;
  disabled?: boolean;
};

type SelectDesignerResponse = {
  message?: string;
  jobId?: string;
  transferNote?: string;
  job?: {
    id: string;
    request_id: string;
    designer_id: string;
    status: string;
  };
  payment?: {
    amount_vnd: number;
    status: string;
    transfer_note: string;
    platform_fee_percent: number;
    platform_fee_vnd: number;
    designer_revenue_vnd: number;
  };
};

export function SelectDesignerButton({
  requestId,
  matchId,
  disabled = false,
}: SelectDesignerButtonProps) {
  const router = useRouter();
  const [isSelecting, setIsSelecting] = useState(false);

  async function handleSelectDesigner() {
    if (!requestId || !matchId) {
      toast.error("Thiếu dữ liệu match designer.");
      return;
    }

    setIsSelecting(true);

    try {
      const response = await fetch(
        `/api/customer/requests/${requestId}/matches/${matchId}/create-job`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as SelectDesignerResponse;

      if (!response.ok) {
        toast.error("Không thể chọn designer", {
          description:
            data.message ??
            "Hệ thống chưa thể tạo job với designer này. Vui lòng thử lại.",
        });
        return;
      }

      toast.success("Đã chọn designer", {
        description:
          data.message ??
          "Hệ thống đã tạo job từ designer match bạn đã chọn.",
      });

      const createdJobId = data.job?.id ?? data.jobId;

      if (createdJobId) {
        router.push(`/customer/jobs/${createdJobId}`);
        return;
      }

      router.refresh();
      
    } catch (error) {
      console.error("[DesignMatch AI] Select designer failed:", error);
      toast.error("Không thể kết nối hệ thống chọn designer.");
    } finally {
      setIsSelecting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSelectDesigner}
      disabled={disabled || isSelecting}
      className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#061a3a] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#0b2a61] disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {isSelecting ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang chọn designer...
        </>
      ) : (
        <>
          <UserCheck className="mr-2 size-4" />
          Chọn designer này
        </>
      )}
    </button>
  );
}