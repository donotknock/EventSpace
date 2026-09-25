import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

export const tasksRouter = Router();

// GET /api/tasks/master, /api/tasks/agenda, /api/tasks/schedule - Aggregate cross-event tasks
tasksRouter.get(['/master', '/agenda', '/schedule'], async (req: Request, res: Response) => {
  try {
    const { includeCompleted, eventId } = req.query;

    const eventWhere: any = { deletedAt: null };
    if (eventId && typeof eventId === 'string') {
      eventWhere.id = eventId;
    } else {
      // By default exclude muted events in master view
      eventWhere.isMuted = false;
    }

    const nodeWhere: any = {
      type: { in: ['task', 'chaser'] },
      deletedAt: null,
      event: eventWhere,
    };

    if (includeCompleted !== 'true') {
      nodeWhere.isCompleted = false;
    }

    const taskNodes = await prisma.canvasNode.findMany({
      where: nodeWhere,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            priority: true,
            department: true,
            term: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const checklistWhere: any = {
      deletedAt: null,
      event: eventWhere,
    };
    if (includeCompleted !== 'true') {
      checklistWhere.isCompleted = false;
    }

    const checklistItems = await prisma.checklistItem.findMany({
      where: checklistWhere,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            priority: true,
            department: true,
            term: true,
          },
        },
      },
      orderBy: [
        { isCompleted: 'asc' },
        { order: 'asc' },
      ],
    });

    let pendingSubtasksCount = 0;
    for (const node of taskNodes) {
      if (node.metadata) {
        try {
          const meta = JSON.parse(node.metadata);
          if (Array.isArray(meta.subtasks)) {
            pendingSubtasksCount += meta.subtasks.filter((st: any) => !st.done).length;
          }
        } catch {}
      }
    }

    res.json({
      taskNodes,
      checklistItems,
      totalPending:
        taskNodes.filter((t) => !t.isCompleted).length +
        checklistItems.filter((c) => !c.isCompleted).length +
        pendingSubtasksCount,
    });
  } catch (error) {
    console.error('Failed to get master tasks:', error);
    res.status(500).json({ error: 'Failed to aggregate master tasks' });
  }
});

// PATCH /api/tasks/:id/toggle - Universal toggle for mobile companion app
tasksRouter.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { subtaskIndex, isCompleted } = req.body || {};

    // 1. Check canvas node
    const node = await prisma.canvasNode.findUnique({ where: { id } });
    if (node) {
      if (typeof subtaskIndex === 'number' && node.metadata) {
        try {
          const meta = JSON.parse(node.metadata);
          if (Array.isArray(meta.subtasks) && meta.subtasks[subtaskIndex]) {
            meta.subtasks[subtaskIndex].done =
              typeof isCompleted === 'boolean'
                ? isCompleted
                : !meta.subtasks[subtaskIndex].done;
            const updated = await prisma.canvasNode.update({
              where: { id },
              data: { metadata: JSON.stringify(meta) },
            });
            return res.json({ type: 'subtask', success: true, node: updated });
          }
        } catch {}
      }

      const newStatus = typeof isCompleted === 'boolean' ? isCompleted : !node.isCompleted;
      const updated = await prisma.canvasNode.update({
        where: { id },
        data: { isCompleted: newStatus },
      });
      return res.json({ type: 'node', success: true, node: updated });
    }

    // 2. Check checklist item
    const checklist = await prisma.checklistItem.findUnique({ where: { id } });
    if (checklist) {
      const newStatus = typeof isCompleted === 'boolean' ? isCompleted : !checklist.isCompleted;
      const updated = await prisma.checklistItem.update({
        where: { id },
        data: { isCompleted: newStatus },
      });
      return res.json({ type: 'checklist', success: true, checklist: updated });
    }

    return res.status(404).json({ error: 'Item not found' });
  } catch (err) {
    console.error('Failed to toggle task item:', err);
    res.status(500).json({ error: 'Failed to toggle task item' });
  }
});
