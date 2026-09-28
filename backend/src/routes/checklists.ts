import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

export const checklistsRouter = Router({ mergeParams: true });

checklistsRouter.use(requireAuth);
checklistsRouter.use(requireWorkspace);

const checklistSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  content: z.string().min(1, 'Content is required'),
  isCompleted: z.boolean().default(false),
  order: z.number().int().default(0),
});

const updateChecklistSchema = checklistSchema.partial();

// Helper to check editor/owner permissions
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

// GET /api/events/:eventId/checklists
checklistsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
        OR: [
          { workspaceId: req.workspaceId },
          { shares: { some: { userId: req.user!.id } } },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const items = await prisma.checklistItem.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { order: 'asc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Failed to get checklists:', error);
    res.status(500).json({ error: 'Failed to get checklist items' });
  }
});

// POST /api/events/:eventId/checklists
checklistsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);

    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot create checklist items' });
    }

    const parsed = checklistSchema.parse(req.body);

    const item = await prisma.checklistItem.create({
      data: {
        workspaceId: event.workspaceId,
        eventId,
        category: parsed.category,
        content: parsed.content,
        isCompleted: parsed.isCompleted,
        order: parsed.order,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to create checklist item:', error);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
});

// PUT/PATCH /api/events/:eventId/checklists/:id - Update or toggle completed
const handleUpdateChecklist = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const eventId = req.params.eventId as string;
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);

    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot edit checklist items' });
    }

    const existing = await prisma.checklistItem.findFirst({
      where: { id, eventId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    const parsed = updateChecklistSchema.parse(req.body);

    const updated = await prisma.checklistItem.update({
      where: { id },
      data: parsed,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to update checklist item:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
};

checklistsRouter.put('/:id', handleUpdateChecklist);
checklistsRouter.patch('/:id', handleUpdateChecklist);

// DELETE /api/events/:eventId/checklists/:id - Soft-delete checklist item
checklistsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const eventId = req.params.eventId as string;
    const event = await checkEventEditAccess(eventId, req.user!.id, req.workspaceId);

    if (!event) {
      return res.status(403).json({ error: 'Viewers cannot delete checklist items' });
    }

    const existing = await prisma.checklistItem.findFirst({
      where: { id, eventId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    await prisma.checklistItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true, message: 'Checklist item moved to trash' });
  } catch (error) {
    console.error('Failed to delete checklist item:', error);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
});
