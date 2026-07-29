/**
 * Serialize Prisma objects for React Client Components.
 *
 * Next.js serializes data at the RSC boundary, converting Date fields to ISO
 * strings. This helper makes that intent explicit and avoids verbose
 * JSON.parse(JSON.stringify(...)) calls throughout the codebase.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
