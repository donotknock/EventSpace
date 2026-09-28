import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'eventspace-v1-secret-key-production-change-me';
export const AUTH_COOKIE_NAME = 'eventspace_auth';

export interface AuthUser {
  id: string;
  username: string;
  name: string | null;
  role: string;
  workspaces: string[]; // List of workspace IDs
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      workspaceId?: string;
    }
  }
}

export function signUserToken(payload: { userId: string; username: string; role: string }, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyUserToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Authentication Middleware:
 * Inspects HTTP-only cookie first, falls back to Authorization: Bearer <token>
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }

    // 2. Check Authorization Header (Bearer token)
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const decoded = verifyUserToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }

    // Fetch user and accessible workspaces
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        workspaces: {
          where: {
            workspace: {
              isArchived: false,
              deletedAt: null,
            },
          },
          select: { workspaceId: true, role: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      workspaces: user.workspaces.map((w) => w.workspaceId),
    };

    next();
  } catch (error) {
    console.error('requireAuth middleware error:', error);
    return res.status(500).json({ error: 'Internal authentication failure' });
  }
}

/**
 * Workspace Authorization Middleware:
 * Validates that authenticated user has access to requested workspace
 */
export async function requireWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract workspace ID from header, query param, or body
    let targetWorkspaceId =
      (req.headers['x-workspace-id'] as string) ||
      (req.query.workspaceId as string) ||
      req.body?.workspaceId;

    // If not specified, default to user's first accessible workspace
    if (!targetWorkspaceId && req.user.workspaces.length > 0) {
      targetWorkspaceId = req.user.workspaces[0];
    }

    if (!targetWorkspaceId) {
      return res.status(400).json({ error: 'No workspace specified or available for user' });
    }

    // Verify user membership in workspace
    const hasAccess = req.user.role === 'admin' || req.user.workspaces.includes(targetWorkspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to the specified workspace' });
    }

    req.workspaceId = targetWorkspaceId;
    next();
  } catch (error) {
    console.error('requireWorkspace middleware error:', error);
    return res.status(500).json({ error: 'Internal workspace authorization failure' });
  }
}
