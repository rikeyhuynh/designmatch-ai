"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CompleteJobButtonProps = {
  jobId: string;
  disabled?: boolean;
};

export function CompleteJobButton({ jobId, disabled }: CompleteJobButtonProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  async function handleCompleteJob() {
    setIsCompleting(true);

    try {
      const response = await fetch(`/api/customer/jobs/${jobId}/complete`, {
        method: "POST",
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Không thể hoàn thành job", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã hoàn thành job", {
        description: result.message,
      });

      router.refresh();
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleCompleteJob}
      disabled={disabled || isCompleting}
      className="min-h-12 rounded-xl bg-emerald-700 px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(4,120,87,0.22)] hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
    >
      {isCompleting ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang hoàn thành
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-2 size-4" />
          Duyệt bản hoàn thiện
        </>
      )}
    </Button>
  );
}