import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

export const databaseHealthTables = [
  "profiles",
  "customer_profiles",
  "designer_profiles",
  "portfolio_items",
  "design_requests",
  "ai_briefs",
  "designer_matches",
  "jobs",
  "payments",
] as const satisfies Array<keyof Database["public"]["Tables"]>;

export type DatabaseHealthTableName = (typeof databaseHealthTables)[number];

export type DatabaseHealthCheck = {
  tableName: DatabaseHealthTableName;
  ok: boolean;
  count: number | null;
  error: string | null;
};

export type DatabaseHealthResult = {
  ok: boolean;
  hasAdminKey: boolean;
  checks: DatabaseHealthCheck[];
  error: string | null;
};

export async function getDatabaseHealth(): Promise<DatabaseHealthResult> {
  const configStatus = getSupabaseConfigStatus();

  if (!configStatus.hasSecretKey) {
    return {
      ok: false,
      hasAdminKey: false,
      checks: [],
      error:
        "Thiếu SUPABASE_SECRET_KEY hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local.",
    };
  }

  try {
    const supabase = createSupabaseAdminClient();

    const checks = await Promise.all(
      databaseHealthTables.map(async (tableName) => {
        const { count, error } = await supabase
          .from(tableName)
          .select("id", {
            count: "exact",
            head: true,
          });

        return {
          tableName,
          ok: !error,
          count: count ?? null,
          error: error?.message ?? null,
        };
      }),
    );

    return {
      ok: checks.every((check) => check.ok),
      hasAdminKey: true,
      checks,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      hasAdminKey: true,
      checks: [],
      error: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}