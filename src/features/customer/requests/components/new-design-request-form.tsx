"use client";

import type {
  BusinessIndustry,
  DesignCategory,
  VisualStyle,
} from "@/types/domain";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  businessIndustryLabels,
  designCategoryLabels,
  visualStyleLabels,
} from "@/lib/domain/labels";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NewDesignRequestFormProps = {
  customerProfileId: string;
};

const industryOptions = Object.entries(businessIndustryLabels) as Array<
  [BusinessIndustry, string]
>;

const categoryOptions = Object.entries(designCategoryLabels) as Array<
  [DesignCategory, string]
>;

const styleOptions = Object.entries(visualStyleLabels) as Array<
  [VisualStyle, string]
>;

export function NewDesignRequestForm({
  customerProfileId,
}: NewDesignRequestFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<BusinessIndustry>("fnb");
  const [category, setCategory] = useState<DesignCategory>("poster");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [budgetMinVnd, setBudgetMinVnd] = useState("300000");
  const [budgetMaxVnd, setBudgetMaxVnd] = useState("600000");
  const [deadline, setDeadline] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<VisualStyle[]>([
    "pastel",
    "korean",
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleStyle(style: VisualStyle) {
    setSelectedStyles((currentStyles) => {
      if (currentStyles.includes(style)) {
        return currentStyles.filter((item) => item !== style);
      }

      return [...currentStyles, style];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedStyles.length === 0) {
      toast.error("Hãy chọn ít nhất một phong cách thị giác.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.from("design_requests").insert({
        customer_id: customerProfileId,
        title,
        business_name: businessName,
        industry,
        category,
        description,
        target_audience: targetAudience,
        budget_min_vnd: Number(budgetMinVnd),
        budget_max_vnd: Number(budgetMaxVnd),
        deadline: deadline || null,
        preferred_styles: selectedStyles,
        status: "draft",
      });

      if (error) {
        toast.error("Tạo request thất bại", {
          description: error.message,
        });
        return;
      }

      toast.success("Đã tạo design request.");
      router.push("/customer/requests");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Tên request</Label>
          <Input
            id="title"
            placeholder="Ví dụ: Poster khai trương quán trà sữa"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName">Tên thương hiệu / cửa hàng</Label>
          <Input
            id="businessName"
            placeholder="Ví dụ: Mây Milk Tea"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="industry">Ngành hàng</Label>
          <select
            id="industry"
            value={industry}
            onChange={(event) =>
              setIndustry(event.target.value as BusinessIndustry)
            }
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {industryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Loại thiết kế</Label>
          <select
            id="category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as DesignCategory)
            }
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {categoryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả nhu cầu</Label>
        <Textarea
          id="description"
          placeholder="Mô tả bạn cần thiết kế gì, dùng ở đâu, muốn cảm giác như thế nào, có yêu cầu đặc biệt nào không..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetAudience">Đối tượng khách hàng</Label>
        <Textarea
          id="targetAudience"
          placeholder="Ví dụ: Sinh viên, học sinh cấp 3, dân văn phòng trẻ trong khu vực..."
          value={targetAudience}
          onChange={(event) => setTargetAudience(event.target.value)}
          rows={3}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="budgetMin">Ngân sách tối thiểu</Label>
          <Input
            id="budgetMin"
            type="number"
            min={0}
            step={50000}
            value={budgetMinVnd}
            onChange={(event) => setBudgetMinVnd(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budgetMax">Ngân sách tối đa</Label>
          <Input
            id="budgetMax"
            type="number"
            min={0}
            step={50000}
            value={budgetMaxVnd}
            onChange={(event) => setBudgetMaxVnd(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Phong cách mong muốn</Label>

        <div className="mt-3 flex flex-wrap gap-2">
          {styleOptions.map(([style, label]) => {
            const isSelected = selectedStyles.includes(style);

            return (
              <button
                key={style}
                type="button"
                onClick={() => toggleStyle(style)}
                className={`rounded-full px-3 py-1.5 text-sm font-extrabold ring-1 transition ${
                  isSelected
                    ? "bg-[#061a3a] text-white ring-[#061a3a]"
                    : "bg-white text-slate-700 ring-blue-100 hover:bg-blue-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedStyles.map((style) => (
            <StatusPill key={style} tone="info">
              {visualStyleLabels[style]}
            </StatusPill>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 rounded-2xl bg-[#061a3a] font-extrabold text-white hover:bg-[#0b2a61]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Đang tạo request
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4" />
            Tạo design request
          </>
        )}
      </Button>
    </form>
  );
}