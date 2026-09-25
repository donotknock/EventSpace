import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Info } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { CanvasNodeItem } from '../../types';

export const InfoNode: React.FC<NodeProps> = (props) => {
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
      typeName="Info"
      icon={<Info className="w-4 h-4 text-emerald-500" />}
      accentColor="border-emerald-500/60 dark:border-emerald-500/50 hover:border-emerald-500 shadow-emerald-500/10"
      badgeBg="bg-emerald-100 dark:bg-emerald-950/70"
      badgeText="text-emerald-700 dark:text-emerald-300"
    />
  );
};
