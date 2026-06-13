"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";
import { requireSupabaseConfig } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const { url, publicKey } = requireSupabaseConfig();

  return createBrowserClient<Database>(url, publicKey);
}