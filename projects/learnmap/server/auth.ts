import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { DB } from './db';
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export function hashPassword(value: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(value, salt, 64).toString('hex')}`;
}
export function validPassword(value: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const derived = scryptSync(value, salt, 64);
  return timingSafeEqual(derived, Buffer.from(hash, 'hex'));
}
export async function login(db: DB, res: Response, id: string) {
  const token = randomBytes(32).toString('hex');
  await db.query("INSERT INTO auth_sessions VALUES ($1,$2,now()+interval '7 days')", [
    hashToken(token),
    id,
  ]);
  res.cookie('learnmap', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 604800000,
    path: '/',
  });
}
export function auth(db: DB) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('learnmap='))
      ?.slice(9);
    if (!token) return res.status(401).json({ error: 'Please sign in / Увійдіть до акаунта' });
    const { rows } = await db.query(
      'SELECT u.id,u.name,u.email,u.role FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()',
      [hashToken(token)],
    );
    if (!rows[0]) return res.status(401).json({ error: 'Session expired / Сесія завершилася' });
    res.locals.user = rows[0];
    next();
  };
}
export function role(...roles: string[]) {
  return (_req: Request, res: Response, next: NextFunction) =>
    roles.includes(res.locals.user.role)
      ? next()
      : res.status(403).json({ error: 'Access denied / Немає доступу' });
}
