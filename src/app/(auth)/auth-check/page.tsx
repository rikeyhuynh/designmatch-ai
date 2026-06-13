import Link from "next/link";
import {
  BadgeCheck,
  CircleAlert,
  Database,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AppContainer } from "@/components/common/app-container";
import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getDashboardPathByRole } from "@/lib/auth/roles";
import { getCurrentAuthState } from "@/lib/auth/current-user";

export default async function AuthCheckPage() {
  const authState = await getCurrentAuthState();

  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="py-12 md:py-16">
          <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
            <SurfaceCard className="p-6 md:p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>

              <StatusPill
                tone={authState.isAuthenticated ? "success" : "warning"}
                className="mt-5"
              >
                {authState.isAuthenticated ? "Signed in" : "Not signed in"}
              </StatusPill>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-[-0.055em] text-[#061a3a] md:text-5xl">
                Kiểm tra trạng thái đăng nhập.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
                Trang này dùng Supabase server client để đọc session, profile và
                role hiện tại. Nếu phần này OK, ta mới bảo vệ dashboard thật.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {authState.isAuthenticated ? (
                  <>
                    <Button
                      asChild
                      className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
                    >
                      <Link
                        href={getDashboardPathByRole(authState.profile?.role)}
                      >
                        Vào dashboard
                      </Link>
                    </Button>

                    <LogoutButton />
                  </>
                ) : (
                  <>
                    <Button
                      asChild
                      className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
                    >
                      <Link href="/login">Đăng nhập</Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full border-blue-200 bg-white px-5 font-extrabold"
                    >
                      <Link href="/register">Đăng ký</Link>
                    </Button>
                  </>
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard
              variant={authState.isAuthenticated ? "dark" : "default"}
              className="p-6 md:p-8"
            >
              <p
                className={`text-sm font-black uppercase tracking-[0.22em] ${
                  authState.isAuthenticated ? "text-sky-200/70" : "text-blue-600"
                }`}
              >
                Auth Summary
              </p>

              <div className="mt-6 grid gap-3">
                <AuthRow
                  icon={UserRound}
                  label="Session"
                  value={
                    authState.isAuthenticated
                      ? "Đã có user session"
                      : "Chưa đăng nhập"
                  }
                  ok={authState.isAuthenticated}
                  dark={authState.isAuthenticated}
                />

                <AuthRow
                  icon={Mail}
                  label="Email"
                  value={authState.userEmail ?? "Chưa có email"}
                  ok={Boolean(authState.userEmail)}
                  dark={authState.isAuthenticated}
                />

                <AuthRow
                  icon={KeyRound}
                  label="User ID"
                  value={authState.userId ?? "Chưa có user id"}
                  ok={Boolean(authState.userId)}
                  dark={authState.isAuthenticated}
                />

                <AuthRow
                  icon={Database}
                  label="Profile"
                  value={
                    authState.profile
                      ? `${authState.profile.full_name} · ${authState.profile.role}`
                      : "Chưa đọc được profiles"
                  }
                  ok={Boolean(authState.profile)}
                  dark={authState.isAuthenticated}
                />

                <AuthRow
                  icon={BadgeCheck}
                  label="Role profile"
                  value={getRoleProfileValue(authState)}
                  ok={Boolean(
                    authState.customerProfile || authState.designerProfile,
                  )}
                  dark={authState.isAuthenticated}
                />
              </div>

              {authState.error ? (
                <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 p-5">
                  <div className="flex gap-3">
                    <CircleAlert className="mt-1 size-5 shrink-0 text-red-500" />
                    <p className="text-sm font-semibold leading-7 text-red-600">
                      {authState.error}
                    </p>
                  </div>
                </div>
              ) : null}
            </SurfaceCard>
          </section>

          {authState.profile ? (
            <section className="mt-8 grid gap-5 lg:grid-cols-2">
              <SurfaceCard className="p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                  Profile Record
                </p>

                <div className="mt-5 grid gap-3">
                  <DataLine label="ID" value={authState.profile.id} />
                  <DataLine label="Role" value={authState.profile.role} />
                  <DataLine
                    label="Full name"
                    value={authState.profile.full_name}
                  />
                  <DataLine
                    label="Created at"
                    value={authState.profile.created_at}
                  />
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                  Role-specific Profile
                </p>

                <div className="mt-5 grid gap-3">
                  {authState.customerProfile ? (
                    <>
                      <DataLine
                        label="Customer profile ID"
                        value={authState.customerProfile.id}
                      />
                      <DataLine
                        label="Business name"
                        value={
                          authState.customerProfile.business_name ??
                          "Chưa có tên thương hiệu"
                        }
                      />
                      <DataLine
                        label="Location"
                        value={
                          authState.customerProfile.location ??
                          "Chưa có khu vực"
                        }
                      />
                    </>
                  ) : null}

                  {authState.designerProfile ? (
                    <>
                      <DataLine
                        label="Designer profile ID"
                        value={authState.designerProfile.id}
                      />
                      <DataLine
                        label="Display name"
                        value={authState.designerProfile.display_name}
                      />
                      <DataLine
                        label="Verification"
                        value={authState.designerProfile.verification_status}
                      />
                      <DataLine
                        label="Availability"
                        value={authState.designerProfile.availability}
                      />
                    </>
                  ) : null}

                  {!authState.customerProfile && !authState.designerProfile ? (
                    <p className="text-sm font-medium leading-7 text-slate-600">
                      Chưa tìm thấy profile theo role. Nếu vừa đăng ký, hãy kiểm
                      tra lại trigger hoặc bảng trong Supabase.
                    </p>
                  ) : null}
                </div>
              </SurfaceCard>
            </section>
          ) : null}
        </AppContainer>
      </main>
    </SiteShell>
  );
}

function AuthRow({
  icon: Icon,
  label,
  value,
  ok,
  dark,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  ok: boolean;
  dark: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-[1.25rem] border p-4 ${
        dark
          ? "border-white/10 bg-white/[0.06]"
          : "border-blue-100 bg-blue-50/55"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-2xl ring-1 ${
            dark
              ? "bg-white/10 text-sky-200 ring-white/10"
              : "bg-white text-blue-700 ring-blue-100"
          }`}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <p
            className={`text-xs font-black uppercase tracking-[0.18em] ${
              dark ? "text-sky-200/60" : "text-blue-600"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-1 truncate text-sm font-extrabold ${
              dark ? "text-white" : "text-[#061a3a]"
            }`}
          >
            {value}
          </p>
        </div>
      </div>

      <StatusPill tone={ok ? "success" : "warning"}>
        {ok ? "OK" : "Missing"}
      </StatusPill>
    </div>
  );
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/55 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function getRoleProfileValue(authState: Awaited<ReturnType<typeof getCurrentAuthState>>) {
  if (authState.customerProfile) {
    return authState.customerProfile.business_name ?? "Customer profile OK";
  }

  if (authState.designerProfile) {
    return authState.designerProfile.display_name;
  }

  return "Chưa có role profile";
}