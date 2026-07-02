import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';
import type { AuthenticatedRequest, UserRole } from '../types/database';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequest;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token autentikasi diperlukan' });
    return;
  }

  const token = authHeader.slice(7);
  const supabase = getSupabaseAdmin();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(401).json({ error: 'Profil pengguna tidak ditemukan' });
    return;
  }

  req.auth = {
    userId: user.id,
    email: profile.email,
    role: profile.role as UserRole,
  };

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Tidak terautentikasi' });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Akses ditolak — role tidak cukup' });
      return;
    }

    next();
  };
}
