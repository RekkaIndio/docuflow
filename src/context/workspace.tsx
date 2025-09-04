"use client";
import React from 'react';
import type { Workspace } from '@/lib/types';

export const WorkspaceContext = React.createContext<Workspace | null>(null);

export function useWorkspace() {
  return React.useContext(WorkspaceContext);
}

export default WorkspaceContext;
