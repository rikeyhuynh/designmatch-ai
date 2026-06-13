import { redirect } from "next/navigation";

import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NewDesignRequestForm } from "@/features/customer/requests/components/new-design-request-form";
import { requireRole } from "@/lib/auth/guards";

export default async function NewCustomerRequestPage() {
  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  return (
    <DashboardShell
      role="customer"
      title="Tạo design request mới"
      description="Nhập nhu cầu thiết kế ban đầu. Ở phần sau, AI sẽ dùng dữ liệu này để tạo brief chuẩn hóa."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <SurfaceCard className="p-6 md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
          New Request
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
          Thông tin yêu cầu thiết kế
        </h1>

        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
          Hãy nhập đủ thông tin để hệ thống có thể tạo brief tốt hơn ở bước AI
          Brief Builder.
        </p>

        <div className="mt-8">
          <NewDesignRequestForm customerProfileId={customerProfile.id} />
        </div>
      </SurfaceCard>
    </DashboardShell>
  );
}