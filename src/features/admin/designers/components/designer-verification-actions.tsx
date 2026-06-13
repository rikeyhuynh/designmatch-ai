"use client";

import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type DesignerVerificationActionsProps = {
  designerId: string;
  currentStatus: string | null;
};

export function DesignerVerificationActions({
  designerId,
  currentStatus,
}: DesignerVerificationActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<
    "approve" | "reject" | "review" | null
  >(null);

  async function handleAction(action: "approve" | "reject" | "review") {
    if (action === "approve") {
      const confirmed = window.confirm(
        "Duyệt designer này và cho phép hiển thị như một designer hợp lệ?",
      );

      if (!confirmed) return;
    }

    if (action === "reject") {
      const confirmed = window.confirm(
        "Từ chối designer này? Designer sẽ không được xem là hồ sơ đã duyệt.",
      );

      if (!confirmed) return;
    }

    setIsSubmitting(action);

    try {
      const response = await fetch(
        `/api/admin/designers/${designerId}/verification`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
          }),
        },
      );

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Không thể cập nhật designer", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã cập nhật designer", {
        description: result.message,
      });

      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {currentStatus !== "approved" ? (
        <Button
          type="button"
          onClick={() => handleAction("approve")}
          disabled={Boolean(isSubmitting)}
          className="rounded-full bg-emerald-600 px-5 font-extrabold text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSubmitting === "approve" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang duyệt
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 size-4" />
              Duyệt designer
            </>
          )}
        </Button>
      ) : null}

      {currentStatus !== "rejected" ? (
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
      ) : null}

      {currentStatus !== "in_review" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => handleAction("review")}
          disabled={Boolean(isSubmitting)}
          className="rounded-full border-blue-200 bg-white px-5 font-extrabold text-blue-700 hover:bg-blue-50"
        >
          {isSubmitting === "review" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang cập nhật
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 size-4" />
              Đưa về đang duyệt
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}