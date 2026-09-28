import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { initializeDatabase, prisma } from './db.js';
import { authRouter } from './routes/auth.js';
import { workspacesRouter } from './routes/workspaces.js';
import { pairingRouter } from './routes/pairing.js';
import { eventsRouter } from './routes/events.js';
import { nodesRouter } from './routes/nodes.js';
import { edgesRouter } from './routes/edges.js';
import { checklistsRouter } from './routes/checklists.js';
import { frictionLogsRouter } from './routes/frictionLogs.js';
import { tasksRouter } from './routes/tasks.js';
import { contactsRouter } from './routes/contacts.js';
import { trashRouter } from './routes/trash.js';
import { venuesRouter } from './routes/venues.js';

import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Workspace-Id'],
    exposedHeaders: ['Content-Length', 'Content-Range'],
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EventSpace API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspacesRouter);

app.use('/api', pairingRouter);

app.use('/api/events', eventsRouter);
app.use('/api/events/:eventId/nodes', nodesRouter);
app.use('/api/events/:eventId/edges', edgesRouter);
app.use('/api/events/:eventId/checklists', checklistsRouter);
app.use('/api/events/:eventId/friction-logs', frictionLogsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/trash', trashRouter);

// Production Static Companion App Serving (at /companion and /mobile)
const candidateCompanionPaths = [
  path.join(__dirname, '../public/companion'),             // Docker /app/public/companion
  path.join(__dirname, '../../../eventspace-mobile/dist'),  // Root workspace compiled mobile dist
  path.join(__dirname, '../../eventspace-mobile/dist'),    // Sub-repo compiled mobile dist
  path.join(__dirname, '../eventspace-mobile/dist'),
  path.join(process.cwd(), 'public/companion'),
  path.join(process.cwd(), '../eventspace-mobile/dist'),
  path.join(process.cwd(), '../../eventspace-mobile/dist'),
];
const companionPath = candidateCompanionPaths.find((p) => fs.existsSync(p)) || path.join(__dirname, '../public/companion');

app.get(/^\/(companion|mobile)$/, (req, res) => res.redirect(301, '/companion/'));
app.use('/companion', express.static(companionPath));
app.use('/mobile', express.static(companionPath));

// Fallback for Companion SPA client-side routes under /companion/* or /mobile/*
app.get(['/companion/*', '/mobile/*'], (req, res) => {
  const indexCompanion = path.join(companionPath, 'index.html');
  if (fs.existsSync(indexCompanion)) {
    return res.sendFile(indexCompanion);
  }
  res.status(404).send('EventSpace Mobile Companion build not found.');
});

// Production Static Desktop WebUI Serving (at root /)
const candidatePublicPaths = [
  path.join(__dirname, '../public'),             // Docker /app/public
  path.join(__dirname, '../../frontend/dist'),   // Monorepo compiled frontend dist
  path.join(__dirname, '../frontend/dist'),
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), '../frontend/dist'),
];
const publicPath = candidatePublicPaths.find((p) => fs.existsSync(p)) || path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Fallback to React index.html for client-side routing in Desktop SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).send('EventSpace API is operational. Build frontend to view WebUI.');
});

async function seedAdminUserIfEmpty() {
  try {
    // Strictly skip Docker ENV setup if ANY user already exists in the database
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return;
    }

    const adminUsername = process.env.ADMIN_USERNAME?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.log('[EventSpace] No ADMIN_USERNAME / ADMIN_PASSWORD configured. Skipping auto-seed.');
      return;
    }

    console.log(`[EventSpace] No users found in database. Auto-seeding initial admin: ${adminUsername}...`);
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
        username: adminUsername.toLowerCase(),
        passwordHash,
        name: 'System Administrator',
        role: 'admin',
      },
    });

    const defaultWorkspace = await prisma.workspace.create({
      data: {
        name: 'Main Workspace',
        members: {
          create: {
            userId: adminUser.id,
            role: 'owner',
          },
        },
      },
    });

    // Backfill any existing orphan events, nodes, and checklists to this default workspace
    await prisma.event.updateMany({
      where: { workspaceId: null },
      data: { workspaceId: defaultWorkspace.id },
    });

    await prisma.canvasNode.updateMany({
      where: { workspaceId: null },
      data: { workspaceId: defaultWorkspace.id },
    });

    await prisma.checklistItem.updateMany({
      where: { workspaceId: null },
      data: { workspaceId: defaultWorkspace.id },
    });

    console.log(`[EventSpace] Initial admin user and default workspace seeded successfully.`);
  } catch (error) {
    console.error('[EventSpace] Failed to seed initial admin user:', error);
  }
}

// Boot Server
async function start() {
  await initializeDatabase();
  await seedAdminUserIfEmpty();
  app.listen(PORT, () => {
    console.log(`[EventSpace] Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[EventSpace] Failed to start server:', err);
  process.exit(1);
});
