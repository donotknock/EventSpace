import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

export const eventsRouter = Router();

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().optional().nullable(),
  term: z.string().optional().nullable(),
  year: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['high', 'med', 'low']).optional().nullable(),
  isMuted: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  contactIds: z.array(z.string()).optional(),
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
          event: { deletedAt: null },
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
          event: { deletedAt: null },
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
    const { year, department, term, priority, search, isTemplate } = req.query;

    const where: any = { deletedAt: null };
    if (isTemplate === 'true') {
      where.isTemplate = true;
    } else if (isTemplate === 'all') {
      // do not restrict isTemplate
    } else {
      where.isTemplate = false;
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

    res.json(filteredEvents);
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
      where: { id, deletedAt: null },
      include: {
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

    res.json(event);
  } catch (error) {
    console.error('Failed to fetch event:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// POST /api/events - Create new event
eventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createEventSchema.parse(req.body);
    const newEvent = await prisma.event.create({
      data: {
        title: parsed.title,
        department: parsed.department,
        term: parsed.term,
        year: parsed.year,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        priority: parsed.priority ?? null,
        isMuted: parsed.isMuted,
        isCompleted: parsed.isCompleted ?? false,
        isTemplate: parsed.isTemplate ?? false,
        contacts:
          parsed.contactIds && parsed.contactIds.length > 0
            ? { connect: parsed.contactIds.map((cid) => ({ id: cid })) }
            : undefined,
        checklists: {
          create: [
            { category: 'FM', content: 'Confirm venue & room layout', order: 0 },
            { category: 'AV', content: 'Verify microphones, screens & streaming', order: 1 },
            { category: 'CT', content: 'Finalize catering headcount & dietary needs', order: 2 },
          ],
        },
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

    const original = await prisma.event.findUnique({
      where: { id },
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
        title: title || `${original.title} (Copy)`,
        department: department !== undefined ? department : original.department,
        term: original.term,
        year: original.year,
        startDate: startDate ? new Date(startDate) : original.startDate,
        endDate: endDate ? new Date(endDate) : original.endDate,
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
        // When spawning from a template, wipe content and subtasks completely
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

    const original = await prisma.event.findUnique({
      where: { id },
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
            isCompleted: false, // Strip completed states
            order: c.order,
          })),
        },
      },
    });

    // Replicate canvas structure: preserve block titles, types, coordinates, but strip out dates, assignees, transcriptions, media, checked states
    const idMap = new Map<string, string>();

    for (const oldNode of original.nodes) {
      // Templates spawn as completely empty shells: wipe subtasks array, descriptions/content, and media
      const newNode = await prisma.canvasNode.create({
        data: {
          eventId: templateEvent.id,
          type: oldNode.type,
          xPosition: oldNode.xPosition,
          yPosition: oldNode.yPosition,
          title: oldNode.title,
          content: null, // Explicitly wipe description and content
          isCompleted: false,
          dueDate: null,
          assignee: null,
          priority: null,
          metadata: JSON.stringify({ subtasks: [] }), // Explicitly wipe subtasks array
        },
      });

      idMap.set(oldNode.id, newNode.id);
    }

    // Replicate canvas edges
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

// PUT /api/events/:id - Update event details
eventsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
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
