import { D1Adapter, type D1Database as AuthDatabase } from "@auth/d1-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

type AuthEnvironment = {
  AUTH_GITHUB_ID: string;
  AUTH_GITHUB_SECRET: string;
  AUTH_SECRET: string;
  DB: D1Database;
};

export const { auth, handlers, signIn, signOut } = NextAuth(async () => {
  const { env } = await import("cloudflare:workers");
  const authEnvironment = env as unknown as AuthEnvironment;

  return {
    adapter: D1Adapter(authEnvironment.DB as AuthDatabase),
    providers: [
      GitHub({
        clientId: authEnvironment.AUTH_GITHUB_ID,
        clientSecret: authEnvironment.AUTH_GITHUB_SECRET,
      }),
    ],
    secret: authEnvironment.AUTH_SECRET,
    session: { strategy: "database" },
    trustHost: true,
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          (session.user as typeof session.user & { id: string }).id = user.id;
        }
        return session;
      },
    },
  };
});
