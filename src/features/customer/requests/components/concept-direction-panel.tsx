"use client";

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export type CustomerConceptColor = {
  name: string;
  hex_guess: string | null;
  role: string;
};

export type CustomerConceptDirection = {
  id: string;
  concept_key: string;
  concept_name: string;
  concept_summary: string;
  strategic_role: string;
  display_order: number;
  best_for: string[];
  mood_tags: string[];
  style_tags: string[];
  color_palette: CustomerConceptColor[];
  typography_direction: string;
  layout_direction: string;
  image_direction: string;
  content_direction: string;
  preview_image_prompt: string;
  designer_guidance: string;
  customer_explanation: string;
  suitability_score: number;
  differentiation_score: number;
  risk_notes: string[];
  is_selected: boolean;
};

export type CustomerConceptPreview = {
  id: string;
  design_request_id: string;
  customer_profile_id: string | null;
  concept_direction_id: string;
  ai_model_run_id: string | null;
  provider: string;
  model: string;
  prompt: string;
  generation_prompt?: string;
  image_storage_path: string;
  image_public_url: string;
  image_mime_type: string;
  preview_status: string;
  created_at: string;
};

type GenerateConceptResponse = {
  message?: string;
  concepts?: CustomerConceptDirection[];
};

type SelectConceptResponse = {
  message?: string;
  selectedConcept?: {
    id: string;
    is_selected: boolean | null;
  } | null;
};

type GeneratePreviewResponse = {
  message?: string;
  preview?: unknown;
};

type GenerateMatchesResponse = {
  message?: string;
  matches?: unknown[];
};

type ConceptDirectionPanelProps = {
  requestId: string;
  isBriefConfirmed: boolean;
  initialConcepts: CustomerConceptDirection[];
  initialPreviews: CustomerConceptPreview[];
};

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const cleaned = value.trim();
    return cleaned.length > 0 ? cleaned : fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizePreviewFromResponse({
  value,
  selectedConceptId,
  requestId,
}: {
  value: unknown;
  selectedConceptId: string;
  requestId: string;
}): CustomerConceptPreview | null {
  const record = asRecord(value);

  const imagePublicUrl = stringValue(
    record.image_public_url ??
      record.imagePublicUrl ??
      record.publicUrl ??
      record.url,
  );

  if (!imagePublicUrl) {
    return null;
  }

  return {
    id: stringValue(record.id, `${selectedConceptId}-${Date.now()}`),
    design_request_id: stringValue(
      record.design_request_id ?? record.designRequestId,
      requestId,
    ),
    customer_profile_id:
      stringValue(record.customer_profile_id ?? record.customerProfileId) ||
      null,
    concept_direction_id: stringValue(
      record.concept_direction_id ?? record.conceptDirectionId,
      selectedConceptId,
    ),
    ai_model_run_id:
      stringValue(record.ai_model_run_id ?? record.aiModelRunId) || null,
    provider: stringValue(record.provider, "gemini"),
    model: stringValue(record.model, "gemini-image"),
    prompt: stringValue(record.prompt ?? record.generation_prompt),
    generation_prompt: stringValue(record.generation_prompt ?? record.prompt),
    image_storage_path: stringValue(
      record.image_storage_path ?? record.imageStoragePath,
    ),
    image_public_url: imagePublicUrl,
    image_mime_type: stringValue(
      record.image_mime_type ?? record.imageMimeType,
      "image/png",
    ),
    preview_status: stringValue(record.preview_status, "generated"),
    created_at: stringValue(record.created_at, new Date().toISOString()),
  };
}

function getPreviewImageUrl(preview: CustomerConceptPreview) {
  const separator = preview.image_public_url.includes("?") ? "&" : "?";

  return `${preview.image_public_url}${separator}v=${encodeURIComponent(
    preview.id,
  )}`;
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-sm text-slate-400">Chưa có dữ liệu</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function normalizeConceptDisplayScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const score = Number(value);

  if (score > 0 && score <= 1) {
    return Math.max(0, Math.min(100, Math.round(score * 100)));
  }

  if (score > 1 && score <= 10) {
    return Math.max(0, Math.min(100, Math.round(score * 10)));
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const safeValue = normalizeConceptDisplayScore(value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold text-slate-950">
        {safeValue}
        <span className="text-sm text-slate-500">/100</span>
      </p>
    </div>
  );
}

function ColorPalette({ colors }: { colors: CustomerConceptColor[] }) {
  if (colors.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có bảng màu.</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color, index) => (
        <div
          key={`${color.name}-${index}`}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2"
        >
          <span
            className="h-6 w-6 rounded-full border border-slate-200"
            style={{
              backgroundColor: color.hex_guess ?? "#E5E7EB",
            }}
          />

          <span className="text-xs text-slate-700">
            <span className="font-semibold">{color.name}</span>
            {color.role ? (
              <span className="text-slate-400"> · {color.role}</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function PreviewWatermarkOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,26,58,0.08)_25%,transparent_25%,transparent_50%,rgba(6,26,58,0.08)_50%,rgba(6,26,58,0.08)_75%,transparent_75%,transparent)] bg-[length:80px_80px]" />

      <div className="absolute inset-0 flex rotate-[-24deg] flex-col justify-center gap-12 opacity-25">
        {Array.from({ length: 7 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center gap-10 whitespace-nowrap text-3xl font-black uppercase tracking-[0.28em] text-[#061a3a]"
          >
            <span>DesignMatch AI Preview</span>
            <span>DesignMatch AI Preview</span>
            <span>DesignMatch AI Preview</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#061a3a] shadow-sm backdrop-blur">
        Watermarked preview
      </div>
    </div>
  );
}

function PreviewCard({
  preview,
  selectedConceptName,
}: {
  preview: CustomerConceptPreview;
  selectedConceptName: string;
}) {
  return (
    <section className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Visual Concept Preview
          </p>

          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Ảnh preview cho concept: {selectedConceptName}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Đây là ảnh minh họa định hướng sáng tạo, giúp khách hàng và designer
            thống nhất mood, màu sắc, bố cục và visual direction trước khi thiết
            kế bản hoàn chỉnh.
          </p>
        </div>

        <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600">
          {preview.provider} · {preview.model}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPreviewImageUrl(preview)}
            alt={`Visual concept preview for ${selectedConceptName}`}
            className="aspect-square w-full object-cover"
          />

          <PreviewWatermarkOverlay />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />

          <p className="text-sm font-medium leading-6 text-slate-600">
            Sau bước này, hệ thống sẽ dùng brief, concept, ảnh preview,
            portfolio analysis và Style DNA để AI đề xuất designer phù hợp.
          </p>
        </div>
      </div>
    </section>
  );
}

function ConceptCard({
  concept,
  index,
  isSelecting,
  onSelect,
}: {
  concept: CustomerConceptDirection;
  index: number;
  isSelecting: boolean;
  onSelect: (conceptId: string) => void;
}) {
  return (
    <article
      className={
        concept.is_selected
          ? "rounded-3xl border-2 border-blue-500 bg-blue-50/40 p-5 shadow-sm"
          : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Concept {index + 1}
            </p>

            {concept.is_selected ? (
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Đã chọn
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            {concept.concept_name}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {concept.concept_summary}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:min-w-64">
          <ScorePill label="Phù hợp brief" value={concept.suitability_score} />
          <ScorePill label="Khác biệt" value={concept.differentiation_score} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">
            Vai trò chiến lược
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {concept.strategic_role || "Chưa có mô tả."}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">
            Giải thích cho khách hàng
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {concept.customer_explanation || "Chưa có giải thích."}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-950">
            Phù hợp nhất cho
          </p>
          <TagList items={concept.best_for} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-950">Mood</p>
          <TagList items={concept.mood_tags} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-950">
            Style tags
          </p>
          <TagList items={concept.style_tags} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-950">
            Bảng màu đề xuất
          </p>
          <ColorPalette colors={concept.color_palette} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">
            Typography direction
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {concept.typography_direction || "Chưa có định hướng typography."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">
            Layout direction
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {concept.layout_direction || "Chưa có định hướng layout."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">
            Image direction
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {concept.image_direction || "Chưa có định hướng hình ảnh."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">
            Content direction
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {concept.content_direction || "Chưa có định hướng nội dung."}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-950">
          Ghi chú cho designer
        </p>

        <p className="mt-2 text-sm leading-6 text-blue-900">
          {concept.designer_guidance ||
            "Designer sẽ phát triển concept này thành thiết kế hoàn chỉnh."}
        </p>
      </div>

      {concept.risk_notes.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">
            Rủi ro khi chọn concept này
          </p>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900">
            {concept.risk_notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => onSelect(concept.id)}
          disabled={concept.is_selected || isSelecting}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {concept.is_selected
            ? "Concept đã được chọn"
            : isSelecting
              ? "Đang chọn..."
              : "Chọn concept này"}
        </button>
      </div>
    </article>
  );
}

export function ConceptDirectionPanel({
  requestId,
  isBriefConfirmed,
  initialConcepts,
  initialPreviews,
}: ConceptDirectionPanelProps) {
  const router = useRouter();

  const [concepts, setConcepts] =
    useState<CustomerConceptDirection[]>(initialConcepts);
  const [previews, setPreviews] =
    useState<CustomerConceptPreview[]>(initialPreviews);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);
  const [selectingConceptId, setSelectingConceptId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);

  const selectedConcept = useMemo(
    () => concepts.find((concept) => concept.is_selected) ?? null,
    [concepts],
  );

  const selectedPreview = useMemo(() => {
    if (!selectedConcept) {
      return null;
    }

    return (
      previews.find(
        (preview) => preview.concept_direction_id === selectedConcept.id,
      ) ?? null
    );
  }, [previews, selectedConcept]);

  async function handleGenerateConcepts() {
    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/customer/requests/${requestId}/generate-concepts`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as GenerateConceptResponse;

      if (!response.ok) {
        const errorMessage =
          data.message ?? "Không thể tạo concept direction. Vui lòng thử lại.";
        setMessage(errorMessage);
        toast.error("Không thể tạo concept", {
          description: errorMessage,
        });
        return;
      }

      setConcepts(data.concepts ?? []);
      setPreviews([]);
      setMessage(data.message ?? "Đã tạo concept direction thành công.");

      toast.success("Đã tạo concept direction", {
        description: "Hãy chọn một hướng concept để tạo visual preview.",
      });

      router.refresh();
    } catch (error) {
      console.error("[DesignMatch AI] Generate concepts client error:", error);
      setMessage("Không thể kết nối đến hệ thống AI. Vui lòng thử lại.");
      toast.error("Không thể kết nối đến hệ thống AI.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSelectConcept(conceptId: string) {
    if (!conceptId) {
      setMessage("Concept không hợp lệ.");
      return;
    }

    setSelectingConceptId(conceptId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/customer/requests/${requestId}/concepts/${conceptId}/select`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as SelectConceptResponse;

      if (!response.ok) {
        const errorMessage = data.message ?? "Không thể chọn concept này.";
        setMessage(errorMessage);
        toast.error("Không thể chọn concept", {
          description: errorMessage,
        });
        return;
      }

      setConcepts((currentConcepts) =>
        currentConcepts.map((concept) => ({
          ...concept,
          is_selected: concept.id === conceptId,
        })),
      );

      setMessage(data.message ?? "Đã chọn concept direction.");

      toast.success("Đã chọn concept", {
        description: "Bây giờ bạn có thể tạo visual preview.",
      });

      router.refresh();
    } catch (error) {
      console.error("[DesignMatch AI] Select concept client error:", error);
      setMessage("Không thể kết nối đến hệ thống. Vui lòng thử lại.");
      toast.error("Không thể kết nối đến hệ thống.");
    } finally {
      setSelectingConceptId(null);
    }
  }

  async function handleGeneratePreview() {
    if (!selectedConcept) {
      setMessage("Bạn cần chọn một concept trước khi tạo ảnh preview.");
      toast.error("Bạn cần chọn concept trước.");
      return;
    }

    setIsGeneratingPreview(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/customer/requests/${requestId}/generate-preview`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as GeneratePreviewResponse;

      if (!response.ok) {
        const errorMessage =
          stringValue(data.message) ||
          "Không thể tạo visual concept preview. Vui lòng thử lại.";

        setMessage(errorMessage);
        toast.error("Không thể tạo visual preview", {
          description: errorMessage,
        });
        return;
      }

      const normalizedPreview = normalizePreviewFromResponse({
        value: data.preview,
        selectedConceptId: selectedConcept.id,
        requestId,
      });

      if (!normalizedPreview) {
        const errorMessage =
          "AI đã tạo preview nhưng response chưa có image_public_url.";
        setMessage(errorMessage);
        toast.error("Preview chưa hợp lệ", {
          description: errorMessage,
        });
        return;
      }

      setPreviews((currentPreviews) => [
        normalizedPreview,
        ...currentPreviews.filter(
          (preview) =>
            preview.concept_direction_id !==
            normalizedPreview.concept_direction_id,
        ),
      ]);

      setMessage(data.message ?? "Đã tạo visual concept preview.");

      toast.success("Đã tạo visual preview", {
        description: "Ảnh preview đã hiển thị ngay bên dưới.",
      });

      router.refresh();
    } catch (error) {
      console.error("[DesignMatch AI] Generate preview client error:", error);
      setMessage("Không thể kết nối đến hệ thống AI. Vui lòng thử lại.");
      toast.error("Không thể kết nối đến hệ thống AI.");
    } finally {
      setIsGeneratingPreview(false);
    }
  }

  async function handleContinueToDesignerMatching() {
    if (!selectedConcept) {
      toast.error("Bạn cần chọn concept trước.");
      setMessage("Bạn cần chọn concept trước khi AI matching designer.");
      return;
    }

    if (!selectedPreview) {
      toast.error("Bạn cần tạo visual preview trước.");
      setMessage("Bạn cần tạo visual preview trước khi AI matching designer.");
      return;
    }

    setIsGeneratingMatches(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/customer/requests/${requestId}/generate-matches`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as GenerateMatchesResponse;

      if (!response.ok) {
        const errorMessage =
          data.message ??
          "AI chưa tạo được danh sách designer phù hợp. Vui lòng kiểm tra lại portfolio/DNA hoặc thử lại.";

        setMessage(errorMessage);

        toast.error("Không thể tạo designer match", {
          description: errorMessage,
        });

        return;
      }

      const matchCount = Array.isArray(data.matches) ? data.matches.length : 0;

      if (matchCount === 0) {
        const errorMessage =
          data.message ??
          "AI đã chạy nhưng chưa có designer nào đủ điều kiện đề xuất.";

        setMessage(errorMessage);

        toast.error("Chưa có designer phù hợp", {
          description: errorMessage,
        });

        return;
      }

      toast.success("Đã tạo danh sách designer đề xuất", {
        description: `AI đã phân tích và đề xuất ${matchCount} designer phù hợp.`,
      });

      router.push(`/customer/matches?requestId=${requestId}&refresh=${Date.now()}`);
    } catch (error) {
      console.error("[DesignMatch AI] Generate matches client error:", error);
      setMessage("Không thể kết nối đến AI Matching. Vui lòng thử lại.");
      toast.error("Không thể kết nối đến AI Matching.");
    } finally {
      setIsGeneratingMatches(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            AI Concept Direction
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Bước 2: Tạo concept direction
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Sau khi brief đã chốt, hệ thống sẽ tạo hướng concept. Bạn chọn một
            hướng, tạo visual preview, sau đó AI sẽ phân tích và đề xuất top
            designer phù hợp.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateConcepts}
          disabled={!isBriefConfirmed || isGenerating}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              AI đang tạo concept...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Tạo concept bằng AI
            </>
          )}
        </button>
      </div>

      {!isBriefConfirmed ? (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Bạn cần chốt brief trước khi tạo concept direction.
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          {message}
        </div>
      ) : null}

      {selectedConcept ? (
        <div className="mt-6 rounded-3xl border border-blue-100 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Concept đang chọn: {selectedConcept.concept_name}
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tạo một ảnh minh họa để AI có thêm ngữ cảnh khi matching
                designer theo mood, màu sắc, bố cục và visual direction.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isGeneratingPreview ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  AI đang tạo ảnh preview...
                </>
              ) : selectedPreview ? (
                <>
                  <RefreshCcw className="mr-2 size-4" />
                  Tạo lại ảnh preview
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Tạo ảnh preview
                </>
              )}
            </button>
          </div>

          {selectedPreview ? (
            <div className="mt-5">
              <PreviewCard
                preview={selectedPreview}
                selectedConceptName={selectedConcept.concept_name}
              />

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleContinueToDesignerMatching}
                  disabled={isGeneratingMatches}
                  className="inline-flex items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isGeneratingMatches ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      AI đang phân tích designer...
                    </>
                  ) : (
                    <>
                      Tiếp tục chọn designer
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : concepts.length > 0 ? (
        <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Hãy chọn một concept trước khi tạo ảnh visual preview.
        </div>
      ) : null}

      {concepts.length > 0 ? (
        <div className="mt-6 space-y-5">
          {concepts.map((concept, index) => (
            <ConceptCard
              key={concept.id || concept.concept_key || index}
              concept={concept}
              index={index}
              isSelecting={selectingConceptId === concept.id}
              onSelect={handleSelectConcept}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm font-medium text-slate-700">
            Chưa có concept direction.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Sau khi chốt brief, bấm “Tạo concept bằng AI” để hệ thống đề xuất
            các hướng sáng tạo phù hợp.
          </p>
        </div>
      )}
    </section>
  );
}