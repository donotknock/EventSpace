import React from 'react';
import { NodeProps } from '@xyflow/react';
import { AudioNode } from './AudioNode';

export const NoteNode: React.FC<NodeProps> = (props) => {
  return <AudioNode {...props} />;
};

export { AudioNode };
