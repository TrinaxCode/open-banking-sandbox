import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

// Validate required environment variables at startup
function validateEnv() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET");
  if (!process.env.NEXTAUTH_URL) missing.push("NEXTAUTH_URL");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "See .env.example for reference.",
    );
  }
}

validateEnv();

// A precomputed bcrypt hash of a random string. Used to run a constant-time
// password comparison for non-existent users (anti-enumeration). The plaintext
// is never used anywhere, so no real password can match it.
const DUMMY_PASSWORD_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        // Rate limit by IP (more permissive than email to avoid blocking shared IPs).
        const ip =
          (req?.headers?.["x-forwarded-for"] as string | undefined)
            ?.split(",")[0]
            ?.trim() ?? "unknown";
        const isNonProd = process.env.NODE_ENV !== "production";
        const ipRateCheck = await checkRateLimit(`login:ip:${ip}`, {
          max: isNonProd ? 500 : 30,
          windowMs: 15 * 60 * 1000,
          message: "Too many login attempts from this network. Please try again later.",
        });
        if (!ipRateCheck.allowed) return null;

        // Rate limit by email.
        const maxEmailAttempts = isNonProd || email === "demo@banking.app" ? 500 : 5;
        const rateCheck = await checkRateLimit(`login:${email}`, {
          max: maxEmailAttempts,
          windowMs: 15 * 60 * 1000,
        });
        if (!rateCheck.allowed) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        // Always run a bcrypt comparison — even when the user does not exist —
        // so response timing doesn't reveal whether an email is registered.
        const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
        const isValid = await bcrypt.compare(password, hashToCompare);

        if (!user || !isValid) {
          return null;
        }

        await resetRateLimit(`login:ip:${ip}`);
        await resetRateLimit(`login:${email}`);

        await prisma.securityLog
          .create({
            data: {
              userId: user.id,
              action: "login",
              details: "Successful login session authenticated",
              ipAddress: ip,
            },
          })
          .catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
