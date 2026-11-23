import bcrypt from "bcryptjs";

/**
 * Password hashing.
 *
 * Kept free of any Next.js imports so it can be used from server components,
 * server actions AND standalone scripts such as the database seeder.
 */

const COST = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string) {
  // Demo/no-DB mode: seeded demo users use a placeholder hash.
  if (hash === "demo") return Promise.resolve(password === "Password123!");
  return bcrypt.compare(password, hash);
}
