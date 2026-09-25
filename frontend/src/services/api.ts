import { EventItem, FullEventDetails, MasterTasksResponse, ChecklistItemData } from '../types';

const BASE_URL = '/api';

export const api = {
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
    const res = await fetch(`${BASE_URL}/events?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getEventById(id: string): Promise<FullEventDetails> {
    const res = await fetch(`${BASE_URL}/events/${id}`);
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
  },

  async createEvent(data: {
    title: string;
    department?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    term?: string | null;
    year?: string | null;
    priority?: import('../types').Priority | null;
    contactIds?: string[];
  }): Promise<EventItem> {
    const res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  async updateEvent(
    id: string,
    data: Partial<EventItem> & { contactIds?: string[] }
  ): Promise<EventItem> {
    const res = await fetch(`${BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/events/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete event');
  },

  async duplicateEvent(
    id: string,
    data: {
      title?: string;
      startDate?: string | null;
      endDate?: string | null;
      department?: string | null;
      priority?: string | null;
    }
  ): Promise<FullEventDetails> {
    const res = await fetch(`${BASE_URL}/events/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to duplicate event');
    return res.json();
  },

  async saveAsTemplate(id: string, title?: string): Promise<FullEventDetails> {
    const res = await fetch(`${BASE_URL}/events/${id}/save-as-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to save as template');
    return res.json();
  },

  async getTemplates(): Promise<EventItem[]> {
    const res = await fetch(`${BASE_URL}/events?isTemplate=true`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  // Checklists
  async createChecklistItem(
    eventId: string,
    data: { category: string; content: string; order?: number }
  ): Promise<ChecklistItemData> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/checklists`, {
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
    const res = await fetch(`${BASE_URL}/events/${eventId}/checklists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update checklist item');
    return res.json();
  },

  async deleteChecklistItem(eventId: string, id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/checklists/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete checklist item');
  },

  async toggleChecklist(eventId: string, id: string, isCompleted: boolean): Promise<ChecklistItemData> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/checklists/${id}`, {
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
  ): Promise<import('../types').FrictionLogItem> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/friction-logs`, {
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
    data: Partial<import('../types').FrictionLogItem>
  ): Promise<import('../types').FrictionLogItem> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/friction-logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update friction log');
    return res.json();
  },

  async deleteFrictionLog(eventId: string, id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/friction-logs/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete friction log');
  },

  // Nodes (Building Blocks)
  async createNode(eventId: string, data: Partial<import('../types').CanvasNodeItem>): Promise<import('../types').CanvasNodeItem> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create node');
    return res.json();
  },

  async updateNode(eventId: string, id: string, data: Partial<import('../types').CanvasNodeItem>): Promise<import('../types').CanvasNodeItem> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/nodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update node');
    return res.json();
  },

  async deleteNode(eventId: string, id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/nodes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete node');
  },

  async batchUpdatePositions(
    eventId: string,
    positions: { id: string; xPosition: number; yPosition: number }[]
  ): Promise<void> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/nodes/batch/positions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions }),
    });
    if (!res.ok) throw new Error('Failed to update batch positions');
  },

  // Edges (Connectors)
  async createEdge(eventId: string, data: Partial<import('../types').CanvasEdgeItem>): Promise<import('../types').CanvasEdgeItem> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create edge');
    return res.json();
  },

  async syncEdges(eventId: string, edges: Partial<import('../types').CanvasEdgeItem>[]): Promise<import('../types').CanvasEdgeItem[]> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/edges/sync`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edges }),
    });
    if (!res.ok) throw new Error('Failed to sync edges');
    return res.json();
  },

  async deleteEdge(eventId: string, id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/edges/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete edge');
  },

  // Viewport
  async updateViewport(
    id: string,
    data: { viewportX: number; viewportY: number; viewportZoom: number }
  ): Promise<void> {
    const res = await fetch(`${BASE_URL}/events/${id}/viewport`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update viewport');
  },

  // Master Tasks & Schedule/Agenda
  async getMasterTasks(includeCompleted = false): Promise<MasterTasksResponse> {
    const res = await fetch(`${BASE_URL}/tasks/master?includeCompleted=${includeCompleted}`);
    if (!res.ok) throw new Error('Failed to fetch master tasks');
    return res.json();
  },

  async getScheduleAgenda(includeCompleted = false): Promise<MasterTasksResponse> {
    return this.getMasterTasks(includeCompleted);
  },

  // Contacts (Person in Charge)
  async getContacts(): Promise<import('../types').Contact[]> {
    const res = await fetch(`${BASE_URL}/contacts`);
    if (!res.ok) throw new Error('Failed to fetch contacts');
    return res.json();
  },

  async createContact(data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }): Promise<import('../types').Contact> {
    const res = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create contact');
    return res.json();
  },

  async deleteContact(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/contacts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete contact');
  },

  // Global Cross-Item Search
  async globalSearch(query: string): Promise<import('../types').GlobalSearchResponse> {
    const res = await fetch(`${BASE_URL}/events/search/all?q=${encodeURIComponent(query)}`);
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
    const res = await fetch(`${BASE_URL}/trash`);
    if (!res.ok) throw new Error('Failed to fetch trash items');
    return res.json();
  },

  async restoreTrashItem(type: 'event' | 'node' | 'checklist', id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/trash/${type}/${id}/restore`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to restore item');
    return res.json();
  },

  async permanentlyDeleteTrashItem(type: 'event' | 'node' | 'checklist', id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/trash/${type}/${id}/permanent`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to permanently delete item');
    return res.json();
  },

  async emptyTrash(): Promise<any> {
    const res = await fetch(`${BASE_URL}/trash/empty`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to empty trash');
    return res.json();
  },
};
