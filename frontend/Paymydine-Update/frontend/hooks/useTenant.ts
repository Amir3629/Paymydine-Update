import { useState, useEffect } from 'react';

export interface TenantInfo {
  id: number;
  name: string;
  domain: string;
  database: string;
  email: string;
  phone: string;
  status: string;
  description?: string;
}

export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect current tenant from domain
  const getCurrentTenantDomain = () => {
    if (typeof window === 'undefined') return null;
    
    const hostname = window.location.hostname;
    const domainParts = hostname.split('.');
    
    // For development: localhost:3001 -> null (use default)
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
      return null;
    }
    
    // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
    if (domainParts.length >= 3 && domainParts[1] === 'paymydine') {
      return domainParts[0];
    }
    
    // For custom domains (e.g., "amir.com")
    if (domainParts.length >= 2 && domainParts[0] !== 'www') {
      return hostname;
    }
    
    return null;
  };

  useEffect(() => {
    const fetchTenantInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const tenantDomain = getCurrentTenantDomain();
        
        if (!tenantDomain) {
          // No tenant domain detected, use default
          setTenant(null);
          setLoading(false);
          return;
        }

        // Fetch tenant info from API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tenant/info?domain=${encodeURIComponent(tenantDomain)}`);
        
        if (!response.ok) {
          throw new Error('Restaurant not found');
        }
        
        const tenantData = await response.json();
        setTenant(tenantData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load restaurant');
        setTenant(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantInfo();
  }, []);

  return {
    tenant,
    loading,
    error,
    isMultiTenant: !!getCurrentTenantDomain(),
    currentDomain: getCurrentTenantDomain()
  };
} 