"use client"

import { useTenant } from '@/hooks/useTenant';
import { createContext, useContext } from 'react';

interface TenantContextType {
  tenant: any;
  loading: boolean;
  error: string | null;
  isMultiTenant: boolean;
  currentDomain: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const tenantData = useTenant();
  
  return (
    <TenantContext.Provider value={tenantData}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
} 