import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type PaymentRow = {
  id: string;
  job_id: string;
  amount_vnd: number;
  status: string;
  transfer_note: string | null;
  platform_fee_percent: number | null;
  platform_fee_vnd: number | null;
  designer_revenue_vnd: number | null;
};

type JobRow = {
  id: string;
  request_id: string;
  status: string;
  started_at: string | null;
};

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const paymentId = routeParams.paymentId ?? routeParams.paymentID;

  if (!paymentId) {
    return NextResponse.json(
      {
        message: "Thiếu payment ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để xác nhận payment.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "admin") {
    return NextResponse.json(
      {
        message: "Chỉ admin mới có thể xác nhận payment.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: paymentData, error: paymentError } = await adminSupabase
    .from("payments")
    .select(
      `
      id,
      job_id,
      amount_vnd,
      status,
      transfer_note,
      platform_fee_percent,
      platform_fee_vnd,
      designer_revenue_vnd
    `,
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError) {
    return NextResponse.json(
      {
        message: paymentError.message,
      },
      { status: 500 },
    );
  }

  const payment = paymentData as PaymentRow | null;

  if (!payment) {
    return NextResponse.json(
      {
        message: "Không tìm thấy payment.",
      },
      { status: 404 },
    );
  }

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select("id, request_id, status, started_at")
    .eq("id", payment.job_id)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json(
      {
        message: jobError.message,
      },
      { status: 500 },
    );
  }

  const job = jobData as JobRow | null;

  if (!job) {
    return NextResponse.json(
      {
        message: "Không tìm thấy job của payment này.",
      },
      { status: 404 },
    );
  }

  if (payment.status === "confirmed") {
    return NextResponse.json({
      message: "Payment này đã được xác nhận trước đó.",
      payment,
      job,
    });
  }

  if (payment.status !== "waiting_admin_confirm") {
    return NextResponse.json(
      {
        message: `Payment đang ở trạng thái ${payment.status}, chưa thể xác nhận.`,
      },
      { status: 409 },
    );
  }

  if (!["payment_pending", "active"].includes(job.status)) {
    return NextResponse.json(
      {
        message: `Job đang ở trạng thái ${job.status}, không thể kích hoạt từ payment này.`,
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  const { data: updatedPayment, error: updatePaymentError } =
    await adminSupabase
      .from("payments")
      .update({
        status: "confirmed",
        confirmed_at: now,
        reviewed_at: now,
        reviewed_by: authState.profile.id,
        updated_at: now,
      })
      .eq("id", payment.id)
      .select(
        `
        id,
        job_id,
        amount_vnd,
        status,
        transfer_note,
        confirmed_at,
        reviewed_at,
        reviewed_by,
        platform_fee_percent,
        platform_fee_vnd,
        designer_revenue_vnd
      `,
      )
      .single();

  if (updatePaymentError) {
    return NextResponse.json(
      {
        message: updatePaymentError.message,
      },
      { status: 500 },
    );
  }

  const { data: updatedJob, error: updateJobError } = await adminSupabase
    .from("jobs")
    .update({
      status: "active",
      started_at: job.started_at ?? now,
      updated_at: now,
    })
    .eq("id", job.id)
    .select("id, request_id, status, started_at")
    .single();

  if (updateJobError) {
    await adminSupabase
      .from("payments")
      .update({
        status: "waiting_admin_confirm",
        confirmed_at: null,
        reviewed_at: null,
        reviewed_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return NextResponse.json(
      {
        message: updateJobError.message,
      },
      { status: 500 },
    );
  }

  const { error: requestUpdateError } = await adminSupabase
    .from("design_requests")
    .update({
      status: "in_progress",
      updated_at: now,
    })
    .eq("id", job.request_id);

  if (requestUpdateError) {
    return NextResponse.json({
      message:
        "Đã xác nhận payment và kích hoạt job, nhưng chưa cập nhật được trạng thái request.",
      warning: requestUpdateError.message,
      payment: updatedPayment,
      job: updatedJob,
    });
  }

  return NextResponse.json({
    message: "Đã xác nhận payment và kích hoạt job.",
    payment: updatedPayment,
    job: updatedJob,
  });
}