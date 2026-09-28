import type {
  AgendaResponse,
  CanvasNodeItem,
  ChecklistItem,
  EventItem,
  FullEventItem,
  NormalizedAgendaItem,
  Subtask,
} from '../types';
import { storage } from './storage';

export const mobileApi = {
  // Normalize base URL (strip trailing slashes)
  cleanUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
  },

  async getAuthHeaders(): Promise<Record<string, string>> {
    const config = await storage.getServerConfig();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (config?.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }
    if (config?.workspaceId) {
      headers['X-Workspace-Id'] = config.workspaceId;
    }
    return headers;
  },

  async checkHealth(serverUrl: string): Promise<boolean> {
    const base = this.cleanUrl(serverUrl);
    try {
      const res = await fetch(`${base}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async verifyPairing(
    serverUrl: string,
    code: string
  ): Promise<{
    success: boolean;
    token?: string;
    workspaceId?: string;
    username?: string;
    deviceName?: string;
    error?: string;
  }> {
    const base = this.cleanUrl(serverUrl);
    try {
      const res = await fetch(`${base}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Pairing verification failed' };
      }
      return {
        success: true,
        token: data.token,
        workspaceId: data.workspaceId,
        username: data.username,
        deviceName: data.deviceName,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Could not reach server at ${base}. Ensure your device is on the same local Wi-Fi.`,
      };
    }
  },

  async getEvents(serverUrl: string): Promise<EventItem[]> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events`, { headers });
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getTemplates(serverUrl: string): Promise<EventItem[]> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events?isTemplate=true`, { headers });
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  async getContacts(serverUrl: string): Promise<Array<{ id: string; name: string; email?: string | null; phone?: string | null; role?: string | null }>> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/contacts`, { headers });
    if (!res.ok) return [];
    return res.json();
  },

  async createContact(
    serverUrl: string,
    data: { name: string; role?: string | null; email?: string | null; phone?: string | null }
  ): Promise<{ id: string; name: string; email?: string | null; phone?: string | null; role?: string | null }> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create contact');
    return res.json();
  },

  async createEvent(
    serverUrl: string,
    data: {
      title: string;
      department?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      priority?: 'high' | 'med' | 'low' | null;
      isTemplate?: boolean;
      contactIds?: string[];
    }
  ): Promise<EventItem> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  async duplicateEvent(
    serverUrl: string,
    sourceEventId: string,
    data?: {
      title?: string;
      department?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      priority?: 'high' | 'med' | 'low' | null;
    }
  ): Promise<EventItem> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events/${sourceEventId}/duplicate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data || {}),
    });
    if (!res.ok) throw new Error('Failed to duplicate event');
    return res.json();
  },

  async getEvent(serverUrl: string, eventId: string): Promise<FullEventItem> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events/${eventId}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch event details');
    return res.json();
  },

  async getAgenda(serverUrl: string, includeCompleted = true): Promise<AgendaResponse> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/tasks/agenda?includeCompleted=${includeCompleted}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch agenda');
    return res.json();
  },

  async toggleTask(
    serverUrl: string,
    id: string,
    options?: { subtaskIndex?: number; isCompleted?: boolean }
  ): Promise<{ success: boolean }> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error('Failed to toggle task');
    return res.json();
  },

  // Node CRUD operations
  async createNode(
    serverUrl: string,
    eventId: string,
    data: {
      type: 'task' | 'chaser' | 'info' | 'note' | 'picture' | 'audio' | 'venue' | 'video';
      title: string;
      content?: string | null;
      xPosition?: number;
      yPosition?: number;
      isCompleted?: boolean;
      dueDate?: string | null;
      priority?: 'high' | 'med' | 'low' | null;
      assignee?: string | null;
      metadata?: string | null;
    }
  ): Promise<CanvasNodeItem> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const payload = {
      type: data.type,
      title: data.title,
      content: data.content ?? null,
      xPosition: data.xPosition ?? 100,
      yPosition: data.yPosition ?? 100,
      isCompleted: data.isCompleted ?? false,
      dueDate: data.dueDate ?? null,
      priority: data.priority ?? null,
      assignee: data.assignee ?? null,
      metadata: data.metadata ?? null,
    };
    const res = await fetch(`${base}/api/events/${eventId}/nodes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create node');
    return res.json();
  },

  async updateNode(
    serverUrl: string,
    eventId: string,
    nodeId: string,
    updates: Partial<CanvasNodeItem>
  ): Promise<CanvasNodeItem> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events/${eventId}/nodes/${nodeId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update node');
    return res.json();
  },

  async deleteNode(serverUrl: string, eventId: string, nodeId: string): Promise<void> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events/${eventId}/nodes/${nodeId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('Failed to delete node');
  },

  // Checklist CRUD operations
  async createChecklistItem(
    serverUrl: string,
    eventId: string,
    data: {
      category: string;
      content: string;
      isCompleted?: boolean;
      order?: number;
    }
  ): Promise<ChecklistItem> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events/${eventId}/checklists`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create checklist item');
    return res.json();
  },

  async updateChecklistItem(
    serverUrl: string,
    eventId: string,
    itemId: string,
    updates: Partial<ChecklistItem>
  ): Promise<ChecklistItem> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events/${eventId}/checklists/${itemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update checklist item');
    return res.json();
  },

  async deleteChecklistItem(serverUrl: string, eventId: string, itemId: string): Promise<void> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/events/${eventId}/checklists/${itemId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('Failed to delete checklist item');
  },

  // Flattens and normalizes task nodes, sub-tasks, and checklists into a sorted feed
  normalizeAgenda(agenda: AgendaResponse): NormalizedAgendaItem[] {
    const items: NormalizedAgendaItem[] = [];

    // 1. Process Task & Chaser Nodes (strictly dated items for schedule agenda)
    for (const node of agenda.taskNodes) {
      if ((node.event as any)?.status === 'archived') continue;

      let hasDatedSubtasks = false;
      if (node.metadata) {
        try {
          const meta = JSON.parse(node.metadata);
          if (Array.isArray(meta.subtasks) && meta.subtasks.length > 0) {
            meta.subtasks.forEach((st: Subtask, idx: number) => {
              if (st.style === 'bullet') return;
              const subDueDate = st.dueDate || node.dueDate;
              if (subDueDate) {
                hasDatedSubtasks = true;
                items.push({
                  id: `${node.id}-sub-${idx}`,
                  originalId: node.id,
                  type: 'subtask',
                  title: st.label || st.text || 'Untitled subtask',
                  event: node.event,
                  dueDate: subDueDate,
                  isCompleted: Boolean(st.done),
                  priority: node.priority,
                  nodeType: node.type,
                  subtaskIndex: idx,
                  parentNodeId: node.id,
                });
              }
            });
          }
        } catch {}
      }

      if ((!hasDatedSubtasks || node.isCompleted) && node.dueDate) {
        items.push({
          id: node.id,
          originalId: node.id,
          type: node.type === 'chaser' ? 'chaser' : 'task',
          title: node.title,
          event: node.event,
          dueDate: node.dueDate,
          isCompleted: node.isCompleted,
          priority: node.priority,
          nodeType: node.type,
        });
      }
    }

    // 2. Overarching Department Checklists (FM/AV/CT) are intentionally excluded
    // from the Schedule Agenda logic because they lack due dates and cause jumping behavior.

    // 3. Sort strictly chronologically by dueDate:
    return items.sort((a, b) => {
      const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return timeA - timeB;
    });
  },

  async getVenues(serverUrl: string): Promise<any[]> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    try {
      const res = await fetch(`${base}/api/venues`, { headers });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async createVenue(serverUrl: string, data: { name: string; address?: string; capacity?: number }): Promise<any> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${base}/api/venues`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create venue');
    return res.json();
  },

  async getCurrentUser(serverUrl: string): Promise<{ id: string; username: string; role?: string } | null> {
    const base = this.cleanUrl(serverUrl);
    const headers = await this.getAuthHeaders();
    try {
      const res = await fetch(`${base}/api/auth/me`, { headers });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },
};
