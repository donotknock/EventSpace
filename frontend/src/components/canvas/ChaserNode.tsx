import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { CanvasNodeItem } from '../../types';

export const ChaserNode: React.FC<NodeProps> = (props) => {
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
      typeName="Chaser"
      icon={<Clock className="w-4 h-4 text-amber-500" />}
      accentColor="border-amber-500/60 dark:border-amber-500/50 hover:border-amber-500 shadow-amber-500/10"
      badgeBg="bg-amber-100 dark:bg-amber-950/70"
      badgeText="text-amber-700 dark:text-amber-300"
    />
  );
};
