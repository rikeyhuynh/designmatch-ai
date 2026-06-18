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
  budget_min_vnd: number | null;
  budget_max_vnd: number | null;
  selected_price_vnd: number | null;
  pricing_tier: string | null;
  package_code: string | null;
  package_name: string | null;
  platform_fee_percent: number | null;
  platform_fee_vnd: number | null;
  designer_revenue_vnd: number | null;
  is_team_booking: boolean | null;
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

type JobRow = {
  id: string;
  request_id: string;
  designer_id: string;
  status: string;
};

const DEFAULT_PLATFORM_FEE_PERCENT = 12;

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
      selected_price_vnd,
      pricing_tier,
      package_code,
      package_name,
      platform_fee_percent,
      platform_fee_vnd,
      designer_revenue_vnd,
      is_team_booking,
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

  const designRequest = requestData as DesignRequestRow | null;

  if (!designRequest) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy request hoặc bạn không có quyền truy cập request này.",
      },
      { status: 404 },
    );
  }

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
      .select("id, request_id, designer_id, status")
      .eq("request_id", designRequest.id)
      .limit(1);

  if (existingJobError) {
    return NextResponse.json(
      {
        message: existingJobError.message,
      },
      { status: 500 },
    );
  }

  const existingJob = ((existingJobData ?? []) as JobRow[])[0] ?? null;

  if (existingJob) {
    return NextResponse.json({
      message: "Request này đã có job. Hệ thống sẽ chuyển bạn đến job hiện có.",
      job: existingJob,
      jobId: existingJob.id,
    });
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

  const match = matchData as DesignerMatchRow | null;

  if (!match) {
    return NextResponse.json(
      {
        message: "Không tìm thấy designer match hợp lệ cho request này.",
      },
      { status: 404 },
    );
  }

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

  const designer = designerData as DesignerRow | null;

  if (!designer) {
    return NextResponse.json(
      {
        message: "Không tìm thấy designer của match này.",
      },
      { status: 404 },
    );
  }

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

  const agreedPriceVnd = calculateAgreedPrice({
    selectedPrice: Number(designRequest.selected_price_vnd ?? 0),
    min: Number(designRequest.budget_min_vnd ?? 0),
    max: Number(designRequest.budget_max_vnd ?? 0),
    designerMinimumBudget: Number(designer.minimum_project_budget_vnd ?? 0),
  });

  const feeBreakdown = calculateFeeBreakdown({
    agreedPriceVnd,
    platformFeePercent: Number(
      designRequest.platform_fee_percent ?? DEFAULT_PLATFORM_FEE_PERCENT,
    ),
    platformFeeVnd: designRequest.platform_fee_vnd,
    designerRevenueVnd: designRequest.designer_revenue_vnd,
  });

  const now = new Date().toISOString();

  const { data: createdJobData, error: jobError } = await adminSupabase
    .from("jobs")
    .insert({
      request_id: designRequest.id,
      customer_id: designRequest.customer_id,
      designer_id: designer.id,
      title: designRequest.title,
      status: "payment_pending",
      agreed_price_vnd: agreedPriceVnd,
      selected_price_vnd: designRequest.selected_price_vnd ?? agreedPriceVnd,
      pricing_tier: designRequest.pricing_tier,
      package_code: designRequest.package_code,
      package_name: designRequest.package_name,
      platform_fee_percent: feeBreakdown.platformFeePercent,
      platform_fee_vnd: feeBreakdown.platformFeeVnd,
      designer_revenue_vnd: feeBreakdown.designerRevenueVnd,
      is_team_booking: Boolean(designRequest.is_team_booking),
      started_at: null,
      due_at: designRequest.deadline,
      updated_at: now,
    })
    .select("id, request_id, designer_id, status")
    .single();

  if (jobError || !createdJobData) {
    return NextResponse.json(
      {
        message: jobError?.message ?? "Không tạo được job.",
      },
      { status: 500 },
    );
  }

  const createdJob = createdJobData as JobRow;
  const transferNote = buildTransferNote(createdJob.id);

  const { error: paymentError } = await adminSupabase.from("payments").insert({
    job_id: createdJob.id,
    amount_vnd: agreedPriceVnd,
    status: "waiting_transfer",
    transfer_note: transferNote,
    admin_note: null,
    confirmed_at: null,
    reviewed_at: null,
    payment_provider: "manual_bank_transfer",
    platform_fee_percent: feeBreakdown.platformFeePercent,
    platform_fee_vnd: feeBreakdown.platformFeeVnd,
    designer_revenue_vnd: feeBreakdown.designerRevenueVnd,
    updated_at: now,
  });

  if (paymentError) {
    await adminSupabase.from("jobs").delete().eq("id", createdJob.id);

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
      updated_at: now,
    })
    .eq("id", designRequest.id)
    .eq("customer_id", authState.customerProfile.id);

  if (requestStatusError) {
    await adminSupabase
      .from("payments")
      .delete()
      .eq("job_id", createdJob.id);

    await adminSupabase.from("jobs").delete().eq("id", createdJob.id);

    return NextResponse.json(
      {
        message: requestStatusError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Đã chọn ${designer.display_name} và tạo job chờ thanh toán.`,
    job: createdJob,
    jobId: createdJob.id,
    payment: {
      amount_vnd: agreedPriceVnd,
      status: "waiting_transfer",
      transfer_note: transferNote,
      platform_fee_percent: feeBreakdown.platformFeePercent,
      platform_fee_vnd: feeBreakdown.platformFeeVnd,
      designer_revenue_vnd: feeBreakdown.designerRevenueVnd,
    },
    transferNote,
  });
}

function calculateAgreedPrice({
  selectedPrice,
  min,
  max,
  designerMinimumBudget,
}: {
  selectedPrice: number;
  min: number;
  max: number;
  designerMinimumBudget: number;
}) {
  if (selectedPrice > 0) {
    return Math.max(selectedPrice, designerMinimumBudget);
  }

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

function calculateFeeBreakdown({
  agreedPriceVnd,
  platformFeePercent,
  platformFeeVnd,
  designerRevenueVnd,
}: {
  agreedPriceVnd: number;
  platformFeePercent: number;
  platformFeeVnd: number | null;
  designerRevenueVnd: number | null;
}) {
  const safePlatformFeePercent =
    Number.isFinite(platformFeePercent) && platformFeePercent >= 0
      ? platformFeePercent
      : DEFAULT_PLATFORM_FEE_PERCENT;

  const calculatedPlatformFeeVnd = Math.round(
    agreedPriceVnd * (safePlatformFeePercent / 100),
  );

  const safePlatformFeeVnd =
    typeof platformFeeVnd === "number" && platformFeeVnd >= 0
      ? platformFeeVnd
      : calculatedPlatformFeeVnd;

  const calculatedDesignerRevenueVnd = Math.max(
    agreedPriceVnd - safePlatformFeeVnd,
    0,
  );

  const safeDesignerRevenueVnd =
    typeof designerRevenueVnd === "number" && designerRevenueVnd >= 0
      ? designerRevenueVnd
      : calculatedDesignerRevenueVnd;

  return {
    platformFeePercent: safePlatformFeePercent,
    platformFeeVnd: safePlatformFeeVnd,
    designerRevenueVnd: safeDesignerRevenueVnd,
  };
}

function buildTransferNote(jobId: string) {
  const prefix = process.env.BANK_TRANSFER_NOTE_PREFIX || "DMAI";
  const shortId = jobId.slice(0, 8).toUpperCase();

  return `${prefix}-${shortId}`;
}