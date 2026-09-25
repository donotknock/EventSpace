# EventSpace: Unraid Self-Hosted Implementation Plan

## 1. Architecture & Tech Stack
To ensure high performance, touch-friendly iPad operation, and seamless self-hosting on Unraid, EventSpace is structured as a full-stack TypeScript monorepo delivered as a single Docker container.

*   **Frontend:** React 19 + TypeScript (via Vite) + Tailwind CSS
    *   *Canvas Engine:* **`@xyflow/react` (React Flow v12)** — native touch gestures, custom node ports, debounced spatial coordinates synchronization.
    *   *State & Interaction:* Local optimistic state with debounced REST sync for real-time responsiveness without database thrashing.
    *   *Accessibility & Theming:* Dark/Light/High-Contrast themes and OpenDyslexic typography.
*   **Backend:** Node.js 22 LTS + Express + TypeScript
    *   *Database:* SQLite with **WAL mode** via Prisma ORM for robust concurrent performance on Unraid storage.
    *   *Data Persistence:* Single `/app/data` volume mapping with automated schema initialization on first boot.
    *   *System Integration:* Non-root execution with Unraid-standard `PUID`/`PGID` (default 99:100) handling.

---

## 2. Clara's Visual Wireframe Mapping

Based on the original wireframe (`1000059618.jpg`), the user experience comprises four interconnected layers:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR         │ TOP CHECKLIST PANELS                                                │
│  ────────        ├────────────────────────┬─────────────────────┬────────────────────┤ │
│  Filter:         │  Facilities (FM)       │  Audio/Visual (AV)  │  Catering (Sodexo) │ │
│  • By Year       │  [✓] Room booked       │  [✓] Mics tested    │  [ ] Menu locked   │ │
│  • By Dept       │  [ ] Layout confirmed  │  [ ] Projector link │  [ ] Headcount sent│ │
│  • By Term       ├────────────────────────┴─────────────────────┴────────────────────┤ │
│                  │ SPATIAL CANVAS (@xyflow/react)                                     │
│  Event List:     │                                                    ┌─────────────┐│ │
│  • Event A (Red) │   ┌──────────────────────┐                         │FRICTION LOG ││ │
│  • Event B (Yel) │   │ [AV + FM Bubble]     │                         │(Pull-out)   ││ │
│  • Event C (Grn) │   │ - Emailed vendor     │   ───► (Orange arrow)   │             ││ │
│                  │   │ - Waiting for answer │                         │• Escalations││ │
│                  │   │ - Send form by [DATE]│                         │• Blockers   ││ │
│                  │   │ ──────────────────── │                         │             ││ │
│                  │   │ [ ] To do task 1     │                         └─────────────┘│ │
│                  │   │ [ ] To do task 2     │                                        │ │
│                  │   └──────────────────────┘                                        │ │
│                  │               ▲                                                   │ │
│                  │               │ (Connector)                                       │ │
│                  │   ┌───────────────────────────────┐                               │ │
│                  │   │ [Date / Meeting Notes Bubble] │                               │ │
│                  │   │ - Initial briefing notes      │                               │ │
│                  │   └───────────────────────────────┘                               │ │
└──────────────────┴───────────────────────────────────────────────────────────────────┘
```

1. **Left Navigation Rail:**
   - Multi-dimensional filtering (Year, Department, Term).
   - Traffic light priority status indicators (High: Red, Medium: Yellow, Low: Green).
   - Event creation, archive, and mute toggles.
2. **Top Fixed Overarching Checklists:**
   - Dedicated category cards pinned at the top: Facilities Management (FM), Audio/Visual (AV), and Catering (Sodexo/Custom).
   - Instant checkbox toggles synced live with the database.
3. **Freeform Spatial Canvas:**
   - Drag-and-drop bubbles with custom node types:
     - `TaskNode` / `ChaserNode`: Notes, highlighted due-date pills, follow-up status, and embedded actionable checklist items.
     - `InfoNode` / `NoteNode`: Meeting minutes, briefings, liaison contact details.
   - Smooth curved connectors (edges) with directional arrows.
   - Viewport position and zoom level persistent per event.
4. **Slide-Out Friction Log (Right Pull-Out Drawer):**
   - Quick-access tab on the right edge to record difficulties, blockers, and vendor delays.
   - Severity tags (Low, Medium, Critical) and resolution tracking.
5. **Master Tasks Modal:**
   - Global bird's-eye view aggregating all tasks across all events, filterable by due date and status.

---

## 3. Database Schema (Prisma)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Event {
  id           String          @id @default(uuid())
  title        String
  department   String?
  term         String?
  year         String?
  priority     String          @default("med") // "high", "med", "low"
  isMuted      Boolean         @default(false)
  
  // Persistent canvas viewport
  viewportX    Float           @default(0)
  viewportY    Float           @default(0)
  viewportZoom Float           @default(1)
  
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  nodes        CanvasNode[]
  edges        CanvasEdge[]
  checklists   ChecklistItem[]
  frictionLogs FrictionLog[]
}

model CanvasNode {
  id           String      @id @default(uuid())
  eventId      String
  type         String      // "task", "info", "chaser", "note"
  xPosition    Float
  yPosition    Float
  title        String
  content      String?
  isCompleted  Boolean     @default(false)
  dueDate      DateTime?
  assignee     String?
  priority     String?     // "high", "med", "low"
  metadata     String?     // JSON string for checklists, bullet points, tags
  
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  event        Event       @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
}

model CanvasEdge {
  id           String   @id @default(uuid())
  eventId      String
  sourceId     String
  targetId     String
  sourceHandle String?
  targetHandle String?
  type         String?  @default("smoothstep")
  animated     Boolean  @default(false)
  label        String?

  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
}

model ChecklistItem {
  id          String   @id @default(uuid())
  eventId     String
  category    String   // "FM", "AV", "Sodexo" (or custom)
  content     String
  isCompleted Boolean  @default(false)
  order       Int      @default(0)

  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
}

model FrictionLog {
  id          String   @id @default(uuid())
  eventId     String
  title       String
  description String?
  severity    String   @default("medium") // "low", "medium", "critical"
  resolved    Boolean  @default(false)
  createdAt   DateTime @default(now())

  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
}
```

---

## 4. Production Docker & Unraid Configuration

### `Dockerfile`
- Multi-stage build (Node 22 LTS Alpine).
- Injects `openssl libc6-compat su-exec` to support Prisma engine binaries and non-root execution.
- Bundles built frontend SPA directly into Express static asset hosting.

### `docker-entrypoint.sh`
- Automatic `PUID` and `PGID` adoption (defaulting to 99:100 for Unraid `nobody:users`).
- Automatic database migration sync (`npx prisma db push --skip-generate`) on container launch.
- SQLite WAL journal mode activation.

---

## 5. Development Phases

- [x] **Phase 0:** Plan Review & Architecture Audit
- [ ] **Phase 1:** Project Scaffolding & Backend API (TypeScript, Prisma, Express, WAL SQLite, Seeds, Docker Entrypoint)
- [ ] **Phase 2:** Core Shell, Navigation & Theming (Left Sidebar, Filters, High-Contrast/Dyslexia fonts, Dark/Light modes)
- [ ] **Phase 3:** Spatial Canvas Engine (`@xyflow/react` v12, Custom Nodes matching Clara's sketch, Connectors, Debounced Auto-sync)
- [ ] **Phase 4:** Overarching Panels & Friction Log (Top FM/AV/Sodexo cards, Right Drawer Friction Log, Master Tasks Modal)
- [ ] **Phase 5:** Production Packaging & Unraid CA Verification