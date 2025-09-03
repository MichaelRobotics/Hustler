// Admin Analytics Utility Functions
// These functions prepare data for backend integration while maintaining mock data support

export interface ProductSale {
  name: string;
  sales: number;
  revenue: number;
  type: string;
}

export interface SalesTotal {
  sales: number;
  revenue: number;
}

export interface SalesStats {
  affiliate: ProductSale[];
  myProducts: ProductSale[];
  affiliateTotal: SalesTotal;
  myProductsTotal: SalesTotal;
}

export interface FunnelStats {
  total: number;
  qualifiedUsers: number;
  converted: number;
}

export interface User {
  id: string;
  funnelId: string;
  isQualified: boolean;
  stepCompleted: number;
}

export interface SalesData {
  funnelId: string;
  name: string;
  price: number;
  type: string;
}

export interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  wasEverDeployed?: boolean;
  delay?: number;
  resources?: any[];
  flow?: any;
}

// Data processing functions for backend integration
export const processFunnelStats = (users: User[], funnelId: string): FunnelStats => {
  console.log('processFunnelStats called with:', { usersCount: users.length, funnelId });
  
  const funnelUsers = users.filter(u => u.funnelId === funnelId);
  console.log('Filtered funnel users:', { funnelUsersCount: funnelUsers.length, sampleUser: funnelUsers[0] });
  
  const result = {
    total: funnelUsers.length,
    qualifiedUsers: funnelUsers.filter(u => u.isQualified).length,
    converted: funnelUsers.filter(u => u.stepCompleted === 6).length,
  };
  
  console.log('Funnel stats result:', result);
  return result;
};

export const processSalesStats = (salesData: SalesData[], funnelId: string): SalesStats => {
  console.log('processSalesStats called with:', { salesDataCount: salesData.length, funnelId });
  
  const funnelSales = salesData.filter(s => s.funnelId === funnelId);
  console.log('Filtered funnel sales:', { funnelSalesCount: funnelSales.length, sampleSale: funnelSales[0] });
  
  const productSummary = funnelSales.reduce((acc: Record<string, ProductSale>, sale) => {
    if (!acc[sale.name]) {
      acc[sale.name] = { 
        name: sale.name, 
        sales: 0, 
        revenue: 0, 
        type: sale.type 
      };
    }
    acc[sale.name].sales += 1;
    acc[sale.name].revenue += sale.price;
    return acc;
  }, {});

  const allProducts = Object.values(productSummary);
  const affiliateProducts = allProducts.filter(p => p.type === 'AFFILIATE');
  const myProducts = allProducts.filter(p => p.type === 'MY_PRODUCTS');
  
  const affiliateTotal = affiliateProducts.reduce(
    (acc, p) => ({ 
      sales: acc.sales + p.sales, 
      revenue: acc.revenue + p.revenue 
    }), 
    { sales: 0, revenue: 0 }
  );
  
  const myProductsTotal = myProducts.reduce(
    (acc, p) => ({ 
      sales: acc.sales + p.sales, 
      revenue: acc.revenue + p.revenue 
    }), 
    { sales: 0, revenue: 0 }
  );

  const result = {
    affiliate: affiliateProducts.sort((a, b) => b.revenue - a.revenue),
    myProducts: myProducts.sort((a, b) => b.revenue - a.revenue),
    affiliateTotal,
    myProductsTotal
  };
  
  console.log('Sales stats result:', result);
  return result;
};

// Mock data generators (to be replaced with backend calls)
export const generateMockFunnelStats = (): FunnelStats => ({
  total: 1250,
  qualifiedUsers: 890,
  converted: 156,
});

export const generateMockSalesStats = (): SalesStats => ({
  affiliate: [
    { name: "Premium Course Bundle", sales: 45, revenue: 2250.00, type: "AFFILIATE" },
    { name: "Marketing Masterclass", sales: 32, revenue: 1280.00, type: "AFFILIATE" },
    { name: "Business Strategy Guide", sales: 28, revenue: 840.00, type: "AFFILIATE" },
  ],
  myProducts: [
    { name: "Hustler Pro Membership", sales: 89, revenue: 4450.00, type: "MY_PRODUCTS" },
    { name: "Funnel Builder Toolkit", sales: 67, revenue: 2010.00, type: "MY_PRODUCTS" },
    { name: "Analytics Dashboard", sales: 43, revenue: 1290.00, type: "MY_PRODUCTS" },
  ],
  affiliateTotal: { sales: 105, revenue: 4370.00 },
  myProductsTotal: { sales: 199, revenue: 7750.00 },
});

// Backend integration helpers
export const fetchFunnelStats = async (funnelId: string): Promise<FunnelStats> => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/funnels/${funnelId}/stats`);
  // return response.json();
  
  // For now, return mock data
  return generateMockFunnelStats();
};

export const fetchSalesStats = async (funnelId: string): Promise<SalesStats> => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/funnels/${funnelId}/sales`);
  // return response.json();
  
  // For now, return mock data
  return generateMockSalesStats();
};

export const fetchFunnelUsers = async (funnelId: string): Promise<User[]> => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/funnels/${funnelId}/users`);
  // return response.json();
  
  // For now, return mock data
  return [];
};

export const fetchFunnelSales = async (funnelId: string): Promise<SalesData[]> => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/funnels/${funnelId}/sales-data`);
  // return response.json();
  
  // For now, return mock data
  return [];
};

