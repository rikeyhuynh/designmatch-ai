import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    requestId: string;
    matchId: string;
  }>;
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
};

type MatchRow = {
  id: string;
  request_id: string;
  designer_id: string;
  match_score: number;
};

type DesignerRow = {
  id: string;
  display_name: string;
  verification_status: string | null;
  availability: string | null;
};

type JobRow = {
  id: string;
  request_id: string;
  designer_id: string;
  status: string;
};

export async function POST(_request: Request, context: RouteContext) {
  const { requestId, matchId } = await context.params;

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
        message: "Chỉ customer mới có thể chọn designer.",
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
      deadline
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
          "Không tìm thấy request hoặc bạn không có quyền chọn designer cho request này.",
      },
      { status: 404 },
    );
  }

  const { data: matchData, error: matchError } = await adminSupabase
    .from("designer_matches")
    .select("id, request_id, designer_id, match_score")
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

  const match = matchData as MatchRow | null;

  if (!match) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy designer match hợp lệ. Hãy tạo lại AI matching.",
      },
      { status: 404 },
    );
  }

  const { data: designerData, error: designerError } = await adminSupabase
    .from("designer_profiles")
    .select("id, display_name, verification_status, availability")
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
        message: "Designer này không còn tồn tại.",
      },
      { status: 404 },
    );
  }

  if (designer.verification_status !== "approved") {
    return NextResponse.json(
      {
        message: "Designer này chưa được admin duyệt.",
      },
      { status: 409 },
    );
  }

  if (
    designer.availability &&
    designer.availability !== "available" &&
    designer.availability !== "open"
  ) {
    return NextResponse.json(
      {
        message: "Designer này hiện không sẵn sàng nhận dự án.",
      },
      { status: 409 },
    );
  }

  const { data: existingJobsData, error: existingJobError } =
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

  const existingJobs = (existingJobsData ?? []) as JobRow[];
  const existingJob = existingJobs[0] ?? null;

  if (existingJob) {
    if (existingJob.designer_id === match.designer_id) {
      return NextResponse.json({
        message: "Bạn đã chọn designer này trước đó.",
        job: existingJob,
      });
    }

    return NextResponse.json(
      {
        message:
          "Request này đã có job với designer khác. Không thể chọn thêm designer.",
      },
      { status: 409 },
    );
  }

  const agreedPrice =
    Number(designRequest.selected_price_vnd ?? 0) ||
    Number(designRequest.budget_max_vnd ?? 0) ||
    Number(designRequest.budget_min_vnd ?? 0) ||
    0;

  const { data: createdJobData, error: createJobError } = await adminSupabase
    .from("jobs")
    .insert({
      request_id: designRequest.id,
      customer_id: designRequest.customer_id,
      designer_id: match.designer_id,
      title: designRequest.title,
      status: "proposal_pending",
      agreed_price_vnd: agreedPrice,
      selected_price_vnd: designRequest.selected_price_vnd ?? agreedPrice,
      pricing_tier: designRequest.pricing_tier,
      package_code: designRequest.package_code,
      package_name: designRequest.package_name,
      platform_fee_percent: designRequest.platform_fee_percent,
      platform_fee_vnd: designRequest.platform_fee_vnd,
      designer_revenue_vnd: designRequest.designer_revenue_vnd,
      is_team_booking: Boolean(designRequest.is_team_booking),
      due_at: designRequest.deadline,
      updated_at: new Date().toISOString(),
    })
    .select("id, request_id, designer_id, status")
    .single();

  if (createJobError) {
    return NextResponse.json(
      {
        message: createJobError.message,
      },
      { status: 500 },
    );
  }

  const createdJob = createdJobData as JobRow;

  await adminSupabase
    .from("design_requests")
    .update({
      status: "matched",
      updated_at: new Date().toISOString(),
    })
    .eq("id", designRequest.id)
    .eq("customer_id", authState.customerProfile.id);

  return NextResponse.json({
    message: `Đã chọn ${designer.display_name} và tạo job từ designer match.`,
    job: createdJob,
  });
}