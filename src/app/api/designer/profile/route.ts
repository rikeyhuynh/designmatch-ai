import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const allowedAvailability = ["available", "busy", "unavailable"];

type UpdateDesignerProfilePayload = {
  displayName?: unknown;
  headline?: unknown;
  bio?: unknown;
  specialties?: unknown;
  styles?: unknown;
  minimumProjectBudgetVnd?: unknown;
  availability?: unknown;
};

export async function PATCH(request: Request) {
  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để cập nhật hồ sơ.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "designer" || !authState.designerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ designer mới có thể cập nhật hồ sơ designer.",
      },
      { status: 403 },
    );
  }

  const payload = (await request.json()) as UpdateDesignerProfilePayload;

  const displayName = String(payload.displayName ?? "").trim();
  const headline = String(payload.headline ?? "").trim();
  const bio = String(payload.bio ?? "").trim();
  const availability = String(payload.availability ?? "").trim();

  const minimumProjectBudgetVnd = Number(payload.minimumProjectBudgetVnd ?? 0);

  const specialties = normalizeStringArray(payload.specialties);
  const styles = normalizeStringArray(payload.styles);

  if (displayName.length < 2) {
    return NextResponse.json(
      {
        message: "Tên hiển thị cần có ít nhất 2 ký tự.",
      },
      { status: 400 },
    );
  }

  if (headline.length < 5) {
    return NextResponse.json(
      {
        message: "Headline cần có ít nhất 5 ký tự.",
      },
      { status: 400 },
    );
  }

  if (!allowedAvailability.includes(availability)) {
    return NextResponse.json(
      {
        message: "Availability không hợp lệ.",
      },
      { status: 400 },
    );
  }

  if (!Number.isFinite(minimumProjectBudgetVnd) || minimumProjectBudgetVnd < 0) {
    return NextResponse.json(
      {
        message: "Minimum budget không hợp lệ.",
      },
      { status: 400 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data, error } = await adminSupabase
    .from("designer_profiles")
    .update({
      display_name: displayName,
      headline,
      bio: bio.length > 0 ? bio : null,
      specialties,
      styles,
      minimum_project_budget_vnd: Math.round(minimumProjectBudgetVnd),
      availability,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authState.designerProfile.id)
    .select("id, display_name, headline")
    .single();

  if (error) {
    return NextResponse.json(
      {
        message: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Đã cập nhật hồ sơ designer.",
    designerProfile: data,
  });
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 12);
}