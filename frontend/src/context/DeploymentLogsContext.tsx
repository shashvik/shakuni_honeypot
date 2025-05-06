import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DeploymentLog } from '@/components/deployment/DeploymentButton';

interface DeploymentLogsContextType {
  logs: DeploymentLog[];
  addLog: (log: DeploymentLog) => void;
  clearLogs: () => void;
}

const DeploymentLogsContext = createContext<DeploymentLogsContextType | undefined>(undefined);

export function useDeploymentLogs() {
  const context = useContext(DeploymentLogsContext);
  if (context === undefined) {
    throw new Error('useDeploymentLogs must be used within a DeploymentLogsProvider');
  }
  return context;
}

interface DeploymentLogsProviderProps {
  children: ReactNode;
}

export function DeploymentLogsProvider({ children }: DeploymentLogsProviderProps) {
  const [logs, setLogs] = useState<DeploymentLog[]>([]);

  const addLog = (log: DeploymentLog) => {
    setLogs((prevLogs) => [log, ...prevLogs]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <DeploymentLogsContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </DeploymentLogsContext.Provider>
  );
}