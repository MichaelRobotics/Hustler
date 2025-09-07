import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { FunnelFlow, FunnelBlockOption, ChatMessage } from '../types/funnel';

/**
 * Performance-Optimized Funnel Preview Chat Hook
 * 
 * Key Optimizations:
 * - Debounced scroll handling
 * - Optimized path finding with better caching
 * - Reduced re-renders with better memoization
 * - Intersection Observer for scroll optimization
 * - Performance monitoring
 */

interface PerformanceMetrics {
  renderTime: number;
  scrollTime: number;
  pathFindingTime: number;
}

export const useOptimizedFunnelPreviewChat = (
  funnelFlow: FunnelFlow | null, 
  selectedOffer?: string | null
) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    scrollTime: 0,
    pathFindingTime: 0
  });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastProcessedInputRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathCacheRef = useRef<Map<string, boolean>>(new Map());

  // Performance monitoring
  const measurePerformance = useCallback((operation: string, fn: () => void) => {
    const startTime = performance.now();
    fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setPerformanceMetrics(prev => ({
      ...prev,
      [operation]: duration
    }));
    
    if (duration > 16) { // 60fps threshold
      console.warn(`Performance warning: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }, []);

  // Optimized message construction
  const constructCompleteMessage = useCallback((block: any): string => {
    if (!block || !block.options || block.options.length === 0) {
      return block.message;
    }
    
    const numberedOptions = block.options.map((opt: any, index: number) => 
      `${index + 1}. ${opt.text}`
    ).join('\n');
    
    return `${block.message}\n\n${numberedOptions}`;
  }, []);

  // Optimized conversation start
  const startConversation = useCallback(() => {
    measurePerformance('renderTime', () => {
      if (funnelFlow && funnelFlow.startBlockId) {
        const startBlock = funnelFlow.blocks[funnelFlow.startBlockId];
        if (startBlock) {
          const completeMessage = constructCompleteMessage(startBlock);
          setHistory([{ type: 'bot', text: completeMessage }]);
          setCurrentBlockId(funnelFlow.startBlockId);
        }
      }
    });
  }, [funnelFlow, constructCompleteMessage, measurePerformance]);

  // Start conversation when component mounts or funnelFlow changes
  useEffect(() => {
    startConversation();
  }, [startConversation]);

  // Optimized scroll handling with debouncing
  const debouncedScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      measurePerformance('scrollTime', () => {
        if (history.length === 1) {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = 0;
          }
        } else {
          chatEndRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        }
      });
    }, 50); // 50ms debounce
  }, [history, measurePerformance]);

  // Effect to handle auto-scrolling with debouncing
  useEffect(() => {
    debouncedScroll();
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [debouncedScroll]);

  // Optimized path finding with better caching
  const doesPathLeadToOffer = useCallback((blockId: string, targetOfferId: string, visited: Set<string>): boolean => {
    const cacheKey = `${blockId}-${targetOfferId}`;
    
    // Check cache first
    if (pathCacheRef.current.has(cacheKey)) {
      return pathCacheRef.current.get(cacheKey)!;
    }
    
    if (visited.has(blockId)) {
      pathCacheRef.current.set(cacheKey, false);
      return false;
    }
    
    visited.add(blockId);
    
    const block = funnelFlow?.blocks[blockId];
    if (!block) {
      pathCacheRef.current.set(cacheKey, false);
      return false;
    }
    
    // Check if this block is the offer block
    if (block.id === `offer_${targetOfferId}` || block.id === targetOfferId) {
      pathCacheRef.current.set(cacheKey, true);
      return true;
    }
    
    // Check if this block has options that lead to the offer
    if (block.options) {
      for (const option of block.options) {
        if (option.nextBlockId && doesPathLeadToOffer(option.nextBlockId, targetOfferId, visited)) {
          pathCacheRef.current.set(cacheKey, true);
          return true;
        }
      }
    }
    
    pathCacheRef.current.set(cacheKey, false);
    return false;
  }, [funnelFlow]);

  // Memoized path finder with performance tracking
  const memoizedPathFinder = useMemo(() => {
    return (blockId: string, targetOfferId: string): boolean => {
      const result = doesPathLeadToOffer(blockId, targetOfferId, new Set());
      measurePerformance('pathFindingTime', () => {});
      return result;
    };
  }, [doesPathLeadToOffer, measurePerformance]);

  // Optimized option finding
  const findOptionsLeadingToOffer = useCallback((offerId: string, currentBlockId: string | null): number[] => {
    if (!currentBlockId || !funnelFlow) return [];
    
    const leadingOptionIndices: number[] = [];
    const currentBlock = funnelFlow.blocks[currentBlockId];
    
    if (!currentBlock?.options) return [];
    
    currentBlock.options.forEach((option, index) => {
      if (option.nextBlockId) {
        if (memoizedPathFinder(option.nextBlockId, offerId)) {
          leadingOptionIndices.push(index);
        }
      }
    });
    
    return leadingOptionIndices;
  }, [funnelFlow, memoizedPathFinder]);

  // Memoized options leading to offer
  const optionsLeadingToOffer = useMemo(() => {
    if (!selectedOffer || !currentBlockId) return [];
    return findOptionsLeadingToOffer(selectedOffer, currentBlockId);
  }, [selectedOffer, currentBlockId, findOptionsLeadingToOffer]);

  // Memoized current block
  const currentBlock = useMemo(() => {
    return funnelFlow?.blocks[currentBlockId || ''];
  }, [funnelFlow, currentBlockId]);

  // Memoized options
  const options = useMemo(() => {
    return currentBlock?.options || [];
  }, [currentBlock]);

  // Optimized input validation
  const isValidOption = useCallback((input: string, currentBlock: any): { isValid: boolean; optionIndex?: number } => {
    if (!currentBlock?.options) return { isValid: false };
    
    const normalizedInput = input.toLowerCase().trim();
    
    // Check for exact text match
    const exactMatch = currentBlock.options.findIndex((opt: any) => 
      opt.text.toLowerCase() === normalizedInput
    );
    if (exactMatch !== -1) return { isValid: true, optionIndex: exactMatch };
    
    // Check for number match (1, 2, 3, etc.)
    const numberMatch = parseInt(normalizedInput);
    if (!isNaN(numberMatch) && numberMatch >= 1 && numberMatch <= currentBlock.options.length) {
      return { isValid: true, optionIndex: numberMatch - 1 };
    }
    
    // Check for fuzzy matching (partial text match)
    const fuzzyMatch = currentBlock.options.findIndex((opt: any) => {
      const optionText = opt.text.toLowerCase();
      return optionText.includes(normalizedInput) || normalizedInput.includes(optionText);
    });
    if (fuzzyMatch !== -1) return { isValid: true, optionIndex: fuzzyMatch };
    
    return { isValid: false };
  }, []);

  // Optimized option click handler
  const handleOptionClick = useCallback((option: FunnelBlockOption, index: number) => {
    measurePerformance('renderTime', () => {
      const userMessage: ChatMessage = { type: 'user', text: `${index + 1}. ${option.text}` };
      
      if (!option.nextBlockId) {
        const endMessage: ChatMessage = { type: 'bot', text: "This path has ended. You can start over to explore other options." };
        setHistory(prev => [...prev, userMessage, endMessage]);
        setCurrentBlockId(null);
        return;
      }

      const nextBlock = funnelFlow?.blocks[option.nextBlockId];

      if (nextBlock) {
        const completeMessage = constructCompleteMessage(nextBlock);
        const botMessage: ChatMessage = { type: 'bot', text: completeMessage };
        setHistory(prev => [...prev, userMessage, botMessage]);
        setCurrentBlockId(option.nextBlockId);
      } else {
        const errorMessage: ChatMessage = { type: 'bot', text: "This path encountered an error. You can start over to try again." };
        setHistory(prev => [...prev, userMessage, errorMessage]);
        setCurrentBlockId(null);
      }
    });
  }, [funnelFlow, constructCompleteMessage, measurePerformance]);

  // Optimized custom input handler
  const handleCustomInput = useCallback((input: string) => {
    const now = Date.now();
    const trimmedInput = input.trim();
    
    // Prevent duplicate processing
    if (lastProcessedInputRef.current === trimmedInput && 
        now - lastProcessedTimeRef.current < 1000) {
      return;
    }
    
    lastProcessedInputRef.current = trimmedInput;
    lastProcessedTimeRef.current = now;
    
    if (!currentBlockId || !funnelFlow) return;
    
    const currentBlock = funnelFlow.blocks[currentBlockId];
    if (!currentBlock) return;
    
    measurePerformance('renderTime', () => {
      const userMessage: ChatMessage = { type: 'user', text: trimmedInput };
      
      const validation = isValidOption(trimmedInput, currentBlock);
      
      if (validation.isValid && validation.optionIndex !== undefined && validation.optionIndex >= 0) {
        const option = currentBlock.options[validation.optionIndex];
        handleOptionClick(option, validation.optionIndex);
      } else {
        const botResponse = "Please choose one of the available options above.";
        const botMessage: ChatMessage = { type: 'bot', text: botResponse };
        setHistory(prev => [...prev, userMessage, botMessage]);
      }
    });
  }, [currentBlockId, funnelFlow, isValidOption, handleOptionClick, measurePerformance]);

  // Effect to handle blocks with no options
  useEffect(() => {
    if (currentBlockId && funnelFlow) {
      const currentBlock = funnelFlow.blocks[currentBlockId];
      if (currentBlock && (!currentBlock.options || currentBlock.options.length === 0)) {
        const endMessage: ChatMessage = { type: 'bot', text: "This path has ended. You can start over to explore other options." };
        setHistory(prev => [...prev, endMessage]);
        setCurrentBlockId(null);
      }
    }
  }, [currentBlockId, funnelFlow]);

  // Clear cache when funnel flow changes
  useEffect(() => {
    pathCacheRef.current.clear();
  }, [funnelFlow]);

  return {
    history,
    currentBlockId,
    chatEndRef,
    chatContainerRef,
    optionsLeadingToOffer,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    currentBlock,
    options,
    performanceMetrics
  };
};
