import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

export const contactsRouter = Router();

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
});

// GET /api/contacts - List all saved contacts
contactsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(contacts);
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/contacts - Create a new contact
contactsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validated = contactSchema.parse(req.body);
    const contact = await prisma.contact.create({
      data: {
        name: validated.name.trim(),
        email: validated.email || null,
        phone: validated.phone?.trim() || null,
        role: validated.role?.trim() || null,
      },
    });
    res.status(201).json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }
    console.error('Failed to create contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT /api/contacts/:id - Update contact
contactsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const validated = contactSchema.partial().parse(req.body);
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        name: validated.name?.trim(),
        email: validated.email !== undefined ? (validated.email || null) : undefined,
        phone: validated.phone !== undefined ? (validated.phone?.trim() || null) : undefined,
        role: validated.role !== undefined ? (validated.role?.trim() || null) : undefined,
      },
    });
    res.json(contact);
  } catch (error) {
    console.error('Failed to update contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id - Delete contact
contactsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.contact.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});
