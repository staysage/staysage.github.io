import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LOCALE_MAP: Record<string, string> = {
  "zh-cn": "zh",
  "zh-hk": "zh-TW",
  en: "en",
  es: "es",
  ko: "ko",
  ja: "ja",
  us: "en",
};

const LOCALE_MATCH = new RegExp(`^/(${Object.keys(LOCALE_MAP).join("|")})(/|$)`);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(LOCALE_MATCH);
  if (!match) return NextResponse.next();

  const locale = match[1];
  const language = LOCALE_MAP[locale] ?? "zh";
  const rest = pathname.replace(`/${locale}`, "") || "/";
  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = rest;
  const response = NextResponse.rewrite(nextUrl);
  response.cookies.set("language", language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|favicon|logo|.*\\.).*)"],
};
