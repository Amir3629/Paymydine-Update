export interface TenantConfig {
  tenant_id: number;
  name: string;
  domain: string;
  database: string;
  frontend_url: string;
  table_url_pattern: string;
}

export class MultiTenantConfig {
  private static instance: MultiTenantConfig;
  private tenantInfo: TenantConfig | null = null;
  
  private constructor() {}
  
  static getInstance(): MultiTenantConfig {
    if (!MultiTenantConfig.instance) {
      MultiTenantConfig.instance = new MultiTenantConfig();
    }
    return MultiTenantConfig.instance;
  }
  
  async detectTenant(): Promise<TenantConfig | null> {
    try {
      const response = await fetch('/api-server-multi-tenant.php/tenant-info');
      const data = await response.json();
      
      if (data.success) {
        this.tenantInfo = data.data;
        return this.tenantInfo;
      }
    } catch (error) {
      console.error('Failed to detect tenant:', error);
    }
    
    return null;
  }
  
  getTenantInfo(): TenantConfig | null {
    return this.tenantInfo;
  }
  
  getApiBaseUrl(): string {
    if (this.tenantInfo) {
      return `http://${this.tenantInfo.domain}/api-server-multi-tenant.php`;
    }
    if (typeof window !== 'undefined') {
      // Allow forcing a remote/public backend from local via env
      const override = (window as any)?.__NEXT_PUBLIC_API_BASE_URL__ || process.env.NEXT_PUBLIC_API_BASE_URL;
      if (override) return override;
      const host = window.location.hostname;
      const fullHost = window.location.host;
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      // Special-case local Next served on 127.0.0.1:8000 to call PHP on 8001 directly
      if (fullHost === '127.0.0.1:8000') {
        // Prefer multi-tenant gateway if available; fallback to api-server.php
        return 'http://127.0.0.1:8001/api-server-multi-tenant.php';
      }
      return isLocal
        ? (process.env.NEXT_PUBLIC_API_BASE_URL || `${window.location.origin}/api-server-multi-tenant.php`)
        : `${window.location.origin}/api-server-multi-tenant.php`;
    }
    // SSR fallback
    return process.env.NEXT_PUBLIC_API_BASE_URL || '/api-server-multi-tenant.php';
  }
  
  getTableUrl(tableId: string): string {
    if (this.tenantInfo) {
      return this.tenantInfo.table_url_pattern.replace('{table_id}', tableId);
    }
    return `http://localhost:3000/table/${tableId}`; // Fallback
  }
  
  getFrontendUrl(): string {
    if (this.tenantInfo) {
      return this.tenantInfo.frontend_url;
    }
    return 'http://localhost:3000'; // Fallback
  }
} 