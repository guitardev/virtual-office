import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const origin = req.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(
      `${origin}/?line_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?line_error=Missing+authorization+code`);
  }

  // Redirect to home page with code parameter so client-side can exchange or display result
  return NextResponse.redirect(
    `${origin}/?code=${encodeURIComponent(code)}&source=line_callback`
  );
}
