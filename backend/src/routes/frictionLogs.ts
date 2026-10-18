import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

export const frictionLogsRouter = Router({ mergeParams: true });

frictionLogsRouter.use(requireAuth);
frictionLogsRouter.use(requireWorkspace);

const frictionLogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  severity: z.enum(['low', 'medium', 'critical', 'none']).default('none'),
  resolved: z.boolean().default(false),
});

const updateFrictionLogSchema = frictionLogSchema.partial();

// GET /api/events/:eventId/friction-logs
frictionLogsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const logs = await prisma.frictionLog.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs);
  } catch (error) {
    console.error('Failed to get friction logs:', error);
    res.status(500).json({ error: 'Failed to get friction logs' });
  }
});

async function checkEventEditAccess(eventId: string, userId: string, workspaceId?: string) {
  return prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      OR: [
        { workspaceId },
        { shares: { some: { userId, role: 'editor' } } },
      ],
    },
  });
}

// POST /api/events/:eventId/friction-logs
frictionLogsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);
    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot create friction logs' });
    }

    const parsed = frictionLogSchema.parse(req.body);

    const log = await prisma.frictionLog.create({
      data: {
        eventId,
        title: parsed.title,
        description: parsed.description,
        severity: parsed.severity,
        resolved: parsed.resolved,
      },
    });

    res.status(201).json(log);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to create friction log:', error);
    res.status(500).json({ error: 'Failed to create friction log' });
  }
});

// PUT /api/events/:eventId/friction-logs/:id or /api/friction-logs/:id
frictionLogsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    let eventId = req.params.eventId as string;
    if (!eventId) {
      const existing = await prisma.frictionLog.findUnique({
        where: { id },
        select: { eventId: true },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Friction log not found' });
      }
      eventId = existing.eventId;
    }
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);
    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot update friction logs' });
    }

    const parsed = updateFrictionLogSchema.parse(req.body);

    const updated = await prisma.frictionLog.update({
      where: { id },
      data: parsed,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to update friction log:', error);
    res.status(500).json({ error: 'Failed to update friction log' });
  }
});

// DELETE /api/events/:eventId/friction-logs/:id or /api/friction-logs/:id
frictionLogsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    let eventId = req.params.eventId as string;
    if (!eventId) {
      const existing = await prisma.frictionLog.findUnique({
        where: { id },
        select: { eventId: true },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Friction log not found' });
      }
      eventId = existing.eventId;
    }
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);
    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot delete friction logs' });
    }

    await prisma.frictionLog.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete friction log:', error);
    res.status(500).json({ error: 'Failed to delete friction log' });
  }
});
