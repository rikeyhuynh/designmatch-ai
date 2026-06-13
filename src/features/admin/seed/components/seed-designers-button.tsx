"use client";

import { Database, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function SeedDesignersButton() {
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);

  async function handleSeed() {
    setIsSeeding(true);

    try {
      const response = await fetch("/api/admin/seed-designers", {
        method: "POST",
      });

      const result = (await response.json()) as {
        message?: string;
        seeded?: Array<{
          email: string;
          designerProfileId: string;
          portfolioCount: number;
        }>;
      };

      if (!response.ok) {
        toast.error("Seed designer thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã seed designer vào Supabase", {
        description: `${result.seeded?.length ?? 0} designer được tạo/cập nhật.`,
      });

      router.refresh();
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleSeed}
      disabled={isSeeding}
      className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
    >
      {isSeeding ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang seed designer
        </>
      ) : (
        <>
          <Database className="mr-2 size-4" />
          Seed designer mẫu
        </>
      )}
    </Button>
  );
}