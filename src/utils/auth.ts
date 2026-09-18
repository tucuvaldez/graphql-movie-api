import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '../models/User.model';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me';

// jsonwebtoken tipa `expiresIn` como `number | StringValue` (un literal
// restringido tipo "15m", "30d"), así que un `process.env.X` (string
// genérico) no entra sin este cast. El valor sigue viniendo de env.
const ACCESS_TOKEN_TTL = (process.env.JWT_ACCESS_TTL ?? '15m') as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL = (process.env.JWT_REFRESH_TTL ?? '30d') as SignOptions['expiresIn'];

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
}
