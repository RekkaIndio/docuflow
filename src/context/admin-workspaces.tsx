"use client";
import React from 'react';
import type { Workspace } from '@/lib/types';

export const AdminWorkspacesContext = React.createContext<Workspace[] | null>(null);

export function useAdminWorkspaces() {
  const ctx = React.useContext(AdminWorkspacesContext);
  return ctx || [];
}

export default AdminWorkspacesContext;
