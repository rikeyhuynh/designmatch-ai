import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Palette,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { UpdateDesignerProfileForm } from "@/features/designer/profile/components/update-designer-profile-form";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerProfileRow = {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  specialties: string[];
  styles: string[];
  minimum_project_budget_vnd: number;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
  verification_status: string | null;
  created_at: string;
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
  agreed_price_vnd: number;
};

type ReviewRow = {
  id: string;
  rating: number;
};

export default async function DesignerProfilePage() {
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
          bio,
          specialties,
          styles,
          minimum_project_budget_vnd,
          rating,
          completed_jobs,
          response_time_hours,
          availability,
          verification_status,
          created_at
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
        .select("id, status, agreed_price_vnd")
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

  const bio = designer?.bio ?? "";
  const specialties = designer?.specialties ?? [];
  const styles = designer?.styles ?? [];
  const minimumBudget = Number(designer?.minimum_project_budget_vnd ?? 300000);
  const rating = Number(designer?.rating ?? 0);
  const completedJobsFromProfile = Number(designer?.completed_jobs ?? 0);
  const responseTimeHours = Number(designer?.response_time_hours ?? 24);
  const availability = designer?.availability ?? "available";
  const verificationStatus = designer?.verification_status ?? null;
  const createdAt = designer?.created_at ?? new Date().toISOString();

  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;

  const trackedValue = jobs.reduce((total, job) => {
    if (["active", "completed"].includes(job.status)) {
      return total + Number(job.agreed_price_vnd ?? 0);
    }

    return total;
  }, 0);

  const averageReviewRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : rating;

  return (
    <DashboardShell
      role="designer"
      title="Hồ sơ designer"
      description="Xem và cập nhật hồ sơ công khai, Style DNA, portfolio và tín hiệu chất lượng của bạn."
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
          label="Rating"
          value={`${averageReviewRating.toFixed(1)}/5`}
          description="Điểm đánh giá từ customer"
          icon={<Star className="size-5 fill-current" />}
          tone="warning"
        />

        <MetricCard
          label="Completed"
          value={`${Math.max(completedJobs, completedJobsFromProfile)}`}
          description="Job đã hoàn thành"
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Portfolio"
          value={`${portfolioItems.length}`}
          description="Số sản phẩm trong portfolio"
          icon={<ImageIcon className="size-5" />}
        />

        <MetricCard
          label="Minimum budget"
          value={formatCurrencyVnd(minimumBudget)}
          description="Giá nhận dự án tối thiểu"
          icon={<WalletCards className="size-5" />}
          tone="dark"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-5">
          <SurfaceCard className="p-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                  Public profile
                </p>

                <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.065em] text-[#061a3a]">
                  {displayName}
                </h1>

                <p className="mt-2 text-base font-bold leading-7 text-blue-700">
                  {headline}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill tone={getVerificationTone(verificationStatus)}>
                    {getVerificationLabel(verificationStatus)}
                  </StatusPill>

                  <StatusPill tone={getAvailabilityTone(availability)}>
                    {getAvailabilityLabel(availability)}
                  </StatusPill>

                  <StatusPill tone="info">
                    {`${responseTimeHours}h response`}
                  </StatusPill>
                </div>
              </div>

              <div className="grid size-16 shrink-0 place-items-center rounded-3xl bg-[#061a3a] text-white shadow-[0_18px_45px_rgba(6,26,58,0.25)]">
                <UserRound className="size-7" />
              </div>
            </div>

            <div className="mt-6 rounded-[1.2rem] border border-blue-100 bg-blue-50/65 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                Bio
              </p>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
                {bio ||
                  "Bạn chưa có phần giới thiệu hồ sơ. Hãy cập nhật bio để customer hiểu rõ hơn về phong cách và kinh nghiệm của bạn."}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoBox
                icon={<Star className="size-4" />}
                label="Current rating"
                value={`${averageReviewRating.toFixed(1)}/5`}
              />

              <InfoBox
                icon={<Clock3 className="size-4" />}
                label="Response time"
                value={`${responseTimeHours} giờ`}
              />

              <InfoBox
                icon={<BriefcaseBusiness className="size-4" />}
                label="Active jobs"
                value={`${activeJobs}`}
              />

              <InfoBox
                icon={<ShieldCheck className="size-4" />}
                label="Created at"
                value={formatDateVi(createdAt)}
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Style DNA
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chuyên môn & phong cách
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Dữ liệu này giúp hệ thống matching designer với brief của customer
              chính xác hơn.
            </p>

            <div className="mt-6 rounded-[1.2rem] border border-blue-100 bg-blue-50/65 p-5">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                <Sparkles className="size-4" />
                Specialties
              </div>

              {specialties.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {specialties.map((specialty) => (
                    <StatusPill key={specialty} tone="neutral">
                      {specialty}
                    </StatusPill>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
                  Chưa có specialties. Hãy cập nhật bằng form bên phải.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-blue-100 bg-blue-50/65 p-5">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                <Palette className="size-4" />
                Visual styles
              </div>

              {styles.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {styles.map((style) => (
                    <StatusPill key={style} tone="neutral">
                      {style}
                    </StatusPill>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
                  Chưa có visual styles. Hãy cập nhật bằng form bên phải.
                </p>
              )}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoBox
                icon={<WalletCards className="size-4" />}
                label="Minimum budget"
                value={formatCurrencyVnd(minimumBudget)}
              />

              <InfoBox
                icon={<ImageIcon className="size-4" />}
                label="Portfolio items"
                value={`${portfolioItems.length}`}
              />
            </div>

            <div className="mt-5">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-blue-200 bg-white font-extrabold"
              >
                <Link href="/designer/portfolio">
                  Quản lý portfolio
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </SurfaceCard>
        </div>

        <UpdateDesignerProfileForm
          initialDisplayName={displayName}
          initialHeadline={headline}
          initialBio={bio}
          initialSpecialties={specialties}
          initialStyles={styles}
          initialMinimumProjectBudgetVnd={minimumBudget}
          initialAvailability={availability}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Portfolio preview
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Portfolio gần đây
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Các sản phẩm portfolio này giúp hệ thống hiểu gu thiết kế và đề
                xuất bạn cho brief phù hợp hơn.
              </p>
            </div>

            <StatusPill tone="info">{`${portfolioItems.length} items`}</StatusPill>
          </div>

          {portfolioItems.length === 0 ? (
            <EmptyState
              title="Chưa có portfolio item."
              description="Bạn cần thêm portfolio để hệ thống matching chính xác hơn."
              href="/designer/portfolio"
              buttonLabel="Thêm portfolio"
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {portfolioItems.slice(0, 6).map((item) => (
                <PortfolioPreviewCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function PortfolioPreviewCard({ item }: { item: PortfolioRow }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white">
      <div className="grid aspect-[4/3] place-items-center bg-blue-50">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="size-10 text-blue-700" />
        )}
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral">
            {getSafeCategoryLabel(item.category)}
          </StatusPill>
        </div>

        <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
          {item.title}
        </h3>

        {item.description ? (
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
            {item.description}
          </p>
        ) : null}

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          {formatDateVi(item.created_at)}
        </p>
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

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-white/75 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  href,
  buttonLabel,
}: {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        <ImageIcon className="size-6" />
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>

      <Button
        asChild
        className="mt-6 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
      >
        <Link href={href}>{buttonLabel}</Link>
      </Button>
    </div>
  );
}

function getVerificationLabel(status: string | null) {
  if (status === "approved" || status === "verified") return "Đã duyệt";
  if (status === "rejected") return "Từ chối";
  if (status === "in_review") return "Đang duyệt";
  return "Chờ duyệt";
}

function getVerificationTone(status: string | null) {
  if (status === "approved" || status === "verified") return "success" as const;
  if (status === "rejected") return "warning" as const;
  if (status === "in_review") return "info" as const;
  return "warning" as const;
}

function getAvailabilityLabel(status: string | null) {
  if (status === "available" || status === "open") return "Đang nhận job";
  if (status === "busy") return "Đang bận";
  if (status === "unavailable") return "Tạm nghỉ";
  return "Chưa rõ availability";
}

function getAvailabilityTone(status: string | null) {
  if (status === "available" || status === "open") return "success" as const;
  if (status === "busy") return "warning" as const;
  if (status === "unavailable") return "neutral" as const;
  return "neutral" as const;
}

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}