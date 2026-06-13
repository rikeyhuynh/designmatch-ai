import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type DesignRequestRow = {
  id: string;
  customer_id: string;
  title: string;
  budget_min_vnd: number;
  budget_max_vnd: number;
  deadline: string | null;
  status: string;
};

type DesignerMatchRow = {
  id: string;
  request_id: string;
  designer_id: string;
  match_score: number | null;
};

type DesignerRow = {
  id: string;
  display_name: string;
  verification_status: string | null;
  availability: string | null;
  minimum_project_budget_vnd: number | null;
};

type ExistingJobRow = {
  id: string;
  status: string;
};

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const requestId = routeParams.requestId ?? routeParams.requestID;
  const matchId = routeParams.matchId ?? routeParams.matchID;

  if (!requestId || !matchId) {
    return NextResponse.json(
      {
        message: "Thiếu request ID hoặc match ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để chọn designer.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "customer" || !authState.customerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ customer mới có thể chọn designer và tạo job.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: requestData, error: requestError } = await adminSupabase
    .from("design_requests")
    .select(
      `
      id,
      customer_id,
      title,
      budget_min_vnd,
      budget_max_vnd,
      deadline,
      status
    `,
    )
    .eq("id", requestId)
    .eq("customer_id", authState.customerProfile.id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json(
      {
        message: requestError.message,
      },
      { status: 500 },
    );
  }

  if (!requestData) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy request hoặc bạn không có quyền truy cập request này.",
      },
      { status: 404 },
    );
  }

  const designRequest = requestData as DesignRequestRow;

  if (["completed", "cancelled"].includes(String(designRequest.status))) {
    return NextResponse.json(
      {
        message: "Request này đã hoàn tất hoặc đã hủy, không thể tạo job mới.",
      },
      { status: 400 },
    );
  }

  const { data: existingJobData, error: existingJobError } =
    await adminSupabase
      .from("jobs")
      .select("id, status")
      .eq("request_id", designRequest.id)
      .maybeSingle();

  if (existingJobError) {
    return NextResponse.json(
      {
        message: existingJobError.message,
      },
      { status: 500 },
    );
  }

  const existingJob = existingJobData as ExistingJobRow | null;

  if (existingJob) {
    return NextResponse.json(
      {
        message: "Request này đã có job, không thể tạo thêm job trùng.",
        jobId: existingJob.id,
      },
      { status: 409 },
    );
  }

  const { data: matchData, error: matchError } = await adminSupabase
    .from("designer_matches")
    .select(
      `
      id,
      request_id,
      designer_id,
      match_score
    `,
    )
    .eq("id", matchId)
    .eq("request_id", designRequest.id)
    .maybeSingle();

  if (matchError) {
    return NextResponse.json(
      {
        message: matchError.message,
      },
      { status: 500 },
    );
  }

  if (!matchData) {
    return NextResponse.json(
      {
        message: "Không tìm thấy designer match hợp lệ cho request này.",
      },
      { status: 404 },
    );
  }

  const match = matchData as DesignerMatchRow;

  const { data: designerData, error: designerError } = await adminSupabase
    .from("designer_profiles")
    .select(
      `
      id,
      display_name,
      verification_status,
      availability,
      minimum_project_budget_vnd
    `,
    )
    .eq("id", match.designer_id)
    .maybeSingle();

  if (designerError) {
    return NextResponse.json(
      {
        message: designerError.message,
      },
      { status: 500 },
    );
  }

  if (!designerData) {
    return NextResponse.json(
      {
        message: "Không tìm thấy designer của match này.",
      },
      { status: 404 },
    );
  }

  const designer = designerData as DesignerRow;

  if (designer.verification_status !== "approved") {
    return NextResponse.json(
      {
        message:
          "Designer này chưa được admin duyệt hoặc đã bị từ chối, không thể tạo job.",
      },
      { status: 403 },
    );
  }

  if (designer.availability === "unavailable") {
    return NextResponse.json(
      {
        message: "Designer này đang tạm nghỉ, không thể nhận job mới.",
      },
      { status: 403 },
    );
  }

  const agreedPriceVnd = calculateSuggestedPrice({
    min: Number(designRequest.budget_min_vnd ?? 0),
    max: Number(designRequest.budget_max_vnd ?? 0),
    designerMinimumBudget: Number(designer.minimum_project_budget_vnd ?? 0),
  });

  const { data: job, error: jobError } = await adminSupabase
    .from("jobs")
    .insert({
      request_id: designRequest.id,
      customer_id: authState.customerProfile.id,
      designer_id: designer.id,
      title: designRequest.title,
      status: "payment_pending",
      agreed_price_vnd: agreedPriceVnd,
      started_at: null,
      due_at: designRequest.deadline,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      {
        message: jobError?.message ?? "Không tạo được job.",
      },
      { status: 500 },
    );
  }

  const transferNote = buildTransferNote(job.id);

  const { error: paymentError } = await adminSupabase.from("payments").insert({
    job_id: job.id,
    amount_vnd: agreedPriceVnd,
    status: "waiting_transfer",
    transfer_note: transferNote,
    admin_note: null,
    confirmed_at: null,
  });

  if (paymentError) {
    await adminSupabase.from("jobs").delete().eq("id", job.id);

    return NextResponse.json(
      {
        message: paymentError.message,
      },
      { status: 500 },
    );
  }

  const { error: requestStatusError } = await adminSupabase
    .from("design_requests")
    .update({
      status: "in_progress",
    })
    .eq("id", designRequest.id)
    .eq("customer_id", authState.customerProfile.id);

  if (requestStatusError) {
    return NextResponse.json(
      {
        message: requestStatusError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Đã chọn ${designer.display_name} và tạo job thành công.`,
    jobId: job.id,
    transferNote,
  });
}

function calculateSuggestedPrice({
  min,
  max,
  designerMinimumBudget,
}: {
  min: number;
  max: number;
  designerMinimumBudget: number;
}) {
  if (max > 0) {
    return Math.max(max, designerMinimumBudget);
  }

  if (min > 0) {
    return Math.max(min, designerMinimumBudget);
  }

  if (designerMinimumBudget > 0) {
    return designerMinimumBudget;
  }

  return 500000;
}

function buildTransferNote(jobId: string) {
  const prefix = process.env.BANK_TRANSFER_NOTE_PREFIX || "DMAI";
  const shortId = jobId.slice(0, 8).toUpperCase();

  return `${prefix}-${shortId}`;
}