export type Priority = 'high' | 'med' | 'low';
export type NodeType = 'task' | 'chaser' | 'info' | 'note' | 'picture' | 'audio';

export interface EventItem {
  id: string;
  title: string;
  department?: string | null;
  term?: string | null;
  year?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority?: Priority | null;
  isMuted: boolean;
  isCompleted?: boolean;
  isTemplate?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Subtask {
  id: string;
  text?: string;
  label?: string;
  done: boolean;
  style?: 'bullet' | 'circle' | 'square';
  dueDate?: string | null;
}

export interface CanvasNodeItem {
  id: string;
  eventId: string;
  type: NodeType;
  xPosition: number;
  yPosition: number;
  title: string;
  content?: string | null;
  isCompleted: boolean;
  dueDate?: string | null;
  assignee?: string | null;
  priority?: Priority | null;
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CanvasEdgeItem {
  id: string;
  eventId: string;
  sourceId: string;
  targetId: string;
  label?: string | null;
  style?: string | null;
}

export interface ChecklistItem {
  id: string;
  eventId: string;
  category: string;
  content: string;
  isCompleted: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface FullEventItem extends EventItem {
  nodes: CanvasNodeItem[];
  edges: CanvasEdgeItem[];
  checklists: ChecklistItem[];
  contacts?: any[];
}

export interface AgendaNode {
  id: string;
  eventId: string;
  type: NodeType;
  title: string;
  content?: string | null;
  isCompleted: boolean;
  dueDate?: string | null;
  priority?: Priority | null;
  assignee?: string | null;
  metadata?: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    priority?: Priority | null;
    department?: string | null;
    term?: string | null;
  };
}

export interface AgendaChecklistItem {
  id: string;
  eventId: string;
  category: string;
  content: string;
  isCompleted: boolean;
  order: number;
  createdAt: string;
  event: {
    id: string;
    title: string;
    priority?: Priority | null;
    department?: string | null;
    term?: string | null;
  };
}

export interface AgendaResponse {
  taskNodes: AgendaNode[];
  checklistItems: AgendaChecklistItem[];
  totalPending: number;
}

export interface NormalizedAgendaItem {
  id: string;
  originalId: string;
  type: 'task' | 'chaser' | 'subtask' | 'checklist';
  title: string;
  event: {
    id: string;
    title: string;
    department?: string | null;
    priority?: Priority | null;
  };
  dueDate?: string | null;
  isCompleted: boolean;
  priority?: Priority | null;
  category?: string | null;
  nodeType?: string;
  subtaskIndex?: number;
  parentNodeId?: string;
}

export interface ServerConfig {
  serverUrl: string;
  pin: string;
  pairedAt?: string;
  serverName?: string;
}
