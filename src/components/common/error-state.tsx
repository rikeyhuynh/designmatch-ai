import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

type ErrorStateVariant = "card" | "plain";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: ErrorStateVariant;
};

export function ErrorState({
  title = "Đã có lỗi xảy ra",
  description = "Hệ thống chưa thể xử lý yêu cầu này. Vui lòng kiểm tra lại hoặc thử lại sau.",
  action,
  className,
  variant = "card",
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "card" &&
          "rounded-[1.5rem] border border-red-100 bg-white p-8 shadow-[0_18px_55px_rgba(145,15,15,0.065)]",
        variant === "plain" && "p-6",
        className,
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>

      <h3 className="mt-5 max-w-md text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
        {title}
      </h3>

      {description ? (
        <p className="mt-3 max-w-md text-sm font-medium leading-7 text-slate-600">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}