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
  payment_method: 'cash' | 'card' | 'paypal';
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
        throw new Error(`HTTP error! status: ${response.status}`);
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
      const response = await fetch(endpoint);
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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: tableId,
          message: message
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Waiter call failed:', error);
      throw error; // Force the error instead of using mock response
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
  async getTableInfo(tableId: string, qrCode?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (tableId) params.append('table_id', tableId);
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