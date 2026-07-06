import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/types/database.types";

const PUBLIC_PATHS = ["/login", "/signup", "/invite", "/api/invites"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through public auth routes without any session check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Build a response we can attach refreshed cookies to
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto both the forwarded request and the response so
          // that the refreshed session reaches the page and the browser.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT and refreshes the session when needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated — send to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch role from profiles table. Right after sign-in (or after the DB
  // connection has been idle, e.g. on Supabase's free tier), this query can
  // transiently fail even though the session itself is perfectly valid —
  // retry a couple of times before making any routing decisions so we don't
  // punish a real, authenticated user with a bogus redirect to /login.
  let profile: { role: string; org_id: string | null } | null = null;
  let profileFetchFailed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 250 * attempt));
    const { data, error } = await supabase
      .from("profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .single();
    if (data) { profile = data; profileFetchFailed = false; break; }
    profileFetchFailed = !!error;
  }

  // We know the user is authenticated but couldn't confirm their role/org —
  // let the request through rather than bouncing them to /login. The
  // destination page does its own server-side profile check and will
  // recover once the DB connection is warm again.
  if (!profile && profileFetchFailed) {
    return response;
  }

  const role = profile?.role ?? "client";
  const orgId = profile?.org_id;

  // Bare /workspace (no slug) — always send to the correct home
  if (pathname === "/workspace" || pathname === "/workspace/") {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (orgId) {
      return NextResponse.redirect(new URL(`/workspace/${orgId}`, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Root "/" — redirect to the right home
  if (pathname === "/") {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    // Clients without an org get a fallback; normally the trigger assigns one
    if (!orgId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL(`/workspace/${orgId}`, request.url));
  }

  // Admin-only area — block clients
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Workspace area — clients can only access their own slug, admins can access any
  if (pathname.startsWith("/workspace/")) {
    if (role === "admin") {
      return response; // admins can impersonate any workspace
    }

    // Derive the org slug or id from the URL (/workspace/<slug>/...)
    const slugInUrl = pathname.split("/")[2];

    // Fetch the org to compare slug against the client's org_id
    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("id, slug")
      .eq("id", orgId ?? "")
      .single();

    // Same transient-failure tolerance as above — don't kick an
    // authenticated client out to /login over a blip in this lookup.
    if (!org && orgError) {
      return response;
    }

    const ownsThisWorkspace =
      org && (org.id === slugInUrl || org.slug === slugInUrl);

    if (!ownsThisWorkspace) {
      // Redirect client to their own workspace
      if (org) {
        return NextResponse.redirect(
          new URL(`/workspace/${org.slug || org.id}`, request.url)
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
