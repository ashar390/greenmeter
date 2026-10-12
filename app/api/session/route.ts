import { auth } from "../../../auth";
import { getSessionUser } from "../../../lib/session-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSessionUser(await auth());

  return Response.json({
    authenticated: Boolean(user),
    user,
    mode: user ? "personal" : "demo",
  });
}
