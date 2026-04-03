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
    // Client-side: prefer explicit override, else always same-origin to avoid CORS/mixed-content
    if (typeof window !== 'undefined') {
      const override = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const isHttpsPage = window.location.protocol === 'https:';
      const isUnsafeOverride = override.startsWith('http://localhost') || override.startsWith('http://127.0.0.1');
      const isProtocolDowngrade = isHttpsPage && override.startsWith('http:');

      // Only use override when it is explicitly set and safe for the current context
      if (override && !isUnsafeOverride && !isProtocolDowngrade) {
        return override;
      }
      // Default to same-origin tenant gateway
      return `${window.location.origin}/api-server-multi-tenant.php`;
    }

    // Server-side render fallback: use explicit override if provided, else relative path
    return process.env.NEXT_PUBLIC_API_BASE_URL || '/api-server-multi-tenant.php';
  }
  
  getTableUrl(tableId: string): string {
    if (this.tenantInfo) {
      return this.tenantInfo.table_url_pattern.replace('{table_id}', tableId);
    }
    return `http://localhost:3001/table/${tableId}`; // Fallback
  }
  
  getFrontendUrl(): string {
    if (this.tenantInfo) {
      return this.tenantInfo.frontend_url;
    }
    return 'http://localhost:3001'; // Fallback
  }
} 
