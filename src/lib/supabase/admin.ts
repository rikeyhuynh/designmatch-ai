import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAdminConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

export function createSupabaseAdminClient() {
  const { url, secretKey } = requireSupabaseAdminConfig();

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}