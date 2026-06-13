"use client";

import { BriefcaseBusiness, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CreateJobFromMatchButtonProps = {
  requestId: string;
  matchId: string;
  disabled?: boolean;
};

export function CreateJobFromMatchButton({
  requestId,
  matchId,
  disabled,
}: CreateJobFromMatchButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateJob() {
    setIsCreating(true);

    try {
      const response = await fetch(
        `/api/customer/requests/${requestId}/matches/${matchId}/create-job`,
        {
          method: "POST",
        },
      );

      const result = (await response.json()) as {
        message?: string;
        jobId?: string;
        transferNote?: string;
      };

      if (!response.ok) {
        toast.error("Chọn designer thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã tạo job thành công", {
        description: result.transferNote
          ? `Mã chuyển khoản: ${result.transferNote}`
          : result.message,
      });

      router.push("/customer/jobs");
      router.refresh();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleCreateJob}
      disabled={disabled || isCreating}
      className="w-full rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
    >
      {isCreating ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang tạo job
        </>
      ) : (
        <>
          <BriefcaseBusiness className="mr-2 size-4" />
          Chọn designer này
        </>
      )}
    </Button>
  );
}