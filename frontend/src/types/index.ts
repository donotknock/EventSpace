export type Priority = 'high' | 'med' | 'low';

export type NodeType = 'task' | 'info' | 'chaser' | 'note' | 'picture' | 'audio';

export type Severity = 'low' | 'medium' | 'critical' | 'none';

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventItem {
  id: string;
  title: string;
  department: string | null;
  term: string | null;
  year: string | null;
  startDate: string | null;
  endDate: string | null;
  priority: Priority | null;
  isMuted: boolean;
  isCompleted?: boolean;
  isTemplate?: boolean;
  viewportX: number;
  viewportY: number;
  viewportZoom: number;
  createdAt: string;
  updatedAt: string;
  contacts?: Contact[];
  _count?: {
    nodes: number;
    checklists: number;
    frictionLogs: number;
  };
  nodes?: {
    id: string;
    type: string;
    isCompleted: boolean;
    dueDate: string | null;
  }[];
  checklists?: {
    id: string;
    isCompleted: boolean;
  }[];
}

export interface CanvasNodeItem {
  id: string;
  eventId: string;
  type: NodeType;
  xPosition: number;
  yPosition: number;
  title: string;
  content: string | null;
  isCompleted: boolean;
  dueDate: string | null;
  assignee: string | null;
  priority: Priority | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasEdgeItem {
  id: string;
  eventId: string;
  sourceId: string;
  targetId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  type: string | null;
  animated: boolean;
  label: string | null;
}

export interface ChecklistItemData {
  id: string;
  eventId: string;
  category: string;
  content: string;
  isCompleted: boolean;
  order: number;
}

export interface FrictionLogItem {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  severity: Severity;
  resolved: boolean;
  createdAt: string;
}

export interface FullEventDetails extends EventItem {
  nodes: CanvasNodeItem[];
  edges: CanvasEdgeItem[];
  checklists: ChecklistItemData[];
  frictionLogs: FrictionLogItem[];
  contacts: Contact[];
}

export interface MasterTasksResponse {
  taskNodes: (CanvasNodeItem & {
    event: {
      id: string;
      title: string;
      priority: Priority | null;
      department: string | null;
      term: string | null;
    };
  })[];
  checklistItems: (ChecklistItemData & {
    event: {
      id: string;
      title: string;
      priority: Priority | null;
      department: string | null;
      term: string | null;
    };
  })[];
  totalPending: number;
}

export type ScheduleAgendaResponse = MasterTasksResponse;

export interface GlobalSearchResponse {
  events: {
    id: string;
    title: string;
    department: string | null;
    startDate: string | null;
    priority: Priority | null;
  }[];
  nodes: (CanvasNodeItem & { event: { id: string; title: string } })[];
  checklists: (ChecklistItemData & { event: { id: string; title: string } })[];
}
