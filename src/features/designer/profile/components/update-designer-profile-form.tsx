"use client";

import { Loader2, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type UpdateDesignerProfileFormProps = {
  initialDisplayName: string;
  initialHeadline: string;
  initialBio: string;
  initialSpecialties: string[];
  initialStyles: string[];
  initialMinimumProjectBudgetVnd: number;
  initialAvailability: string;
};

const availabilityOptions = [
  {
    value: "available",
    label: "Đang nhận job",
  },
  {
    value: "busy",
    label: "Đang bận",
  },
  {
    value: "unavailable",
    label: "Tạm nghỉ",
  },
];

export function UpdateDesignerProfileForm({
  initialDisplayName,
  initialHeadline,
  initialBio,
  initialSpecialties,
  initialStyles,
  initialMinimumProjectBudgetVnd,
  initialAvailability,
}: UpdateDesignerProfileFormProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [headline, setHeadline] = useState(initialHeadline);
  const [bio, setBio] = useState(initialBio);
  const [specialtiesText, setSpecialtiesText] = useState(
    initialSpecialties.join(", "),
  );
  const [stylesText, setStylesText] = useState(initialStyles.join(", "));
  const [minimumProjectBudgetVnd, setMinimumProjectBudgetVnd] = useState(
    String(initialMinimumProjectBudgetVnd),
  );
  const [availability, setAvailability] = useState(
    initialAvailability || "available",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const specialties = splitCommaText(specialtiesText);
    const styles = splitCommaText(stylesText);
    const minimumBudget = Number(minimumProjectBudgetVnd);

    if (displayName.trim().length < 2) {
      toast.error("Tên hiển thị quá ngắn", {
        description: "Vui lòng nhập ít nhất 2 ký tự.",
      });
      return;
    }

    if (headline.trim().length < 5) {
      toast.error("Headline quá ngắn", {
        description: "Vui lòng nhập ít nhất 5 ký tự.",
      });
      return;
    }

    if (!Number.isFinite(minimumBudget) || minimumBudget < 0) {
      toast.error("Minimum budget không hợp lệ", {
        description: "Vui lòng nhập số tiền hợp lệ.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/designer/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          headline: headline.trim(),
          bio: bio.trim(),
          specialties,
          styles,
          minimumProjectBudgetVnd: minimumBudget,
          availability,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Không thể cập nhật hồ sơ", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã cập nhật hồ sơ", {
        description: result.message,
      });

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
          <UserRound className="size-5" />
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
            Edit profile
          </p>

          <h3 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
            Cập nhật hồ sơ designer
          </h3>

          <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
            Các thông tin này sẽ được lưu thật vào Supabase và dùng để cải thiện
            matching.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="designer-display-name" className="font-extrabold">
            Tên hiển thị
          </Label>

          <Input
            id="designer-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="min-h-12 rounded-2xl border-blue-100 bg-white"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="designer-headline" className="font-extrabold">
            Headline
          </Label>

          <Input
            id="designer-headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="Ví dụ: Warm minimal branding for local shops"
            className="min-h-12 rounded-2xl border-blue-100 bg-white"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="designer-availability" className="font-extrabold">
            Availability
          </Label>

          <select
            id="designer-availability"
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            disabled={isSubmitting}
            className="min-h-12 rounded-2xl border border-blue-100 bg-white px-3 text-sm font-semibold text-[#061a3a] outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          >
            {availabilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="designer-budget" className="font-extrabold">
            Minimum project budget VND
          </Label>

          <Input
            id="designer-budget"
            type="number"
            min={0}
            step={50000}
            value={minimumProjectBudgetVnd}
            onChange={(event) => setMinimumProjectBudgetVnd(event.target.value)}
            className="min-h-12 rounded-2xl border-blue-100 bg-white"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="designer-bio" className="font-extrabold">
            Bio
          </Label>

          <Textarea
            id="designer-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Giới thiệu ngắn về phong cách, kinh nghiệm và nhóm khách hàng bạn muốn phục vụ..."
            className="min-h-32 rounded-2xl border-blue-100 bg-white"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="designer-specialties" className="font-extrabold">
            Specialties
          </Label>

          <Input
            id="designer-specialties"
            value={specialtiesText}
            onChange={(event) => setSpecialtiesText(event.target.value)}
            placeholder="Ví dụ: Logo, Social post, Brand guideline"
            className="min-h-12 rounded-2xl border-blue-100 bg-white"
            disabled={isSubmitting}
          />

          <p className="text-xs font-medium leading-5 text-slate-500">
            Nhập nhiều mục bằng dấu phẩy.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="designer-styles" className="font-extrabold">
            Visual styles
          </Label>

          <Input
            id="designer-styles"
            value={stylesText}
            onChange={(event) => setStylesText(event.target.value)}
            placeholder="Ví dụ: Minimal, Warm, Pastel, Bold"
            className="min-h-12 rounded-2xl border-blue-100 bg-white"
            disabled={isSubmitting}
          />

          <p className="text-xs font-medium leading-5 text-slate-500">
            Nhập nhiều phong cách bằng dấu phẩy.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61] disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang lưu hồ sơ
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Lưu hồ sơ
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function splitCommaText(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}