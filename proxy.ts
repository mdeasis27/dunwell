import { type NextRequest, NextResponse } from "next/server";
import { localeRedirect } from "./src/routing/locale-redirect";

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const target = localeRedirect(pathname, search);
  if (target === null) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url), 307);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
