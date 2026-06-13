import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type CustomerProfileForComplete = {
  id: string;
  profile_id: string;
};

type JobForComplete = {
  id: string;
  customer_id: string;
  designer_id: string;
  request_id: string;
  status: string;
};

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    return NextResponse.json(
      {
        message: "Thiếu job ID.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập bằng tài khoản customer.",
      },
      { status: 401 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: customerProfileData, error: customerProfileError } =
    await adminSupabase
      .from("customer_profiles")
      .select("id, profile_id")
      .eq("profile_id", user.id)
      .maybeSingle();

  if (customerProfileError) {
    return NextResponse.json(
      {
        message: customerProfileError.message,
      },
      { status: 500 },
    );
  }

  const customerProfile =
    customerProfileData as CustomerProfileForComplete | null;

  if (!customerProfile) {
    return NextResponse.json(
      {
        message: "Không tìm thấy customer profile của tài khoản đang đăng nhập.",
      },
      { status: 403 },
    );
  }

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select("id, customer_id, designer_id, request_id, status")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json(
      {
        message: jobError.message,
      },
      { status: 500 },
    );
  }

  const job = jobData as JobForComplete | null;

  if (!job) {
    return NextResponse.json(
      {
        message: "Không tìm thấy job.",
      },
      { status: 404 },
    );
  }

  if (job.customer_id !== customerProfile.id) {
    return NextResponse.json(
      {
        message: "Job này không thuộc customer đang đăng nhập.",
      },
      { status: 403 },
    );
  }

  if (job.status === "completed") {
    const syncResult = await syncDesignerCompletedJobs(
      adminSupabase,
      job.designer_id,
    );

    if (!syncResult.ok) {
      return NextResponse.json(
        {
          message: syncResult.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message:
        "Job này đã được hoàn thành trước đó. Đã đồng bộ lại số job hoàn thành của designer.",
    });
  }

  if (job.status !== "active") {
    return NextResponse.json(
      {
        message:
          "Chỉ có thể hoàn thành job đang ở trạng thái active. Hãy đảm bảo payment đã được admin xác nhận.",
      },
      { status: 400 },
    );
  }

  const { count: finalUpdateCount, error: finalUpdateError } =
    await adminSupabase
      .from("job_updates")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("job_id", job.id)
      .eq("update_type", "final");

  if (finalUpdateError) {
    return NextResponse.json(
      {
        message: finalUpdateError.message,
      },
      { status: 500 },
    );
  }

  if (!finalUpdateCount || finalUpdateCount < 1) {
    return NextResponse.json(
      {
        message:
          "Designer cần gửi ít nhất một cập nhật loại 'Bản hoàn thiện' trước khi customer duyệt hoàn thành.",
      },
      { status: 400 },
    );
  }

  const completedAt = new Date().toISOString();

  const { error: jobUpdateError } = await adminSupabase
    .from("jobs")
    .update({
      status: "completed",
      completed_at: completedAt,
    })
    .eq("id", job.id)
    .eq("status", "active");

  if (jobUpdateError) {
    return NextResponse.json(
      {
        message: jobUpdateError.message,
      },
      { status: 500 },
    );
  }

  const { error: requestUpdateError } = await adminSupabase
    .from("design_requests")
    .update({
      status: "completed",
      updated_at: completedAt,
    })
    .eq("id", job.request_id);

  if (requestUpdateError) {
    return NextResponse.json(
      {
        message: requestUpdateError.message,
      },
      { status: 500 },
    );
  }

  const syncResult = await syncDesignerCompletedJobs(
    adminSupabase,
    job.designer_id,
  );

  if (!syncResult.ok) {
    return NextResponse.json(
      {
        message: syncResult.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message:
      "Đã duyệt bản hoàn thiện, đóng job, hoàn tất request và đồng bộ số job hoàn thành cho designer.",
  });
}

async function syncDesignerCompletedJobs(
  adminSupabase: any,
  designerId: string,
): Promise<
  | {
      ok: true;
      completedJobs: number;
    }
  | {
      ok: false;
      message: string;
    }
> {
  const { count, error: countError } = await adminSupabase
    .from("jobs")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("designer_id", designerId)
    .eq("status", "completed");

  if (countError) {
    return {
      ok: false,
      message: countError.message,
    };
  }

  const completedJobs = count ?? 0;

  const { error: updateDesignerError } = await adminSupabase
    .from("designer_profiles")
    .update({
      completed_jobs: completedJobs,
    })
    .eq("id", designerId);

  if (updateDesignerError) {
    return {
      ok: false,
      message: updateDesignerError.message,
    };
  }

  return {
    ok: true,
    completedJobs,
  };
}