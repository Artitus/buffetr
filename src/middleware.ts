import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSlug } from "@/lib/verdict";

export function middleware(request: NextRequest) {
  const slug = parseSlug(request.nextUrl.searchParams.get("m"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-buffetr-m", slug);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/",
};
