import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { X, Trash2 } from 'lucide-react';

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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onDelete && typeof data.onDelete === 'function') {
      data.onDelete(id);
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#ef4444' : (style.stroke || (data as any)?.color || '#3b82f6'),
          strokeWidth: selected ? 3.5 : 2.5,
          cursor: 'pointer',
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan z-30"
          >
            <button
              onClick={handleDelete}
              className="min-w-[32px] min-h-[32px] w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl border-2 border-white dark:border-slate-900 flex items-center justify-center active:scale-90 transition-all animate-fadeIn"
              title="Delete connector (or press Delete/Backspace)"
              aria-label="Delete connector"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
