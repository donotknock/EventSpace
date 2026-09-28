import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

export const venuesRouter = Router();

venuesRouter.use(requireAuth);
venuesRouter.use(requireWorkspace);

const venueSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  location: z.string().optional().nullable(),
  setupTime: z.string().optional().nullable(),
  teardownTime: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/venues - List all saved venues scoped to workspace
venuesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const venues = await prisma.venue.findMany({
      where: {
        deletedAt: null,
        ...(req.workspaceId
          ? {
              OR: [
                { workspaceId: req.workspaceId },
                { workspaceId: null },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
    res.json(venues);
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// POST /api/venues - Create a new venue
venuesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validated = venueSchema.parse(req.body);
    const venue = await prisma.venue.create({
      data: {
        workspaceId: req.workspaceId || null,
        name: validated.name.trim(),
        location: validated.location?.trim() || null,
        setupTime: validated.setupTime?.trim() || null,
        teardownTime: validated.teardownTime?.trim() || null,
        contactName: validated.contactName?.trim() || null,
        contactPhone: validated.contactPhone?.trim() || null,
        notes: validated.notes?.trim() || null,
      },
    });
    res.status(201).json(venue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }
    console.error('Failed to create venue:', error);
    res.status(500).json({ error: 'Failed to create venue' });
  }
});

// PUT /api/venues/:id - Update an existing venue
venuesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const validated = venueSchema.partial().parse(req.body);

    const existing = await prisma.venue.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(req.workspaceId
          ? {
              OR: [{ workspaceId: req.workspaceId }, { workspaceId: null }],
            }
          : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const updated = await prisma.venue.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name.trim() }),
        ...(validated.location !== undefined && { location: validated.location?.trim() || null }),
        ...(validated.setupTime !== undefined && { setupTime: validated.setupTime?.trim() || null }),
        ...(validated.teardownTime !== undefined && { teardownTime: validated.teardownTime?.trim() || null }),
        ...(validated.contactName !== undefined && { contactName: validated.contactName?.trim() || null }),
        ...(validated.contactPhone !== undefined && { contactPhone: validated.contactPhone?.trim() || null }),
        ...(validated.notes !== undefined && { notes: validated.notes?.trim() || null }),
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }
    console.error('Failed to update venue:', error);
    res.status(500).json({ error: 'Failed to update venue' });
  }
});

// DELETE /api/venues/:id - Soft-delete a venue
venuesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.venue.findFirst({
      where: {
        id,
        ...(req.workspaceId
          ? {
              OR: [{ workspaceId: req.workspaceId }, { workspaceId: null }],
            }
          : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    await prisma.venue.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete venue:', error);
    res.status(500).json({ error: 'Failed to delete venue' });
  }
});
