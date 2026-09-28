import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const workspacesRouter = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
});

// GET /api/workspaces - List workspaces user has access to
workspacesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                _count: {
                  select: { events: true, members: true },
                },
              },
            },
          },
        },
      },
    });

    const workspaces = (user?.workspaces || []).map((w) => ({
      id: w.workspace.id,
      name: w.workspace.name,
      role: w.role,
      eventCount: w.workspace._count.events,
      memberCount: w.workspace._count.members,
      createdAt: w.workspace.createdAt,
    }));

    res.json(workspaces);
  } catch (error) {
    console.error('List workspaces error:', error);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
});

// POST /api/workspaces - Create new workspace
workspacesRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name } = createWorkspaceSchema.parse(req.body);

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        members: {
          create: {
            userId: req.user!.id,
            role: 'owner',
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        role: 'owner',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});
