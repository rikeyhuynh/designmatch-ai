"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type GenerateAiBriefButtonProps = {
  requestId: string;
  hasBrief: boolean;
};

export function GenerateAiBriefButton({
  requestId,
  hasBrief,
}: GenerateAiBriefButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateBrief() {
    setIsGenerating(true);

    try {
      const response = await fetch(
        `/api/customer/requests/${requestId}/generate-brief`,
        {
          method: "POST",
        },
      );

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Tạo AI brief thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success(
        hasBrief ? "Đã tạo lại AI brief." : "Đã tạo AI brief thành công.",
      );

      router.refresh();
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleGenerateBrief}
      disabled={isGenerating}
      className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang tạo brief
        </>
      ) : (
        <>
          <Sparkles className="mr-2 size-4" />
          {hasBrief ? "Tạo lại AI brief" : "Tạo AI brief"}
        </>
      )}
    </Button>
  );
}