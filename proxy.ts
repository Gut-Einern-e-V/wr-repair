import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  /* Die Buehnenziehung gehoert dazu (Issue #45): Sie liegt zwar nicht unter
     /admin, aendert aber echte Gewinne. Die Seite selbst prueft die Rolle
     nochmals - hier faellt nur die Anmeldung frueh genug auf, damit auf der
     Buehne kein leerer Bildschirm steht. */
  const isBackend = ["/moderator", "/admin", "/tombola"].some((path) => request.nextUrl.pathname.startsWith(path));
  if (!user && isBackend) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/moderator/:path*", "/admin/:path*", "/tombola/:path*"],
};