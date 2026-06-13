import { NextResponse } from "next/server";

import { seedDesigners } from "@/lib/seed/designers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập bằng tài khoản admin.",
      },
      {
        status: 401,
      },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json(
      {
        message: "Bạn không có quyền seed designer.",
      },
      {
        status: 403,
      },
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  const seeded: Array<{
    email: string;
    designerProfileId: string;
    portfolioCount: number;
  }> = [];

  for (const designer of seedDesigners) {
    const designerUserId = await findOrCreateDesignerUser({
      email: designer.email,
      password: designer.password,
      fullName: designer.fullName,
    });

    const { error: profileUpsertError } = await adminSupabase
      .from("profiles")
      .upsert(
        {
          id: designerUserId,
          role: "designer",
          full_name: designer.fullName,
          avatar_url: null,
        },
        {
          onConflict: "id",
        },
      );

    if (profileUpsertError) {
      return NextResponse.json(
        {
          message: profileUpsertError.message,
        },
        {
          status: 500,
        },
      );
    }

    const { data: designerProfile, error: designerProfileError } =
      await adminSupabase
        .from("designer_profiles")
        .upsert(
          {
            profile_id: designerUserId,
            display_name: designer.displayName,
            headline: designer.headline,
            bio: designer.bio,
            location: designer.location,
            industries: designer.industries,
            categories: designer.categories,
            styles: designer.styles,
            min_budget_vnd: designer.minBudgetVnd,
            max_budget_vnd: designer.maxBudgetVnd,
            response_time_hours: designer.responseTimeHours,
            rating: designer.rating,
            completed_jobs: designer.completedJobs,
            verification_status: "approved",
            availability: "available",
          },
          {
            onConflict: "profile_id",
          },
        )
        .select("id")
        .single();

    if (designerProfileError || !designerProfile) {
      return NextResponse.json(
        {
          message:
            designerProfileError?.message ??
            "Không tạo được designer profile.",
        },
        {
          status: 500,
        },
      );
    }

    await adminSupabase
      .from("portfolio_items")
      .delete()
      .eq("designer_id", designerProfile.id);

    const { error: portfolioError } = await adminSupabase
      .from("portfolio_items")
      .insert(
        designer.portfolioItems.map((item) => ({
          designer_id: designerProfile.id,
          title: item.title,
          image_url: item.imageUrl,
          industry: item.industry,
          category: item.category,
          styles: item.styles,
          description: item.description,
          year: item.year,
        })),
      );

    if (portfolioError) {
      return NextResponse.json(
        {
          message: portfolioError.message,
        },
        {
          status: 500,
        },
      );
    }

    seeded.push({
      email: designer.email,
      designerProfileId: designerProfile.id,
      portfolioCount: designer.portfolioItems.length,
    });
  }

  return NextResponse.json({
    message: "Đã seed designer và portfolio.",
    seeded,
  });
}

async function findOrCreateDesignerUser({
  email,
  password,
  fullName,
}: {
  email: string;
  password: string;
  fullName: string;
}) {
  const adminSupabase = createSupabaseAdminClient();

  const { data: usersData } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const existingUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existingUser) {
    return existingUser.id;
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "designer",
      full_name: fullName,
      display_name: fullName,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? `Không tạo được user ${email}.`);
  }

  return data.user.id;
}