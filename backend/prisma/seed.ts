import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

/**
 * Resolves the EventSpace icon as a base64 data URL
 */
function getIconBase64(): string {
  const candidatePaths = [
    path.join(__dirname, '../../Resources/EventSpace-Icon-Lightmode.png'),
    path.join(__dirname, '../Resources/EventSpace-Icon-Lightmode.png'),
    path.join(__dirname, '../../../Resources/EventSpace-Icon-Lightmode.png'),
    path.join(__dirname, '../public/EventSpace-Icon-Lightmode.png'),
    path.join(__dirname, '../../frontend/public/EventSpace-Icon-Lightmode.png'),
    path.join(process.cwd(), 'Resources/EventSpace-Icon-Lightmode.png'),
    path.join(process.cwd(), '../Resources/EventSpace-Icon-Lightmode.png'),
    '/app/Resources/EventSpace-Icon-Lightmode.png',
    '/app/public/EventSpace-Icon-Lightmode.png',
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const buffer = fs.readFileSync(candidate);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.warn(`[Seed] Failed reading icon from ${candidate}:`, err);
      }
    }
  }

  // Fallback placeholder if asset cannot be read from disk
  return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%234f46e5" rx="32"/><text x="100" y="115" font-family="sans-serif" font-size="28" fill="white" font-weight="bold" text-anchor="middle">EventSpace</text></svg>';
}

async function main() {
  const isIfEmptyMode = process.argv.includes('--if-empty');

  if (isIfEmptyMode) {
    const existingEventsCount = await prisma.event.count();
    if (existingEventsCount > 0) {
      console.log(`[Seed] Database already contains ${existingEventsCount} event(s). Skipping seed.`);
      return;
    }
  }

  console.log('[Seed] Wiping existing data (events, blocks, edges, checklists, friction logs)...');
  await prisma.frictionLog.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.canvasEdge.deleteMany();
  await prisma.canvasNode.deleteMany();
  await prisma.event.deleteMany();

  console.log('[Seed] Generating "Welcome to EventSpace" tutorial onboarding event...');

  const iconDataUrl = getIconBase64();

  // Create Onboarding Event
  const onboardingEvent = await prisma.event.create({
    data: {
      title: 'Welcome to EventSpace',
      department: 'Orientation',
      term: 'Tutorial',
      year: '2026',
      priority: 'high',
      isMuted: false,
      viewportX: 0,
      viewportY: 0,
      viewportZoom: 0.95,
      checklists: {
        create: [
          {
            category: 'FM',
            content: 'Inspect main hall setup & confirm emergency exits',
            isCompleted: true,
            order: 0,
          },
          {
            category: 'FM',
            content: 'Confirm table layout, stage risers and power drops',
            isCompleted: false,
            order: 1,
          },
          {
            category: 'AV',
            content: 'Calibrate main 4K projection screens & audio monitors',
            isCompleted: true,
            order: 2,
          },
          {
            category: 'AV',
            content: 'Test dual wireless lapel mics and backup handhelds',
            isCompleted: false,
            order: 3,
          },
          {
            category: 'CT',
            content: 'Lock in attendee dietary counts (vegan, halal, gluten-free)',
            isCompleted: true,
            order: 4,
          },
          {
            category: 'CT',
            content: 'Schedule mid-morning coffee refills & water stations',
            isCompleted: false,
            order: 5,
          },
        ],
      },
      frictionLogs: {
        create: [
          {
            title: 'Projector HDMI Handshake (Resolved)',
            description:
              'Stage display required 4 seconds to sync. Replaced with certified HDMI 2.1 cable and resolved before start.',
            severity: 'low',
            resolved: true,
          },
        ],
      },
    },
  });

  // Central Hub: PictureNode with EventSpace icon
  const centralPictureNode = await prisma.canvasNode.create({
    data: {
      eventId: onboardingEvent.id,
      type: 'picture',
      title: 'Welcome to EventSpace',
      xPosition: 480,
      yPosition: 280,
      content: iconDataUrl,
      isCompleted: false,
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({
        caption: 'A spatial event management dashboard for visual thinkers.',
        isCentralHub: true,
      }),
    },
  });

  // 1. Info Block (Top): Schedule/Agenda view and overarching checklists
  const infoNode = await prisma.canvasNode.create({
    data: {
      eventId: onboardingEvent.id,
      type: 'info',
      title: 'Schedule & Department Checklists',
      xPosition: 480,
      yPosition: -40,
      content:
        '• Pinned Overarching Checklists at the top track Facilities (FM), AV, and Catering in real time.\n• Click "Schedule" in the header to view time-sequenced milestones and due dates.\n• Tap the collapse arrow on the checklist container anytime to maximize canvas workspace.',
      isCompleted: false,
      priority: 'med',
      metadata: JSON.stringify({
        bullets: [
          'Pinned Overarching Checklists track Facilities, AV & Catering',
          'Open Schedule/Agenda view for time-sequenced milestones',
          'Collapse the checklist container anytime to maximize your canvas focus',
        ],
      }),
    },
  });

  // 2. Note Block (Left): "T" button (OpenDyslexic font) and theme toggles
  const noteNode = await prisma.canvasNode.create({
    data: {
      eventId: onboardingEvent.id,
      type: 'note',
      title: 'Themes & OpenDyslexic Typography',
      xPosition: 40,
      yPosition: 280,
      content:
        '• Click the "T" button in the top navigation bar to toggle OpenDyslexic typography.\n• Click the Theme icon to switch between Dark, Light, and High-Contrast modes.\n• Canvas viewport pan position and zoom scale are auto-saved per event.',
      isCompleted: false,
      priority: 'med',
      metadata: JSON.stringify({
        bullets: [
          'Click the "T" button in the header to enable OpenDyslexic font',
          'Toggle between Dark, Light, and High-Contrast color themes',
          'Viewport coordinates and zoom levels persist automatically per event',
        ],
      }),
    },
  });

  // 3. Chaser Block (Right): Connecting Mobile Companion app via Settings gear
  const chaserNode = await prisma.canvasNode.create({
    data: {
      eventId: onboardingEvent.id,
      type: 'chaser',
      title: 'Mobile Companion App Pairing',
      xPosition: 960,
      yPosition: 280,
      content:
        '• Click the Settings ⚙️ gear icon in the top header to view your Mobile Companion PIN.\n• Open eventspace-mobile on your phone or tablet and enter this server\'s URL and PIN.\n• Snap floor photos directly into Picture blocks, record AI voice memos, and manage blocks on the move.',
      isCompleted: false,
      priority: 'high',
      assignee: 'Mobile App',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({
        bullets: [
          'Open Settings ⚙️ in the web header to view the Mobile Companion PIN',
          'Enter server URL and PIN on mobile to pair instantly',
          'Quick capture floor photos, record voice notes, and track blocks on the move',
        ],
      }),
    },
  });

  // 4. Task Block (Bottom): Using checkboxes, subtasks, and right-click menu
  const taskNode = await prisma.canvasNode.create({
    data: {
      eventId: onboardingEvent.id,
      type: 'task',
      title: 'Canvas Controls & Interactive Blocks',
      xPosition: 480,
      yPosition: 660,
      content:
        '• Right-click anywhere on the empty canvas to spawn new building blocks.\n• Drag connector handles between blocks to visualize dependencies.\n• Use checkboxes and subtasks below to track immediate progress.',
      isCompleted: false,
      priority: 'high',
      assignee: 'You (Event Lead)',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({
        bullets: [
          'Right-click empty canvas to spawn Task, Chaser, Info, Note, Audio, or Picture blocks',
          'Connect handles between blocks to visualize dependencies',
          'Double-click titles to rename or click calendar pills to adjust due dates',
        ],
        subtasks: [
          {
            id: 'st1',
            label: 'Right-click canvas to create your first custom block',
            done: false,
          },
          {
            id: 'st2',
            label: 'Try toggling dark mode or OpenDyslexic typography (T)',
            done: true,
          },
          {
            id: 'st3',
            label: 'Pair the Mobile Companion app via Settings gear',
            done: false,
          },
          {
            id: 'st4',
            label: 'Archive or move this tutorial event to Trash when ready',
            done: false,
          },
        ],
      }),
    },
  });

  // Surrounding Edges connecting outward from Central Picture Block
  await prisma.canvasEdge.createMany({
    data: [
      {
        eventId: onboardingEvent.id,
        sourceId: centralPictureNode.id,
        targetId: infoNode.id,
        type: 'smoothstep',
        animated: true,
        label: 'Checklists & Schedule',
      },
      {
        eventId: onboardingEvent.id,
        sourceId: centralPictureNode.id,
        targetId: noteNode.id,
        type: 'smoothstep',
        animated: true,
        label: 'Typography & Themes',
      },
      {
        eventId: onboardingEvent.id,
        sourceId: centralPictureNode.id,
        targetId: chaserNode.id,
        type: 'smoothstep',
        animated: true,
        label: 'Mobile Companion',
      },
      {
        eventId: onboardingEvent.id,
        sourceId: centralPictureNode.id,
        targetId: taskNode.id,
        type: 'smoothstep',
        animated: true,
        label: 'Interactive Controls',
      },
    ],
  });

  console.log('[Seed] Tutorial onboarding event generated successfully!');
  console.log(`[Seed] Event ID: ${onboardingEvent.id} ("${onboardingEvent.title}")`);
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
