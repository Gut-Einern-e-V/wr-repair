import { createSupabaseServerClient } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // 303 damit auch ein einfaches Formular ohne JavaScript auf der Loginseite landet.
  return Response.redirect(new URL("/login", request.url), 303);
}
