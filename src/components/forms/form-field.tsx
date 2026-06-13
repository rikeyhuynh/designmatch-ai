import { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  successMessage?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  htmlFor,
  required = false,
  helperText,
  error,
  successMessage,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={htmlFor}
          className="text-sm font-extrabold tracking-[-0.02em] text-[#061a3a]"
        >
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </Label>

        {successMessage ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Hợp lệ
          </span>
        ) : null}
      </div>

      {children}

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs font-semibold leading-5 text-red-600"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs font-medium leading-5 text-slate-500">
          {helperText}
        </p>
      ) : successMessage ? (
        <p className="text-xs font-medium leading-5 text-emerald-600">
          {successMessage}
        </p>
      ) : null}
    </div>
  );
}