import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

export const edgesRouter = Router({ mergeParams: true });

const edgeSchema = z.object({
  id: z.string().optional(),
  sourceId: z.string(),
  targetId: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.string().default('smoothstep'),
  animated: z.boolean().default(false),
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

// POST /api/events/:eventId/edges - Add single edge
edgesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const parsed = edgeSchema.parse(req.body);

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

// PUT /api/events/:eventId/edges/sync - Synchronize complete edge set
edgesRouter.put('/sync', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const parsed = syncEdgesSchema.parse(req.body);

    // Atomically replace edges for this event
    await prisma.$transaction(async (tx) => {
      await tx.canvasEdge.deleteMany({
        where: { eventId },
      });

      if (parsed.edges.length > 0) {
        await tx.canvasEdge.createMany({
          data: parsed.edges.map((e) => ({
            id: e.id,
            eventId,
            sourceId: e.sourceId,
            targetId: e.targetId,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: e.type,
            animated: e.animated,
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
    await prisma.canvasEdge.deleteMany({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete edge:', error);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});
