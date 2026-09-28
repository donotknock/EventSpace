import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  signUserToken,
  requireAuth,
  AUTH_COOKIE_NAME,
} from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional().nullable(),
  role: z.enum(['admin', 'member']).default('member'),
  workspaceId: z.string().optional(),
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: {
        workspaces: {
          where: {
            workspace: {
              isArchived: false,
              deletedAt: null,
            },
          },
          include: {
            workspace: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Sign JWT
    const token = signUserToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Set HTTP-only Cookie (valid for 7 days)
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const workspaces = user.workspaces.map((w) => ({
      id: w.workspace.id,
      name: w.workspace.name,
      role: w.role,
    }));

    res.json({
      success: true,
      token, // Also return for non-cookie API / Mobile clients
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      workspaces,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// POST /api/auth/change-password - Change password for authenticated user
authRouter.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        workspaces: {
          where: {
            workspace: {
              isArchived: false,
              deletedAt: null,
            },
          },
          include: {
            workspace: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const workspaces = user.workspaces.map((w) => ({
      id: w.workspace.id,
      name: w.workspace.name,
      role: w.role,
    }));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      workspaces,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// POST /api/auth/users - Create new user with strictly isolated personal workspace and default tutorial event
authRouter.post('/users', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create users' });
    }
    const parsed = createUserSchema.parse(req.body);
    const normalizedUsername = parsed.username.trim().toLowerCase();

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existing) {
      return res.status(409).json({ error: 'Username already in use' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(parsed.password, 10);

    // Create user account
    const newUser = await prisma.user.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        name: parsed.name?.trim() || null,
        role: parsed.role,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // 1. Strictly isolated personal workspace for each user
    const wsName = parsed.name?.trim()
      ? `${parsed.name.trim()}'s Workspace`
      : `${normalizedUsername.toUpperCase()}'s Workspace`;

    const userWorkspace = await prisma.workspace.create({
      data: {
        name: wsName,
        members: {
          create: {
            userId: newUser.id,
            role: 'owner',
          },
        },
      },
    });

    // 2. Seed default "Tutorial" event strictly for this user's isolated workspace
    const tutorialEvent = await prisma.event.create({
      data: {
        workspaceId: userWorkspace.id,
        title: 'Tutorial: Welcome to EventSpace',
        department: 'Getting Started',
        status: 'active',
        priority: null,
        color: '#3B82F6',
        isTemplate: false,
        nodes: {
          create: [
            {
              workspaceId: userWorkspace.id,
              type: 'info',
              title: 'Welcome to EventSpace',
              content: 'EventSpace is your spatial coordination workspace. Drag and drop blocks, connect them with arrows, and manage event schedules seamlessly.',
              xPosition: 120,
              yPosition: 160,
              dueDate: null,
              isCompleted: false,
            },
            {
              workspaceId: userWorkspace.id,
              type: 'task',
              title: 'Explore Building Blocks',
              content: 'Try adding different blocks from the palette on the left (Task, Chaser, Info, Venue, Picture, Audio, Video).',
              xPosition: 440,
              yPosition: 160,
              dueDate: null,
              isCompleted: false,
              metadata: JSON.stringify({
                subtasks: [
                  { id: 'st1', label: 'Try connecting two blocks with an arrow', done: false, style: 'circle' },
                  { id: 'st2', label: 'Double-click block title to customize', done: false, style: 'circle' },
                ],
              }),
            },
          ],
        },
        checklists: {
          create: [
            {
              workspaceId: userWorkspace.id,
              category: 'FM',
              content: 'Explore your personal workspace canvas',
              order: 0,
            },
          ],
        },
      },
    });

    res.status(201).json({
      success: true,
      user: newUser,
      workspace: {
        id: userWorkspace.id,
        name: userWorkspace.name,
      },
      tutorialEventId: tutorialEvent.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

// DELETE /api/auth/users/:id - Remove member & automatically archive their associated workspace
authRouter.delete('/users/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator permissions required to remove members' });
    }

    const targetUserId = String(req.params.id);
    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot remove your own administrator account' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find all workspaces where this user was an owner
    const userMemberships = await prisma.workspaceMember.findMany({
      where: { userId: targetUserId, role: 'owner' },
      select: { workspaceId: true },
    });
    const ownedWorkspaceIds = userMemberships.map((m) => m.workspaceId);

    // Automatically archive the associated workspaces
    if (ownedWorkspaceIds.length > 0) {
      await prisma.workspace.updateMany({
        where: { id: { in: ownedWorkspaceIds } },
        data: {
          isArchived: true,
          deletedAt: new Date(),
        },
      });
    }

    // Delete user account (cascades memberships, shares, pairing codes)
    await prisma.user.delete({
      where: { id: targetUserId },
    });

    res.json({
      success: true,
      message: 'Member removed and associated workspace successfully archived',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// GET /api/auth/users - List users in current workspace (Protected)
authRouter.get('/users', requireAuth, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});
