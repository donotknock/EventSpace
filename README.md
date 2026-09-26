# EventSpace 🌌

> **A spatial, touch-friendly event management platform designed for visual thinkers.**

EventSpace transforms event coordination by combining a freeform spatial canvas with structured event logistics. Designed specifically for self-hosting on **Unraid**, **Docker**, and **Docker Compose** as a **single unified container on port 3000**, it hosts the complete solution in one container:
* **The Web Canvas** (at `/`)
* **The Mobile Companion App** (at `/companion`)
* **The Unified REST API** (at `/api`)

---

## 🌟 Key Features

* **Spatial Canvas Architecture (`@xyflow/react` v12):**
  * Freeform drag-and-drop node graph with directional connectors and autosaving coordinates.
  * Specialized building block types:
    * `TaskNode`: Checklists, subtasks, priority indicators, and native date picker badges.
    * `ChaserNode`: Vendor liaisons, point-of-contact tracking, and follow-up deadlines.
    * `InfoNode`: Meeting minutes, briefings, and structured bullet lists.
    * `NoteNode`: Flexible text scratchpads and reference notes.
    * `PictureNode`: High-resolution floor/stage photo cards with fullscreen lightbox and replace capability.
    * `AudioNode`: Voice recording blocks with waveform player, seekbar, and client-side AI transcription + bullet-point summarization.
  * Persistent canvas viewport (pan position and zoom scale) saved automatically per event.
  * Context menu: Right-click anywhere on the empty canvas to spawn any building block.
* **Overarching Fixed Department Checklists:**
  * Pinned top-of-screen cards for **Facilities Management (FM)**, **Audio/Visual (AV)**, and **Catering (CT)**.
  * Real-time checkbox state synchronization backed by SQLite.
  * Collapsible container to maximize canvas workspace.
* **Slide-Out Friction Log (Right Pull-Out Drawer):**
  * Dedicated drawer to record, triage, and resolve event bottlenecks, vendor delays, and equipment issues.
* **Multi-Dimensional Navigation Rail:**
  * Filter events across **Year**, **Department**, and **Term**.
  * Traffic-light priority status indicators (High: Red, Medium: Yellow, Low: Green).
  * Quick event muting, archiving, and soft-delete trash bin with full restore support.
* **Master Tasks Aggregation Modal:**
  * Global cross-event view of all pending tasks and checklist items sorted by due date and urgency.
* **Accessibility & Personalization:**
  * Native **OpenDyslexic** typography toggle ("T" button in navigation bar).
  * High-contrast mode and system dark/light theme switching.
* **Mobile Companion App (`eventspace-mobile` hosted at `/companion`):**
  * Touch-first mobile web app optimized for smartphones and tablets on the event floor.
  * Ultra-compact Quick Capture carousel with centered cards for instantaneous block creation.
  * Direct device camera integration for floor photo capture into canvas Picture blocks.
  * In-browser voice recording with offline AI whisper transcription and bullet-point summaries.
  * "Web Canvas" deep link that dynamically jumps straight to the active event on the main desktop canvas.

---

## 🏗️ True Single-Container Deployment (Port 3000)

EventSpace builds both Vite apps into a single production Docker image. The internal Express engine serves everything seamlessly on port 3000:

| Path | Destination | Description |
| :--- | :--- | :--- |
| **`/`** | **Web Canvas** | Full desktop spatial dashboard and event workspace |
| **`/companion`** | **Mobile Companion** | Lightweight, touch-first mobile app for floor management |
| **`/mobile`** | **Mobile Redirect** | Convenience alias redirecting directly to `/companion/` |
| **`/api/*`** | **REST API** | Unified backend routes backed by SQLite in WAL mode |

```
┌─────────────────────────────────────────────────────────────────┐
│              EventSpace Unified Container (:3000)               │
│                                                                 │
│   Desktop Browser ────────► http://<host>:3000/                 │
│                                (Main Web Canvas)                │
│                                                                 │
│   Mobile Phone / Tablet ──► http://<host>:3000/companion        │
│                                (Mobile Companion App)           │
│                                                                 │
│   Companion API Sync ─────► http://<host>:3000/api/*            │
│                                (Express + Prisma + SQLite)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🐳 Quick Start with Docker

### Run with Docker CLI
```bash
docker run -d \
  --name eventspace \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /path/to/host/data:/app/data \
  -e PUID=99 \
  -e PGID=100 \
  -e COMPANION_PIN=EVSP-9482 \
  donotknock/eventspace:latest
```

* Open the **Web Canvas**: `http://<your-host-ip>:3000/`
* Open the **Mobile Companion**: `http://<your-host-ip>:3000/companion/`

---

## 🐙 Docker Compose Setup

Create a `docker-compose.yml` file:

```yaml
services:
  eventspace:
    image: donotknock/eventspace:latest
    container_name: eventspace
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - PUID=99
      - PGID=100
      - COMPANION_PIN=EVSP-9482
      - DATABASE_URL=file:/app/data/eventspace.db
    volumes:
      - ./data:/app/data
```

Start the container:
```bash
docker compose up -d
```

---

## 🖥️ Unraid Community Apps Deployment

EventSpace includes a pre-configured Unraid XML template (`eventspace.xml`):

1. Install via Unraid Community Applications (or copy `eventspace.xml` to `/boot/config/plugins/dockerMan/templates-user/eventspace.xml`).
2. Parameters in the Unraid WebGUI:
   * **WebUI & API Port:** `3000` (hosts `/` and `/companion`)
   * **App Data Path:** `/mnt/user/appdata/eventspace` (mapped to `/app/data`)
   * **Mobile Companion PIN:** `EVSP-9482` (or your chosen security PIN)
   * **PUID / PGID:** `99` / `100` (standard Unraid `nobody:users` permissions)
3. Click **Apply**. The container boots, runs database migrations, and automatically seeds the interactive tutorial onboarding event on first startup.

---

## 📱 Mobile Companion Pairing

1. **Access the Companion App:**
   * On your phone or tablet connected to your local network, navigate to:
     `http://<your-server-ip>:3000/companion`
   * The server URL automatically defaults to your current address (`http://<your-server-ip>:3000`).
2. **Enter Your Pairing PIN:**
   * In the desktop Web Canvas, click the **Settings** (⚙️ gear icon) in the header to view your Mobile Companion PIN (default: `EVSP-9482`).
   * Enter the PIN on your mobile device and tap **Connect & Pair**.
3. **Features on the Floor:**
   * **Quick Capture:** Tap **Task**, **Chaser**, **Info**, **Audio**, or **Picture** in the centered carousel to instantly log items into the active event.
   * **Floor Photos:** Tap **Picture** to open your mobile camera and snap staging, seating, or catering photos directly into the canvas.
   * **Voice Memos:** Tap **Audio** to record voice briefings. The app transcribes the recording and extracts bulleted action points.
   * **Web Canvas Deep Link:** Tap **Web Canvas** in the event view header to open the desktop canvas focused directly on that event.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Unified container port hosting `/` (WebUI), `/companion` (Mobile), and `/api` |
| `NODE_ENV` | `production` | Node runtime environment |
| `DATABASE_URL` | `file:/app/data/eventspace.db` | SQLite database file location |
| `COMPANION_PIN` | `EVSP-9482` | Verification PIN required to pair mobile devices |
| `PUID` | `99` | Container process user ID (Unraid standard: `nobody=99`) |
| `PGID` | `100` | Container process group ID (Unraid standard: `users=100`) |

---

## 🛠️ Local Development

### Repository Structure
```
EventSpace/
├── backend/            # Express REST API, Prisma ORM, SQLite DB
├── frontend/           # Vite + React 19 spatial canvas WebUI (root /)
├── eventspace-mobile/  # Mobile companion web app (/companion)
├── Dockerfile          # Multi-stage production container build (both apps)
├── docker-compose.yml  # Docker Compose service definition
└── eventspace.xml      # Unraid Community Applications template
```

### Running Locally
```bash
# 1. Start the unified backend API server
cd EventSpace/backend
npm install
npm run prisma:push
npm run seed             # Generates tutorial onboarding event
npm run dev              # Listens on http://localhost:3001

# 2. Start the desktop web frontend (with API proxy to 3001)
cd ../frontend
npm install
npm run dev              # Runs on http://localhost:5173

# 3. Start the mobile companion app
cd ../eventspace-mobile
npm install
npm run dev              # Runs on http://localhost:5174
```

---

## 👨‍💻 Author & Project

Created and maintained by **[donotknock](https://donotknock.app)**.

* Website: [donotknock.app](https://donotknock.app)
* GitHub: [@donotknock](https://github.com/donotknock)

---

## 📄 License

MIT © 2026 [donotknock](https://donotknock.app). All rights reserved.
