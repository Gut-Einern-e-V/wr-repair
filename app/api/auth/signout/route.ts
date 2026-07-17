import { createSupabaseServerClient } from "@/lib/supabase/auth";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return new Response(null, { status: 204 });
}