import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type JobRow = {
  id: string;
  customer_id: string;
  status: string;
};

type PaymentRow = {
  id: string;
  job_id: string;
  status: string;
};

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    return NextResponse.json({ message: "Thiếu job ID." }, { status: 400 });
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      { message: "Bạn cần đăng nhập để xác nhận thanh toán." },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "customer" || !authState.customerProfile) {
    return NextResponse.json(
      { message: "Chỉ customer mới có thể xác nhận đã chuyển khoản." },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select("id, customer_id, status")
    .eq("id", jobId)
    .eq("customer_id", authState.customerProfile.id)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ message: jobError.message }, { status: 500 });
  }

  const job = jobData as JobRow | null;

  if (!job) {
    return NextResponse.json(
      { message: "Không tìm thấy job hoặc bạn không có quyền truy cập job này." },
      { status: 404 },
    );
  }

  const { data: paymentData, error: paymentError } = await adminSupabase
    .from("payments")
    .select("id, job_id, status")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) {
    return NextResponse.json(
      { message: paymentError.message },
      { status: 500 },
    );
  }

  const payment = paymentData as PaymentRow | null;

  if (!payment) {
    return NextResponse.json(
      { message: "Job này chưa có payment record." },
      { status: 404 },
    );
  }

  if (payment.status === "confirmed") {
    return NextResponse.json({
      message: "Thanh toán này đã được admin xác nhận trước đó.",
      payment: {
        id: payment.id,
        job_id: payment.job_id,
        status: payment.status,
      },
    });
  }

  if (payment.status === "waiting_admin_confirm") {
    return NextResponse.json({
      message: "Bạn đã xác nhận chuyển khoản. Payment đang chờ admin kiểm tra.",
      payment: {
        id: payment.id,
        job_id: payment.job_id,
        status: payment.status,
      },
    });
  }

  if (!["waiting_transfer", "rejected"].includes(payment.status)) {
    return NextResponse.json(
      {
        message: `Không thể xác nhận chuyển khoản khi payment đang ở trạng thái ${payment.status}.`,
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  const { data: updatedPayment, error: updateError } = await adminSupabase
    .from("payments")
    .update({
      status: "waiting_admin_confirm",
      updated_at: now,
    })
    .eq("id", payment.id)
    .select("id, job_id, status")
    .single();

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    message:
      "Đã ghi nhận xác nhận chuyển khoản. Admin sẽ kiểm tra và xác nhận payment.",
    payment: updatedPayment,
  });
}