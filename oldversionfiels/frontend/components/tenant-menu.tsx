"use client"

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import { tenantApiService, currentTenant } from '@/lib/tenant-api';
import { useCartStore } from '@/store/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Minus } from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image?: string;
  category_id: number;
  available: boolean;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface RestaurantInfo {
  name: string;
  description: string;
  logo?: string;
  address?: string;
  phone?: string;
}

export function TenantMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  const { addItem, removeItem, getItemQuantity, items } = useCartStore();

  useEffect(() => {
    const loadRestaurantData = async () => {
      try {
        setLoading(true);
        
        // Load restaurant info
        const restaurantResponse = await tenantApiService.getRestaurantInfo();
        setRestaurantInfo(restaurantResponse.data);
        
        // Load categories
        const categoriesResponse = await tenantApiService.getMenuCategories();
        setCategories(categoriesResponse.data);
        
        // Load all menu items
        const menuResponse = await tenantApiService.getMenuItems();
        setMenuItems(menuResponse.data);
        
      } catch (error) {
        console.error('Error loading restaurant data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentTenant) {
      loadRestaurantData();
    }
  }, [currentTenant]);

  const filteredItems = selectedCategory 
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold mb-2">Restaurant Not Found</h2>
        <p className="text-gray-600">Please access this page through a valid restaurant domain.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Restaurant Header */}
      {restaurantInfo && (
        <div className="text-center mb-8">
          {restaurantInfo.logo && (
            <img 
              src={restaurantInfo.logo} 
              alt={restaurantInfo.name}
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {restaurantInfo.name}
          </h1>
          <p className="text-gray-600 mb-4">{restaurantInfo.description}</p>
          {restaurantInfo.address && (
            <p className="text-sm text-gray-500">{restaurantInfo.address}</p>
          )}
        </div>
      )}

      {/* Menu Tabs */}
      <Tabs 
        value={selectedCategory?.toString() || "all"} 
        onValueChange={(value) => setSelectedCategory(value === "all" ? null : parseInt(value))}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-auto-fit">
          <TabsTrigger value="all">All Items</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id.toString()}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory?.toString() || "all"} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {item.image && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant={item.available ? "default" : "secondary"}>
                      {item.available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-semibold">
              {formatCurrency(item.price)}
                    </span>
                    {item.available && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItem(item.id)}
                          disabled={getItemQuantity(item.id) === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[20px] text-center">
                          {getItemQuantity(item.id)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => addItem({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            quantity: 1
                          })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Cart Summary */}
      {items.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
          <h3 className="font-semibold mb-2">Cart ({items.length} items)</h3>
          <p className="text-sm text-gray-600 mb-2">
          Total: {formatCurrency(items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
          </p>
          <Button className="w-full" size="sm">
            View Cart
          </Button>
        </div>
      )}
    </div>
  );
} 