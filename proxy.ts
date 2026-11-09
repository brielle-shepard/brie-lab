import { NextRequest, NextResponse } from "next/server";
import { authConfigured, readAzureOwner } from "./lib/azure-auth";
export function proxy(request: NextRequest) {
  if(process.env.SITE_VISIBILITY === "public" || readAzureOwner(request.headers)) return NextResponse.next();
  return new NextResponse(authConfigured()?"This site is private.":"Site setup is in progress.",{
    status:authConfigured()?403:503,
    headers:{"Cache-Control":"private, no-store","Content-Type":"text/plain; charset=utf-8"}
  });
}
export const config = {matcher:["/((?!_next/static|_next/image|favicon.svg|images/|api/health|\\.auth/).*)"]};
