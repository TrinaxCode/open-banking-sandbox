// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalNodeEnv = process.env.NODE_ENV;

describe("prisma singleton", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear the global prisma instance
    delete (globalThis as any).prisma;
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  });

  it("should create a new PrismaClient instance", async () => {
    const { prisma } = await import("@/lib/prisma");
    expect(prisma).toBeDefined();
    expect(prisma.user).toBeDefined();
    expect(typeof prisma.user.findUnique).toBe("function");
  });

  it("should reuse the same instance on subsequent imports in dev", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const mod1 = await import("@/lib/prisma");
    const mod2 = await import("@/lib/prisma");
    expect(mod1.prisma).toBe(mod2.prisma);
  });

  it("should store global reference in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { prisma } = await import("@/lib/prisma");
    expect((globalThis as any).prisma).toBe(prisma);
  });
});
