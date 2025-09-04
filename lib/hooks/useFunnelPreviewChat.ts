import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { FunnelFlow, FunnelBlockOption, ChatMessage } from '../types/funnel';

export const useFunnelPreviewChat = (funnelFlow: FunnelFlow | null, selectedOffer?: string | null) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [invalidInputCount, setInvalidInputCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to construct complete message with numbered options
  const constructCompleteMessage = useCallback((block: any): string => {
    if (!block || !block.options || block.options.length === 0) {
      return block.message;
    }
    
    const numberedOptions = block.options.map((opt: any, index: number) => 
      `${index + 1}. ${opt.text}`
    ).join('\n');
    
    return `${block.message}\n\n${numberedOptions}`;
  }, []);

  // Function to start or restart the conversation
  const startConversation = useCallback(() => {
    if (funnelFlow && funnelFlow.startBlockId) {
      const startBlock = funnelFlow.blocks[funnelFlow.startBlockId];
      if (startBlock) {
        const completeMessage = constructCompleteMessage(startBlock);
        setHistory([{ type: 'bot', text: completeMessage }]);
        setCurrentBlockId(funnelFlow.startBlockId);
      }
    }
  }, [funnelFlow, constructCompleteMessage]);

  // Start the conversation when the component mounts or the funnelFlow changes
  useEffect(() => {
    startConversation();
  }, [startConversation]);

  // Effect to handle auto-scrolling as new messages are added
  useEffect(() => {
    if (history.length === 1) {
      // On the first message, scroll the container to the top
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
    } else {
      // For all subsequent messages, scroll to the end
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Helper function to check if a path leads to the offer
  const doesPathLeadToOffer = useCallback((blockId: string, targetOfferId: string, visited: Set<string>): boolean => {
    if (visited.has(blockId)) return false; // Prevent infinite loops
    visited.add(blockId);
    
    const block = funnelFlow?.blocks[blockId];
    if (!block) return false;
    
    // Check if this block is the offer block
    if (block.id === `offer_${targetOfferId}` || block.id === targetOfferId) {
      return true;
    }
    
    // Check if this block has options that lead to the offer
    if (block.options) {
      for (const option of block.options) {
        if (option.nextBlockId && doesPathLeadToOffer(option.nextBlockId, targetOfferId, visited)) {
          return true;
        }
      }
    }
    
    return false;
  }, [funnelFlow]);

  // Find which answer options in the current question would lead to the selected offer
  const findOptionsLeadingToOffer = useCallback((offerId: string, currentBlockId: string | null): number[] => {
    if (!currentBlockId || !funnelFlow) return [];
    
    const leadingOptionIndices: number[] = [];
    const currentBlock = funnelFlow.blocks[currentBlockId];
    
    if (!currentBlock?.options) return [];
    
    // For each option in the current block, check if it leads to the offer
    currentBlock.options.forEach((option, index) => {
      if (option.nextBlockId) {
        // Recursively check if this option leads to the offer
        if (doesPathLeadToOffer(option.nextBlockId, offerId, new Set())) {
          leadingOptionIndices.push(index);
        }
      }
    });
    
    return leadingOptionIndices;
  }, [funnelFlow, doesPathLeadToOffer]);

  // Get the indices of options that lead to the selected offer
  const optionsLeadingToOffer = useMemo(() => {
    if (!selectedOffer || !currentBlockId) return [];
    return findOptionsLeadingToOffer(selectedOffer, currentBlockId);
  }, [selectedOffer, currentBlockId, findOptionsLeadingToOffer]);

  // Helper function to check if input matches a valid option
  const isValidOption = useCallback((input: string, currentBlock: any): { isValid: boolean; optionIndex?: number } => {
    if (!currentBlock?.options) return { isValid: false };
    
    // Check for exact text match
    const exactMatch = currentBlock.options.findIndex((opt: any) => 
      opt.text.toLowerCase() === input.toLowerCase()
    );
    if (exactMatch !== -1) return { isValid: true, optionIndex: exactMatch };
    
    // Check for number match (1, 2, 3, etc.)
    const numberMatch = parseInt(input);
    if (!isNaN(numberMatch) && numberMatch >= 1 && numberMatch <= currentBlock.options.length) {
      return { isValid: true, optionIndex: numberMatch - 1 };
    }
    
    return { isValid: false };
  }, []);

  // Handler for custom text input
  const handleCustomInput = useCallback((input: string) => {
    if (!currentBlockId || !funnelFlow) return;
    
    const currentBlock = funnelFlow.blocks[currentBlockId];
    if (!currentBlock) return;
    
    const userMessage: ChatMessage = { type: 'user', text: input };
    
    // Check if input is valid
    const validation = isValidOption(input, currentBlock);
    
    if (validation.isValid && validation.optionIndex !== undefined) {
      // Valid input - process as option click
      setInvalidInputCount(0); // Reset invalid input counter
      const option = currentBlock.options[validation.optionIndex];
      handleOptionClick(option, validation.optionIndex);
    } else {
      // Invalid input - handle based on invalid input count
      setInvalidInputCount(prev => prev + 1);
      
      let botResponse: string;
      if (invalidInputCount === 0) {
        // First invalid input - friendly reminder
        botResponse = "I understand you'd like to respond differently, but please choose one of the options I've provided above. This helps me guide you through the conversation effectively! 😊";
      } else {
        // Second invalid input - escalate to creator
        botResponse = "I see you have questions that aren't covered by my current options. I'll notify the creator about your inquiry, and they'll get back to you with a personalized response. In the meantime, please choose from the available options to continue our conversation.";
      }
      
      const botMessage: ChatMessage = { type: 'bot', text: botResponse };
      setHistory(prev => [...prev, userMessage, botMessage]);
    }
  }, [currentBlockId, funnelFlow, isValidOption, invalidInputCount]);

  // Handler for when a user clicks on a chat option
  const handleOptionClick = useCallback((option: FunnelBlockOption, index: number) => {
    const userMessage: ChatMessage = { type: 'user', text: `${index + 1}. ${option.text}` };
    
    // If the selected option has no next block, the conversation ends
    if (!option.nextBlockId) {
      const endMessage: ChatMessage = { type: 'bot', text: "This path has ended. You can start over to explore other options." };
      setHistory(prev => [...prev, userMessage, endMessage]);
      setCurrentBlockId(null);
      return;
    }

    const nextBlock = funnelFlow?.blocks[option.nextBlockId];

    // If the next block exists, add the user's and the bot's messages to the history
    if (nextBlock) {
      const completeMessage = constructCompleteMessage(nextBlock);
      const botMessage: ChatMessage = { type: 'bot', text: completeMessage };
      setHistory(prev => [...prev, userMessage, botMessage]);
      setCurrentBlockId(option.nextBlockId);
    } else {
      // If the next block ID is invalid, end the conversation
      const errorMessage: ChatMessage = { type: 'bot', text: "This path encountered an error. You can start over to try again." };
      setHistory(prev => [...prev, userMessage, errorMessage]);
      setCurrentBlockId(null);
    }
  }, [funnelFlow, constructCompleteMessage]);

  // Effect to handle blocks with no options (dead-end paths)
  useEffect(() => {
    if (currentBlockId && funnelFlow) {
      const currentBlock = funnelFlow.blocks[currentBlockId];
      if (currentBlock && (!currentBlock.options || currentBlock.options.length === 0)) {
        // If we reach a block with no options, add a message and end the conversation
        const endMessage: ChatMessage = { type: 'bot', text: "This path has ended. You can start over to explore other options." };
        setHistory(prev => [...prev, endMessage]);
        setCurrentBlockId(null);
      }
    }
  }, [currentBlockId, funnelFlow]);

  return {
    history,
    currentBlockId,
    chatEndRef,
    chatContainerRef,
    optionsLeadingToOffer,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    currentBlock: funnelFlow?.blocks[currentBlockId || ''],
    options: funnelFlow?.blocks[currentBlockId || '']?.options || []
  };
};
