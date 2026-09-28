import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

export const trashRouter = Router();

trashRouter.use(requireAuth);
trashRouter.use(requireWorkspace);

// GET /api/trash - List all soft-deleted items across events, nodes, and checklists scoped to workspace
trashRouter.get('/', async (req: Request, res: Response) => {
  try {
    const [events, nodes, checklists] = await Promise.all([
      prisma.event.findMany({
        where: { deletedAt: { not: null }, workspaceId: req.workspaceId },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.canvasNode.findMany({
        where: { deletedAt: { not: null }, event: { workspaceId: req.workspaceId } },
        include: {
          event: {
            select: { id: true, title: true },
          },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.checklistItem.findMany({
        where: { deletedAt: { not: null }, event: { workspaceId: req.workspaceId } },
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
      const existing = await prisma.event.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });
      if (!existing) return res.status(404).json({ error: 'Event not found in workspace' });

      const restored = await prisma.event.update({
        where: { id },
        data: { deletedAt: null },
      });
      return res.json({ success: true, restored });
    }

    if (type === 'node') {
      const existing = await prisma.canvasNode.findFirst({
        where: { id, event: { workspaceId: req.workspaceId } },
      });
      if (!existing) return res.status(404).json({ error: 'Node not found in workspace' });

      const restored = await prisma.canvasNode.update({
        where: { id },
        data: { deletedAt: null },
      });
      return res.json({ success: true, restored });
    }

    if (type === 'checklist') {
      const existing = await prisma.checklistItem.findFirst({
        where: { id, event: { workspaceId: req.workspaceId } },
      });
      if (!existing) return res.status(404).json({ error: 'Checklist not found in workspace' });

      const restored = await prisma.checklistItem.update({
        where: { id },
        data: { deletedAt: null },
      });
      return res.json({ success: true, restored });
    }

    res.status(400).json({ error: 'Invalid trash item type' });
  } catch (error) {
    console.error('Failed to restore trash item:', error);
    res.status(500).json({ error: 'Failed to restore item' });
  }
});

// DELETE /api/trash/:type/:id/permanent - Permanently delete item
trashRouter.delete('/:type/:id/permanent', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const type = req.params.type as string;

    if (type === 'event') {
      const existing = await prisma.event.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });
      if (!existing) return res.status(404).json({ error: 'Event not found in workspace' });

      await prisma.event.delete({ where: { id } });
      return res.json({ success: true, message: 'Event permanently deleted' });
    }

    if (type === 'node') {
      const existing = await prisma.canvasNode.findFirst({
        where: { id, event: { workspaceId: req.workspaceId } },
      });
      if (!existing) return res.status(404).json({ error: 'Node not found in workspace' });

      await prisma.canvasNode.delete({ where: { id } });
      return res.json({ success: true, message: 'Node permanently deleted' });
    }

    if (type === 'checklist') {
      const existing = await prisma.checklistItem.findFirst({
        where: { id, event: { workspaceId: req.workspaceId } },
      });
      if (!existing) return res.status(404).json({ error: 'Checklist not found in workspace' });

      await prisma.checklistItem.delete({ where: { id } });
      return res.json({ success: true, message: 'Checklist item permanently deleted' });
    }

    res.status(400).json({ error: 'Invalid trash item type' });
  } catch (error) {
    console.error('Failed to permanently delete item:', error);
    res.status(500).json({ error: 'Failed to permanently delete item' });
  }
});

// DELETE /api/trash/empty - Permanently delete all trash in this workspace
trashRouter.delete('/empty', async (req: Request, res: Response) => {
  try {
    const targetWorkspaceId = req.workspaceId;

    const [deletedNodes, deletedChecklists, deletedEvents] = await Promise.all([
      prisma.canvasNode.deleteMany({
        where: { deletedAt: { not: null }, event: { workspaceId: targetWorkspaceId } },
      }),
      prisma.checklistItem.deleteMany({
        where: { deletedAt: { not: null }, event: { workspaceId: targetWorkspaceId } },
      }),
      prisma.event.deleteMany({
        where: { deletedAt: { not: null }, workspaceId: targetWorkspaceId },
      }),
    ]);

    res.json({
      success: true,
      message: 'Trash bin emptied successfully',
      deletedCounts: {
        events: deletedEvents.count,
        nodes: deletedNodes.count,
        checklists: deletedChecklists.count,
      },
    });
  } catch (error) {
    console.error('Failed to empty trash bin:', error);
    res.status(500).json({ error: 'Failed to empty trash bin' });
  }
});
