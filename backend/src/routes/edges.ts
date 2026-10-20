import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

export const edgesRouter = Router({ mergeParams: true });

edgesRouter.use(requireAuth);
edgesRouter.use(requireWorkspace);

const edgeSchema = z.object({
  id: z.string().optional(),
  sourceId: z.string(),
  targetId: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.string().default('smoothstep'),
  animated: z.boolean().default(true),
  lineStyle: z.enum(['dashed', 'solid']).default('dashed'),
  strokeWidth: z.number().default(2.5),
  label: z.string().optional().nullable(),
});

const syncEdgesSchema = z.object({
  edges: z.array(edgeSchema),
});

// GET /api/events/:eventId/edges
edgesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const edges = await prisma.canvasEdge.findMany({
      where: { eventId },
    });
    res.json(edges);
  } catch (error) {
    console.error('Failed to get edges:', error);
    res.status(500).json({ error: 'Failed to get edges' });
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

// POST /api/events/:eventId/edges - Add single edge
edgesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);

    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot create connections' });
    }

    const parsed = edgeSchema.parse(req.body);

    if (parsed.sourceId === parsed.targetId) {
      return res.status(400).json({ error: 'Self connections are not allowed' });
    }

    const edge = await prisma.canvasEdge.create({
      data: {
        id: parsed.id,
        eventId,
        sourceId: parsed.sourceId,
        targetId: parsed.targetId,
        sourceHandle: parsed.sourceHandle,
        targetHandle: parsed.targetHandle,
        type: parsed.type,
        animated: parsed.animated,
        lineStyle: parsed.lineStyle,
        strokeWidth: parsed.strokeWidth,
        label: parsed.label,
      },
    });

    res.status(201).json(edge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to create edge:', error);
    res.status(500).json({ error: 'Failed to create edge' });
  }
});

// PATCH or PUT /api/events/:eventId/edges/:id - Update edge properties (reverse, style, etc.)
const handleUpdateEdge = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const eventId = req.params.eventId as string;
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);

    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot update connections' });
    }

    const updateEdgeSchema = z.object({
      sourceId: z.string().optional(),
      targetId: z.string().optional(),
      sourceHandle: z.string().optional().nullable(),
      targetHandle: z.string().optional().nullable(),
      type: z.string().optional(),
      animated: z.boolean().optional(),
      lineStyle: z.enum(['dashed', 'solid']).optional(),
      strokeWidth: z.number().optional(),
      label: z.string().optional().nullable(),
    });

    const parsed = updateEdgeSchema.parse(req.body);

    const updated = await prisma.canvasEdge.update({
      where: { id },
      data: parsed,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to update edge:', error);
    res.status(500).json({ error: 'Failed to update edge' });
  }
};

edgesRouter.patch('/:id', handleUpdateEdge);
edgesRouter.put('/:id', handleUpdateEdge);

// PUT /api/events/:eventId/edges/sync - Synchronize complete edge set
edgesRouter.put('/sync', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);

    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot sync connections' });
    }

    const parsed = syncEdgesSchema.parse(req.body);
    const validEdges = parsed.edges.filter((e) => e.sourceId !== e.targetId);

    // Atomically replace edges for this event
    await prisma.$transaction(async (tx) => {
      await tx.canvasEdge.deleteMany({
        where: { eventId },
      });

      if (validEdges.length > 0) {
        await tx.canvasEdge.createMany({
          data: validEdges.map((e) => ({
            id: e.id,
            eventId,
            sourceId: e.sourceId,
            targetId: e.targetId,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: e.type,
            animated: e.animated,
            lineStyle: e.lineStyle,
            strokeWidth: e.strokeWidth,
            label: e.label,
          })),
        });
      }
    });

    const updatedEdges = await prisma.canvasEdge.findMany({
      where: { eventId },
    });

    res.json(updatedEdges);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to sync edges:', error);
    res.status(500).json({ error: 'Failed to sync edges' });
  }
});

// DELETE /api/events/:eventId/edges/:id
edgesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const eventId = req.params.eventId as string;
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);

    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot delete connections' });
    }

    await prisma.canvasEdge.deleteMany({
      where: { id, eventId },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete edge:', error);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});
