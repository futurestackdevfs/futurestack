import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("fs_token")?.value;

  const studentPaths = ["/students"];
  const staffPaths = ["/admin", "/teacher", "/dashboard"];
  const isStudentRoute = studentPaths.some((p) => pathname.startsWith(p));
  const isStaffRoute = staffPaths.some((p) => pathname.startsWith(p));

  if (isStudentRoute && !token) {
    return NextResponse.redirect(new URL("/students", request.url));
  }

  if (isStaffRoute && !token) {
    return NextResponse.redirect(new URL("/auth/staff-login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/students/:path+", "/admin/:path*", "/teacher/:path*", "/dashboard/:path*"],
};
