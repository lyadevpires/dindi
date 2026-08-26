"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente do Supabase para usar no navegador. */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
