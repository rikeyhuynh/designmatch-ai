"use client";

import {
  CheckCircle2,
  FileText,
  LayoutTemplate,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type JsonRecord = Record<string, unknown>;

type PackageScope = {
  package_name: string;
  package_type: string;
  pricing_tier: string;
  selected_price: string;
  price_level: string;
  scope_summary: string;
  revision_limit: string;
  deliverable_limit: string;
};

type ProductSpecificSection = {
  section_title: string;
  requirements: string[];
};

type VisualDirection = {
  mood: string[];
  style_tags: string[];
  color_direction: string[];
  typography_direction: string;
  layout_direction: string;
  image_direction: string;
};

type LayoutHierarchy = {
  priority_order: string[];
  composition_notes: string;
  readability_notes: string;
  print_or_platform_notes: string;
};

type DetailedBrief = {
  project_title: string;
  business_context: string;
  design_objective: string;
  target_audience: string;
  key_message: string;
  deliverables: string[];
  package_scope: PackageScope;
  product_specific_requirements: ProductSpecificSection[];
  visual_direction: VisualDirection;
  layout_hierarchy: LayoutHierarchy;
  content_requirements: string[];
  technical_requirements: string[];
  references_to_collect: string[];
  acceptance_checklist: string[];
  out_of_scope_items: string[];
  designer_notes: string;
};

type BriefReviewFormProps = {
  requestId?: string;
  designRequestId?: string;
  aiBriefId?: string | null;

  initialBrief?: unknown;
  brief?: unknown;
  aiBrief?: unknown;

  initialStatus?: string | null;
  briefReviewStatus?: string | null;
  isConfirmed?: boolean | null;
};

type SubmitMode = "save_draft" | "confirm";

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function hasKeys(value: JsonRecord) {
  return Object.keys(value).length > 0;
}

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

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

/**
 * Dùng khi đang nhập trong textarea.
 * Không trim, không filter, để người dùng gõ dấu cách bình thường.
 */
function textareaToEditableLines(value: string) {
  return value.split("\n");
}

/**
 * Dùng trước khi lưu/chốt brief.
 */
function cleanStringArray(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean);
}

function linesToTextarea(value: string[]) {
  return value.join("\n");
}

function normalizeProductSpecificSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        section_title: stringValue(record.section_title, "Yêu cầu thiết kế"),
        requirements: stringArray(record.requirements),
      };
    })
    .filter(
      (item) =>
        item.section_title.trim().length > 0 ||
        item.requirements.length > 0,
    );
}

function pickBriefSource(raw: unknown) {
  const row = asRecord(raw);

  const finalBrief = asRecord(row.final_brief_json);
  const editedBrief = asRecord(row.customer_edited_brief_json);
  const briefJson = asRecord(row.brief_json);

  if (hasKeys(finalBrief)) {
    return {
      source: finalBrief,
      sourceType: "final" as const,
      row,
    };
  }

  if (hasKeys(editedBrief)) {
    return {
      source: editedBrief,
      sourceType: "edited" as const,
      row,
    };
  }

  if (hasKeys(briefJson)) {
    return {
      source: briefJson,
      sourceType: "generated" as const,
      row,
    };
  }

  return {
    source: row,
    sourceType: "generated" as const,
    row,
  };
}

function normalizeBrief(raw: unknown): DetailedBrief {
  const { source, sourceType, row } = pickBriefSource(raw);

  const packageScope = asRecord(source.package_scope);
  const visualDirection = asRecord(source.visual_direction);
  const layoutHierarchy = asRecord(source.layout_hierarchy);

  const deliverables =
    stringArray(source.deliverables).length > 0
      ? stringArray(source.deliverables)
      : stringArray(row.deliverables);

  const contentRequirements =
    stringArray(source.content_requirements).length > 0
      ? stringArray(source.content_requirements)
      : stringArray(row.content_requirements);

  const technicalRequirements =
    stringArray(source.technical_requirements).length > 0
      ? stringArray(source.technical_requirements)
      : stringArray(row.technical_requirements);

  const referencesToCollect =
    stringArray(source.references_to_collect).length > 0
      ? stringArray(source.references_to_collect)
      : stringArray(row.references_to_collect);

  return {
    project_title: stringValue(
      source.project_title ?? row.project_title,
      "Brief thiết kế mới",
    ),
    business_context: stringValue(
      source.business_context ?? row.business_context,
      "",
    ),
    design_objective: stringValue(
      source.design_objective ?? row.design_objective ?? row.objective,
      "",
    ),
    target_audience: stringValue(
      source.target_audience ?? row.target_audience,
      "",
    ),
    key_message: stringValue(source.key_message ?? row.key_message, ""),
    deliverables,
    package_scope: {
      package_name: stringValue(packageScope.package_name, ""),
      package_type: stringValue(packageScope.package_type, ""),
      pricing_tier: stringValue(packageScope.pricing_tier, ""),
      selected_price: stringValue(packageScope.selected_price, ""),
      price_level: stringValue(packageScope.price_level, ""),
      scope_summary: stringValue(packageScope.scope_summary, ""),
      revision_limit: stringValue(packageScope.revision_limit, ""),
      deliverable_limit: stringValue(packageScope.deliverable_limit, ""),
    },
    product_specific_requirements: normalizeProductSpecificSections(
      source.product_specific_requirements,
    ),
    visual_direction: {
      mood: stringArray(visualDirection.mood),
      style_tags: stringArray(visualDirection.style_tags),
      color_direction: stringArray(visualDirection.color_direction),
      typography_direction: stringValue(
        visualDirection.typography_direction,
        "",
      ),
      layout_direction: stringValue(visualDirection.layout_direction, ""),
      image_direction: stringValue(visualDirection.image_direction, ""),
    },
    layout_hierarchy: {
      priority_order: stringArray(layoutHierarchy.priority_order),
      composition_notes: stringValue(layoutHierarchy.composition_notes, ""),
      readability_notes: stringValue(layoutHierarchy.readability_notes, ""),
      print_or_platform_notes: stringValue(
        layoutHierarchy.print_or_platform_notes,
        "",
      ),
    },
    content_requirements: contentRequirements,
    technical_requirements: technicalRequirements,
    references_to_collect: referencesToCollect,
    acceptance_checklist: stringArray(source.acceptance_checklist),
    out_of_scope_items: stringArray(source.out_of_scope_items),
    designer_notes:
      sourceType === "generated"
        ? ""
        : stringValue(source.designer_notes ?? row.designer_notes, ""),
  };
}

function cleanBriefForSave(brief: DetailedBrief): DetailedBrief {
  return {
    ...brief,
    project_title: brief.project_title.trim(),
    business_context: brief.business_context.trim(),
    design_objective: brief.design_objective.trim(),
    target_audience: brief.target_audience.trim(),
    key_message: brief.key_message.trim(),
    deliverables: cleanStringArray(brief.deliverables),
    product_specific_requirements: brief.product_specific_requirements
      .map((section) => ({
        section_title: section.section_title.trim(),
        requirements: cleanStringArray(section.requirements),
      }))
      .filter(
        (section) =>
          section.section_title.length > 0 || section.requirements.length > 0,
      ),
    visual_direction: {
      ...brief.visual_direction,
      mood: cleanStringArray(brief.visual_direction.mood),
      style_tags: cleanStringArray(brief.visual_direction.style_tags),
      color_direction: cleanStringArray(
        brief.visual_direction.color_direction,
      ),
      typography_direction:
        brief.visual_direction.typography_direction.trim(),
      layout_direction: brief.visual_direction.layout_direction.trim(),
      image_direction: brief.visual_direction.image_direction.trim(),
    },
    layout_hierarchy: {
      priority_order: cleanStringArray(brief.layout_hierarchy.priority_order),
      composition_notes: brief.layout_hierarchy.composition_notes.trim(),
      readability_notes: brief.layout_hierarchy.readability_notes.trim(),
      print_or_platform_notes:
        brief.layout_hierarchy.print_or_platform_notes.trim(),
    },
    content_requirements: cleanStringArray(brief.content_requirements),
    technical_requirements: cleanStringArray(brief.technical_requirements),
    references_to_collect: cleanStringArray(brief.references_to_collect),
    acceptance_checklist: cleanStringArray(brief.acceptance_checklist),
    out_of_scope_items: cleanStringArray(brief.out_of_scope_items),
    designer_notes: brief.designer_notes.trim(),
  };
}

function isBriefConfirmed(props: BriefReviewFormProps) {
  return (
    props.isConfirmed === true ||
    props.initialStatus === "confirmed" ||
    props.briefReviewStatus === "confirmed"
  );
}

async function safeReadJson(response: Response) {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

function validateBriefForConfirm(brief: DetailedBrief) {
  const cleanedBrief = cleanBriefForSave(brief);

  if (!cleanedBrief.project_title) {
    return "Tên dự án không được để trống.";
  }

  if (!cleanedBrief.design_objective) {
    return "Mục tiêu thiết kế không được để trống.";
  }

  if (!cleanedBrief.key_message) {
    return "Thông điệp chính không được để trống.";
  }

  if (cleanedBrief.deliverables.length === 0) {
    return "Cần có ít nhất một deliverable.";
  }

  if (cleanedBrief.content_requirements.length === 0) {
    return "Cần có ít nhất một yêu cầu nội dung.";
  }

  if (cleanedBrief.technical_requirements.length === 0) {
    return "Cần có ít nhất một yêu cầu kỹ thuật.";
  }

  return null;
}

function buildSavePayload({
  mode,
  brief,
}: {
  mode: SubmitMode;
  brief: DetailedBrief;
}) {
  const isConfirming = mode === "confirm";
  const cleanedBrief = cleanBriefForSave(brief);

  return {
    action: mode,
    mode,
    intent: mode,
    submitAction: mode,
    status: isConfirming ? "confirmed" : "draft",
    isConfirmed: isConfirming,
    confirm: isConfirming,

    brief: cleanedBrief,
    editedBrief: cleanedBrief,
    customerEditedBriefJson: cleanedBrief,
    customer_edited_brief_json: cleanedBrief,
    finalBriefJson: isConfirming ? cleanedBrief : null,
    final_brief_json: isConfirming ? cleanedBrief : null,
  };
}

export function BriefReviewForm(props: BriefReviewFormProps) {
  const router = useRouter();

  const requestId = props.requestId ?? props.designRequestId ?? "";
  const rawBrief = props.initialBrief ?? props.brief ?? props.aiBrief ?? {};

  const initialBrief = useMemo(() => normalizeBrief(rawBrief), [rawBrief]);

  const [brief, setBrief] = useState<DetailedBrief>(initialBrief);
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [confirmed, setConfirmed] = useState(isBriefConfirmed(props));

  const isSubmitting = submitMode !== null;

  function updateBriefField<Key extends keyof DetailedBrief>(
    key: Key,
    value: DetailedBrief[Key],
  ) {
    setBrief((currentBrief) => ({
      ...currentBrief,
      [key]: value,
    }));
  }

  function updateVisualDirection<Key extends keyof VisualDirection>(
    key: Key,
    value: VisualDirection[Key],
  ) {
    setBrief((currentBrief) => ({
      ...currentBrief,
      visual_direction: {
        ...currentBrief.visual_direction,
        [key]: value,
      },
    }));
  }

  function updateLayoutHierarchy<Key extends keyof LayoutHierarchy>(
    key: Key,
    value: LayoutHierarchy[Key],
  ) {
    setBrief((currentBrief) => ({
      ...currentBrief,
      layout_hierarchy: {
        ...currentBrief.layout_hierarchy,
        [key]: value,
      },
    }));
  }

  function updateProductSectionTitle(index: number, value: string) {
    setBrief((currentBrief) => {
      const nextSections = [...currentBrief.product_specific_requirements];

      nextSections[index] = {
        ...nextSections[index],
        section_title: value,
      };

      return {
        ...currentBrief,
        product_specific_requirements: nextSections,
      };
    });
  }

  function updateProductSectionRequirements(index: number, value: string) {
    setBrief((currentBrief) => {
      const nextSections = [...currentBrief.product_specific_requirements];

      nextSections[index] = {
        ...nextSections[index],
        requirements: textareaToEditableLines(value),
      };

      return {
        ...currentBrief,
        product_specific_requirements: nextSections,
      };
    });
  }

  function addProductSection() {
    setBrief((currentBrief) => ({
      ...currentBrief,
      product_specific_requirements: [
        ...currentBrief.product_specific_requirements,
        {
          section_title: "Yêu cầu bổ sung",
          requirements: [],
        },
      ],
    }));
  }

  function removeProductSection(index: number) {
    setBrief((currentBrief) => ({
      ...currentBrief,
      product_specific_requirements:
        currentBrief.product_specific_requirements.filter(
          (_section, sectionIndex) => sectionIndex !== index,
        ),
    }));
  }

  async function submitBrief(mode: SubmitMode) {
    if (!requestId) {
      toast.error("Thiếu request ID.");
      return;
    }

    if (mode === "confirm") {
      const validationMessage = validateBriefForConfirm(brief);

      if (validationMessage) {
        toast.error("Brief chưa đủ để chốt", {
          description: validationMessage,
        });
        return;
      }
    }

    setSubmitMode(mode);

    try {
      const endpoint = `/api/customer/requests/${requestId}/brief-review`;
      const payload = buildSavePayload({ mode, brief });

      let response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 404 || response.status === 405) {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const responsePayload = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(
          stringValue(
            responsePayload.message,
            mode === "confirm"
              ? "Không thể chốt brief."
              : "Không thể lưu bản nháp brief.",
          ),
        );
      }

      if (mode === "confirm") {
        setConfirmed(true);
        toast.success("Đã chốt brief", {
          description: "Tiếp theo: tạo concept direction bằng AI.",
        });
        router.push(`/customer/requests/${requestId}/concept`);
        router.refresh();
        return;
      }

      toast.success("Đã lưu bản nháp brief.");
      router.refresh();
    } catch (error) {
      toast.error(
        mode === "confirm" ? "Chốt brief thất bại" : "Lưu brief thất bại",
        {
          description: getErrorMessage(
            error,
            "Vui lòng thử lại hoặc kiểm tra terminal server.",
          ),
        },
      );
    } finally {
      setSubmitMode(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <FileText className="size-5" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                AI Brief Review
              </p>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Kiểm tra và chốt brief thiết kế
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Đây là brief chi tiết được AI tạo theo đúng ấn phẩm đã chọn. Bạn
                có thể chỉnh lại nội dung trước khi chốt gửi cho designer.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {confirmed ? (
              <StatusPill tone="success">Đã chốt brief</StatusPill>
            ) : (
              <StatusPill tone="warning">Đang chỉnh brief</StatusPill>
            )}

            <StatusPill tone="info">Single Design Request</StatusPill>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-blue-100 bg-white p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-blue-700" />
          <h3 className="text-lg font-black tracking-[-0.035em] text-[#061a3a]">
            1. Thông tin chính của brief
          </h3>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="project_title">Tên dự án</Label>
            <Input
              id="project_title"
              value={brief.project_title}
              onChange={(event) =>
                updateBriefField("project_title", event.target.value)
              }
              disabled={isSubmitting || confirmed}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_message">Thông điệp chính</Label>
            <Input
              id="key_message"
              value={brief.key_message}
              onChange={(event) =>
                updateBriefField("key_message", event.target.value)
              }
              disabled={isSubmitting || confirmed}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          <div className="space-y-2">
            <Label htmlFor="business_context">Bối cảnh kinh doanh</Label>
            <Textarea
              id="business_context"
              value={brief.business_context}
              onChange={(event) =>
                updateBriefField("business_context", event.target.value)
              }
              disabled={isSubmitting || confirmed}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="design_objective">Mục tiêu thiết kế</Label>
            <Textarea
              id="design_objective"
              value={brief.design_objective}
              onChange={(event) =>
                updateBriefField("design_objective", event.target.value)
              }
              disabled={isSubmitting || confirmed}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_audience">Đối tượng mục tiêu</Label>
            <Textarea
              id="target_audience"
              value={brief.target_audience}
              onChange={(event) =>
                updateBriefField("target_audience", event.target.value)
              }
              disabled={isSubmitting || confirmed}
              rows={3}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="size-5 text-blue-700" />
            <h3 className="text-lg font-black tracking-[-0.035em] text-[#061a3a]">
              2. Yêu cầu riêng theo loại ấn phẩm
            </h3>
          </div>

          {!confirmed ? (
            <Button
              type="button"
              variant="outline"
              onClick={addProductSection}
              disabled={isSubmitting}
              className="rounded-2xl"
            >
              Thêm nhóm yêu cầu
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4">
          {brief.product_specific_requirements.length > 0 ? (
            brief.product_specific_requirements.map((section, index) => (
              <div
                key={`${section.section_title}-${index}`}
                className="rounded-3xl border border-blue-100 bg-blue-50/40 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2 md:flex-1">
                    <Label>Tiêu đề nhóm yêu cầu</Label>
                    <Input
                      value={section.section_title}
                      onChange={(event) =>
                        updateProductSectionTitle(index, event.target.value)
                      }
                      disabled={isSubmitting || confirmed}
                    />
                  </div>

                  {!confirmed ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeProductSection(index)}
                      disabled={isSubmitting}
                      className="rounded-2xl md:mt-7"
                    >
                      Xóa
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Mỗi dòng là một yêu cầu</Label>
                  <Textarea
                    value={linesToTextarea(section.requirements)}
                    onChange={(event) =>
                      updateProductSectionRequirements(
                        index,
                        event.target.value,
                      )
                    }
                    disabled={isSubmitting || confirmed}
                    rows={5}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/50 p-5 text-sm font-medium leading-6 text-slate-600">
              Chưa có yêu cầu riêng theo ấn phẩm. Bạn có thể thêm nhóm yêu cầu
              nếu cần.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white p-5">
        <h3 className="text-lg font-black tracking-[-0.035em] text-[#061a3a]">
          3. Định hướng thị giác
        </h3>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>Mood / cảm giác</Label>
            <Textarea
              value={linesToTextarea(brief.visual_direction.mood)}
              onChange={(event) =>
                updateVisualDirection(
                  "mood",
                  textareaToEditableLines(event.target.value),
                )
              }
              disabled={isSubmitting || confirmed}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Style tags</Label>
            <Textarea
              value={linesToTextarea(brief.visual_direction.style_tags)}
              onChange={(event) =>
                updateVisualDirection(
                  "style_tags",
                  textareaToEditableLines(event.target.value),
                )
              }
              disabled={isSubmitting || confirmed}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Màu sắc</Label>
            <Textarea
              value={linesToTextarea(brief.visual_direction.color_direction)}
              onChange={(event) =>
                updateVisualDirection(
                  "color_direction",
                  textareaToEditableLines(event.target.value),
                )
              }
              disabled={isSubmitting || confirmed}
              rows={5}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          <div className="space-y-2">
            <Label>Typography</Label>
            <Textarea
              value={brief.visual_direction.typography_direction}
              onChange={(event) =>
                updateVisualDirection(
                  "typography_direction",
                  event.target.value,
                )
              }
              disabled={isSubmitting || confirmed}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Định hướng bố cục</Label>
            <Textarea
              value={brief.visual_direction.layout_direction}
              onChange={(event) =>
                updateVisualDirection("layout_direction", event.target.value)
              }
              disabled={isSubmitting || confirmed}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Định hướng hình ảnh</Label>
            <Textarea
              value={brief.visual_direction.image_direction}
              onChange={(event) =>
                updateVisualDirection("image_direction", event.target.value)
              }
              disabled={isSubmitting || confirmed}
              rows={3}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white p-5">
        <h3 className="text-lg font-black tracking-[-0.035em] text-[#061a3a]">
          4. Layout & hierarchy
        </h3>

        <div className="mt-5 grid gap-5">
          <div className="space-y-2">
            <Label>Thứ tự ưu tiên thông tin</Label>
            <Textarea
              value={linesToTextarea(brief.layout_hierarchy.priority_order)}
              onChange={(event) =>
                updateLayoutHierarchy(
                  "priority_order",
                  textareaToEditableLines(event.target.value),
                )
              }
              disabled={isSubmitting || confirmed}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Ghi chú bố cục</Label>
            <Textarea
              value={brief.layout_hierarchy.composition_notes}
              onChange={(event) =>
                updateLayoutHierarchy(
                  "composition_notes",
                  event.target.value,
                )
              }
              disabled={isSubmitting || confirmed}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Ghi chú khả năng đọc</Label>
            <Textarea
              value={brief.layout_hierarchy.readability_notes}
              onChange={(event) =>
                updateLayoutHierarchy("readability_notes", event.target.value)
              }
              disabled={isSubmitting || confirmed}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Ghi chú kênh sử dụng / in ấn</Label>
            <Textarea
              value={brief.layout_hierarchy.print_or_platform_notes}
              onChange={(event) =>
                updateLayoutHierarchy(
                  "print_or_platform_notes",
                  event.target.value,
                )
              }
              disabled={isSubmitting || confirmed}
              rows={3}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white p-5">
        <h3 className="text-lg font-black tracking-[-0.035em] text-[#061a3a]">
          5. Nội dung, kỹ thuật và tài liệu
        </h3>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="space-y-2">
            <Label>Deliverables</Label>
            <Textarea
              value={linesToTextarea(brief.deliverables)}
              onChange={(event) =>
                updateBriefField(
                  "deliverables",
                  textareaToEditableLines(event.target.value),
                )
              }
              disabled={isSubmitting || confirmed}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Yêu cầu nội dung</Label>
            <Textarea
              value={linesToTextarea(brief.content_requirements)}
              onChange={(event) =>
                updateBriefField(
                  "content_requirements",
                  textareaToEditableLines(event.target.value),
                )
              }
              disabled={isSubmitting || confirmed}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Yêu cầu kỹ thuật</Label>
            <Textarea
              value={linesToTextarea(brief.technical_requirements)}
              onChange={(event) =>
                updateBriefField(
                  "technical_requirements",
                  textareaToEditableLines(event.target.value),
                )
              }
              disabled={isSubmitting || confirmed}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Tài liệu cần thu thập</Label>
            <Textarea
              value={linesToTextarea(brief.references_to_collect)}
              onChange={(event) =>
                updateBriefField(
                  "references_to_collect",
                  textareaToEditableLines(event.target.value),
                )
              }
              disabled={isSubmitting || confirmed}
              rows={5}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white p-5">
        <h3 className="text-lg font-black tracking-[-0.035em] text-[#061a3a]">
          6. Ghi chú thêm cho designer
        </h3>

        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          Phần này là tùy chọn. Bạn có thể để trống nếu không có ghi chú riêng.
        </p>

        <div className="mt-5 space-y-2">
          <Label htmlFor="designer_notes">Ghi chú cho designer</Label>
          <Textarea
            id="designer_notes"
            placeholder="Ví dụ: Mình thích bố cục thoáng, chữ dễ đọc, không dùng màu quá chói..."
            value={brief.designer_notes}
            onChange={(event) =>
              updateBriefField("designer_notes", event.target.value)
            }
            disabled={isSubmitting || confirmed}
            rows={4}
          />
        </div>
      </section>

      <div className="sticky bottom-4 z-20 rounded-3xl border border-blue-100 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-[#061a3a]">
              Kiểm tra kỹ brief trước khi chốt
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              Sau khi chốt, hệ thống sẽ dùng brief này để matching designer và
              gửi cho designer khi nhận job.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {!confirmed ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => submitBrief("save_draft")}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl font-extrabold"
                >
                  {submitMode === "save_draft" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  Lưu nháp
                </Button>

                <Button
                  type="button"
                  onClick={() => submitBrief("confirm")}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl bg-[#061a3a] font-extrabold text-white hover:bg-[#0b2a61]"
                >
                  {submitMode === "confirm" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 size-4" />
                  )}
                  Chốt brief gửi designer
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => router.push(`/customer/requests/${requestId}/concept`)}
                className="h-11 rounded-2xl bg-[#061a3a] font-extrabold text-white hover:bg-[#0b2a61]"
              >
                Tiếp tục tạo concept
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}