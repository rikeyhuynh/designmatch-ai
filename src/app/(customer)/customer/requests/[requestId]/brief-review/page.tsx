import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BriefReviewForm } from "@/features/customer/requests/components/brief-review-form";
import {
  ConceptDirectionPanel,
  type CustomerConceptDirection,
  type CustomerConceptPreview,
} from "@/features/customer/requests/components/concept-direction-panel";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    requestId: string;
  }>;
};

type JsonRecord = Record<string, any>;

type DesignRequestRow = {
  id: string;
  title: string;
  business_name: string | null;
  status: string | null;
  brief_review_status: string | null;
  deadline: string | null;
  is_urgent: boolean | null;
  urgency_fee_percent: number | null;
  original_budget_min_vnd: number | null;
  original_budget_max_vnd: number | null;
  budget_min_vnd: number | null;
  budget_max_vnd: number | null;
  selected_price_vnd: number | null;
  package_name: string | null;
  package_type: string | null;
  package_code: string | null;
};

type ConceptDirectionRow = {
  id: string;
  concept_key: string | null;
  concept_name: string | null;
  concept_summary: string | null;
  strategic_role: string | null;
  display_order: number | null;
  best_for: string[] | null;
  mood_tags: string[] | null;
  style_tags: string[] | null;
  color_palette: unknown;
  typography_direction: string | null;
  layout_direction: string | null;
  image_direction: string | null;
  content_direction: string | null;
  preview_image_prompt: string | null;
  designer_guidance: string | null;
  customer_explanation: string | null;
  suitability_score: number | null;
  differentiation_score: number | null;
  risk_notes: string[] | null;
  is_selected: boolean | null;
};

type ConceptPreviewRow = {
  id: string;
  design_request_id: string;
  customer_profile_id: string | null;
  concept_direction_id: string;
  ai_model_run_id: string | null;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  image_storage_path: string | null;
  image_public_url: string | null;
  image_mime_type: string | null;
  preview_status: string | null;
  created_at: string | null;
};

function getEnvValue(key: string) {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function createSupabaseAIPageClient() {
  const supabaseUrl = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    getEnvValue("SUPABASE_SERVICE_ROLE_KEY") ??
    getEnvValue("SUPABASE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Thiếu Supabase admin env. Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as any;
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function asArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function normalizeBriefForForm(brief: any) {
  const customerEditedBrief = asRecord(brief?.customer_edited_brief_json);
  const finalBrief = asRecord(brief?.final_brief_json);
  const originalBrief = asRecord(brief?.brief_json);

  const source =
    Object.keys(customerEditedBrief).length > 0
      ? customerEditedBrief
      : Object.keys(finalBrief).length > 0
        ? finalBrief
        : originalBrief;

  const visualDirection = asRecord(source.visual_direction);

  return {
    project_title:
      String(source.project_title ?? brief?.project_title ?? "").trim(),
    business_context:
      String(source.business_context ?? brief?.business_context ?? "").trim(),
    design_objective:
      String(source.design_objective ?? brief?.design_objective ?? "").trim(),
    target_audience:
      String(source.target_audience ?? brief?.target_audience ?? "").trim(),
    key_message: String(source.key_message ?? brief?.key_message ?? "").trim(),
    deliverables: asArray(source.deliverables ?? brief?.deliverables),
    visual_direction: {
      mood: asArray(visualDirection.mood),
      style_tags: asArray(visualDirection.style_tags),
      color_direction: asArray(visualDirection.color_direction),
      typography_direction: String(
        visualDirection.typography_direction ?? "",
      ).trim(),
      layout_direction: String(visualDirection.layout_direction ?? "").trim(),
      image_direction: String(visualDirection.image_direction ?? "").trim(),
    },
    content_requirements: asArray(
      source.content_requirements ?? brief?.content_requirements,
    ),
    technical_requirements: asArray(
      source.technical_requirements ?? brief?.technical_requirements,
    ),
    references_to_collect: asArray(
      source.references_to_collect ?? brief?.references_to_collect,
    ),
    designer_notes:
      String(source.designer_notes ?? brief?.designer_notes ?? "").trim(),
  };
}

function normalizeColorPalette(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        name: String(record.name ?? "").trim() || "Không xác định",
        hex_guess:
          typeof record.hex_guess === "string" &&
          /^#[0-9a-fA-F]{6}$/.test(record.hex_guess.trim())
            ? record.hex_guess.trim().toUpperCase()
            : null,
        role: String(record.role ?? "").trim() || "supporting",
      };
    })
    .filter((item) => item.name.length > 0);
}

function normalizeConceptDirections(
  rows: ConceptDirectionRow[],
): CustomerConceptDirection[] {
  return rows.map((row) => ({
    id: row.id,
    concept_key: row.concept_key ?? "",
    concept_name: row.concept_name ?? "Concept chưa đặt tên",
    concept_summary: row.concept_summary ?? "",
    strategic_role: row.strategic_role ?? "",
    display_order: Number(row.display_order ?? 0),
    best_for: row.best_for ?? [],
    mood_tags: row.mood_tags ?? [],
    style_tags: row.style_tags ?? [],
    color_palette: normalizeColorPalette(row.color_palette),
    typography_direction: row.typography_direction ?? "",
    layout_direction: row.layout_direction ?? "",
    image_direction: row.image_direction ?? "",
    content_direction: row.content_direction ?? "",
    preview_image_prompt: row.preview_image_prompt ?? "",
    designer_guidance: row.designer_guidance ?? "",
    customer_explanation: row.customer_explanation ?? "",
    suitability_score: Number(row.suitability_score ?? 0),
    differentiation_score: Number(row.differentiation_score ?? 0),
    risk_notes: row.risk_notes ?? [],
    is_selected: Boolean(row.is_selected),
  }));
}

function normalizeConceptPreviews(
  rows: ConceptPreviewRow[],
): CustomerConceptPreview[] {
  return rows.map((row) => ({
    id: row.id,
    design_request_id: row.design_request_id,
    customer_profile_id: row.customer_profile_id,
    concept_direction_id: row.concept_direction_id,
    ai_model_run_id: row.ai_model_run_id,
    provider: row.provider ?? "",
    model: row.model ?? "",
    prompt: row.prompt ?? "",
    image_storage_path: row.image_storage_path ?? "",
    image_public_url: row.image_public_url ?? "",
    image_mime_type: row.image_mime_type ?? "",
    preview_status: row.preview_status ?? "generated",
    created_at: row.created_at ?? "",
  }));
}

function formatOptionalMoney(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Chưa xác định";
  }

  return formatCurrencyVnd(value);
}

function getUrgentBasePrice(request: DesignRequestRow) {
  if (
    request.is_urgent &&
    typeof request.selected_price_vnd === "number" &&
    request.selected_price_vnd > 0
  ) {
    return Math.round(request.selected_price_vnd / 1.5);
  }

  return request.selected_price_vnd;
}

function getUrgentFeeValue(request: DesignRequestRow) {
  const basePrice = getUrgentBasePrice(request);

  if (
    !request.is_urgent ||
    typeof basePrice !== "number" ||
    typeof request.selected_price_vnd !== "number"
  ) {
    return 0;
  }

  return Math.max(request.selected_price_vnd - basePrice, 0);
}

function getBudgetRange(min?: number | null, max?: number | null) {
  if (typeof min !== "number" || typeof max !== "number") {
    return "Chưa xác định";
  }

  return `${formatCurrencyVnd(min)} - ${formatCurrencyVnd(max)}`;
}

function DeliverySummaryCard({ request }: { request: DesignRequestRow }) {
  const isUrgent = Boolean(request.is_urgent);
  const basePrice = getUrgentBasePrice(request);
  const urgentFeeValue = getUrgentFeeValue(request);

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div
        className={`border-b p-6 ${
          isUrgent
            ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50"
            : "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50"
        }`}
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={isUrgent ? "warning" : "success"}>
                {isUrgent ? "Đơn gấp" : "Đơn thường"}
              </StatusPill>

              {request.package_name ? (
                <StatusPill tone="info">{request.package_name}</StatusPill>
              ) : null}
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.055em] text-[#061a3a]">
              Thông tin nhận hàng và chi phí
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              {isUrgent
                ? "Bạn đã chọn đơn gấp. Thời gian nhận hàng là 1 ngày và phí sẽ tăng 50% so với giá gốc."
                : "Bạn đang chọn đơn thường. Thời gian nhận hàng ít nhất 3 ngày và không có phụ phí đơn gấp."}
            </p>
          </div>

          <div
            className={`rounded-2xl px-4 py-3 text-sm font-black ${
              isUrgent
                ? "bg-amber-500 text-white"
                : "bg-[#061a3a] text-white"
            }`}
          >
            {isUrgent ? "Phí +50%" : "Không phụ phí"}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryInfo
          label="Thời gian nhận hàng"
          value={isUrgent ? "1 ngày" : "Ít nhất 3 ngày"}
        />

        <SummaryInfo
          label="Ngày nhận hàng mong muốn"
          value={request.deadline ? formatDateVi(request.deadline) : "Chưa có"}
        />

        <SummaryInfo
          label="Giá gốc"
          value={formatOptionalMoney(basePrice)}
        />

        <SummaryInfo
          label="Tổng tiền dự kiến"
          value={formatOptionalMoney(request.selected_price_vnd)}
          highlight
        />
      </div>

      {isUrgent ? (
        <div className="border-t border-amber-100 bg-amber-50/80 px-6 py-4">
          <p className="text-sm font-bold leading-6 text-amber-800">
            Phụ phí đơn gấp 50%: {formatOptionalMoney(urgentFeeValue)}. Tổng
            tiền dự kiến đã bao gồm phụ phí này.
          </p>
        </div>
      ) : (
        <div className="border-t border-blue-100 bg-blue-50/70 px-6 py-4">
          <p className="text-sm font-medium leading-6 text-slate-600">
            Đơn thường không có phụ phí. Ngân sách dự kiến:{" "}
            <span className="font-black text-[#061a3a]">
              {getBudgetRange(request.budget_min_vnd, request.budget_max_vnd)}
            </span>
            .
          </p>
        </div>
      )}
    </SurfaceCard>
  );
}

function SummaryInfo({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 text-base font-black leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

export default async function CustomerBriefReviewPage({ params }: PageProps) {
  const { requestId } = await params;

  const authState = await requireRole(["customer"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const supabase = createSupabaseAIPageClient();

  const { data: requestData } = await supabase
    .from("design_requests")
    .select(
      `
      id,
      title,
      business_name,
      status,
      brief_review_status,
      deadline,
      is_urgent,
      urgency_fee_percent,
      original_budget_min_vnd,
      original_budget_max_vnd,
      budget_min_vnd,
      budget_max_vnd,
      selected_price_vnd,
      package_name,
      package_type,
      package_code
    `,
    )
    .eq("id", requestId)
    .maybeSingle();

  const request = requestData as DesignRequestRow | null;

  if (!request) {
    redirect("/customer/requests");
  }

  const { data: brief } = await supabase
    .from("ai_briefs")
    .select("*")
    .or(`request_id.eq.${requestId},design_request_id.eq.${requestId}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!brief) {
    redirect(`/customer/requests/${requestId}/ai-brief`);
  }

  const { data: conceptRows } = await supabase
    .from("ai_concept_directions")
    .select(
      `
      id,
      concept_key,
      concept_name,
      concept_summary,
      strategic_role,
      display_order,
      best_for,
      mood_tags,
      style_tags,
      color_palette,
      typography_direction,
      layout_direction,
      image_direction,
      content_direction,
      preview_image_prompt,
      designer_guidance,
      customer_explanation,
      suitability_score,
      differentiation_score,
      risk_notes,
      is_selected
    `,
    )
    .eq("design_request_id", requestId)
    .order("display_order", { ascending: true });

  const { data: previewRows } = await supabase
    .from("ai_concept_previews")
    .select(
      `
      id,
      design_request_id,
      customer_profile_id,
      concept_direction_id,
      ai_model_run_id,
      provider,
      model,
      prompt,
      image_storage_path,
      image_public_url,
      image_mime_type,
      preview_status,
      created_at
    `,
    )
    .eq("design_request_id", requestId)
    .order("created_at", { ascending: false });

  const editableBrief = normalizeBriefForForm(brief);

  const isConfirmed =
    Boolean(brief.is_user_confirmed) ||
    brief.status === "confirmed" ||
    request.brief_review_status === "confirmed";

  const conceptRowsList = Array.isArray(conceptRows)
    ? (conceptRows as unknown as ConceptDirectionRow[])
    : [];

  const previewRowsList = Array.isArray(previewRows)
    ? (previewRows as unknown as ConceptPreviewRow[])
    : [];

  const concepts = normalizeConceptDirections(conceptRowsList);
  const previews = normalizeConceptPreviews(previewRowsList);

  return (
    <DashboardShell
      role="customer"
      title="Duyệt AI Brief"
      description="Kiểm tra brief, thời gian nhận hàng, chi phí dự kiến và concept định hướng trước khi gửi cho designer."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <div className="space-y-6">
        <DeliverySummaryCard request={request} />

        <BriefReviewForm
          requestId={requestId}
          initialBrief={editableBrief}
          isConfirmed={isConfirmed}
        />

        <ConceptDirectionPanel
          requestId={requestId}
          isBriefConfirmed={isConfirmed}
          initialConcepts={concepts}
          initialPreviews={previews}
        />
      </div>
    </DashboardShell>
  );
}