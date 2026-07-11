import bcrypt from "bcryptjs";

const MIN_ROUNDS = 10;
const MAX_ROUNDS = 14;

export function passwordHashRounds() {
  const defaultRounds = process.env.NODE_ENV === "production" ? 12 : 10;
  const configured = Number.parseInt(process.env.BCRYPT_ROUNDS || String(defaultRounds), 10);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, MIN_ROUNDS), MAX_ROUNDS) : defaultRounds;
}

export function hashPassword(password) {
  return bcrypt.hash(password, passwordHashRounds());
}

export function needsPasswordRehash(passwordHash) {
  try {
    return bcrypt.getRounds(passwordHash) < passwordHashRounds();
  } catch (_error) {
    return true;
  }
}
