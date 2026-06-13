import type { Job, Payment } from "@/types/domain";

export const mockJobs: Job[] = [
  {
    id: "job_milktea_01",
    requestId: "request_milktea_opening",
    customerId: "customer_demo_01",
    designerId: "designer_linh_studio",
    title: "Poster khai trương Mây Milk Tea",
    status: "payment_pending",
    agreedPriceVnd: 450000,
    dueAt: "2026-06-21",
  },
];

export const mockPayments: Payment[] = [
  {
    id: "payment_milktea_01",
    jobId: "job_milktea_01",
    amountVnd: 450000,
    status: "waiting_admin_confirm",
    transferNote: "DMAI-JOB-MILKTEA-01",
    adminNote: "Đang chờ admin đối soát chuyển khoản.",
  },
];