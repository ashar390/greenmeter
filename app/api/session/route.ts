import { getRequestUser } from "../../../lib/request-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = getRequestUser(request);

  return Response.json({
    authenticated: Boolean(user),
    user,
    mode: user ? "personal" : "demo",
  });
}
