import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

export const eventsRouter = Router();

eventsRouter.use(requireAuth);
eventsRouter.use(requireWorkspace);

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().optional().nullable(),
  term: z.string().optional().nullable(),
  year: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  status: z.enum(['active', 'archived']).default('active').optional().nullable(),
  priority: z.enum(['high', 'med', 'low']).optional().nullable(),
  isMuted: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  contactIds: z.array(z.string()).optional(),
  includeDefaultChecklists: z.boolean().optional(),
});

const updateEventSchema = createEventSchema.partial();

const updateViewportSchema = z.object({
  viewportX: z.number(),
  viewportY: z.number(),
  viewportZoom: z.number(),
});

// GET /api/events/search/all - Global cross-item search endpoint
eventsRouter.get('/search/all', async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q) return res.json({ events: [], nodes: [], checklists: [] });

    const [events, nodes, checklists] = await Promise.all([
      prisma.event.findMany({
        where: {
          deletedAt: null,
          workspaceId: req.workspaceId,
          status: { not: 'archived' },
          OR: [
            { title: { contains: q } },
            { department: { contains: q } },
            { term: { contains: q } },
          ],
        },
        select: { id: true, title: true, department: true, startDate: true, priority: true },
      }),
      prisma.canvasNode.findMany({
        where: {
          deletedAt: null,
          event: { deletedAt: null, workspaceId: req.workspaceId, status: { not: 'archived' } },
          OR: [
            { title: { contains: q } },
            {
              AND: [
                { type: { not: 'picture' } },
                { content: { contains: q } },
              ],
            },
            { metadata: { contains: q } },
            { assignee: { contains: q } },
          ],
        },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          isCompleted: true,
          dueDate: true,
          metadata: true,
          assignee: true,
          event: { select: { id: true, title: true } },
        },
        take: 40,
      }),
      prisma.checklistItem.findMany({
        where: {
          deletedAt: null,
          event: { deletedAt: null, workspaceId: req.workspaceId, status: { not: 'archived' } },
          OR: [
            { content: { contains: q } },
            { category: { contains: q } },
          ],
        },
        include: { event: { select: { id: true, title: true } } },
        take: 40,
      }),
    ]);

    // Truncate any long content/metadata to prevent response bloat
    const safeNodes = nodes.map((n) => ({
      ...n,
      content: n.type === 'picture' ? '[Photo]' : n.content?.slice(0, 300) || null,
    }));

    res.json({ events, nodes: safeNodes, checklists });
  } catch (error) {
    console.error('Failed to run global search:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// GET /api/events - List all events with deadline and task stats for dynamic indicators
eventsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { year, department, term, priority, search, isTemplate, status } = req.query;

    const where: any = {
      deletedAt: null,
      AND: [
        {
          OR: [
            { workspaceId: req.workspaceId },
            { shares: { some: { userId: req.user!.id } } },
          ],
        },
      ],
    };
    if (isTemplate === 'true') {
      where.isTemplate = true;
    } else if (isTemplate === 'all') {
      // do not restrict isTemplate
    } else {
      where.isTemplate = false;
    }

    if (status && typeof status === 'string') {
      if (status !== 'all') {
        where.status = status;
      }
    } else if (isTemplate === 'true') {
      // Default template queries (e.g. selection menus) to exclude archived templates
      where.status = { not: 'archived' };
    }

    if (year && typeof year === 'string') where.year = year;
    if (department && typeof department === 'string') where.department = department;
    if (priority && typeof priority === 'string') {
      where.priority = priority === 'none' ? null : priority;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { department: { contains: q } },
        { term: { contains: q } },
        {
          nodes: {
            some: {
              OR: [
                { title: { contains: q } },
                {
                  AND: [
                    { type: { not: 'picture' } },
                    { content: { contains: q } },
                  ],
                },
                { metadata: { contains: q } },
                { assignee: { contains: q } },
              ],
            },
          },
        },
        {
          checklists: {
            some: {
              OR: [
                { content: { contains: q } },
                { category: { contains: q } },
              ],
            },
          },
        },
        {
          frictionLogs: {
            some: {
              OR: [
                { title: { contains: q } },
                { description: { contains: q } },
              ],
            },
          },
        },
        {
          contacts: {
            some: {
              OR: [
                { name: { contains: q } },
                { role: { contains: q } },
                { email: { contains: q } },
              ],
            },
          },
        },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        shares: {
          select: {
            userId: true,
            role: true,
          },
        },
        contacts: true,
        _count: {
          select: {
            nodes: true,
            checklists: true,
            frictionLogs: true,
          },
        },
        nodes: {
          where: { deletedAt: null },
          select: {
            id: true,
            type: true,
            isCompleted: true,
            dueDate: true,
          },
        },
        checklists: {
          where: { deletedAt: null },
          select: {
            id: true,
            isCompleted: true,
          },
        },
      },
    });

    // Filter by term or actual month from startDate
    let filteredEvents = events;
    if (term && typeof term === 'string' && term.trim()) {
      const t = term.trim().toUpperCase();
      const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthIdx = MONTHS.indexOf(t);

      filteredEvents = events.filter((ev) => {
        if (ev.term && ev.term.trim().toUpperCase() === t) return true;
        if (monthIdx !== -1 && ev.startDate) {
          const d = new Date(ev.startDate);
          return d.getUTCMonth() === monthIdx || d.getMonth() === monthIdx;
        }
        return false;
      });
    }

    const enriched = filteredEvents.map((ev) => {
      const isOwner = ev.workspaceId === req.workspaceId;
      const userShare = (ev as any).shares?.find((s: any) => s.userId === req.user!.id);
      return {
        ...ev,
        isOwner,
        isShared: !isOwner,
        userRole: isOwner ? 'owner' : (userShare?.role || 'viewer'),
        shareRole: userShare?.role || null,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id - Get complete event with canvas graph and overlays
eventsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const event = await prisma.event.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { workspaceId: req.workspaceId },
          { shares: { some: { userId: req.user!.id } } },
        ],
      },
      include: {
        shares: {
          include: {
            user: {
              select: { id: true, username: true, name: true, role: true },
            },
          },
        },
        nodes: {
          where: { deletedAt: null },
        },
        edges: true,
        contacts: true,
        checklists: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        frictionLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isOwner = event.workspaceId === req.workspaceId;
    const userShare = event.shares?.find((s) => s.userId === req.user!.id);
    const userRole = isOwner ? 'owner' : (userShare?.role || 'viewer');

    res.json({
      ...event,
      isOwner,
      isShared: !isOwner,
      userRole,
      shareRole: userShare?.role || null,
    });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// GET /api/events/:id/shares - List users with whom this event is shared
eventsRouter.get('/:id/shares', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const event = await prisma.event.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { workspaceId: req.workspaceId },
          { shares: { some: { userId: req.user!.id } } },
        ],
      },
      include: {
        shares: {
          include: {
            user: {
              select: { id: true, username: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event.shares);
  } catch (error) {
    console.error('Failed to get shares:', error);
    res.status(500).json({ error: 'Failed to retrieve event shares' });
  }
});

// POST /api/events/:id/shares - Share event with another user (Owner or Editor only)
eventsRouter.post('/:id/shares', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { username, userId, role = 'editor' } = req.body;

    const event = await prisma.event.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: { shares: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isOwner = event.workspaceId === req.workspaceId;
    const userShare = event.shares.find((s) => s.userId === req.user!.id);
    const canShare = isOwner || userShare?.role === 'editor';

    if (!canShare) {
      return res.status(403).json({ error: 'Only owners and editors can share this event' });
    }

    let targetUser;
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: userId } });
    } else if (username) {
      targetUser = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User to share with not found' });
    }

    if (targetUser.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot share event with yourself' });
    }

    const share = await prisma.eventShare.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId: targetUser.id,
        },
      },
      update: {
        role: role === 'viewer' ? 'viewer' : 'editor',
      },
      create: {
        eventId: id,
        userId: targetUser.id,
        role: role === 'viewer' ? 'viewer' : 'editor',
      },
      include: {
        user: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
    });

    res.status(201).json({ success: true, share });
  } catch (error) {
    console.error('Failed to share event:', error);
    res.status(500).json({ error: 'Failed to share event' });
  }
});

// PATCH /api/events/:id/shares/:userId - Update permission level of a shared user
eventsRouter.patch('/:id/shares/:userId', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const { role } = req.body;

    if (role !== 'editor' && role !== 'viewer') {
      return res.status(400).json({ error: 'Role must be editor or viewer' });
    }

    const event = await prisma.event.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: { shares: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isOwner = event.workspaceId === req.workspaceId;
    const userShare = event.shares.find((s) => s.userId === req.user!.id);
    const canManage = isOwner || userShare?.role === 'editor';

    if (!canManage) {
      return res.status(403).json({ error: 'Only owners and editors can modify permissions' });
    }

    await prisma.eventShare.updateMany({
      where: {
        eventId: id,
        userId: targetUserId,
      },
      data: { role },
    });

    res.json({ success: true, message: `Permission updated to ${role}` });
  } catch (error) {
    console.error('Failed to update share permission:', error);
    res.status(500).json({ error: 'Failed to update share permission' });
  }
});

// DELETE /api/events/:id/shares/:userId - Remove share or leave event
eventsRouter.delete('/:id/shares/:userId', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const isSelfLeaving = targetUserId === req.user!.id;

    const event = await prisma.event.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: { shares: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!isSelfLeaving) {
      const isOwner = event.workspaceId === req.workspaceId;
      const userShare = event.shares.find((s) => s.userId === req.user!.id);
      const canManage = isOwner || userShare?.role === 'editor';

      if (!canManage) {
        return res.status(403).json({ error: 'Only owners and editors can remove shares' });
      }
    }

    await prisma.eventShare.deleteMany({
      where: {
        eventId: id,
        userId: targetUserId,
      },
    });

    res.json({
      success: true,
      message: isSelfLeaving ? 'You left the event' : 'Share removed successfully',
    });
  } catch (error) {
    console.error('Failed to remove share:', error);
    res.status(500).json({ error: 'Failed to remove share' });
  }
});

// POST /api/events/:id/leave - Leave shared event
eventsRouter.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.eventShare.deleteMany({
      where: {
        eventId: id,
        userId: req.user!.id,
      },
    });
    res.json({ success: true, message: 'You have left the event' });
  } catch (error) {
    console.error('Failed to leave event:', error);
    res.status(500).json({ error: 'Failed to leave event' });
  }
});

// POST /api/events - Create new event
eventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createEventSchema.parse(req.body);
    const newEvent = await prisma.event.create({
      data: {
        workspaceId: req.workspaceId,
        title: parsed.title,
        department: parsed.department,
        term: parsed.term,
        year: parsed.year,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        startTime: parsed.startTime || null,
        endTime: parsed.endTime || null,
        color: parsed.color ?? null,
        status: parsed.status || 'active',
        priority: parsed.priority ?? null,
        isMuted: parsed.isMuted,
        isCompleted: parsed.isCompleted ?? false,
        isTemplate: parsed.isTemplate ?? false,
        contacts:
          parsed.contactIds && parsed.contactIds.length > 0
            ? { connect: parsed.contactIds.map((cid) => ({ id: cid })) }
            : undefined,
        checklists: parsed.includeDefaultChecklists
          ? {
              create: [
                { category: 'FM', content: 'Confirm venue & room layout', order: 0, workspaceId: req.workspaceId },
                { category: 'AV', content: 'Verify microphones, screens & streaming', order: 1, workspaceId: req.workspaceId },
                { category: 'CT', content: 'Finalize catering headcount & dietary needs', order: 2, workspaceId: req.workspaceId },
              ],
            }
          : undefined,
      },
      include: {
        checklists: true,
        contacts: true,
      },
    });

    res.status(201).json(newEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to create event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// POST /api/events/:id/duplicate - Duplicate event structure stripping completion
eventsRouter.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, startDate, endDate, department, priority } = req.body;

    const original = await prisma.event.findFirst({
      where: { id, workspaceId: req.workspaceId },
      include: {
        checklists: true,
        nodes: true,
        edges: true,
      },
    });

    if (!original) {
      return res.status(404).json({ error: 'Event to duplicate not found' });
    }

    // Create the new event
    const duplicatedEvent = await prisma.event.create({
      data: {
        workspaceId: req.workspaceId,
        title: title || `${original.title} (Copy)`,
        department: department !== undefined ? department : original.department,
        term: original.term,
        year: original.year,
        startDate: startDate ? new Date(startDate) : original.startDate,
        endDate: endDate ? new Date(endDate) : original.endDate,
        startTime: original.startTime,
        endTime: original.endTime,
        status: 'active',
        priority: priority !== undefined ? priority : original.priority,
        isMuted: false,
        isTemplate: false,
        viewportX: original.viewportX,
        viewportY: original.viewportY,
        viewportZoom: original.viewportZoom,
        checklists: {
          create: original.checklists.map((c) => ({
            category: c.category,
            content: c.content,
            isCompleted: false, // Strip completion
            order: c.order,
            workspaceId: req.workspaceId,
          })),
        },
      },
    });

    // Replicate nodes and maintain ID map for edges
    const idMap = new Map<string, string>();
    const isSourceTemplate = Boolean(original.isTemplate);

    for (const oldNode of original.nodes) {
      let cleanContent = oldNode.content;
      let cleanMetadata = oldNode.metadata;
      let cleanDueDate = oldNode.dueDate;
      let cleanAssignee = oldNode.assignee;
      let cleanPriority = oldNode.priority;

      if (isSourceTemplate) {
        cleanContent = null;
        cleanMetadata = JSON.stringify({ subtasks: [] });
        cleanDueDate = null;
        cleanAssignee = null;
        cleanPriority = null;
      } else if (cleanMetadata) {
        try {
          const parsed = JSON.parse(cleanMetadata);
          if (Array.isArray(parsed.subtasks)) {
            parsed.subtasks = parsed.subtasks.map((st: any) => ({ ...st, done: false }));
            cleanMetadata = JSON.stringify(parsed);
          }
        } catch {
          // ignore
        }
      }

      const newNode = await prisma.canvasNode.create({
        data: {
          workspaceId: req.workspaceId,
          eventId: duplicatedEvent.id,
          type: oldNode.type,
          xPosition: oldNode.xPosition,
          yPosition: oldNode.yPosition,
          title: oldNode.title,
          content: cleanContent,
          isCompleted: false, // Strip completion
          dueDate: cleanDueDate,
          assignee: cleanAssignee,
          priority: cleanPriority,
          metadata: cleanMetadata,
        },
      });

      idMap.set(oldNode.id, newNode.id);
    }

    // Replicate edges with mapped source and target IDs
    if (original.edges.length > 0) {
      const validEdges = original.edges
        .filter((e) => idMap.has(e.sourceId) && idMap.has(e.targetId))
        .map((e) => ({
          eventId: duplicatedEvent.id,
          sourceId: idMap.get(e.sourceId)!,
          targetId: idMap.get(e.targetId)!,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          animated: e.animated,
          label: e.label,
        }));

      if (validEdges.length > 0) {
        await prisma.canvasEdge.createMany({
          data: validEdges,
        });
      }
    }

    const fullDuplicated = await prisma.event.findUnique({
      where: { id: duplicatedEvent.id },
      include: {
        nodes: true,
        edges: true,
        checklists: true,
      },
    });

    res.status(201).json(fullDuplicated);
  } catch (error) {
    console.error('Failed to duplicate event:', error);
    res.status(500).json({ error: 'Failed to duplicate event' });
  }
});

// POST /api/events/:id/save-as-template - Clone event into a reusable Template
eventsRouter.post('/:id/save-as-template', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title } = req.body;

    const original = await prisma.event.findFirst({
      where: { id, workspaceId: req.workspaceId },
      include: {
        checklists: true,
        nodes: true,
        edges: true,
      },
    });

    if (!original) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const templateTitle = title?.trim() || `${original.title} (Template)`;

    // Create template with isTemplate = true, stripping all specific event details
    const templateEvent = await prisma.event.create({
      data: {
        workspaceId: req.workspaceId,
        title: templateTitle,
        department: original.department,
        term: null,
        year: null,
        startDate: null,
        endDate: null,
        priority: null,
        isMuted: false,
        isCompleted: false,
        isTemplate: true,
        viewportX: original.viewportX,
        viewportY: original.viewportY,
        viewportZoom: original.viewportZoom,
        checklists: {
          create: original.checklists.map((c) => ({
            category: c.category,
            content: c.content,
            isCompleted: false,
            order: c.order,
            workspaceId: req.workspaceId,
          })),
        },
      },
    });

    const idMap = new Map<string, string>();

    for (const oldNode of original.nodes) {
      const newNode = await prisma.canvasNode.create({
        data: {
          workspaceId: req.workspaceId,
          eventId: templateEvent.id,
          type: oldNode.type,
          xPosition: oldNode.xPosition,
          yPosition: oldNode.yPosition,
          title: oldNode.title,
          content: null,
          isCompleted: false,
          dueDate: null,
          assignee: null,
          priority: null,
          metadata: JSON.stringify({ subtasks: [] }),
        },
      });

      idMap.set(oldNode.id, newNode.id);
    }

    if (original.edges.length > 0) {
      const validEdges = original.edges
        .filter((e) => idMap.has(e.sourceId) && idMap.has(e.targetId))
        .map((e) => ({
          eventId: templateEvent.id,
          sourceId: idMap.get(e.sourceId)!,
          targetId: idMap.get(e.targetId)!,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          animated: e.animated,
          label: e.label,
        }));

      if (validEdges.length > 0) {
        await prisma.canvasEdge.createMany({
          data: validEdges,
        });
      }
    }

    const fullTemplate = await prisma.event.findUnique({
      where: { id: templateEvent.id },
      include: {
        nodes: true,
        edges: true,
        checklists: true,
      },
    });

    res.status(201).json(fullTemplate);
  } catch (error) {
    console.error('Failed to save event as template:', error);
    res.status(500).json({ error: 'Failed to save event as template' });
  }
});

// PUT /api/events/:id - Update event details (Owner or Editor only)
eventsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.event.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { workspaceId: req.workspaceId },
          { shares: { some: { userId: req.user!.id, role: 'editor' } } },
        ],
      },
    });

    if (!existing) {
      return res.status(403).json({ error: 'Event not found or you do not have edit permissions' });
    }

    const parsed = updateEventSchema.parse(req.body);

    const updateData: any = { ...parsed };
    if (parsed.startDate !== undefined) {
      updateData.startDate = parsed.startDate ? new Date(parsed.startDate) : null;
    }
    if (parsed.endDate !== undefined) {
      updateData.endDate = parsed.endDate ? new Date(parsed.endDate) : null;
    }
    if (parsed.priority !== undefined) {
      updateData.priority = parsed.priority ?? null;
    }
    if (parsed.color !== undefined) {
      updateData.color = parsed.color || null;
    }
    if (parsed.contactIds !== undefined) {
      updateData.contacts = {
        set: parsed.contactIds.map((cid) => ({ id: cid })),
      };
      delete updateData.contactIds;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to update event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// PUT /api/events/:id/viewport - Save viewport coordinates and zoom
eventsRouter.put('/:id/viewport', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.event.findFirst({
      where: { id, workspaceId: req.workspaceId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found in workspace' });
    }

    const parsed = updateViewportSchema.parse(req.body);

    const updated = await prisma.event.update({
      where: { id },
      data: {
        viewportX: parsed.viewportX,
        viewportY: parsed.viewportY,
        viewportZoom: parsed.viewportZoom,
      },
      select: {
        id: true,
        viewportX: true,
        viewportY: true,
        viewportZoom: true,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to update viewport:', error);
    res.status(500).json({ error: 'Failed to update viewport' });
  }
});

// DELETE /api/events/:id - Soft-delete event
eventsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.event.findFirst({
      where: { id, workspaceId: req.workspaceId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found in workspace' });
    }

    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, message: 'Event moved to trash successfully' });
  } catch (error) {
    console.error('Failed to delete event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});
