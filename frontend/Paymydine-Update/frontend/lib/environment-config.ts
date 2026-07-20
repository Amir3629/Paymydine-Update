export interface EnvironmentConfigShape {
  apiBaseUrl: string;
  frontendUrl: string;
  wsUrl: string;
  environment: 'development' | 'production';
  tenantDetection: boolean;
  defaultTenant: string;
}

export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: EnvironmentConfigShape;

  private constructor() {
    this.config = this.detectEnvironment();
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private detectEnvironment(): EnvironmentConfigShape {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDevelopment = process.env.NODE_ENV === 'development' || isLocalhost;

    if (isDevelopment) {
      return {
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
        frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
        wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
        environment: 'development',
        tenantDetection: false,
        defaultTenant: 'paymydine',
      };
    }

    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    const currentDomain = hostname || 'paymydine.com';

    // In prod, we keep apiBaseUrl as same-origin by default.
    // Multi-tenant override is handled ONLY for specific endpoints inside getApiEndpoint.
    return {
      apiBaseUrl: `${protocol}//${currentDomain}`,
      frontendUrl: `${protocol}//${currentDomain}`,
      wsUrl: `${protocol === 'https:' ? 'wss:' : 'ws:'}//${currentDomain}`,
      environment: 'production',
      tenantDetection: true,
      defaultTenant: 'paymydine',
    };
  }

  getConfig(): EnvironmentConfigShape {
    return this.config;
  }

  getApiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  backendBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  getFrontendUrl(): string {
    return this.config.frontendUrl;
  }

  getWsUrl(): string {
    return this.config.wsUrl;
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  shouldDetectTenant(): boolean {
    return this.config.tenantDetection;
  }

  getDefaultTenant(): string {
    return this.config.defaultTenant;
  }

  // Build API endpoint URL
  getApiEndpoint(endpoint: string): string {
    const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // These endpoints must go through multi-tenant gateway (PHP).
    const MT_ENDPOINTS = new Set<string>([
      '/menu',
      '/categories',
      '/table-menu',
      '/table-info',
      '/restaurant',
    ]);

    // Helper: trim trailing slashes
    const trimSlash = (s: string) => (s || '').replace(/\/+$/, '');

    if (this.isProduction() && this.shouldDetectTenant()) {
      // Only route selected endpoints to multi-tenant base (if provided)
      if (MT_ENDPOINTS.has(ep)) {
        const mtBase = trimSlash((process.env.NEXT_PUBLIC_API_BASE_URL || '').trim());
        // If NEXT_PUBLIC_API_BASE_URL is set like "/api-server-multi-tenant.php"
        if (mtBase) return `${mtBase}/api/v1${ep}`;
        // fallback (same-origin)
        return `/api/v1${ep}`;
      }

      // Everything else (payments, orders, etc.) must remain same-origin
      return `/api/v1${ep}`;
    }

    // Development: use full backend base URL
    const base = trimSlash(this.getApiBaseUrl());
    return `${base}/api/v1${ep}`;
  }
}
