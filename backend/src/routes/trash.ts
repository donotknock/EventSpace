import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

export const trashRouter = Router();

// GET /api/trash - List all soft-deleted items across events, nodes, and checklists
trashRouter.get('/', async (req: Request, res: Response) => {
  try {
    const [events, nodes, checklists] = await Promise.all([
      prisma.event.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.canvasNode.findMany({
        where: { deletedAt: { not: null } },
        include: {
          event: {
            select: { id: true, title: true },
          },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.checklistItem.findMany({
        where: { deletedAt: { not: null } },
        include: {
          event: {
            select: { id: true, title: true },
          },
        },
        orderBy: { deletedAt: 'desc' },
      }),
    ]);

    res.json({
      events,
      nodes,
      checklists,
      totalCount: events.length + nodes.length + checklists.length,
    });
  } catch (error) {
    console.error('Failed to fetch trash items:', error);
    res.status(500).json({ error: 'Failed to fetch trash items' });
  }
});

// POST /api/trash/:type/:id/restore - Restore soft-deleted item
trashRouter.post('/:type/:id/restore', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const type = req.params.type as string;

    if (type === 'event') {
      const restored = await prisma.event.update({
        where: { id },
        data: { deletedAt: null },
      });
      return res.json({ success: true, restored });
    }

    if (type === 'node') {
      const node = await prisma.canvasNode.findUnique({ where: { id } });
      if (!node) return res.status(404).json({ error: 'Node not found' });

      // If parent event was deleted, restore it as well
      await prisma.event.updateMany({
        where: { id: node.eventId, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      const restored = await prisma.canvasNode.update({
        where: { id },
        data: { deletedAt: null },
      });
      return res.json({ success: true, restored });
    }

    if (type === 'checklist') {
      const item = await prisma.checklistItem.findUnique({ where: { id } });
      if (!item) return res.status(404).json({ error: 'Checklist item not found' });

      await prisma.event.updateMany({
        where: { id: item.eventId, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      const restored = await prisma.checklistItem.update({
        where: { id },
        data: { deletedAt: null },
      });
      return res.json({ success: true, restored });
    }

    return res.status(400).json({ error: 'Invalid item type' });
  } catch (error) {
    console.error('Failed to restore item:', error);
    res.status(500).json({ error: 'Failed to restore item' });
  }
});

// DELETE /api/trash/:type/:id/permanent - Permanently delete item
trashRouter.delete('/:type/:id/permanent', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const type = req.params.type as string;

    if (type === 'event') {
      await prisma.event.delete({ where: { id } });
      return res.json({ success: true, message: 'Event permanently deleted' });
    }

    if (type === 'node') {
      await prisma.canvasNode.delete({ where: { id } });
      return res.json({ success: true, message: 'Node permanently deleted' });
    }

    if (type === 'checklist') {
      await prisma.checklistItem.delete({ where: { id } });
      return res.json({ success: true, message: 'Checklist item permanently deleted' });
    }

    return res.status(400).json({ error: 'Invalid item type' });
  } catch (error) {
    console.error('Failed to permanently delete item:', error);
    res.status(500).json({ error: 'Failed to permanently delete item' });
  }
});

// POST /api/trash/empty - Empty all trash
trashRouter.post('/empty', async (req: Request, res: Response) => {
  try {
    await prisma.canvasNode.deleteMany({ where: { deletedAt: { not: null } } });
    await prisma.checklistItem.deleteMany({ where: { deletedAt: { not: null } } });
    await prisma.event.deleteMany({ where: { deletedAt: { not: null } } });

    res.json({ success: true, message: 'Trash emptied completely' });
  } catch (error) {
    console.error('Failed to empty trash:', error);
    res.status(500).json({ error: 'Failed to empty trash' });
  }
});
