# EventSpace 🌌

> **A spatial, touch-friendly event management platform designed for visual thinkers.**

EventSpace transforms event coordination by combining a freeform spatial canvas with structured event logistics. Designed specifically for self-hosting on **Unraid**, **Docker**, and **Docker Compose** as a **single unified container on port 3000**, it hosts the complete solution in one container:
* **The Web Canvas** (at `/`)
* **The Mobile Companion App** (at `/companion`)
* **The Unified REST API** (at `/api`)

---

## 🌟 Key Features

* **Multi-Tenant Workspace & Security (New in v1.1.0):**
  * **Role-Based Access Control (RBAC):** Assign Admin, Editor, and Viewer permissions. Viewers have strict read-only access (canvas lock).
  * **Event Isolation & Sharing:** Events are completely private to the creator's workspace until explicitly shared with other registered users. 
  * **Secure Authentication:** JWT-based authentication via secure HTTP-only cookies.
* **Spatial Canvas Architecture (`@xyflow/react` v12):**
  * Freeform drag-and-drop node graph with directional connectors and autosaving coordinates.
  * Specialized building block types:
    * `TaskNode`: Checklists, subtasks, priority indicators, and native date picker badges.
    * `ChaserNode`: Vendor liaisons, point-of-contact tracking, and follow-up deadlines.
    * `InfoNode`: Meeting minutes, structured bullet lists, and automatic Excel/Sheets markdown table parsing.
    * `VenueNode`: Dedicated logistics block for Setup/Teardown times, location dropdowns, and facility manager contacts.
    * `PictureNode`: High-resolution floor/stage photo cards with fullscreen lightbox and replace capability.
    * `AudioNode`: Voice recording blocks with waveform player, seekbar, and client-side AI transcription + bullet-point summarization.
    * `VideoNode`: HTML5 video player and auto-parsing YouTube/Vimeo embeds.
* **Global Directories & Overarching Checklists:**
  * **Template & Venue Management:** Dedicated global directories to save, edit, and duplicate event templates and reusable venue profiles.
  * **Resizable Overarching Checklists:** Pinned top-of-screen cards for global departments (FM, AV, CT, Communications). Drag-to-resize heights and `@dnd-kit` powered drag-and-drop reordering.
* **Mobile Companion App (`eventspace-mobile` hosted at `/companion`):**
  * Touch-first mobile web app optimized for smartphones and tablets on the event floor.
  * **Transient 6-Digit Pairing:** Secure, device-specific pairing codes with live 5-minute countdowns.
  * Ultra-compact Quick Capture carousel for instantaneous block creation (including direct camera/video capture).
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

```text
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
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=password123 \
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
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=password123
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

1. Install via Unraid Community Applications.
2. Parameters in the Unraid WebGUI:
   * **WebUI & API Port:** `3000` (hosts `/` and `/companion`)
   * **App Data Path:** `/mnt/user/appdata/eventspace` (mapped to `/app/data`)
   * **Admin Username:** `admin` (or your preferred setup username)
   * **Admin Password:** `password123` (Change immediately upon logging in!)
   * **PUID / PGID:** `99` / `100` (standard Unraid `nobody:users` permissions)
3. Click **Apply**. The container boots, runs database migrations, and automatically seeds the initial admin user and interactive tutorial.

---

## 📱 Mobile Companion Pairing

1. **Access the Companion App:**
   * On your phone or tablet connected to your local network, navigate to:
     `http://<your-server-ip>:3000/companion`
2. **Generate a Pairing Code:**
   * Log into the desktop Web Canvas, open **Settings** (⚙️ gear icon), and navigate to the **Mobile Companion** tab.
   * Click **Generate Pairing Code**. You will receive a unique, transient 6-digit code valid for 5 minutes.
3. **Connect & Pair:**
   * Enter the 6-digit code on your mobile device and tap **Connect & Pair**. The connection is device-specific and can be revoked at any time from the desktop settings.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Unified container port hosting `/` (WebUI), `/companion` (Mobile), and `/api` |
| `NODE_ENV` | `production` | Node runtime environment |
| `DATABASE_URL` | `file:/app/data/eventspace.db` | SQLite database file location |
| `ADMIN_USERNAME` | `admin` | Initial administrator username seeded on first startup |
| `ADMIN_PASSWORD` | `password123` | Initial administrator password seeded on first startup |
| `PUID` | `99` | Container process user ID (Unraid standard: `nobody=99`) |
| `PGID` | `100` | Container process group ID (Unraid standard: `users=100`) |

---

## 🛠️ Local Development

### Repository Structure
```text
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
* Support: [Unraid Community Forums](https://forums.unraid.net/topic/200695-support-eventspace/)
* Donate: [Ko-fi](https://ko-fi.com/donotknock)

---

## 📄 License

MIT © 2026 [donotknock](https://donotknock.app). All rights reserved.
