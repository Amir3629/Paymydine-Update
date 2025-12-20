// API Configuration - Dynamic for production
// Always prefer same-origin proxy on the client to avoid dev localhost leaks
const API_BASE_URL = (typeof window !== 'undefined'
  ? `${window.location.origin}/api-server-multi-tenant.php`
  : (process.env.NEXT_PUBLIC_API_BASE_URL || '/api-server-multi-tenant.php'));
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'; // FIXED: Changed to 3001

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

// Fallback data for offline mode
const fallbackMenuData: MenuResponse = {
  success: true,
  data: {
    items: [
      {
        id: 1,
        name: "Puff-Puff",
        description: "Delicious fried dough balls",
        price: 4.99,
        image: "/images/placeholder-food.jpg",
        category_id: 1,
        category_name: "Starters",
        available: true,
        stock_qty: 10,
        minimum_qty: 1
      },
      {
        id: 2,
        name: "SCOTCH EGG",
        description: "Hard-boiled egg wrapped in sausage",
        price: 2.00,
        image: "/images/placeholder-food.jpg",
        category_id: 1,
        category_name: "Starters",
        available: true,
        stock_qty: 5,
        minimum_qty: 1
      },
      {
        id: 3,
        name: "ATA RICE",
        description: "Spicy rice with peppers",
        price: 12.00,
        image: "/images/placeholder-food.jpg",
        category_id: 2,
        category_name: "Mains",
        available: true,
        stock_qty: 8,
        minimum_qty: 1
      }
    ],
    categories: [
      { id: 1, name: "Starters", description: "Appetizers and starters" },
      { id: 2, name: "Mains", description: "Main courses" },
      { id: 3, name: "Desserts", description: "Sweet treats" },
      { id: 4, name: "Drinks", description: "Beverages" }
    ]
  }
};

const fallbackRestaurantInfo: RestaurantInfo = {
  id: 1,
  name: "PayMyDine Restaurant",
  address: "123 Main Street",
  city: "City",
  state: "State",
  telephone: "+1234567890",
  description: "A luxurious dining experience"
};

import { MultiTenantConfig } from './multi-tenant-config';

const multiTenantConfig = MultiTenantConfig.getInstance();

// API Client Class
import type { ThemeSettings } from '@/store/theme-store'

export class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Build URL; for local PHP dev server, use query-style routing (?action=...)
    const isBrowser = typeof window !== 'undefined';
    const isLocalHost = isBrowser && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
    const isActionGateway = this.baseURL.includes('api-server-multi-tenant.php') || this.baseURL.includes('api-server2.php');
    let url = `${this.baseURL}${endpoint}`;
    if (isLocalHost && isActionGateway && this.baseURL.startsWith('http://127.0.0.1:8001')) {
      const action = endpoint.replace(/^\//, '');
      // Preserve existing query if any
      const [pathOnly, queryPart] = action.split('?');
      url = `${this.baseURL}?action=${encodeURIComponent(pathOnly)}${queryPart ? `&${queryPart}` : ''}`;
    }
    
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
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${text?.slice(0,200)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();
      if (contentType.includes('application/json')) {
        try {
          return JSON.parse(rawText);
        } catch (e) {
          throw new Error(`Invalid JSON from ${endpoint}: ${rawText.slice(0,200)}`);
        }
      }
      // Some servers may miss content-type; attempt to parse JSON first, else surface snippet
      try {
        return JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Non-JSON response from ${endpoint}: ${rawText.slice(0,200)}`);
      }
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
      this.baseURL = this.getApiBaseUrl();
      // Prefer table-scoped menu when a table_id is present in URL (browser)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search || '');
        const tableId = params.get('table_id') || params.get('table') || params.get('tid');
        if (tableId) {
          const tableRaw = await this.request<any>(`/table-menu?table_id=${encodeURIComponent(tableId)}`, { method: 'GET' });
          // Normalize potential shapes
          if (tableRaw?.success && tableRaw?.data) return tableRaw as MenuResponse;
          if (Array.isArray(tableRaw?.data)) {
            return { success: true, data: { items: tableRaw.data, categories: [] } } as MenuResponse;
          }
          // If table endpoint misbehaves, fall back to generic menu
        }
      }

      const raw = await this.request<any>('/menu', { method: 'GET' });
      // Normalize tenant API shape → MenuResponse
      if (Array.isArray(raw?.data)) {
        return { success: true, data: { items: raw.data, categories: [] } } as MenuResponse;
      }
      if (raw?.success && raw?.data?.items) {
        return raw as MenuResponse;
      }
      // If unexpected shape, fail back to fallback
      return fallbackMenuData;
    } catch (error) {
      console.error('Failed to fetch menu from API, using fallback:', error);
      return fallbackMenuData;
    }
  }

  async getCategories(): Promise<{ success: boolean; data: Category[] }> {
    try {
      this.baseURL = this.getApiBaseUrl();
      const response = await this.request<any>('/categories');
      // Normalize to Category[] with name
      const data: Category[] = (response?.data || response || []).map((c: any) => ({
        id: Number(c.category_id ?? c.id ?? 0),
        name: c.category_name ?? c.name ?? String(c),
        description: c.description ?? undefined,
        image: c.image ?? undefined,
      }));
      return { success: true, data };
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
      this.baseURL = this.getApiBaseUrl();
      const useMultiTenant = this.baseURL.includes('api-server-multi-tenant.php');
      // Map payload for both gateways
      const transformedMultiTenant = {
        first_name: order.customer_name || 'Guest',
        order_total: order.total_amount,
        payment: order.payment_method,
        table_name: order.table_id ? `Table ${order.table_id}` : 'Table',
        items: order.items.map(i => ({ id: i.menu_id, name: i.name, quantity: i.quantity, price: i.price })),
      };
      const transformedLegacy = {
        customer_name: order.customer_name || 'Guest',
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        table_name: order.table_id ? `Table ${order.table_id}` : 'Table',
        items: order.items.map(i => ({ menu_id: i.menu_id, name: i.name, quantity: i.quantity, price: i.price })),
      };
      const response = await this.request<OrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify(useMultiTenant ? transformedMultiTenant : transformedLegacy),
      });
      return response;
    } catch (error) {
      console.error('Order submission failed:', error);
      throw error; // Force the error instead of using mock response
    }
  }

  // Removed duplicate method - using the one below instead

  async getUserOrders(userId: number): Promise<{ success: boolean; data: any[] }> {
    try {
      const response = await this.request<{ success: boolean; data: any[] }>(`/user/${userId}/orders`);
      return response;
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
      const response = await this.request<{ success: boolean; message: string }>('/waiter-call', {
      method: 'POST',
        body: JSON.stringify({
          table_id: tableId,
          message: message
        }),
      });
      return response;
    } catch (error) {
      console.error('Waiter call failed:', error);
      throw error; // Force the error instead of using mock response
    }
  }

  async getSettings(): Promise<{ success: boolean; data: any }> {
    try {
      const response = await this.request<{ success: boolean; data: any }>('/settings');
      return response;
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
      const response = await this.request<{ success: boolean; data: RestaurantInfo }>(`/restaurant/${locationId}`);
      return response;
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
      const response = await this.request<OrderStatusResponse>(`/order-status?order_id=${orderId}`);
      return response;
    } catch (error) {
      console.error('Order status fetch failed:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: number, statusId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.request<{ success: boolean; message: string }>('/order-status', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          status_id: statusId
        })
      });
      return response;
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
      
      const response = await fetch(`${this.getApiBaseUrl()}/table-info?${params}`);
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
      
      const response = await this.request<MenuResponse>(`/table-menu?${params.toString()}`);
      return response;
    } catch (error) {
      console.log('Table menu fetch failed, using fallback:', error);
      return fallbackMenuData;
    }
  }

  async getTableOrders(tableId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; data?: any[]; error?: string }>(`/table-orders?table_id=${tableId}`);
      return response;
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
      const response = await this.request<{ success: boolean; message: string }>('/theme-settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      return response;
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
      const response = await fetch(`${this.getApiBaseUrl().replace('api-server-multi-tenant.php', 'api-server2.php')}/tables`);
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
      const response = await fetch(`${this.getApiBaseUrl().replace('api-server-multi-tenant.php', 'api-server2.php')}/create-table`, {
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
      const response = await fetch(`${this.getApiBaseUrl().replace('api-server-multi-tenant.php', 'api-server2.php')}/update-table`, {
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
      const response = await fetch(`${this.getApiBaseUrl().replace('api-server-multi-tenant.php', 'api-server2.php')}/delete-table?table_id=${tableId}`, {
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
      const response = await fetch(`${this.getApiBaseUrl().replace('api-server-multi-tenant.php', 'api-server2.php')}/generate-qr`, {
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
      const response = await fetch(`${this.getApiBaseUrl().replace('api-server-multi-tenant.php', 'api-server2.php')}/table-stats?table_id=${tableId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Failed to fetch table stats' };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();