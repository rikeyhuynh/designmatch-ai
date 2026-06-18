"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type DeletePortfolioItemButtonProps = {
  portfolioId: string;
  portfolioTitle: string;
};

type DeletePortfolioResponse = {
  message?: string;
  dnaUpdated?: boolean;
};

export function DeletePortfolioItemButton({
  portfolioId,
  portfolioTitle,
}: DeletePortfolioItemButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      [
        `Bạn có chắc muốn xóa portfolio "${portfolioTitle}" không?`,
        "",
        "Style riêng của portfolio này sẽ bị xóa khỏi hệ thống.",
        "Style DNA tổng hợp sẽ được cập nhật lại từ các portfolio còn lại.",
      ].join("\n"),
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/designer/portfolio/${portfolioId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as DeletePortfolioResponse;

      if (!response.ok) {
        toast.error("Không thể xóa portfolio", {
          description: result.message ?? "Đã có lỗi xảy ra.",
        });

        return;
      }

      if (result.dnaUpdated === false) {
        toast.warning("Đã xóa portfolio nhưng Style DNA chưa cập nhật", {
          description:
            result.message ??
            "Hãy tải lại trang hoặc phân tích lại portfolio còn lại.",
        });
      } else {
        toast.success("Đã xóa portfolio", {
          description:
            result.message ??
            "Style DNA đã được cập nhật lại từ các portfolio còn lại.",
        });
      }

      router.refresh();
    } catch (error) {
      toast.error("Không thể xóa portfolio", {
        description:
          error instanceof Error
            ? error.message
            : "Không thể kết nối đến hệ thống.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-full border-red-200 bg-red-50 font-extrabold text-red-600 hover:bg-red-100 hover:text-red-700 disabled:bg-slate-100 disabled:text-slate-400"
    >
      {isDeleting ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Đang xóa
        </>
      ) : (
        <>
          <Trash2 className="mr-2 size-4" />
          Xóa
        </>
      )}
    </Button>
  );
}