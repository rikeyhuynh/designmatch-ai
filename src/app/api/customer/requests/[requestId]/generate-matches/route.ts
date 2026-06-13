import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type DesignRequestRow = {
  id: string;
  customer_id: string;
  title: string;
  business_name: string;
  industry: string;
  category: string;
  budget_min_vnd: number;
  budget_max_vnd: number;
  status: string;
};

type DesignerRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
  verification_status: string | null;
  minimum_project_budget_vnd: number | null;
  specialties: string[] | null;
  styles: string[] | null;
};

type PortfolioRow = {
  id: string;
  designer_id: string;
  title: string;
  industry: string;
  category: string;
  image_url: string | null;
};

type ScoredDesigner = {
  designer: DesignerRow;
  score: number;
  reasons: string[];
};

const MAX_MATCHES = 5;
const MIN_MATCH_SCORE = 0;
const MAX_MATCH_SCORE = 100;

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const requestId = routeParams.requestId ?? routeParams.requestID;

  if (!requestId) {
    return NextResponse.json(
      {
        message: "Thiếu request ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để tạo designer matches.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "customer" || !authState.customerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ customer mới có thể tạo designer matches.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: designRequest, error: requestError } = await adminSupabase
    .from("design_requests")
    .select(
      `
      id,
      customer_id,
      title,
      business_name,
      industry,
      category,
      budget_min_vnd,
      budget_max_vnd,
      status
    `,
    )
    .eq("id", requestId)
    .eq("customer_id", authState.customerProfile.id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json(
      {
        message: requestError.message,
      },
      { status: 500 },
    );
  }

  if (!designRequest) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy request hoặc bạn không có quyền xử lý request này.",
      },
      { status: 404 },
    );
  }

  const request = designRequest as DesignRequestRow;

  const { data: designersData, error: designersError } = await adminSupabase
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
      verification_status,
      minimum_project_budget_vnd,
      specialties,
      styles
    `,
    )
    .eq("verification_status", "approved");

  if (designersError) {
    return NextResponse.json(
      {
        message: designersError.message,
      },
      { status: 500 },
    );
  }

  const approvedDesigners = (designersData ?? []) as unknown as DesignerRow[];
  const approvedDesignerIds = approvedDesigners.map((designer) => designer.id);

  if (approvedDesignerIds.length === 0) {
    await adminSupabase
      .from("designer_matches")
      .delete()
      .eq("request_id", request.id);

    return NextResponse.json({
      message:
        "Hiện chưa có designer nào đã được admin duyệt, nên hệ thống chưa thể tạo matching.",
      matches: [],
    });
  }

  const { data: portfolioData, error: portfolioError } = await adminSupabase
    .from("portfolio_items")
    .select(
      `
      id,
      designer_id,
      title,
      industry,
      category,
      image_url
    `,
    )
    .in("designer_id", approvedDesignerIds);

  if (portfolioError) {
    return NextResponse.json(
      {
        message: portfolioError.message,
      },
      { status: 500 },
    );
  }

  const portfolioItems = (portfolioData ?? []) as unknown as PortfolioRow[];

  const scoredDesigners = approvedDesigners
    .map((designer) =>
      scoreDesignerForRequest({
        designer,
        request,
        portfolioItems: portfolioItems.filter(
          (item) => item.designer_id === designer.id,
        ),
      }),
    )
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const ratingDiff =
        Number(b.designer.rating ?? 0) - Number(a.designer.rating ?? 0);

      if (ratingDiff !== 0) return ratingDiff;

      return (
        Number(b.designer.completed_jobs ?? 0) -
        Number(a.designer.completed_jobs ?? 0)
      );
    })
    .slice(0, MAX_MATCHES);

  await adminSupabase
    .from("designer_matches")
    .delete()
    .eq("request_id", request.id);

  if (scoredDesigners.length === 0) {
    return NextResponse.json({
      message:
        "Chưa tìm thấy designer đã duyệt phù hợp với brief này. Hãy thử cập nhật brief hoặc thêm designer đã duyệt.",
      matches: [],
    });
  }

  const matchRows = scoredDesigners.map((item) => ({
    request_id: request.id,
    designer_id: item.designer.id,
    match_score: clampMatchScore(item.score),
    match_reasons: item.reasons,
  }));

  const { data: insertedMatches, error: insertError } = await adminSupabase
    .from("designer_matches")
    .insert(matchRows)
    .select("id, request_id, designer_id, match_score, match_reasons");

  if (insertError) {
    return NextResponse.json(
      {
        message: insertError.message,
      },
      { status: 500 },
    );
  }

  await adminSupabase
    .from("design_requests")
    .update({
      status: "matched",
    })
    .eq("id", request.id)
    .eq("customer_id", authState.customerProfile.id);

  return NextResponse.json({
    message: "Đã tạo designer matches từ các designer đã được admin duyệt.",
    matches: insertedMatches ?? [],
  });
}

function scoreDesignerForRequest({
  designer,
  request,
  portfolioItems,
}: {
  designer: DesignerRow;
  request: DesignRequestRow;
  portfolioItems: PortfolioRow[];
}): ScoredDesigner {
  let score = 0;
  const reasons: string[] = [];

  const verificationStatus = String(designer.verification_status ?? "");

  if (verificationStatus !== "approved") {
    return {
      designer,
      score: 0,
      reasons: ["Designer chưa được admin duyệt."],
    };
  }

  score += 25;
  reasons.push("Designer đã được admin duyệt.");

  const availability = String(designer.availability ?? "");

  if (availability === "available" || availability === "open") {
    score += 15;
    reasons.push("Designer đang nhận job.");
  } else if (availability === "busy") {
    score += 5;
    reasons.push("Designer đang bận nhưng vẫn có thể cân nhắc.");
  }

  const categoryMatches = portfolioItems.filter(
    (item) => item.category === request.category,
  );

  const industryMatches = portfolioItems.filter(
    (item) => item.industry === request.industry,
  );

  const directPortfolioMatches = portfolioItems.filter(
    (item) =>
      item.category === request.category && item.industry === request.industry,
  );

  if (directPortfolioMatches.length > 0) {
    score += 24;
    reasons.push("Portfolio trùng cả ngành và hạng mục thiết kế.");
  } else {
    if (categoryMatches.length > 0) {
      score += 14;
      reasons.push("Portfolio có hạng mục thiết kế tương tự.");
    }

    if (industryMatches.length > 0) {
      score += 12;
      reasons.push("Portfolio có ngành kinh doanh tương tự.");
    }
  }

  if (portfolioItems.length > 0) {
    score += Math.min(portfolioItems.length * 2, 8);
    reasons.push("Designer có dữ liệu portfolio để đánh giá phong cách.");
  }

  const portfolioWithImages = portfolioItems.filter((item) =>
    Boolean(item.image_url),
  ).length;

  if (portfolioWithImages > 0) {
    score += Math.min(portfolioWithImages * 2, 6);
    reasons.push("Portfolio có ảnh preview trực quan.");
  }

  const rating = Number(designer.rating ?? 0);

  if (rating > 0) {
    score += Math.min(rating * 3, 15);
    reasons.push("Designer có rating từ customer.");
  }

  const completedJobs = Number(designer.completed_jobs ?? 0);

  if (completedJobs > 0) {
    score += Math.min(completedJobs * 2, 10);
    reasons.push("Designer đã có job hoàn thành.");
  }

  const responseTimeHours = Number(designer.response_time_hours ?? 24);

  if (responseTimeHours <= 12) {
    score += 5;
    reasons.push("Thời gian phản hồi nhanh.");
  } else if (responseTimeHours <= 24) {
    score += 3;
    reasons.push("Thời gian phản hồi ổn.");
  } else if (responseTimeHours <= 48) {
    score += 1;
  }

  const minimumBudget = Number(designer.minimum_project_budget_vnd ?? 0);
  const requestMaxBudget = Number(request.budget_max_vnd ?? 0);

  if (minimumBudget > 0 && requestMaxBudget > 0) {
    if (minimumBudget <= requestMaxBudget) {
      score += 8;
      reasons.push("Minimum budget phù hợp với ngân sách tối đa của request.");
    } else {
      score -= 15;
      reasons.push("Minimum budget cao hơn ngân sách request.");
    }
  }

  const specialties = designer.specialties ?? [];
  const styles = designer.styles ?? [];

  if (specialties.length > 0) {
    score += Math.min(specialties.length, 5);
    reasons.push("Designer đã khai báo chuyên môn.");
  }

  if (styles.length > 0) {
    score += Math.min(styles.length, 5);
    reasons.push("Designer đã khai báo phong cách thị giác.");
  }

  return {
    designer,
    score: clampMatchScore(score),
    reasons: Array.from(new Set(reasons)).slice(0, 8),
  };
}

function clampMatchScore(score: number) {
  if (!Number.isFinite(score)) return MIN_MATCH_SCORE;

  return Math.min(
    MAX_MATCH_SCORE,
    Math.max(MIN_MATCH_SCORE, Math.round(score)),
  );
}