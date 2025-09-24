"use client";

import React, { useState, useEffect } from "react";
import { Button } from "frosted-ui";
import { TestTube, Zap, CheckCircle, XCircle, Loader } from "lucide-react";
import { apiPost, apiGet } from "../../utils/api-client";

interface WebhookTesterProps {
  conversationId: string;
  experienceId: string;
  funnelFlow: any;
  onTestComplete?: (result: any) => void;
}

interface OfferProduct {
  id: string;
  name: string;
  blockId: string;
  resourceName: string;
  whopProductId?: string;
  category: string;
  type: string;
}

interface TestResult {
  productId: string;
  productName: string;
  scenario: 'PRODUCT' | 'AFFILIATE' | 'error';
  success: boolean;
  message: string;
  webhookData?: any;
  realUserId?: string;
  actualProductId?: string;
  debug?: {
    originalProductId: string;
    foundProductId: string;
    experienceId: string;
    userId: string;
  };
}

export const WebhookTester: React.FC<WebhookTesterProps> = ({
  conversationId,
  experienceId,
  funnelFlow,
  onTestComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [offerProducts, setOfferProducts] = useState<OfferProduct[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Extract products from OFFER stage blocks with real resource data
  useEffect(() => {
    if (!funnelFlow) return;

    const loadProducts = async () => {
      try {
        const products: OfferProduct[] = [];
        
        // Find OFFER stage
        const offerStage = funnelFlow.stages?.find((stage: any) => stage.name === 'OFFER');
        if (!offerStage) return;

        // Get all blocks in OFFER stage
        for (const blockId of offerStage.blockIds || []) {
          const block = funnelFlow.blocks?.[blockId];
          if (block && block.resourceName) {
            // Try to get the actual resource data with whopProductId
            try {
              const response = await apiGet('/api/resources', experienceId);
              const result = await response.json();
              
              if (result.success && result.data?.resources) {
                // Find the resource that matches this block
                const matchingResource = result.data.resources.find((resource: any) => 
                  resource.name === block.resourceName && 
                  resource.category === 'PAID' &&
                  resource.type === 'MY_PRODUCTS'
                );
                
                if (matchingResource) {
                  products.push({
                    id: blockId,
                    name: block.resourceName,
                    blockId: blockId,
                    resourceName: block.resourceName,
                    whopProductId: matchingResource.whopProductId,
                    category: matchingResource.category,
                    type: matchingResource.type
                  });
                } else {
                  // Fallback to block data if no matching resource found
                  products.push({
                    id: blockId,
                    name: block.resourceName,
                    blockId: blockId,
                    resourceName: block.resourceName,
                    whopProductId: undefined,
                    category: 'PAID',
                    type: 'MY_PRODUCTS'
                  });
                }
              } else {
                // Fallback to block data if API call fails
                products.push({
                  id: blockId,
                  name: block.resourceName,
                  blockId: blockId,
                  resourceName: block.resourceName,
                  whopProductId: undefined,
                  category: 'PAID',
                  type: 'MY_PRODUCTS'
                });
              }
            } catch (error) {
              console.error('Error loading resource data:', error);
              // Fallback to block data
              products.push({
                id: blockId,
                name: block.resourceName,
                blockId: blockId,
                resourceName: block.resourceName,
                whopProductId: undefined,
                category: 'PAID',
                type: 'MY_PRODUCTS'
              });
            }
          }
        }

        setOfferProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };

    loadProducts();
  }, [funnelFlow, experienceId]);

  // Test webhook for a specific product
  const testWebhookForProduct = async (product: OfferProduct, scenario: 'PRODUCT' | 'AFFILIATE') => {
    try {
      setIsTesting(true);
      
      // Use the admin webhook test API with actual Whop product ID
      const response = await apiPost('/api/admin/webhook-test', {
        productId: product.whopProductId || product.id, // Use whopProductId if available, otherwise use internal ID
        productName: product.name,
        scenario,
        whopProductId: product.whopProductId // Pass the actual Whop product ID
      }, experienceId);

      const result = await response.json();

      const testResult: TestResult = {
        productId: product.id,
        productName: product.name,
        scenario,
        success: result.success,
        message: result.message || (result.success ? 'Webhook test successful' : 'Webhook test failed'),
        webhookData: result.webhookData,
        realUserId: result.realUserId,
        actualProductId: result.actualProductId,
        debug: result.debug
      };

      setTestResults(prev => [...prev, testResult]);
      onTestComplete?.(testResult);

    } catch (error) {
      console.error('Error testing webhook:', error);
      const testResult: TestResult = {
        productId: product.id,
        productName: product.name,
        scenario,
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setTestResults(prev => [...prev, testResult]);
    } finally {
      setIsTesting(false);
    }
  };

  // Test all products with both scenarios
  const testAllProducts = async () => {
    setIsLoading(true);
    setTestResults([]);

    for (const product of offerProducts) {
      // Test scenario 1: Whop Owner gets product revenue
      await testWebhookForProduct(product, 'PRODUCT');
      
      // Test scenario 2: Whop Owner gets affiliate commission
      await testWebhookForProduct(product, 'AFFILIATE');
    }

    setIsLoading(false);
  };

  // Clear test results
  const clearResults = () => {
    setTestResults([]);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
        size="2"
      >
        <TestTube size={16} className="mr-2" />
        Test Webhooks
      </Button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TestTube size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold">Webhook Testing</h3>
        </div>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="2"
        >
          ×
        </Button>
      </div>

      {/* Products List */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Products in OFFER Stage ({offerProducts.length})
        </h4>
        {offerProducts.length === 0 ? (
          <p className="text-sm text-gray-500">No products found in OFFER stage</p>
        ) : (
          <div className="space-y-2">
            {offerProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({product.category})</span>
                  {product.whopProductId && (
                    <div className="text-xs text-blue-600 mt-1">
                      Whop ID: {product.whopProductId}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => testWebhookForProduct(product, 'AFFILIATE')}
                    size="2"
                    variant="soft"
                    disabled={isTesting}
                    className="text-xs"
                  >
                    Test AFFILIATE
                  </Button>
                  <Button
                    onClick={() => testWebhookForProduct(product, 'PRODUCT')}
                    size="2"
                    variant="soft"
                    disabled={isTesting}
                    className="text-xs"
                  >
                    Test PRODUCT
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={testAllProducts}
          disabled={isLoading || isTesting || offerProducts.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <Loader size={16} className="mr-2 animate-spin" />
          ) : (
            <Zap size={16} className="mr-2" />
          )}
          Test All Products
        </Button>
        {testResults.length > 0 && (
          <Button
            onClick={clearResults}
            variant="soft"
            size="2"
          >
            Clear Results
          </Button>
        )}
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Test Results</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    <span className="text-sm font-medium">{result.productName}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      result.scenario === 'AFFILIATE' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {result.scenario}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{result.message}</p>
                {result.debug && (
                  <div className="text-xs text-blue-600 mt-1">
                    <div>Real User: {result.realUserId}</div>
                    <div>Product ID: {result.actualProductId}</div>
                    <div>Experience: {result.debug.experienceId}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-800">
        <strong>Webhook Testing:</strong> This will send dummy webhook events to test your analytics system.
        <br />
        <strong>Scenario 1 (Affiliate):</strong> You get affiliate commission
        <br />
        <strong>Scenario 2 (Product Owner):</strong> Other company gets affiliate commission
      </div>
    </div>
  );
};
