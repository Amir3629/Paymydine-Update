import axios from 'axios';

// Detect current tenant from domain
const getCurrentTenant = () => {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  const domainParts = hostname.split('.');
  
  // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
  if (domainParts.length >= 3 && domainParts[1] === 'paymydine') {
    return domainParts[0];
  }
  
  return null;
};

// Create tenant-aware API client
const createTenantApi = () => {
  const tenant = getCurrentTenant();
  
  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Tenant': tenant || '',
    },
  });

  // Request interceptor to add tenant info
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add tenant header for backend routing
    if (tenant) {
      config.headers['X-Tenant'] = tenant;
    }
    
    return config;
  });

  // Response interceptor to handle errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth-token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return { api, tenant };
};

export const { api: tenantApi, tenant: currentTenant } = createTenantApi();

// Tenant-specific API functions
export const tenantApiService = {
  // Get restaurant info
  getRestaurantInfo: () => tenantApi.get('/restaurant/info'),
  
  // Get menu categories
  getMenuCategories: () => tenantApi.get('/menu/categories'),
  
  // Get menu items by category
  getMenuItems: (categoryId?: number) => 
    tenantApi.get(`/menu/items${categoryId ? `?category=${categoryId}` : ''}`),
  
  // Get specific menu item
  getMenuItem: (itemId: number) => tenantApi.get(`/menu/items/${itemId}`),
  
  // Submit order
  submitOrder: (orderData: any) => tenantApi.post('/orders', orderData),
  
  // Get order status
  getOrderStatus: (orderId: string) => tenantApi.get(`/orders/${orderId}`),
  
  // Get user orders
  getUserOrders: () => tenantApi.get('/orders'),
}; 
