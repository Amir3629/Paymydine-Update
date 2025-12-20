export interface EnvironmentConfig {
  apiBaseUrl: string;
  frontendUrl: string;
  wsUrl: string;
  environment: 'development' | 'production';
  tenantDetection: boolean;
  defaultTenant: string;
}

export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.detectEnvironment();
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private detectEnvironment(): EnvironmentConfig {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDevelopment = process.env.NODE_ENV === 'development' || isLocalhost;

    if (isDevelopment) {
      // Development environment - use Laravel backend
      return {
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
        frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
        wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
        environment: 'development',
        tenantDetection: false, // Disable tenant detection in development
        defaultTenant: 'paymydine'
      } as EnvironmentConfig;
    } else {
      // Production environment - automatically detect from current domain
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
      const currentDomain = hostname || 'paymydine.com';
      
      return {
        apiBaseUrl: `${protocol}//${currentDomain}`,
        frontendUrl: `${protocol}//${currentDomain}`,
        wsUrl: `${protocol === 'https:' ? 'wss:' : 'ws:'}//${currentDomain}`,
        environment: 'production',
        tenantDetection: true, // Enable tenant detection in production
        defaultTenant: 'paymydine'
      } as EnvironmentConfig;
    }
  }

  getConfig(): EnvironmentConfig {
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

  // Get API endpoint with tenant detection
  getApiEndpoint(endpoint: string): string {
    if (this.isProduction() && this.shouldDetectTenant()) {
      // In production, use relative URLs for same-origin requests
      return `/api/v1${endpoint}`;
    } else {
      // In development, use full URL to Laravel backend
      return `${this.getApiBaseUrl()}/api/v1${endpoint}`;
    }
  }
} 