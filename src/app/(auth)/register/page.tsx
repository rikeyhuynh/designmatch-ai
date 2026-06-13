import { AppContainer } from "@/components/common/app-container";
import { SurfaceCard } from "@/components/common/surface-card";
import { SiteShell } from "@/components/layout/site-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="grid min-h-[calc(100vh-76px)] place-items-center py-12">
          <SurfaceCard className="w-full max-w-3xl p-6 md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Create account
            </p>

            <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              Tạo tài khoản DesignMatch AI.
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
              Chọn vai trò customer hoặc designer. Sau khi đăng ký, hệ thống sẽ
              tự tạo profile tương ứng trong Supabase.
            </p>

            <div className="mt-8">
              <RegisterForm />
            </div>
          </SurfaceCard>
        </AppContainer>
      </main>
    </SiteShell>
  );
}