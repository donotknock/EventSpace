import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase } from './db.js';
import { eventsRouter } from './routes/events.js';
import { nodesRouter } from './routes/nodes.js';
import { edgesRouter } from './routes/edges.js';
import { checklistsRouter } from './routes/checklists.js';
import { frictionLogsRouter } from './routes/frictionLogs.js';
import { tasksRouter } from './routes/tasks.js';
import { contactsRouter } from './routes/contacts.js';
import { trashRouter } from './routes/trash.js';

import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Range'],
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EventSpace API', timestamp: new Date().toISOString() });
});

// Mobile Companion App Pairing Verification
app.post('/api/companion/pair', (req, res) => {
  const { pin, serverUrl } = req.body || {};
  const validPin = process.env.COMPANION_PIN || 'EVSP-9482';
  
  if (!pin || pin.toUpperCase().trim() !== validPin.toUpperCase()) {
    return res.status(401).json({
      success: false,
      error: 'Invalid pairing PIN. Check the Web App Settings > Mobile Companion App tab.',
    });
  }

  res.json({
    success: true,
    pairedAt: new Date().toISOString(),
    service: 'EventSpace Mobile Companion API',
    version: '1.0.0',
    serverUrl: serverUrl || `http://localhost:${PORT}`,
  });
});

app.use('/api/events', eventsRouter);
app.use('/api/events/:eventId/nodes', nodesRouter);
app.use('/api/events/:eventId/edges', edgesRouter);
app.use('/api/events/:eventId/checklists', checklistsRouter);
app.use('/api/events/:eventId/friction-logs', frictionLogsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/contacts', contactsRouter);
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

// Boot Server
async function start() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`[EventSpace] Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[EventSpace] Failed to start server:', err);
  process.exit(1);
});
