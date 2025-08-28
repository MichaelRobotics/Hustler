/**
 * --- Data Simulation Utility ---
 * This file contains functions for generating mock data for the application.
 * This is useful for development and demonstration purposes, allowing the UI
 * to be built and tested without a live backend.
 */

interface MockUser {
  id: string;
  funnelId: string;
  timestamp: number;
  selections: {
    niche: string | null;
    experience: string | null;
    painPoint: string | null;
  };
  stepCompleted: number;
  isQualified: boolean;
}

interface MockSale {
  type: 'AFFILIATE' | 'MY_PRODUCTS';
  funnelId: string;
  timestamp: number;
  name: string;
  price: number;
}

/**
 * Generates a specified number of mock user records.
 * It simulates user progression through different funnels and their choices,
 * providing realistic data for the analytics dashboard.
 * @param {number} userCount - The number of mock users to generate.
 * @returns {MockUser[]} An array of mock user objects.
 */
export const generateMockData = (userCount: number): MockUser[] => {
    const mockData: MockUser[] = [];
    const niches = ['DROPSHIPING', 'SMMA', 'AFFILIATE'];
    const experiences = ['BEGGINER', 'INTERMEDIATE', 'ADVANCED'];
    const painPoints = ['TRAFFIC', 'CONVERSION', 'SPEED'];
    
    for (let i = 0; i < userCount; i++) {
        const funnelId = Math.random() < 0.7 ? 'A' : 'B'; // Skew data for more interesting analytics
        const randomProgress = Math.random();
        let stepCompleted = 0;
        
        if (randomProgress > 0.3) stepCompleted = 1;
        if (randomProgress > 0.5) stepCompleted = 2;
        if (randomProgress > 0.7) stepCompleted = 3;
        if (randomProgress > 0.8) stepCompleted = 4;
        if (randomProgress > 0.9) stepCompleted = 5;
        if (randomProgress > 0.95) stepCompleted = 6;
        
        mockData.push({
            id: `mock-user-${i}`,
            funnelId,
            timestamp: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000, // Random timestamp in last 90 days
            selections: {
                niche: stepCompleted >= 2 ? niches[Math.floor(Math.random() * niches.length)] : null,
                experience: stepCompleted >= 3 ? experiences[Math.floor(Math.random() * experiences.length)] : null,
                painPoint: stepCompleted >= 4 ? painPoints[Math.floor(Math.random() * painPoints.length)] : null,
            },
            stepCompleted,
            isQualified: stepCompleted >= 4
        });
    }
    
    return mockData;
};

/**
 * Generates mock sales data for both affiliate and proprietary products.
 * @returns {MockSale[]} An array of mock sales objects.
 */
export const generateSalesData = (): MockSale[] => {
    const affiliateProducts = [
        { name: 'Beginner Traffic Course', price: 49 },
        { name: 'Advanced Dropshipping Strategies for High Volume Stores', price: 199 },
        { name: 'SMMA Client Acquisition Masterclass', price: 99 },
    ];
    
    const myProducts = [
        { name: 'My Ultimate E-commerce Guide to $100k Months', price: 79 },
        { name: 'Personal 1-on-1 Coaching Call with an Expert', price: 299 },
        { name: 'Exclusive Community Access Pass (Lifetime)', price: 29 },
    ];
    
    const sales: MockSale[] = [];
    
    // Generate affiliate sales
    for (let i = 0; i < 50 + Math.random() * 100; i++) {
        const product = affiliateProducts[Math.floor(Math.random() * affiliateProducts.length)];
        sales.push({ 
            type: 'AFFILIATE', 
            funnelId: Math.random() < 0.7 ? 'A' : 'B', 
            timestamp: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000, 
            ...product 
        });
    }
    
    // Generate my product sales
    for (let i = 0; i < 30 + Math.random() * 80; i++) {
        const product = myProducts[Math.floor(Math.random() * myProducts.length)];
        sales.push({ 
            type: 'MY_PRODUCTS', 
            funnelId: Math.random() < 0.7 ? 'A' : 'B', 
            timestamp: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000, 
            ...product 
        });
    }
    
    return sales;
};



