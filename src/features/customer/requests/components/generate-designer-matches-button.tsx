"use client";

import { Loader2, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type GenerateDesignerMatchesButtonProps = {
  requestId: string;
  hasBrief: boolean;
  hasMatches: boolean;
};

export function GenerateDesignerMatchesButton({
  requestId,
  hasBrief,
  hasMatches,
}: GenerateDesignerMatchesButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateMatches() {
    if (!hasBrief) {
      toast.error("Hãy tạo AI brief trước khi match designer.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(
        `/api/customer/requests/${requestId}/generate-matches`,
        {
          method: "POST",
        },
      );

      const result = (await response.json()) as {
        message?: string;
        matches?: unknown[];
      };

      if (!response.ok) {
        toast.error("Match designer thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success(
        hasMatches ? "Đã match lại designer." : "Đã match designer thành công.",
        {
          description: `${result.matches?.length ?? 0} designer được đề xuất.`,
        },
      );

      router.refresh();
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleGenerateMatches}
      disabled={isGenerating || !hasBrief}
      className="rounded-full bg-blue-700 px-5 font-extrabold text-white hover:bg-blue-800"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang match
        </>
      ) : (
        <>
          <UsersRound className="mr-2 size-4" />
          {hasMatches ? "Match lại designer" : "Match designer"}
        </>
      )}
    </Button>
  );
}