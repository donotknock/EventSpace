import { EventItem, FullEventDetails, MasterTasksResponse, ChecklistItemData, Contact, FrictionLogItem, CanvasNodeItem, Venue } from '../types';

const BASE_URL = '/api';

let activeWorkspaceId: string | null = localStorage.getItem('eventspace_active_workspace_id');

export const api = {
  // Workspace management
  getActiveWorkspaceId(): string | null {
    return activeWorkspaceId;
  },

  setActiveWorkspaceId(id: string | null) {
    activeWorkspaceId = id;
    if (id) {
      localStorage.setItem('eventspace_active_workspace_id', id);
    } else {
      localStorage.removeItem('eventspace_active_workspace_id');
    }
  },

  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (activeWorkspaceId && !headers.has('X-Workspace-Id')) {
      headers.set('X-Workspace-Id', activeWorkspaceId);
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Automatically send HTTP-only cookies
    });
  },

  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; user: any; workspaces: any[]; token?: string }> {
    const res = await this.request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    if (data.workspaces && data.workspaces.length > 0 && !activeWorkspaceId) {
      this.setActiveWorkspaceId(data.workspaces[0].id);
    }
    return data;
  },

  async logout(): Promise<void> {
    await this.request(`${BASE_URL}/auth/logout`, { method: 'POST' });
    this.setActiveWorkspaceId(null);
  },

  async getMe(): Promise<{ user: any; workspaces: any[] }> {
    const res = await this.request(`${BASE_URL}/auth/me`);
    if (!res.ok) throw new Error('Unauthenticated');
    const data = await res.json();
    if (data.workspaces && data.workspaces.length > 0) {
      const valid = data.workspaces.some((w: any) => w.id === activeWorkspaceId);
      if (!valid || !activeWorkspaceId) {
        this.setActiveWorkspaceId(data.workspaces[0].id);
      }
    }
    return data;
  },

  async createUser(data: { username: string; password: string; name?: string; role?: string; workspaceId?: string }): Promise<any> {
    const res = await this.request(`${BASE_URL}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  async getUsers(): Promise<any[]> {
    const res = await this.request(`${BASE_URL}/auth/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async deleteUser(id: string): Promise<any> {
    const res = await this.request(`${BASE_URL}/auth/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to remove user');
    }
    return res.json();
  },

  async changePassword(
    currentPasswordOrData: string | { currentPassword: string; newPassword: string },
    maybeNewPassword?: string
  ): Promise<any> {
    const payload =
      typeof currentPasswordOrData === 'string'
        ? { currentPassword: currentPasswordOrData, newPassword: maybeNewPassword || '' }
        : currentPasswordOrData;
    const res = await this.request(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update password');
    }
    return res.json();
  },

  // Workspaces
  async getWorkspaces(): Promise<any[]> {
    const res = await this.request(`${BASE_URL}/workspaces`);
    if (!res.ok) throw new Error('Failed to fetch workspaces');
    return res.json();
  },

  async createWorkspace(name: string): Promise<any> {
    const res = await this.request(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create workspace');
    return res.json();
  },

  // Companion Pairing Code & Devices
  async generatePairingCode(deviceName?: string): Promise<{
    success: boolean;
    code: string;
    deviceName?: string;
    expiresAt: string;
    expiresInSeconds: number;
  }> {
    const res = await this.request(`${BASE_URL}/companion/generate-pairing-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate pairing code');
    }
    return res.json();
  },

  async getCompanionDevices(): Promise<Array<{
    id: string;
    code: string;
    deviceName?: string | null;
    used: boolean;
    expiresAt: string;
    createdAt: string;
  }>> {
    const res = await this.request(`${BASE_URL}/companion/devices`);
    if (!res.ok) throw new Error('Failed to fetch paired devices');
    return res.json();
  },

  async deleteCompanionDevice(id: string): Promise<any> {
    const res = await this.request(`${BASE_URL}/companion/devices/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to revoke device pairing');
    return res.json();
  },

  // Event Sharing
  async getEventShares(eventId: string): Promise<any[]> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/shares`);
    if (!res.ok) throw new Error('Failed to fetch event shares');
    return res.json();
  },

  async shareEvent(
    eventId: string,
    data: { username?: string; userId?: string; role?: 'editor' | 'viewer' }
  ): Promise<any> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to share event');
    }
    return res.json();
  },

  async updateEventShareRole(
    eventId: string,
    userId: string,
    role: 'editor' | 'viewer'
  ): Promise<any> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/shares/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update share role');
    }
    return res.json();
  },

  async removeEventShare(eventId: string, userId: string): Promise<any> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/shares/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove event share');
    return res.json();
  },

  async leaveEvent(eventId: string): Promise<any> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/leave`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to leave event');
    }
    return res.json();
  },

  // Events
  async getEvents(params?: {
    search?: string;
    year?: string;
    department?: string;
    term?: string;
    priority?: string;
    isTemplate?: boolean | string;
  }): Promise<EventItem[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) searchParams.append(key, String(val));
      });
    }
    const res = await this.request(`${BASE_URL}/events?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getEventById(id: string): Promise<FullEventDetails> {
    const res = await this.request(`${BASE_URL}/events/${id}`);
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
  },

  async createEvent(data: {
    title: string;
    department?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    term?: string | null;
    year?: string | null;
    priority?: import('../types').Priority | null;
    contactIds?: string[];
  }): Promise<EventItem> {
    const res = await this.request(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  async updateEvent(
    id: string,
    data: Partial<EventItem> & { contactIds?: string[]; startTime?: string | null; endTime?: string | null }
  ): Promise<EventItem> {
    const res = await this.request(`${BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
  },

  async updateViewport(
    id: string,
    data: { viewportX: number; viewportY: number; viewportZoom: number }
  ): Promise<{ id: string; viewportX: number; viewportY: number; viewportZoom: number }> {
    const res = await this.request(`${BASE_URL}/events/${id}/viewport`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update viewport');
    return res.json();
  },

  async duplicateEvent(
    id: string,
    data: {
      title?: string;
      department?: string;
      startDate?: string;
      endDate?: string;
      priority?: import('../types').Priority | null;
    }
  ): Promise<FullEventDetails> {
    const res = await this.request(`${BASE_URL}/events/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to duplicate event');
    return res.json();
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await this.request(`${BASE_URL}/events/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete event');
  },

  async saveAsTemplate(id: string, title?: string): Promise<FullEventDetails> {
    const res = await this.request(`${BASE_URL}/events/${id}/save-as-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to save as template');
    return res.json();
  },

  async getTemplates(): Promise<EventItem[]> {
    const res = await this.request(`${BASE_URL}/events?isTemplate=true`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  // Checklists
  async createChecklistItem(
    eventId: string,
    data: { category: string; content: string; order?: number }
  ): Promise<ChecklistItemData> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create checklist item');
    return res.json();
  },

  async updateChecklistItem(
    eventId: string,
    id: string,
    data: Partial<ChecklistItemData>
  ): Promise<ChecklistItemData> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/checklists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update checklist item');
    return res.json();
  },

  async deleteChecklistItem(eventId: string, id: string): Promise<void> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/checklists/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete checklist item');
  },

  async toggleChecklist(eventId: string, id: string, isCompleted: boolean): Promise<ChecklistItemData> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/checklists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted }),
    });
    if (!res.ok) throw new Error('Failed to update checklist item');
    return res.json();
  },

  // Friction Logs
  async createFrictionLog(
    eventId: string,
    data: { title: string; description?: string; severity: string; resolved?: boolean }
  ): Promise<FrictionLogItem> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/friction-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create friction log');
    return res.json();
  },

  async updateFrictionLog(
    eventId: string,
    id: string,
    data: Partial<FrictionLogItem>
  ): Promise<FrictionLogItem> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/friction-logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update friction log');
    return res.json();
  },

  async deleteFrictionLog(eventId: string, id: string): Promise<void> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/friction-logs/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete friction log');
  },

  // Nodes (Building Blocks)
  async createNode(eventId: string, data: Partial<CanvasNodeItem>): Promise<CanvasNodeItem> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create node');
    return res.json();
  },

  async updateNode(eventId: string, id: string, data: Partial<CanvasNodeItem>): Promise<CanvasNodeItem> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/nodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update node');
    return res.json();
  },

  async deleteNode(eventId: string, id: string): Promise<void> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/nodes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete node');
  },

  async batchUpdatePositions(
    eventId: string,
    positions: { id: string; xPosition: number; yPosition: number }[]
  ): Promise<void> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/nodes/batch/positions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions }),
    });
    if (!res.ok) throw new Error('Failed to update batch positions');
  },

  // Edges (Connectors)
  async createEdge(eventId: string, data: Partial<import('../types').CanvasEdgeItem>): Promise<import('../types').CanvasEdgeItem> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create edge');
    return res.json();
  },

  async deleteEdge(eventId: string, id: string): Promise<void> {
    const res = await this.request(`${BASE_URL}/events/${eventId}/edges/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete edge');
  },

  // Master Tasks & Agenda
  async getMasterTasks(includeCompleted = false): Promise<MasterTasksResponse> {
    const res = await this.request(`${BASE_URL}/tasks/master?includeCompleted=${includeCompleted}`);
    if (!res.ok) throw new Error('Failed to fetch master tasks');
    return res.json();
  },

  async toggleTaskItem(id: string, subtaskIndex?: number, isCompleted?: boolean): Promise<any> {
    const res = await this.request(`${BASE_URL}/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtaskIndex, isCompleted }),
    });
    if (!res.ok) throw new Error('Failed to toggle task item');
    return res.json();
  },

  // Contacts
  async getContacts(): Promise<Contact[]> {
    const res = await this.request(`${BASE_URL}/contacts`);
    if (!res.ok) throw new Error('Failed to fetch contacts');
    return res.json();
  },

  async createContact(data: {
    name: string;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }): Promise<Contact> {
    const res = await this.request(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create contact');
    return res.json();
  },

  async updateContact(
    id: string,
    data: {
      name?: string;
      department?: string | null;
      email?: string | null;
      phone?: string | null;
      role?: string | null;
    }
  ): Promise<Contact> {
    const res = await this.request(`${BASE_URL}/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update contact');
    return res.json();
  },

  async deleteContact(id: string): Promise<void> {
    const res = await this.request(`${BASE_URL}/contacts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete contact');
  },

  // Venues
  async getVenues(): Promise<Venue[]> {
    const res = await this.request(`${BASE_URL}/venues`);
    if (!res.ok) throw new Error('Failed to fetch venues');
    return res.json();
  },

  async createVenue(data: Partial<Venue>): Promise<Venue> {
    const res = await this.request(`${BASE_URL}/venues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create venue');
    return res.json();
  },

  async updateVenue(id: string, data: Partial<Venue>): Promise<Venue> {
    const res = await this.request(`${BASE_URL}/venues/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update venue');
    return res.json();
  },

  async deleteVenue(id: string): Promise<void> {
    const res = await this.request(`${BASE_URL}/venues/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete venue');
  },

  // Global Cross-Item Search
  async globalSearch(query: string): Promise<import('../types').GlobalSearchResponse> {
    const res = await this.request(`${BASE_URL}/events/search/all?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to perform global search');
    return res.json();
  },

  // Trash Bin & Soft-Delete Undo
  async getTrash(): Promise<{
    events: any[];
    nodes: any[];
    checklists: any[];
    totalCount: number;
  }> {
    const res = await this.request(`${BASE_URL}/trash`);
    if (!res.ok) throw new Error('Failed to fetch trash items');
    return res.json();
  },

  async restoreTrashItem(type: 'event' | 'node' | 'checklist', id: string): Promise<any> {
    const res = await this.request(`${BASE_URL}/trash/${type}/${id}/restore`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to restore item');
    return res.json();
  },

  async permanentlyDeleteTrashItem(type: 'event' | 'node' | 'checklist', id: string): Promise<any> {
    const res = await this.request(`${BASE_URL}/trash/${type}/${id}/permanent`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to permanently delete item');
    return res.json();
  },

  async emptyTrash(): Promise<any> {
    const res = await this.request(`${BASE_URL}/trash/empty`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to empty trash');
    return res.json();
  },
};
