import React from 'react';
import { NodeProps } from '@xyflow/react';
import { CheckSquare } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { CanvasNodeItem } from '../../types';

export const TaskNode: React.FC<NodeProps> = (props) => {
  const nodeData = props.data as unknown as {
    node: CanvasNodeItem;
    onUpdate: (id: string, updates: Partial<CanvasNodeItem>) => void;
    onDelete: (id: string) => void;
  };

  return (
    <BaseNode
      id={props.id}
      data={nodeData}
      selected={Boolean(props.selected)}
      typeName="Task"
      icon={<CheckSquare className="w-4 h-4 text-blue-500" />}
      accentColor="border-blue-500/60 dark:border-blue-500/50 hover:border-blue-500 shadow-blue-500/10"
      badgeBg="bg-blue-100 dark:bg-blue-950/70"
      badgeText="text-blue-700 dark:text-blue-300"
    />
  );
};
