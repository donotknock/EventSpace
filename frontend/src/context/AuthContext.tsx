import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

export interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  role: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  role?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(api.getActiveWorkspaceId());
  const [isLoading, setIsLoading] = useState(true);

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id);
    api.setActiveWorkspaceId(id);
    window.location.reload(); // Reload events for new workspace
  };

  const refreshAuth = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setWorkspaces(data.workspaces || []);
      const currentWs = api.getActiveWorkspaceId();
      if (data.workspaces && data.workspaces.length > 0) {
        if (!currentWs || !data.workspaces.some((w: any) => w.id === currentWs)) {
          setActiveWorkspaceIdState(data.workspaces[0].id);
          api.setActiveWorkspaceId(data.workspaces[0].id);
        } else {
          setActiveWorkspaceIdState(currentWs);
        }
      }
    } catch {
      setUser(null);
      setWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async (username: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(username, pass);
      setUser(data.user);
      setWorkspaces(data.workspaces || []);
      if (data.workspaces && data.workspaces.length > 0) {
        const firstId = data.workspaces[0].id;
        setActiveWorkspaceIdState(firstId);
        api.setActiveWorkspaceId(firstId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceIdState(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspaceId,
        setActiveWorkspaceId,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
