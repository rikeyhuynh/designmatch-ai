import Link from "next/link";

import { AppContainer } from "@/components/common/app-container";
import { SurfaceCard } from "@/components/common/surface-card";
import { SiteShell } from "@/components/layout/site-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="grid min-h-[calc(100vh-76px)] place-items-center py-12">
          <SurfaceCard className="w-full max-w-xl p-6 md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Welcome back
            </p>

            <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              Đăng nhập DesignMatch AI.
            </h1>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Tiếp tục tạo brief, quản lý job hoặc nhận dự án thiết kế phù hợp.
            </p>

            <div className="mt-8">
              <LoginForm />
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/55 p-4 text-sm font-medium leading-7 text-slate-600">
              Đang test MVP? Bạn có thể tạo tài khoản mới tại{" "}
              <Link href="/register" className="font-extrabold text-blue-700">
                trang đăng ký
              </Link>
              .
            </div>
          </SurfaceCard>
        </AppContainer>
      </main>
    </SiteShell>
  );
}