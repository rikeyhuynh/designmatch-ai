import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    jobId: string;
    updateId: string;
  }>;
};

type CreateFeedbackBody = {
  message?: string;
};

type CustomerProfileForFeedback = {
  id: string;
  profile_id: string;
};

type JobForFeedback = {
  id: string;
  customer_id: string;
};

type JobUpdateForFeedback = {
  id: string;
  job_id: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { jobId, updateId } = await context.params;

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
      {
        status: 401,
      },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: customerProfileData, error: customerProfileError } =
    await adminSupabase
      .from("customer_profiles")
      .select("id, profile_id")
      .eq("profile_id", user.id)
      .maybeSingle();

  const customerProfile =
    customerProfileData as CustomerProfileForFeedback | null;

  if (customerProfileError || !customerProfile) {
    return NextResponse.json(
      {
        message: "Không tìm thấy customer profile của tài khoản đang đăng nhập.",
      },
      {
        status: 403,
      },
    );
  }

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select("id, customer_id")
    .eq("id", jobId)
    .maybeSingle();

  const job = jobData as JobForFeedback | null;

  if (jobError || !job) {
    return NextResponse.json(
      {
        message: "Không tìm thấy job.",
      },
      {
        status: 404,
      },
    );
  }

  if (job.customer_id !== customerProfile.id) {
    return NextResponse.json(
      {
        message: "Job này không thuộc customer đang đăng nhập.",
      },
      {
        status: 403,
      },
    );
  }

  const { data: updateData, error: updateError } = await adminSupabase
    .from("job_updates")
    .select("id, job_id")
    .eq("id", updateId)
    .eq("job_id", job.id)
    .maybeSingle();

  const jobUpdate = updateData as JobUpdateForFeedback | null;

  if (updateError || !jobUpdate) {
    return NextResponse.json(
      {
        message: "Không tìm thấy cập nhật tiến độ để phản hồi.",
      },
      {
        status: 404,
      },
    );
  }

  const body = (await request.json()) as CreateFeedbackBody;
  const message = body.message?.trim() ?? "";

  if (message.length < 5) {
    return NextResponse.json(
      {
        message: "Nội dung phản hồi cần ít nhất 5 ký tự.",
      },
      {
        status: 400,
      },
    );
  }

  const { error: insertError } = await adminSupabase
    .from("job_update_feedbacks")
    .insert({
      job_id: job.id,
      update_id: jobUpdate.id,
      customer_id: customerProfile.id,
      message,
    });

  if (insertError) {
    return NextResponse.json(
      {
        message: insertError.message,
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    message: "Đã gửi phản hồi cho designer.",
  });
}