"use client";

import { ArrowRight, BriefcaseBusiness, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type GenerateBriefButtonProps = {
  requestId: string;
};

type GenerateMatchesButtonProps = {
  requestId: string;
};

type CreateJobFromMatchButtonProps = {
  requestId: string;
  matchId: string;
  designerName: string;
};

type OpenJobButtonProps = {
  jobId: string;
};

export function GenerateBriefButton({ requestId }: GenerateBriefButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateBrief() {
    const confirmed = window.confirm(
      "Tạo lại AI brief cho request này? Brief cũ có thể được cập nhật.",
    );

    if (!confirmed) return;

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
        toast.error("Không thể tạo AI brief", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã tạo AI brief", {
        description: result.message,
      });

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
      variant="outline"
      className="rounded-full border-blue-200 bg-white font-extrabold"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang tạo brief
        </>
      ) : (
        <>
          <Sparkles className="mr-2 size-4" />
          Tạo lại AI brief
        </>
      )}
    </Button>
  );
}

export function GenerateMatchesButton({
  requestId,
}: GenerateMatchesButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateMatches() {
    const confirmed = window.confirm(
      "Tạo lại designer matching cho request này? Danh sách match cũ sẽ được cập nhật theo designer đã được admin duyệt.",
    );

    if (!confirmed) return;

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
      };

      if (!response.ok) {
        toast.error("Match designer thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã tạo designer matches", {
        description: result.message,
      });

      router.refresh();
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleGenerateMatches}
      disabled={isGenerating}
      className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61] disabled:bg-slate-300 disabled:text-slate-500"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang matching
        </>
      ) : (
        <>
          <RefreshCcw className="mr-2 size-4" />
          Tạo lại matching
        </>
      )}
    </Button>
  );
}

export function CreateJobFromMatchButton({
  requestId,
  matchId,
  designerName,
}: CreateJobFromMatchButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateJob() {
    const confirmed = window.confirm(
      `Chọn ${designerName} cho request này và tạo job thật?`,
    );

    if (!confirmed) return;

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
      };

      if (!response.ok) {
        toast.error("Không thể tạo job", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã tạo job", {
        description: result.message,
      });

      router.refresh();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleCreateJob}
      disabled={isCreating}
      className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61] disabled:bg-slate-300 disabled:text-slate-500"
    >
      {isCreating ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang tạo job
        </>
      ) : (
        <>
          <BriefcaseBusiness className="mr-2 size-4" />
          Chọn designer
        </>
      )}
    </Button>
  );
}

export function OpenJobButton({ jobId }: OpenJobButtonProps) {
  return (
    <Button
      asChild
      className="rounded-full bg-emerald-600 px-5 font-extrabold text-white hover:bg-emerald-700"
    >
      <Link href={`/customer/jobs/${jobId}`}>
        Mở job
        <ArrowRight className="ml-2 size-4" />
      </Link>
    </Button>
  );
}