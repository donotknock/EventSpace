import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useViewport,
  type EdgeProps,
} from '@xyflow/react';
import { ArrowLeftRight, Trash2 } from 'lucide-react';

export const RemovableEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { zoom } = useViewport();
  const isViewer = Boolean(data?.isViewer || data?.isReadOnly);
  const strokeColor = (style.stroke as string) || (data as any)?.color || '#3b82f6';
  const lineStyle: 'dashed' | 'solid' = data?.lineStyle === 'solid' ? 'solid' : 'dashed';
  const isDashed = lineStyle === 'dashed';
  const currentWidth = typeof style.strokeWidth === 'number' ? style.strokeWidth : 2.5;

  const handleSetStyle = (nextStyle: 'dashed' | 'solid') => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (data?.onUpdateStyle && typeof data.onUpdateStyle === 'function') {
      data.onUpdateStyle(id, { lineStyle: nextStyle });
    }
  };

  const handleCycleWidth = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    let nextWidth = 2.5;
    if (currentWidth <= 1.8) nextWidth = 2.5;
    else if (currentWidth <= 3) nextWidth = 4;
    else nextWidth = 1.5;

    if (data?.onUpdateStyle && typeof data.onUpdateStyle === 'function') {
      data.onUpdateStyle(id, { strokeWidth: nextWidth });
    }
  };

  const handleReverse = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (data?.onReverseDirection && typeof data.onReverseDirection === 'function') {
      data.onReverseDirection(id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (data?.onDelete && typeof data.onDelete === 'function') {
      data.onDelete(id);
    }
  };

  const preventGesture = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={35}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: currentWidth,
          strokeDasharray: isDashed ? '5,5' : 'none',
          animation: isDashed ? undefined : 'none',
          cursor: isViewer ? 'default' : 'pointer',
          filter: selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))' : undefined,
        }}
      />
      {selected && !isViewer && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(${1 / zoom})`,
              transformOrigin: 'center center',
              pointerEvents: 'all',
            }}
            className="flex items-center gap-1.5 bg-slate-900 text-white border border-slate-700 rounded-lg px-2 py-1 shadow-xl pointer-events-auto nodrag nopan z-30 animate-fadeIn select-none"
            onClick={preventGesture}
            onMouseDown={preventGesture}
            onPointerDown={preventGesture}
          >
            {/* 1. Line Style Segmented Control: Dash vs Solid */}
            <div className="flex items-center rounded-md bg-slate-800/80 p-0.5 border border-slate-700/60">
              <button
                type="button"
                onClick={handleSetStyle('dashed')}
                onMouseDown={preventGesture}
                onPointerDown={preventGesture}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors flex items-center gap-1 ${
                  isDashed
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Line: Marching Animated Dashed"
              >
                <span className="w-3 border-t-2 border-dashed border-current inline-block" />
                <span>Dash</span>
              </button>
              <button
                type="button"
                onClick={handleSetStyle('solid')}
                onMouseDown={preventGesture}
                onPointerDown={preventGesture}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors flex items-center gap-1 ${
                  !isDashed
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Line: Static Solid"
              >
                <span className="w-3 border-t-2 border-solid border-current inline-block" />
                <span>Solid</span>
              </button>
            </div>

            <span className="w-px h-3.5 bg-slate-700" />

            {/* 2. Line Width Selector: Cycle 1.5 -> 2.5 -> 4 */}
            <button
              type="button"
              onClick={handleCycleWidth}
              onMouseDown={preventGesture}
              onPointerDown={preventGesture}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
              title={`Line Width: ${currentWidth === 1.5 ? 'Thin (1.5px)' : currentWidth === 4 ? 'Thick (4px)' : 'Medium (2.5px)'} - Click to cycle`}
            >
              <span
                className="w-2.5 rounded-full bg-current inline-block"
                style={{ height: currentWidth === 1.5 ? 1.5 : currentWidth === 4 ? 4 : 2.5 }}
              />
              <span>{currentWidth === 1.5 ? '1.5px' : currentWidth === 4 ? '4px' : '2.5px'}</span>
            </button>

            <span className="w-px h-3.5 bg-slate-700" />

            {/* 3. Swap Ends (Reverse Direction) Button */}
            <button
              type="button"
              onClick={handleReverse}
              onMouseDown={preventGesture}
              onPointerDown={preventGesture}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-blue-400 hover:bg-slate-800 transition-colors"
              title="Reverse direction (swap source and target)"
              aria-label="Reverse direction"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-3.5 bg-slate-700" />

            {/* 4. Delete Edge Button */}
            <button
              type="button"
              onClick={handleDelete}
              onMouseDown={preventGesture}
              onPointerDown={preventGesture}
              className="w-6 h-6 flex items-center justify-center rounded text-rose-400 hover:text-white hover:bg-rose-600 transition-colors"
              title="Delete connector"
              aria-label="Delete connector"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
