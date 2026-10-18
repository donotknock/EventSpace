import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const backupRouter = Router();

backupRouter.use(requireAuth);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to check admin role
function requireAdminRole(req: Request, res: Response, next: () => void) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required for database backup and restore' });
  }
  next();
}

backupRouter.use(requireAdminRole);

// GET /api/backup/export - Export entire database state as JSON snapshot
backupRouter.get('/export', async (req: Request, res: Response) => {
  try {
    const [
      users,
      workspaces,
      workspaceMembers,
      events,
      nodes,
      edges,
      checklists,
      frictionLogs,
      contacts,
      venues,
      shares,
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, username: true, passwordHash: true, name: true, role: true, createdAt: true, updatedAt: true } }),
      prisma.workspace.findMany(),
      prisma.workspaceMember.findMany(),
      prisma.event.findMany(),
      prisma.canvasNode.findMany(),
      prisma.canvasEdge.findMany(),
      prisma.checklistItem.findMany(),
      prisma.frictionLog.findMany(),
      prisma.contact.findMany(),
      prisma.venue.findMany(),
      prisma.eventShare.findMany(),
    ]);

    const backupData = {
      version: '1.1.2',
      timestamp: new Date().toISOString(),
      generator: 'EventSpace Backup System',
      data: {
        users,
        workspaces,
        workspaceMembers,
        events,
        nodes,
        edges,
        checklists,
        frictionLogs,
        contacts,
        venues,
        shares,
      },
    };

    const fileName = `eventspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.json(backupData);
  } catch (error) {
    console.error('Failed to export database backup:', error);
    res.status(500).json({ error: 'Failed to export database' });
  }
});

// GET /api/backup/download-db - Download raw SQLite database file
backupRouter.get('/download-db', async (req: Request, res: Response) => {
  try {
    const candidatePaths = [
      path.join(__dirname, '../../prisma/dev.db'),
      path.join(__dirname, '../prisma/dev.db'),
      path.join(process.cwd(), 'prisma/dev.db'),
      path.join(process.cwd(), 'dev.db'),
    ];

    const dbPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!dbPath) {
      return res.status(404).json({ error: 'Database file not found on server' });
    }

    const fileName = `eventspace-${new Date().toISOString().slice(0, 10)}.db`;
    res.download(dbPath, fileName);
  } catch (error) {
    console.error('Failed to download database file:', error);
    res.status(500).json({ error: 'Failed to download database file' });
  }
});

// POST /api/backup/restore - Restore database from JSON backup snapshot
backupRouter.post('/restore', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.data) {
      return res.status(400).json({ error: 'Invalid backup payload structure. Missing data field.' });
    }

    const {
      users = [],
      workspaces = [],
      workspaceMembers = [],
      events = [],
      nodes = [],
      edges = [],
      checklists = [],
      frictionLogs = [],
      contacts = [],
      venues = [],
      shares = [],
    } = payload.data;

    // Restore inside transaction with foreign key integrity
    await prisma.$transaction(async (tx) => {
      // 1. Users
      for (const u of users) {
        await tx.user.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            username: u.username,
            passwordHash: u.passwordHash,
            name: u.name,
            role: u.role || 'member',
          },
          update: {
            username: u.username,
            passwordHash: u.passwordHash,
            name: u.name,
            role: u.role || 'member',
          },
        });
      }

      // 2. Workspaces
      for (const w of workspaces) {
        await tx.workspace.upsert({
          where: { id: w.id },
          create: {
            id: w.id,
            name: w.name,
            isArchived: Boolean(w.isArchived),
            deletedAt: w.deletedAt ? new Date(w.deletedAt) : null,
          },
          update: {
            name: w.name,
            isArchived: Boolean(w.isArchived),
            deletedAt: w.deletedAt ? new Date(w.deletedAt) : null,
          },
        });
      }

      // 3. Workspace Members
      for (const wm of workspaceMembers) {
        await tx.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: wm.workspaceId,
              userId: wm.userId,
            },
          },
          create: {
            id: wm.id,
            workspaceId: wm.workspaceId,
            userId: wm.userId,
            role: wm.role || 'member',
          },
          update: {
            role: wm.role || 'member',
          },
        });
      }

      // 4. Contacts
      for (const c of contacts) {
        await tx.contact.upsert({
          where: { id: c.id },
          create: {
            id: c.id,
            workspaceId: c.workspaceId,
            name: c.name,
            department: c.department,
            email: c.email,
            phone: c.phone,
            role: c.role,
          },
          update: {
            name: c.name,
            department: c.department,
            email: c.email,
            phone: c.phone,
            role: c.role,
          },
        });
      }

      // 5. Venues
      for (const v of venues) {
        await tx.venue.upsert({
          where: { id: v.id },
          create: {
            id: v.id,
            workspaceId: v.workspaceId,
            name: v.name,
            location: v.location,
            setupTime: v.setupTime,
            teardownTime: v.teardownTime,
            contactName: v.contactName,
            contactPhone: v.contactPhone,
            notes: v.notes,
            deletedAt: v.deletedAt ? new Date(v.deletedAt) : null,
          },
          update: {
            name: v.name,
            location: v.location,
            setupTime: v.setupTime,
            teardownTime: v.teardownTime,
            contactName: v.contactName,
            contactPhone: v.contactPhone,
            notes: v.notes,
            deletedAt: v.deletedAt ? new Date(v.deletedAt) : null,
          },
        });
      }

      // 6. Events
      for (const ev of events) {
        await tx.event.upsert({
          where: { id: ev.id },
          create: {
            id: ev.id,
            workspaceId: ev.workspaceId,
            title: ev.title,
            department: ev.department,
            term: ev.term,
            year: ev.year,
            startDate: ev.startDate ? new Date(ev.startDate) : null,
            endDate: ev.endDate ? new Date(ev.endDate) : null,
            startTime: ev.startTime,
            endTime: ev.endTime,
            status: ev.status || 'active',
            priority: ev.priority,
            color: ev.color,
            order: ev.order ?? 0,
            isMuted: Boolean(ev.isMuted),
            isCompleted: Boolean(ev.isCompleted),
            isTemplate: Boolean(ev.isTemplate),
            deletedAt: ev.deletedAt ? new Date(ev.deletedAt) : null,
            viewportX: ev.viewportX ?? 0,
            viewportY: ev.viewportY ?? 0,
            viewportZoom: ev.viewportZoom ?? 1,
          },
          update: {
            title: ev.title,
            department: ev.department,
            term: ev.term,
            year: ev.year,
            startDate: ev.startDate ? new Date(ev.startDate) : null,
            endDate: ev.endDate ? new Date(ev.endDate) : null,
            startTime: ev.startTime,
            endTime: ev.endTime,
            status: ev.status || 'active',
            priority: ev.priority,
            color: ev.color,
            order: ev.order ?? 0,
            isMuted: Boolean(ev.isMuted),
            isCompleted: Boolean(ev.isCompleted),
            isTemplate: Boolean(ev.isTemplate),
            deletedAt: ev.deletedAt ? new Date(ev.deletedAt) : null,
            viewportX: ev.viewportX ?? 0,
            viewportY: ev.viewportY ?? 0,
            viewportZoom: ev.viewportZoom ?? 1,
          },
        });
      }

      // 7. Event Shares
      for (const s of shares) {
        await tx.eventShare.upsert({
          where: {
            eventId_userId: {
              eventId: s.eventId,
              userId: s.userId,
            },
          },
          create: {
            id: s.id,
            eventId: s.eventId,
            userId: s.userId,
            role: s.role || 'viewer',
            isMuted: Boolean(s.isMuted),
          },
          update: {
            role: s.role || 'viewer',
            isMuted: Boolean(s.isMuted),
          },
        });
      }

      // 8. Nodes
      for (const n of nodes) {
        await tx.canvasNode.upsert({
          where: { id: n.id },
          create: {
            id: n.id,
            workspaceId: n.workspaceId,
            eventId: n.eventId,
            type: n.type || 'task',
            xPosition: n.xPosition ?? 0,
            yPosition: n.yPosition ?? 0,
            title: n.title,
            content: n.content,
            isCompleted: Boolean(n.isCompleted),
            dueDate: n.dueDate ? new Date(n.dueDate) : null,
            assignee: n.assignee,
            priority: n.priority,
            metadata: n.metadata,
            deletedAt: n.deletedAt ? new Date(n.deletedAt) : null,
          },
          update: {
            xPosition: n.xPosition ?? 0,
            yPosition: n.yPosition ?? 0,
            title: n.title,
            content: n.content,
            isCompleted: Boolean(n.isCompleted),
            dueDate: n.dueDate ? new Date(n.dueDate) : null,
            assignee: n.assignee,
            priority: n.priority,
            metadata: n.metadata,
            deletedAt: n.deletedAt ? new Date(n.deletedAt) : null,
          },
        });
      }

      // 9. Edges
      for (const ed of edges) {
        await tx.canvasEdge.upsert({
          where: { id: ed.id },
          create: {
            id: ed.id,
            eventId: ed.eventId,
            sourceId: ed.sourceId,
            targetId: ed.targetId,
            sourceHandle: ed.sourceHandle,
            targetHandle: ed.targetHandle,
            type: ed.type || 'smoothstep',
            animated: Boolean(ed.animated),
            lineStyle: ed.lineStyle || 'dashed',
            strokeWidth: typeof ed.strokeWidth === 'number' ? ed.strokeWidth : 2.5,
            label: ed.label,
          },
          update: {
            sourceId: ed.sourceId,
            targetId: ed.targetId,
            sourceHandle: ed.sourceHandle,
            targetHandle: ed.targetHandle,
            type: ed.type || 'smoothstep',
            animated: Boolean(ed.animated),
            lineStyle: ed.lineStyle || 'dashed',
            strokeWidth: typeof ed.strokeWidth === 'number' ? ed.strokeWidth : 2.5,
            label: ed.label,
          },
        });
      }

      // 10. Checklists
      for (const cl of checklists) {
        await tx.checklistItem.upsert({
          where: { id: cl.id },
          create: {
            id: cl.id,
            workspaceId: cl.workspaceId,
            eventId: cl.eventId,
            category: cl.category,
            content: cl.content,
            isCompleted: Boolean(cl.isCompleted),
            order: cl.order ?? 0,
            deletedAt: cl.deletedAt ? new Date(cl.deletedAt) : null,
          },
          update: {
            category: cl.category,
            content: cl.content,
            isCompleted: Boolean(cl.isCompleted),
            order: cl.order ?? 0,
            deletedAt: cl.deletedAt ? new Date(cl.deletedAt) : null,
          },
        });
      }

      // 11. Friction Logs
      for (const fl of frictionLogs) {
        await tx.frictionLog.upsert({
          where: { id: fl.id },
          create: {
            id: fl.id,
            eventId: fl.eventId,
            title: fl.title,
            description: fl.description,
            severity: fl.severity || 'medium',
            resolved: Boolean(fl.resolved),
          },
          update: {
            title: fl.title,
            description: fl.description,
            severity: fl.severity || 'medium',
            resolved: Boolean(fl.resolved),
          },
        });
      }
    });

    res.json({
      success: true,
      message: 'Database restored successfully from backup',
      restoredCounts: {
        users: users.length,
        workspaces: workspaces.length,
        events: events.length,
        nodes: nodes.length,
        edges: edges.length,
        checklists: checklists.length,
      },
    });
  } catch (error) {
    console.error('Failed to restore database from backup:', error);
    res.status(500).json({ error: 'Failed to restore database' });
  }
});
