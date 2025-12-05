// API Configuration - Dynamic for production
import { EnvironmentConfig } from './environment-config';

const envConfig = EnvironmentConfig.getInstance();
const API_BASE_URL = envConfig.getApiBaseUrl();
const FRONTEND_URL = envConfig.getFrontendUrl();

// Types
export interface MenuItem {
  id: number;
  name: string;
  nameKey?: string;
  description: string;
  descriptionKey?: string;
  price: number;
  image: string;
  category_id?: number;
  category_name?: string;
  calories?: number;
  allergens?: string[];
  stock_qty?: number;
  minimum_qty?: number;
  available?: boolean;
  options?: MenuItemOption[];
}

export interface MenuItemOption {
  id: number;
  name: string;
  display_type: 'radio' | 'checkbox' | 'select';
  required: boolean;
  values: MenuItemOptionValue[];
}

export interface MenuItemOptionValue {
  id: number;
  value: string;
  price: number;
  is_default?: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
}

export interface MenuResponse {
  success: boolean;
  data: {
    items?: MenuItem[];
    categories?: Category[];
  };
}

export interface OrderRequest {
  table_id: string;
  items: {
    menu_id: number;
    name: string;
    quantity: number;
    price: number;
    special_instructions?: string;
  }[];
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  payment_method: 'cod' | 'card' | 'paypal';
  total_amount: number;
  tip_amount?: number;
  special_instructions?: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  order_id?: number;
}

export interface RestaurantInfo {
  id: number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  telephone: string;
  description: string;
  logo?: string | null;
}

export interface OrderStatusResponse {
  success: boolean;
  data: {
    order_id: number;
    status_id: number;
    status_name: string;
    customer_status: number; // 0=Kitchen, 1=Preparing, 2=On Way
    updated_at: string;
  };
}

export interface PaymentMethod {
  code: string;
  name: string;
  priority: number;
}

// Fallback data for offline mode - No default food items
const fallbackMenuData: MenuResponse = {
  success: true,
  data: {
    items: [],
    categories: []
  }
};

const fallbackRestaurantInfo: RestaurantInfo = {
  id: 1,
  name: "Restaurant",
  address: "",
  city: "",
  state: "",
  telephone: "",
  description: ""
};

import { MultiTenantConfig } from './multi-tenant-config';

const multiTenantConfig = MultiTenantConfig.getInstance();

// API Client Class
import type { ThemeSettings } from '@/store/theme-store'

export class ApiClient {
  private baseURL: string;
  private envConfig: EnvironmentConfig;
  
  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.envConfig = EnvironmentConfig.getInstance();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const msg = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} @ ${endpoint}: ${msg}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  private getApiBaseUrl(): string {
    return multiTenantConfig.getApiBaseUrl();
  }

  async getMenu(): Promise<MenuResponse> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/menu');
      // Add cache-busting parameter - handle SSR safely
      let url: URL;
      if (endpoint.startsWith('http')) {
        url = new URL(endpoint);
      } else {
        // For relative URLs, provide a base URL for SSR
        const base = typeof window !== 'undefined' 
          ? window.location.origin 
          : (process.env.NEXT_PUBLIC_SITE_URL || 'https://amir.paymydine.com');
        url = new URL(endpoint, base);
      }
      url.searchParams.set('_t', Date.now().toString());
      const response = await fetch(url.toString());
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch menu from API, using fallback:', error);
      // FIXED: Return fallback data instead of throwing error
      return fallbackMenuData;
    }
  }

  async getCategories(): Promise<{ success: boolean; data: Category[] }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/categories');
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Using fallback categories due to API error:', error);
      return {
        success: true,
        data: fallbackMenuData.data.categories || []
      };
    }
  }

  async getMenuItems(categoryId?: number): Promise<{ success: boolean; data: MenuItem[] }> {
    try {
      const menuResponse = await this.getMenu();
      let items = menuResponse.data.items || [];
      
      if (categoryId) {
        items = items.filter(item => item.category_id === categoryId);
      }
      
      return {
        success: true,
        data: items
      };
    } catch (error) {
      console.log('Using fallback menu items due to API error:', error);
      return {
        success: true,
        data: fallbackMenuData.data.items || []
      };
    }
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/payments');
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) {
        return [];
      }
      
      // Ensure stable order (backend already orders by priority, but be defensive)
      return [...data.data].sort((a, b) => a.priority - b.priority);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      return [];
    }
  }

  async submitOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/orders');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Order submission failed:', error);
      throw error; // Force the error instead of using mock response
    }
  }

  // Removed duplicate method - using the one below instead

  async getUserOrders(userId: number): Promise<{ success: boolean; data: any[] }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint(`/user/${userId}/orders`);
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.log('User orders fetch failed:', error);
      return {
        success: true,
        data: []
      };
    }
  }

  async getTableByQrCode(qrCode: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      // This would typically decode the QR code and return table info
      return {
        success: true,
        data: {
          table_id: "7",
          table_name: "Table 7",
          restaurant_id: 1
        }
      };
    } catch (error) {
      console.log('QR code processing failed:', error);
      return {
        success: false,
        message: 'Invalid QR code'
      };
    }
  }

  async callWaiter(tableId: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/waiter-call');
      // normalize inputs
      const safeTableId = String(tableId ?? '').trim();
      const safeMessage = (message ?? '').trim();
      if (!safeTableId) throw new Error('Missing table_id');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ table_id: safeTableId, message: safeMessage }),
      });
      
      if (!response.ok) {
        // Try to read API validation message
        let errMsg = `HTTP ${response.status}`;
        try { const j = await response.json(); if (j?.message) errMsg = j.message; } catch {}
        throw new Error(errMsg);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Waiter call failed:', error);
      throw error; // Force the error instead of using mock response
    }
  }

  async callTableNote(
    tableId: string | number,
    note: string,
    timestamp?: string
  ): Promise<{ ok?: boolean; success?: boolean; message: string; id?: number }> {
    const body = {
      table_id: String(tableId),                 // <- ensure string (backend expects string)
      note: (note ?? '').trim(),                 // <- no null/whitespace
      timestamp: timestamp ?? new Date().toISOString(), // <- always present
    };

    try {
      const endpoint = this.envConfig.getApiEndpoint('/table-notes');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // read server message so 422 explains itself in console/toast
        const msg = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${msg}`);
      }

      return await res.json();
    } catch (err) {
      console.error('Table note failed:', err);
      throw err;
    }
  }

  // Optional: valet  creates a notification too
  async createValetRequest(input: {
    name: string;
    license_plate: string;
    car_make?: string;
    table_id?: string;
  }): Promise<{ ok?: boolean; success?: boolean; message: string; id?: number }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/valet-request');
      const body = JSON.stringify(Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined)
      ));
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Valet request failed:', error);
      throw error;
    }
  }

  async getSettings(): Promise<{ success: boolean; data: any }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/settings');
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Settings fetch failed:', error);
      return {
        success: true,
        data: {
          restaurant_name: 'PayMyDine Restaurant',
          currency: 'EUR',
          tax_rate: 0.19,
          service_charge: 0.10,
        }
      };
    }
  }

  async getTaxSettings(): Promise<{ success: boolean; data: any }> {
    try {
      // Try /tax-settings endpoint first (like /simple-theme)
      const base = typeof window !== 'undefined' ? window.location.origin : this.getApiBaseUrl();
      const res = await fetch(`${base}/tax-settings`, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
      // Fallback: try to get from /settings endpoint
      const settingsRes = await this.getSettings();
      if (settingsRes && (settingsRes.tax_mode !== undefined || settingsRes.data?.tax_mode !== undefined)) {
        const data = settingsRes.data || settingsRes;
        return {
          success: true,
          data: {
            tax_mode: data.tax_mode || '0',
            tax_percentage: data.tax_percentage || '0',
            tax_menu_price: data.tax_menu_price || '1',
          }
        };
      }
      // If not found, return defaults
      throw new Error('Tax settings not found');
    } catch (error) {
      console.error('Failed to fetch tax settings:', error);
      // Return default tax settings
      return {
        success: true,
        data: {
          tax_mode: '0',
          tax_percentage: '0',
          tax_menu_price: '1',
        }
      };
    }
  }

  async validateCoupon(code: string, subtotal: number): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : this.getApiBaseUrl();
      const res = await fetch(`${base}/validate-coupon`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, subtotal }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to validate coupon' }));
        return {
          success: false,
          message: errorData.message || 'Failed to validate coupon',
        };
      }
      
      const json = await res.json();
      return json;
    } catch (error) {
      console.error('Failed to validate coupon:', error);
      return {
        success: false,
        message: 'Failed to validate coupon',
      };
    }
  }

  async getRestaurantInfo(locationId: number = 1): Promise<{ success: boolean; data: RestaurantInfo }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint(`/restaurant`);
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Restaurant info fetch failed, using fallback:', error);
      return {
        success: true,
        data: fallbackRestaurantInfo
      };
    }
  }

  async getOrderStatus(orderId: number): Promise<OrderStatusResponse> {
    try {
      const endpoint = this.envConfig.getApiEndpoint(`/order-status?order_id=${orderId}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Order status fetch failed:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: number, statusId: number): Promise<{ success: boolean; message: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/order-status');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          status_id: statusId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Order status update failed:', error);
      throw error;
    }
  }

  // Table-specific methods
  async getTableInfo(tableId: string, qrCode?: string, useTableNo: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (tableId) {
        if (useTableNo) {
          params.append('table_no', tableId);
        } else {
          params.append('table_id', tableId);
        }
      }
      if (qrCode) params.append('qr_code', qrCode);
      
      const endpoint = this.envConfig.getApiEndpoint(`/table-info?${params}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Table info fetch failed:', error);
      return { success: false, error: 'Failed to fetch table information' };
    }
  }

  async getTableMenu(tableId: string, locationId?: number): Promise<MenuResponse> {
    try {
      const params = new URLSearchParams();
      params.append('table_id', tableId);
      if (locationId) params.append('location_id', locationId.toString());
      
      const endpoint = this.envConfig.getApiEndpoint(`/table-menu?${params.toString()}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Table menu fetch failed, using fallback:', error);
      return fallbackMenuData;
    }
  }

  async getTableOrders(tableId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint(`/table-orders?table_id=${tableId}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Table orders fetch failed:', error);
      return { success: false, error: 'Failed to fetch table orders' };
    }
  }

  async getThemeSettings(): Promise<{ success: boolean; data: any }> {
    try {
      // Always hit same-origin to avoid port mismatch (proxy keeps URL on 8000)
      const base = typeof window !== 'undefined' ? window.location.origin : this.getApiBaseUrl();
      const res = await fetch(`${base}/simple-theme`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json;
    } catch (error) {
      console.error('Failed to fetch theme settings:', error);
      // Return default theme settings
      return {
        success: true,
        data: {
          theme_id: 'clean-light',
          primary_color: '#E7CBA9',
          secondary_color: '#EFC7B1',
          accent_color: '#3B3B3B',
          background_color: '#FAFAFA'
        }
      };
    }
  }

  async updateThemeSettings(settings: Partial<ThemeSettings>): Promise<{ success: boolean; message: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/theme-settings');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to update theme settings:', error);
      return {
        success: false,
        message: 'Failed to update theme settings'
      };
    }
  }

  // NEW: Table-specific methods for api-server2.php
  async getTables(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/tables');
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Failed to fetch tables' };
    }
  }

  async createTable(tableData: {
    table_name: string;
    location_id?: number;
    min_capacity?: number;
    max_capacity?: number;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/create-table');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Failed to create table' };
    }
  }

  async updateTable(tableId: string, tableData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/update-table');
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableId, ...tableData }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Failed to update table' };
    }
  }

  async deleteTable(tableId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint(`/delete-table?table_id=${tableId}`);
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Failed to delete table' };
    }
  }

  async generateQRCode(tableId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint('/generate-qr');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableId }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Failed to generate QR code' };
    }
  }

  async getTableStats(tableId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const endpoint = this.envConfig.getApiEndpoint(`/table-stats?table_id=${tableId}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Failed to fetch table stats' };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
