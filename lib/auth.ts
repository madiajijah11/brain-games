import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (!user || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email };
    }
  })],
  callbacks: { jwt({ token, user }) { if (user) token.id = user.id; return token; }, session({ session, token }) { if (session.user) (session.user as typeof session.user & { id: string }).id = token.id as string; return session; } }
});
