import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.stubEnv("DATABASE_URL", "file:./prisma/test.db");
vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
vi.stubEnv("NEXTAUTH_SECRET", "test-only-secret");
