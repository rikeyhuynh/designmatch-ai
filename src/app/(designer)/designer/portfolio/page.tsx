import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileImage,
  ImageIcon,
  Palette,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { CreatePortfolioItemForm } from "@/features/designer/portfolio/components/create-portfolio-item-form";
import { DeletePortfolioItemButton } from "@/features/designer/portfolio/components/delete-portfolio-item-button";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerProfileRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
  verification_status: string | null;
};

type PortfolioRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  status: string;
};

type ReviewRow = {
  id: string;
  rating: number;
};

export default async function DesignerPortfolioPage() {
  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [designerResult, portfolioResult, jobsResult, reviewsResult] =
    await Promise.all([
      adminSupabase
        .from("designer_profiles")
        .select(
          `
          id,
          display_name,
          headline,
          rating,
          completed_jobs,
          response_time_hours,
          availability,
          verification_status
        `,
        )
        .eq("id", designerProfile.id)
        .maybeSingle(),

      adminSupabase
        .from("portfolio_items")
        .select(
          `
          id,
          title,
          description,
          category,
          image_url,
          created_at
        `,
        )
        .eq("designer_id", designerProfile.id)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("jobs")
        .select("id, status")
        .eq("designer_id", designerProfile.id),

      adminSupabase
        .from("job_reviews")
        .select("id, rating")
        .eq("designer_id", designerProfile.id),
    ]);

  const designer = designerResult.data as DesignerProfileRow | null;
  const portfolioItems = (portfolioResult.data ??
    []) as unknown as PortfolioRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const displayName =
    designer?.display_name ?? designerProfile.display_name ?? "Designer";

  const headline = designer?.headline ?? designerProfile.headline ?? "Designer";

  const portfolioWithImages = portfolioItems.filter((item) =>
    Boolean(item.image_url),
  ).length;

  const portfolioWithoutImages = portfolioItems.length - portfolioWithImages;

  const uniqueCategories = Array.from(
    new Set(portfolioItems.map((item) => item.category).filter(Boolean)),
  );

  const activeJobs = jobs.filter((job) => job.status === "active").length;

  const completedJobs =
    jobs.filter((job) => job.status === "completed").length ||
    Number(designer?.completed_jobs ?? 0);

  const averageReviewRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : Number(designer?.rating ?? 0);

  return (
    <DashboardShell
      role="designer"
      title="Portfolio"
      description="Quản lý dữ liệu portfolio thật dùng cho Style DNA và designer matching."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          designerResult.error?.message,
          portfolioResult.error?.message,
          jobsResult.error?.message,
          reviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Portfolio items"
          value={`${portfolioItems.length}`}
          description="Tổng sản phẩm portfolio"
          icon={<FileImage className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Has image"
          value={`${portfolioWithImages}`}
          description="Portfolio đã có ảnh preview"
          icon={<ImageIcon className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Categories"
          value={`${uniqueCategories.length}`}
          description="Số nhóm thiết kế đang có"
          icon={<Palette className="size-5" />}
        />

        <MetricCard
          label="Rating"
          value={`${averageReviewRating.toFixed(1)}/5`}
          description="Rating hiện tại của hồ sơ"
          icon={<Star className="size-5 fill-current" />}
          tone="warning"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="grid gap-5">
          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Portfolio workspace
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              {displayName}
            </h2>

            <p className="mt-2 text-sm font-bold text-blue-700">{headline}</p>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Portfolio là dữ liệu quan trọng để hệ thống hiểu phong cách thiết
              kế của bạn và đề xuất bạn cho các brief phù hợp hơn.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <SignalBox
                icon={<CheckCircle2 className="size-4" />}
                label="Completed jobs"
                value={`${completedJobs} job hoàn thành`}
              />

              <SignalBox
                icon={<BriefcaseBusiness className="size-4" />}
                label="Active jobs"
                value={`${activeJobs} job đang làm`}
              />

              <SignalBox
                icon={<ImageIcon className="size-4" />}
                label="Missing images"
                value={`${portfolioWithoutImages} item chưa có ảnh`}
                tone={portfolioWithoutImages > 0 ? "warning" : "normal"}
              />
            </div>

            <div className="mt-5">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-blue-200 bg-white font-extrabold"
              >
                <Link href="/designer/profile">
                  Xem hồ sơ designer
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </SurfaceCard>

          <CreatePortfolioItemForm />
        </div>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Portfolio list
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách portfolio
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Đây là toàn bộ portfolio item thật đang gắn với tài khoản
                designer hiện tại.
              </p>
            </div>

            <StatusPill tone="info">{`${portfolioItems.length} items`}</StatusPill>
          </div>

          {portfolioItems.length === 0 ? (
            <EmptyState
              title="Chưa có portfolio item."
              description="Hãy dùng form bên trái để thêm portfolio đầu tiên vào CSDL."
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {portfolioItems.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Portfolio categories
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Nhóm thiết kế đang có
          </h2>

          {uniqueCategories.length === 0 ? (
            <p className="mt-5 text-sm font-medium leading-7 text-slate-600">
              Chưa có category nào vì bạn chưa có portfolio item.
            </p>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {uniqueCategories.map((category) => {
                const count = portfolioItems.filter(
                  (item) => item.category === category,
                ).length;

                return (
                  <div
                    key={category}
                    className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4"
                  >
                    <StatusPill tone="neutral">
                      {getSafeCategoryLabel(category)}
                    </StatusPill>

                    <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                      {`${count} portfolio item`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function PortfolioCard({ item }: { item: PortfolioRow }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <div className="grid aspect-[4/3] place-items-center bg-blue-50">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid place-items-center text-center">
            <ImageIcon className="mx-auto size-12 text-blue-700" />
            <p className="mt-3 text-sm font-bold text-blue-700">
              Chưa có ảnh preview
            </p>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral">
            {getSafeCategoryLabel(item.category)}
          </StatusPill>

          {item.image_url ? (
            <StatusPill tone="success">Có ảnh</StatusPill>
          ) : (
            <StatusPill tone="warning">Chưa có ảnh</StatusPill>
          )}
        </div>

        <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
          {item.title}
        </h3>

        {item.description ? (
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            {item.description}
          </p>
        ) : (
          <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
            Portfolio item này chưa có mô tả.
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/65 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            <CalendarDays className="size-4" />
            Created
          </div>

          <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
            {formatDateVi(item.created_at)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <DeletePortfolioItemButton
            portfolioId={item.id}
            portfolioTitle={item.title}
          />
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ errors }: { errors: Array<string | undefined> }) {
  const realErrors = errors.filter((error): error is string => Boolean(error));

  if (realErrors.length === 0) return null;

  return (
    <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">
        Data loading warning
      </p>

      <div className="mt-3 grid gap-2">
        {realErrors.map((error) => (
          <p key={error} className="text-sm font-semibold leading-7 text-red-600">
            {error}
          </p>
        ))}
      </div>
    </SurfaceCard>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "normal",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?: "normal" | "dark" | "success" | "warning";
}) {
  const cardClass =
    tone === "dark"
      ? "border-[#061a3a] bg-[#061a3a] text-white shadow-[0_18px_50px_rgba(6,26,58,0.22)]"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-[#061a3a]"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-[#061a3a]"
          : "border-blue-100 bg-white text-[#061a3a]";

  const iconClass =
    tone === "dark"
      ? "bg-white/10 text-sky-200 ring-white/10"
      : tone === "success"
        ? "bg-white text-emerald-700 ring-emerald-200"
        : tone === "warning"
          ? "bg-white text-amber-700 ring-amber-200"
          : "bg-blue-50 text-blue-700 ring-blue-100";

  const labelClass = tone === "dark" ? "text-sky-200/75" : "text-blue-600";
  const descriptionClass = tone === "dark" ? "text-white/68" : "text-slate-500";

  return (
    <div className={`rounded-[1.35rem] border p-5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-[0.18em] ${labelClass}`}
          >
            {label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-[-0.06em]">
            {value}
          </p>
        </div>

        <div
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-3 text-sm font-medium leading-6 ${descriptionClass}`}>
        {description}
      </p>
    </div>
  );
}

function SignalBox({
  icon,
  label,
  value,
  tone = "normal",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "warning";
}) {
  const boxClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-blue-100 bg-blue-50/65";

  return (
    <div className={`rounded-[1.15rem] border p-4 ${boxClass}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        <FileImage className="size-6" />
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}