import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

export const checklistsRouter = Router({ mergeParams: true });

const checklistSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  content: z.string().min(1, 'Content is required'),
  isCompleted: z.boolean().default(false),
  order: z.number().int().default(0),
});

const updateChecklistSchema = checklistSchema.partial();

// GET /api/events/:eventId/checklists
checklistsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
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
    const parsed = checklistSchema.parse(req.body);

    const item = await prisma.checklistItem.create({
      data: {
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
