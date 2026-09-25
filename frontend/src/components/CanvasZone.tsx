import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Controls,
  ControlButton,
  Background,
  BackgroundVariant,
  useReactFlow,
  MarkerType,
} from '@xyflow/react';
import { FullEventDetails, CanvasNodeItem, NodeType, FrictionLogItem, Severity } from '../types';
import { api } from '../services/api';
import { TaskNode } from './canvas/TaskNode';
import { ChaserNode } from './canvas/ChaserNode';
import { InfoNode } from './canvas/InfoNode';
import { NoteNode } from './canvas/NoteNode';
import { PictureNode } from './canvas/PictureNode';
import { AudioNode } from './canvas/AudioNode';
import { RemovableEdge } from './canvas/RemovableEdge';
import { ContextMenu } from './canvas/ContextMenu';
import { BuildingBlocksPalette } from './canvas/BuildingBlocksPalette';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Magnet,
  Plus,
  Trash2,
  RotateCcw,
  Pencil,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

interface CanvasZoneProps {
  activeEvent: FullEventDetails | null;
  onRefreshEvent: () => void;
  locatedNodeId?: string | null;
}

const nodeTypes = {
  task: TaskNode,
  chaser: ChaserNode,
  info: InfoNode,
  note: NoteNode,
  audio: AudioNode,
  picture: PictureNode,
};

const getBlockBrandColor = (type?: string): string => {
  switch (type?.toLowerCase()) {
    case 'chaser':
      return '#f59e0b'; // Amber / Yellow
    case 'info':
      return '#10b981'; // Emerald / Green
    case 'task':
      return '#3b82f6'; // Blue
    case 'audio':
      return '#8b5cf6'; // Violet / Purple
    case 'picture':
      return '#f43f5e'; // Rose
    case 'note':
    default:
      return '#64748b'; // Slate / Neutral
  }
};

const edgeTypes = {
  removable: RemovableEdge,
  smoothstep: RemovableEdge,
};

const defaultEdgeOptions = {
  type: 'removable',
  animated: true,
  style: { stroke: '#f59e0b', strokeWidth: 2.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#f59e0b',
    width: 20,
    height: 20,
  },
};

const CanvasInner: React.FC<{
  activeEvent: FullEventDetails;
  onRefreshEvent: () => void;
  locatedNodeId?: string | null;
}> = ({ activeEvent, onRefreshEvent, locatedNodeId }) => {
  const { screenToFlowPosition, setViewport, fitView, setCenter } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { enablePriority } = useSettings();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Snap to Grid state
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPos: { x: number; y: number };
  } | null>(null);

  // Friction log pull-out drawer state
  const [frictionDrawerOpen, setFrictionDrawerOpen] = useState(false);
  const [newFrictionTitle, setNewFrictionTitle] = useState('');
  const [newFrictionDesc, setNewFrictionDesc] = useState('');
  const [newFrictionSeverity, setNewFrictionSeverity] = useState<Severity>('none');
  const [isSubmittingFriction, setIsSubmittingFriction] = useState(false);

  // Friction log editing state
  const [editingFrictionId, setEditingFrictionId] = useState<string | null>(null);
  const [editFrictionTitle, setEditFrictionTitle] = useState('');
  const [editFrictionDesc, setEditFrictionDesc] = useState('');
  const [editFrictionSeverity, setEditFrictionSeverity] = useState<Severity>('none');
  const [isSavingFrictionEdit, setIsSavingFrictionEdit] = useState(false);

  // Locate animation and centering
  useEffect(() => {
    if (!locatedNodeId) return;
    const targetNode =
      nodes.find((n) => n.id === locatedNodeId) ||
      (activeEvent.nodes || []).find((n) => n.id === locatedNodeId);
    if (targetNode) {
      const x = 'position' in targetNode ? targetNode.position.x : targetNode.xPosition;
      const y = 'position' in targetNode ? targetNode.position.y : targetNode.yPosition;
      setCenter(x + 140, y + 90, { zoom: 1.2, duration: 800 });
    }
  }, [locatedNodeId, nodes, activeEvent.nodes, setCenter]);

  // Sync isLocated property on nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const isLoc = n.id === locatedNodeId;
        if ((n.data as any)?.isLocated !== isLoc) {
          return {
            ...n,
            data: {
              ...n.data,
              isLocated: isLoc,
            },
          };
        }
        return n;
      })
    );
  }, [locatedNodeId, setNodes]);

  // Update node handler passed to node data
  const handleUpdateNode = useCallback(
    async (nodeId: string, updates: Partial<CanvasNodeItem>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            const currentData = n.data as any;
            return {
              ...n,
              data: {
                ...currentData,
                node: { ...currentData.node, ...updates },
              },
            };
          }
          return n;
        })
      );

      try {
        await api.updateNode(activeEvent.id, nodeId, updates);
      } catch (err) {
        console.error('Failed to update node:', err);
        onRefreshEvent();
      }
    },
    [activeEvent.id, setNodes, onRefreshEvent]
  );

  // Delete node handler
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));

      try {
        await api.deleteNode(activeEvent.id, nodeId);
      } catch (err) {
        console.error('Failed to delete node:', err);
        onRefreshEvent();
      }
    },
    [activeEvent.id, setNodes, setEdges, onRefreshEvent]
  );

  // Handle edge delete (touch button or direct call)
  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      try {
        await api.deleteEdge(activeEvent.id, edgeId);
      } catch (err) {
        console.error('Failed to delete edge:', err);
      }
    },
    [activeEvent.id, setEdges]
  );

  // Handle edges delete from keyboard Backspace / Delete
  const handleEdgesDelete = useCallback(
    async (deletedEdges: Edge[]) => {
      for (const e of deletedEdges) {
        try {
          await api.deleteEdge(activeEvent.id, e.id);
        } catch (err) {
          console.error('Failed to delete edge via key/event:', err);
        }
      }
    },
    [activeEvent.id]
  );

  // RENDER SEED DATA IMMEDIATELY
  useEffect(() => {
    if (!activeEvent) return;

    const initialNodes: Node[] = (activeEvent.nodes || []).map((n) => ({
      id: n.id,
      type: n.type || 'task',
      position: { x: n.xPosition, y: n.yPosition },
      data: {
        node: n,
        onUpdate: handleUpdateNode,
        onDelete: handleDeleteNode,
        isLocated: n.id === locatedNodeId,
      },
    }));

    const initialEdges: Edge[] = (activeEvent.edges || []).map((e) => {
      const sourceNode = (activeEvent.nodes || []).find((n) => n.id === e.sourceId);
      const brandColor = getBlockBrandColor(sourceNode?.type);

      return {
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
        type: 'removable',
        animated: e.animated ?? true,
        label: e.label || undefined,
        style: { stroke: brandColor, strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: brandColor,
          width: 18,
          height: 18,
        },
        data: {
          onDelete: handleDeleteEdge,
          color: brandColor,
        },
      };
    });

    setNodes(initialNodes);
    setEdges(initialEdges);

    if (activeEvent.viewportZoom && activeEvent.viewportZoom > 0) {
      setViewport(
        {
          x: activeEvent.viewportX,
          y: activeEvent.viewportY,
          zoom: activeEvent.viewportZoom,
        },
        { duration: 400 }
      );
    } else {
      setTimeout(() => fitView({ padding: 0.3 }), 50);
    }
  }, [activeEvent.id, handleUpdateNode, handleDeleteNode, handleDeleteEdge]);

  // Connectors with Directional Arrow & Block Brand Colors
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode =
        (activeEvent.nodes || []).find((n) => n.id === connection.source) ||
        nodes.find((n) => n.id === connection.source);
      const brandColor = getBlockBrandColor(
        (sourceNode as any)?.type || (sourceNode as any)?.data?.node?.type
      );

      const newEdgeId = `edge-${Date.now()}`;
      const newEdge: Edge = {
        ...connection,
        id: newEdgeId,
        type: 'removable',
        animated: true,
        style: { stroke: brandColor, strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: brandColor,
          width: 18,
          height: 18,
        },
        data: {
          onDelete: handleDeleteEdge,
          color: brandColor,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));

      try {
        await api.createEdge(activeEvent.id, {
          sourceId: connection.source,
          targetId: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'smoothstep',
          animated: true,
        });
      } catch (err) {
        console.error('Failed to save edge:', err);
      }
    },
    [activeEvent.id, nodes, setEdges, handleDeleteEdge]
  );

  // Debounced node drag position save
  const onNodeDragStop = useCallback(
    async (_event: MouseEvent | TouchEvent, node: Node) => {
      try {
        await api.batchUpdatePositions(activeEvent.id, [
          {
            id: node.id,
            xPosition: node.position.x,
            yPosition: node.position.y,
          },
        ]);
      } catch (err) {
        console.error('Failed to save node coordinates:', err);
      }
    },
    [activeEvent.id]
  );

  // Viewport persistence
  const onMoveEnd = useCallback(
    async (_e: any, viewport: { x: number; y: number; zoom: number }) => {
      try {
        await api.updateViewport(activeEvent.id, {
          viewportX: viewport.x,
          viewportY: viewport.y,
          viewportZoom: viewport.zoom,
        });
      } catch (err) {
        console.error('Failed to persist viewport:', err);
      }
    },
    [activeEvent.id]
  );

  // Spawn a new building block
  const spawnBuildingBlock = useCallback(
    async (type: NodeType, flowPosition?: { x: number; y: number }) => {
      const position = flowPosition || {
        x: Math.random() * 200 + 250,
        y: Math.random() * 200 + 150,
      };

      const defaultTitles: Record<NodeType, string> = {
        task: 'New Task Block',
        chaser: 'Vendor Chaser Liaison',
        info: 'Meeting Notes & Info',
        note: 'General Memo / Sticky',
        picture: 'Event Photo / Site Snap',
        audio: 'Audio Note / Voice Memo',
      };

      try {
        const created = await api.createNode(activeEvent.id, {
          type,
          title: defaultTitles[type],
          content:
            type === 'picture'
              ? null
              : 'Click title or text to customize notes and attached tasks.',
          xPosition: position.x,
          yPosition: position.y,
          isCompleted: false,
          dueDate:
            type === 'task' || type === 'chaser'
              ? new Date(Date.now() + 2 * 86400000).toISOString()
              : null,
          metadata: JSON.stringify({
            subtasks:
              type === 'task' ? [{ id: 'st1', label: 'Initial action item', done: false }] : [],
          }),
        });

        const newNode: Node = {
          id: created.id,
          type: created.type,
          position: { x: created.xPosition, y: created.yPosition },
          data: {
            node: created,
            onUpdate: handleUpdateNode,
            onDelete: handleDeleteNode,
          },
        };

        setNodes((nds) => [...nds, newNode]);
      } catch (err) {
        console.error('Failed to spawn building block:', err);
      }
    },
    [activeEvent.id, handleUpdateNode, handleDeleteNode, setNodes]
  );

  // Context menu on right-click
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPos,
      });
    },
    [screenToFlowPosition]
  );

  // Drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      spawnBuildingBlock(type, flowPos);
    },
    [screenToFlowPosition, spawnBuildingBlock]
  );

  // Friction Log Actions
  const handleAddFriction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrictionTitle.trim() || isSubmittingFriction) return;

    try {
      setIsSubmittingFriction(true);
      await api.createFrictionLog(activeEvent.id, {
        title: newFrictionTitle.trim(),
        description: newFrictionDesc.trim() || undefined,
        severity: newFrictionSeverity,
        resolved: false,
      });
      setNewFrictionTitle('');
      setNewFrictionDesc('');
      onRefreshEvent();
    } catch (err) {
      console.error('Failed to create friction log:', err);
    } finally {
      setIsSubmittingFriction(false);
    }
  };

  const handleToggleFrictionResolved = async (log: FrictionLogItem) => {
    try {
      await api.updateFrictionLog(activeEvent.id, log.id, {
        resolved: !log.resolved,
      });
      onRefreshEvent();
    } catch (err) {
      console.error('Failed to toggle friction log status:', err);
    }
  };

  const handleDeleteFriction = async (id: string) => {
    try {
      await api.deleteFrictionLog(activeEvent.id, id);
      onRefreshEvent();
    } catch (err) {
      console.error('Failed to delete friction log:', err);
    }
  };

  const handleStartEditFriction = (log: FrictionLogItem) => {
    setEditingFrictionId(log.id);
    setEditFrictionTitle(log.title);
    setEditFrictionDesc(log.description || '');
    setEditFrictionSeverity(log.severity || 'none');
  };

  const handleCancelEditFriction = () => {
    setEditingFrictionId(null);
    setEditFrictionTitle('');
    setEditFrictionDesc('');
    setEditFrictionSeverity('none');
  };

  const handleSaveFrictionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFrictionId || !editFrictionTitle.trim() || isSavingFrictionEdit) return;
    try {
      setIsSavingFrictionEdit(true);
      await api.updateFrictionLog(activeEvent.id, editingFrictionId, {
        title: editFrictionTitle.trim(),
        description: editFrictionDesc.trim() || undefined,
        severity: editFrictionSeverity,
      });
      setEditingFrictionId(null);
      onRefreshEvent();
    } catch (err) {
      console.error('Failed to update friction log:', err);
    } finally {
      setIsSavingFrictionEdit(false);
    }
  };

  const frictionLogs = activeEvent.frictionLogs || [];

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 w-full h-full relative overflow-hidden bg-slate-50/50 dark:bg-slate-950"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* BUILDING BLOCKS PALETTE */}
      <BuildingBlocksPalette onSpawnNode={(type) => spawnBuildingBlock(type)} />

      {/* Main XYFlow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={handleEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={() => setContextMenu(null)}
        onNodeClick={() => setContextMenu(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={['Backspace', 'Delete']}
        edgesFocusable={true}
        edgesReconnectable={true}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2.5}
        elevateNodesOnSelect={true}
        className="touch-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="currentColor"
          className="text-slate-300 dark:text-slate-800 opacity-60"
        />
        {/* Controls Module with Magnet Snap-to-Grid Button */}
        <Controls
          className="!bottom-4 !left-4 !bg-white/95 dark:!bg-slate-900/95 !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-lg"
          showInteractive={false}
        >
          <ControlButton
            onClick={() => setSnapToGrid(!snapToGrid)}
            title={snapToGrid ? 'Snap to Grid: ON (Click to disable)' : 'Snap to Grid: OFF (Click to enable)'}
            aria-label="Toggle snap to grid"
            className={snapToGrid ? '!bg-blue-50 dark:!bg-blue-950/60' : ''}
          >
            <Magnet
              className={`w-4 h-4 transition-colors ${
                snapToGrid ? 'text-blue-600 dark:text-blue-400 stroke-[2.5]' : 'text-slate-400'
              }`}
            />
          </ControlButton>
        </Controls>
      </ReactFlow>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onSelect={(type) => spawnBuildingBlock(type, contextMenu.flowPos)}
        />
      )}

      {/* CLARA'S WIREFRAME: Pull-out "Difficulties faced here" Friction Log Drawer */}
      <div
        className={`absolute top-0 bottom-0 right-0 z-30 flex transition-transform duration-300 ease-in-out ${
          frictionDrawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%-44px)]'
        }`}
      >
        {/* Pull-out Tab Handle (Minimum 44x44px touch area) */}
        <button
          onClick={() => setFrictionDrawerOpen(!frictionDrawerOpen)}
          aria-label={frictionDrawerOpen ? 'Close friction log' : 'Open friction log'}
          className="self-center min-w-[44px] min-h-[56px] py-4 px-2 rounded-l-2xl bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all focus:outline-none relative group"
          title={`Friction Log: ${frictionLogs.filter((f) => !f.resolved).length} open issue(s)`}
        >
          {!frictionDrawerOpen && (
            <span
              className={`w-5 h-5 rounded-full font-extrabold text-[10px] flex items-center justify-center shadow-md transition-transform ${
                frictionLogs.filter((f) => !f.resolved).length > 0
                  ? 'bg-white text-red-600 animate-pulse'
                  : 'bg-red-700/90 text-white'
              }`}
            >
              {frictionLogs.filter((f) => !f.resolved).length}
            </span>
          )}
          {frictionDrawerOpen ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
          <span className="text-[10px] font-black uppercase tracking-wider [writing-mode:vertical-rl] rotate-180">
            Friction Log
          </span>
        </button>

        {/* Drawer Body */}
        <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full select-none">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Friction Log
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Track difficulties & blockers ({frictionLogs.filter((f) => !f.resolved).length} open)
                </p>
              </div>
            </div>
            <button
              onClick={() => setFrictionDrawerOpen(false)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Form to Author New Friction Log Item */}
          <form onSubmit={handleAddFriction} className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Log New Blocker / Difficulty
            </span>
            <input
              type="text"
              required
              placeholder="Difficulty title (e.g. HDMI sync lag)..."
              value={newFrictionTitle}
              onChange={(e) => setNewFrictionTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <textarea
              placeholder="Context or notes on how this is being handled..."
              value={newFrictionDesc}
              onChange={(e) => setNewFrictionDesc(e.target.value)}
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex items-center justify-between gap-2">
              {enablePriority ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Priority:
                  </span>
                  {(['low', 'medium', 'critical'] as Severity[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() =>
                        setNewFrictionSeverity(newFrictionSeverity === sev ? 'none' : sev)
                      }
                      className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg capitalize transition-all ${
                        newFrictionSeverity === sev
                          ? sev === 'critical'
                            ? 'bg-red-500 text-white shadow-sm ring-1 ring-red-400'
                            : sev === 'medium'
                            ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                            : 'bg-blue-500 text-white shadow-sm ring-1 ring-blue-400'
                          : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                  {newFrictionSeverity !== 'none' && (
                    <button
                      type="button"
                      onClick={() => setNewFrictionSeverity('none')}
                      className="text-[10px] text-slate-400 hover:text-red-500 underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              ) : <div />}
              <button
                type="submit"
                disabled={!newFrictionTitle.trim() || isSubmittingFriction}
                className="min-h-[34px] px-3 flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Blocker</span>
              </button>
            </div>
          </form>

          {/* List of Existing Friction Log Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {frictionLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No difficulties or friction logged for this event.
              </div>
            ) : (
              frictionLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-2xl border transition-all space-y-2 ${
                    log.resolved
                      ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20 opacity-70'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-sm'
                  }`}
                >
                  {editingFrictionId === log.id ? (
                    <form onSubmit={handleSaveFrictionEdit} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                          Edit Blocker Details
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelEditFriction}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={editFrictionTitle}
                        onChange={(e) => setEditFrictionTitle(e.target.value)}
                        placeholder="Difficulty title..."
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <textarea
                        rows={2}
                        value={editFrictionDesc}
                        onChange={(e) => setEditFrictionDesc(e.target.value)}
                        placeholder="Context or notes..."
                        className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <div className="flex items-center justify-between gap-1 pt-1">
                        {enablePriority ? (
                          <div className="flex items-center gap-1">
                            {(['low', 'medium', 'critical'] as Severity[]).map((sev) => (
                              <button
                                key={sev}
                                type="button"
                                onClick={() =>
                                  setEditFrictionSeverity(editFrictionSeverity === sev ? 'none' : sev)
                                }
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded capitalize ${
                                  editFrictionSeverity === sev
                                    ? sev === 'critical'
                                      ? 'bg-red-500 text-white'
                                      : sev === 'medium'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-blue-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {sev}
                              </button>
                            ))}
                          </div>
                        ) : <div />}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCancelEditFriction}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!editFrictionTitle.trim() || isSavingFrictionEdit}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`font-bold text-xs ${
                            log.resolved ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {log.title}
                        </span>
                        {enablePriority && log.severity && log.severity !== 'none' && (
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                              log.severity === 'critical'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                : log.severity === 'medium'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                            }`}
                          >
                            {log.severity}
                          </span>
                        )}
                      </div>

                      {log.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          {log.description}
                        </p>
                      )}

                      <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-750 text-[11px]">
                        <button
                          onClick={() => handleToggleFrictionResolved(log)}
                          className={`flex items-center gap-1.5 font-semibold transition-colors ${
                            log.resolved
                              ? 'text-slate-400 hover:text-red-600'
                              : 'text-emerald-600 dark:text-emerald-400 hover:underline'
                          }`}
                        >
                          {log.resolved ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" /> Re-open issue
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditFriction(log)}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-500 transition-colors"
                            title="Edit friction log"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFriction(log.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete friction log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CanvasZone: React.FC<CanvasZoneProps> = ({
  activeEvent,
  onRefreshEvent,
  locatedNodeId,
}) => {
  const { theme } = useTheme();

  if (!activeEvent) {
    const iconSrc = theme === 'light' ? '/EventSpace-Icon-Lightmode.png' : '/EventSpace-Icon-Darkmode.png';
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950 p-6 text-center select-none">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4">
          <img
            src={iconSrc}
            alt="EventSpace"
            className="w-16 h-16 object-contain drop-shadow-md"
          />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          No Event Selected
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Select an event from the directory on the left or create a new event to open its spatial workspace.
        </p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <CanvasInner
        activeEvent={activeEvent}
        onRefreshEvent={onRefreshEvent}
        locatedNodeId={locatedNodeId}
      />
    </ReactFlowProvider>
  );
};
