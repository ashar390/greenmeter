import type { Session } from "next-auth";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export function getSessionUser(session: Session | null): SessionUser | null {
  const user = session?.user as (Session["user"] & { id?: string }) | undefined;
  const id = user?.id?.trim();
  const email = user?.email?.trim().toLowerCase();

  if (!id || !email) return null;

  return {
    id,
    email,
    displayName: user.name?.trim() || email,
  };
}
