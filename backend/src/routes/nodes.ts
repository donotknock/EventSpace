import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

export const nodesRouter = Router({ mergeParams: true });

const nodeSchema = z.object({
  type: z.enum(['task', 'info', 'chaser', 'note', 'picture', 'audio']).default('task'),
  xPosition: z.number(),
  yPosition: z.number(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional().nullable(),
  isCompleted: z.boolean().default(false),
  dueDate: z.string().datetime().optional().nullable(),
  assignee: z.string().optional().nullable(),
  priority: z.enum(['high', 'med', 'low']).optional().nullable(),
  metadata: z.string().optional().nullable(), // Stored JSON string
});

const updateNodeSchema = nodeSchema.partial();

const batchPositionsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string(),
      xPosition: z.number(),
      yPosition: z.number(),
    })
  ),
});

// GET /api/events/:eventId/nodes
nodesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const nodes = await prisma.canvasNode.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    res.json(nodes);
  } catch (error) {
    console.error('Failed to get nodes:', error);
    res.status(500).json({ error: 'Failed to get nodes' });
  }
});

// POST /api/events/:eventId/nodes
nodesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const parsed = nodeSchema.parse(req.body);

    const node = await prisma.canvasNode.create({
      data: {
        eventId,
        type: parsed.type,
        xPosition: parsed.xPosition,
        yPosition: parsed.yPosition,
        title: parsed.title,
        content: parsed.content,
        isCompleted: parsed.isCompleted,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        assignee: parsed.assignee,
        priority: parsed.priority,
        metadata: parsed.metadata,
      },
    });

    res.status(201).json(node);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to create node:', error);
    res.status(500).json({ error: 'Failed to create node' });
  }
});

// PUT /api/events/:eventId/nodes/batch/positions - Debounced drag coordinate save
nodesRouter.put('/batch/positions', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const parsed = batchPositionsSchema.parse(req.body);

    // Run batch updates inside a transaction
    await prisma.$transaction(
      parsed.positions.map((p) =>
        prisma.canvasNode.updateMany({
          where: { id: p.id, eventId },
          data: {
            xPosition: p.xPosition,
            yPosition: p.yPosition,
          },
        })
      )
    );

    res.json({ success: true, count: parsed.positions.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to update batch positions:', error);
    res.status(500).json({ error: 'Failed to update positions' });
  }
});

// PUT/PATCH /api/events/:eventId/nodes/:id
const handleUpdateNode = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateNodeSchema.parse(req.body);

    const data: any = { ...parsed };
    if (parsed.dueDate !== undefined) {
      data.dueDate = parsed.dueDate ? new Date(parsed.dueDate) : null;
    }

    const updated = await prisma.canvasNode.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to update node:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
};

nodesRouter.put('/:id', handleUpdateNode);
nodesRouter.patch('/:id', handleUpdateNode);

// DELETE /api/events/:eventId/nodes/:id - Soft delete node
nodesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.canvasNode.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true, message: 'Node moved to trash' });
  } catch (error) {
    console.error('Failed to delete node:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});
