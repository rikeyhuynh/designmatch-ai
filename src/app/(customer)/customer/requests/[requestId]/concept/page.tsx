import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Lightbulb } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  ConceptDirectionPanel,
  type CustomerConceptDirection,
  type CustomerConceptPreview,
} from "@/features/customer/requests/components/concept-direction-panel";
import { requireRole } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    requestId: string;
  }>;
};

type RequestRow = {
  id: string;
  customer_id: string;
  title: string;
  business_name: string;
  status: string;
  brief_review_status: string | null;
  brief_confirmed_at: string | null;
};

type AiBriefRow = {
  id: string;
  is_user_confirmed: boolean | null;
  status: string | null;
  confirmed_at: string | null;
  final_brief_json: unknown;
};

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeConcept(row: Record<string, unknown>): CustomerConceptDirection {
  return {
    id: String(row.id ?? ""),
    concept_key: String(row.concept_key ?? row.id ?? ""),
    concept_name: String(row.concept_name ?? "Concept direction"),
    concept_summary: String(row.concept_summary ?? ""),
    strategic_role: String(row.strategic_role ?? ""),
    display_order:
      typeof row.display_order === "number" ? row.display_order : 0,
    best_for: Array.isArray(row.best_for)
      ? row.best_for.map(String).filter(Boolean)
      : [],
    mood_tags: Array.isArray(row.mood_tags)
      ? row.mood_tags.map(String).filter(Boolean)
      : [],
    style_tags: Array.isArray(row.style_tags)
      ? row.style_tags.map(String).filter(Boolean)
      : [],
    color_palette: Array.isArray(row.color_palette)
      ? row.color_palette.map((item) => {
          const color = asRecord(item);

          return {
            name: String(color.name ?? "Color"),
            hex_guess:
              typeof color.hex_guess === "string" ? color.hex_guess : null,
            role: String(color.role ?? ""),
          };
        })
      : [],
    typography_direction: String(row.typography_direction ?? ""),
    layout_direction: String(row.layout_direction ?? ""),
    image_direction: String(row.image_direction ?? ""),
    content_direction: String(row.content_direction ?? ""),
    preview_image_prompt: String(row.preview_image_prompt ?? ""),
    designer_guidance: String(row.designer_guidance ?? ""),
    customer_explanation: String(row.customer_explanation ?? ""),
    suitability_score:
      typeof row.suitability_score === "number" ? row.suitability_score : 0,
    differentiation_score:
      typeof row.differentiation_score === "number"
        ? row.differentiation_score
        : 0,
    risk_notes: Array.isArray(row.risk_notes)
      ? row.risk_notes.map(String).filter(Boolean)
      : [],
    is_selected: Boolean(row.is_selected),
  };
}

function normalizePreview(row: Record<string, unknown>): CustomerConceptPreview {
  return {
    id: String(row.id ?? ""),
    design_request_id: String(row.design_request_id ?? ""),
    customer_profile_id:
      typeof row.customer_profile_id === "string"
        ? row.customer_profile_id
        : null,
    concept_direction_id: String(row.concept_direction_id ?? ""),
    ai_model_run_id:
      typeof row.ai_model_run_id === "string" ? row.ai_model_run_id : null,
    provider: String(row.provider ?? "AI"),
    model: String(row.model ?? "image model"),
    prompt: String(row.prompt ?? ""),
    image_storage_path: String(row.image_storage_path ?? ""),
    image_public_url: String(row.image_public_url ?? ""),
    image_mime_type: String(row.image_mime_type ?? "image/png"),
    preview_status: String(row.preview_status ?? "generated"),
    created_at: String(row.created_at ?? ""),
  };
}

export default async function CustomerRequestConceptPage({ params }: PageProps) {
  const { requestId } = await params;

  if (!requestId) {
    notFound();
  }

  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const requestResult = await adminSupabase
    .from("design_requests")
    .select(
      `
      id,
      customer_id,
      title,
      business_name,
      status,
      brief_review_status,
      brief_confirmed_at
    `,
    )
    .eq("id", requestId)
    .eq("customer_id", customerProfile.id)
    .maybeSingle();

  if (requestResult.error || !requestResult.data) {
    notFound();
  }

  const request = requestResult.data as RequestRow;

  const [briefResult, conceptsResult, previewsResult] = await Promise.all([
    adminSupabase
      .from("ai_briefs")
      .select(
        `
        id,
        is_user_confirmed,
        status,
        confirmed_at,
        final_brief_json
      `,
      )
      .or(`request_id.eq.${request.id},design_request_id.eq.${request.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    adminSupabase
      .from("ai_concept_directions")
      .select("*")
      .eq("design_request_id", request.id)
      .order("display_order", { ascending: true }),

    adminSupabase
      .from("ai_concept_previews")
      .select("*")
      .eq("design_request_id", request.id)
      .order("created_at", { ascending: false }),
  ]);

  const brief = briefResult.data as AiBriefRow | null;

  const isBriefConfirmed =
    Boolean(brief?.is_user_confirmed) ||
    brief?.status === "confirmed" ||
    Boolean(brief?.confirmed_at) ||
    request.brief_review_status === "confirmed" ||
    Object.keys(asRecord(brief?.final_brief_json)).length > 0;

  const concepts = ((conceptsResult.data ?? []) as Record<string, unknown>[]).map(
    normalizeConcept,
  );

  const previews = ((previewsResult.data ?? []) as Record<string, unknown>[]).map(
    normalizePreview,
  );

  return (
    <DashboardShell
      role="customer"
      title="Concept direction"
      description="Tạo concept, chọn hướng sáng tạo và tạo visual preview trước khi matching designer."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          briefResult.error?.message,
          conceptsResult.error?.message,
          previewsResult.error?.message,
        ]}
      />

      <SurfaceCard className="mb-5 p-6">
        <Button
          asChild
          variant="outline"
          className="rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={`/customer/requests/${request.id}/brief-review`}>
            <ArrowLeft className="mr-2 size-4" />
            Quay lại brief
          </Link>
        </Button>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Step 2 / Creative Direction
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              {request.title}
            </h1>

            <p className="mt-2 text-sm font-bold text-blue-700">
              {request.business_name}
            </p>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              Bạn đang ở bước tạo concept. Sau khi tạo preview, hệ thống sẽ tự
              tạo designer matching và chuyển bạn sang bước chọn designer.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {isBriefConfirmed ? (
                <StatusPill tone="success">Brief đã chốt</StatusPill>
              ) : (
                <StatusPill tone="warning">Cần chốt brief</StatusPill>
              )}

              <StatusPill tone="info">{`${concepts.length} concepts`}</StatusPill>
              <StatusPill tone="info">{`${previews.length} previews`}</StatusPill>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/70 p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
                <Lightbulb className="size-5" />
              </div>

              <div>
                <p className="text-sm font-black text-[#061a3a]">
                  Luồng tiếp theo
                </p>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                  Chọn concept → tạo preview → hệ thống tự tạo matching → chọn
                  designer → tạo job.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {!isBriefConfirmed ? (
        <SurfaceCard className="mb-5 border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 size-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                Brief chưa chốt
              </p>
              <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
                Bạn cần quay lại bước Review Brief và chốt brief trước khi tạo
                concept direction.
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <ConceptDirectionPanel
        requestId={request.id}
        isBriefConfirmed={isBriefConfirmed}
        initialConcepts={concepts}
        initialPreviews={previews}
      />
    </DashboardShell>
  );
}

function ErrorPanel({ errors }: { errors: Array<string | undefined> }) {
  const realErrors = errors.filter((error): error is string => Boolean(error));

  if (realErrors.length === 0) return null;

  return (
    <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">
        Data loading warning
      </p>

      <div className="mt-3 grid gap-2">
        {realErrors.map((error) => (
          <p key={error} className="text-sm font-semibold leading-7 text-red-600">
            {error}
          </p>
        ))}
      </div>
    </SurfaceCard>
  );
}