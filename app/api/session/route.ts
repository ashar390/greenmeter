import { getRequestUser } from "../../../lib/request-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getRequestUser(request);

  return Response.json({
    authenticated: Boolean(user),
    user,
    mode: user ? "personal" : "demo",
  });
}
