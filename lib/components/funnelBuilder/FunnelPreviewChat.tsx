'use client';

import React from 'react';
import { Text, Button } from 'frosted-ui';

interface FunnelBlockOption {
  text: string;
  nextBlockId: string | null;
}

interface FunnelBlock {
  id: string;
  message: string;
  options: FunnelBlockOption[];
}

interface FunnelFlow {
  startBlockId: string;
  stages: any[];
  blocks: Record<string, FunnelBlock>;
}

interface ChatMessage {
  type: 'user' | 'bot';
  text: string;
}

interface FunnelPreviewChatProps {
  funnelFlow: FunnelFlow | null;
  selectedOffer?: string | null;
}

/**
 * --- Funnel Preview Chat Component ---
 * This component simulates a user conversation with the generated chatbot flow.
 * It allows the user to click through the options and see the conversation unfold,
 * providing a way to test and validate the funnel's logic and messaging.
 *
 * @param {FunnelPreviewChatProps} props - The props passed to the component.
 * @param {FunnelFlow | null} props.funnelFlow - The generated funnel flow object containing stages and blocks.
 * @returns {JSX.Element} The rendered FunnelPreviewChat component.
 */
const FunnelPreviewChat: React.FC<FunnelPreviewChatProps> = ({ funnelFlow, selectedOffer }) => {
    // State to keep track of the conversation history.
    const [history, setHistory] = React.useState<ChatMessage[]>([]);
    // State to track the current block in the conversation.
    const [currentBlockId, setCurrentBlockId] = React.useState<string | null>(null);
    // Refs to manage auto-scrolling of the chat window.
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const chatContainerRef = React.useRef<HTMLDivElement>(null);

    // Helper function to construct complete message with numbered options
    const constructCompleteMessage = (block: any): string => {
        if (!block || !block.options || block.options.length === 0) {
            return block.message;
        }
        
        const numberedOptions = block.options.map((opt: any, index: number) => 
            `${index + 1}. ${opt.text}`
        ).join('\n');
        
        return `${block.message}\n\n${numberedOptions}`;
    };

    // Function to start or restart the conversation.
    const startConversation = React.useCallback(() => {
        if (funnelFlow && funnelFlow.startBlockId) {
            const startBlock = funnelFlow.blocks[funnelFlow.startBlockId];
            if (startBlock) {
                const completeMessage = constructCompleteMessage(startBlock);
                setHistory([{ type: 'bot', text: completeMessage }]);
                setCurrentBlockId(funnelFlow.startBlockId);
            }
        }
    }, [funnelFlow]);

    // Start the conversation when the component mounts or the funnelFlow changes.
    React.useEffect(() => {
        startConversation();
    }, [startConversation]);

    // Effect to handle auto-scrolling as new messages are added.
    React.useEffect(() => {
        if (history.length === 1) {
            // On the first message, scroll the container to the top.
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = 0;
            }
        } else {
            // For all subsequent messages, scroll to the end.
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history]);

    // Handler for when a user clicks on a chat option.
    const handleOptionClick = (option: FunnelBlockOption, index: number) => {
        const userMessage: ChatMessage = { type: 'user', text: `${index + 1}. ${option.text}` };
        
        // If the selected option has no next block, the conversation ends.
        if (!option.nextBlockId) {
            setHistory(prev => [...prev, userMessage]);
            setCurrentBlockId(null);
            return;
        }

        const nextBlock = funnelFlow?.blocks[option.nextBlockId];

        // If the next block exists, add the user's and the bot's messages to the history.
        if (nextBlock) {
            const completeMessage = constructCompleteMessage(nextBlock);
            const botMessage: ChatMessage = { type: 'bot', text: completeMessage };
            setHistory(prev => [...prev, userMessage, botMessage]);
            setCurrentBlockId(option.nextBlockId);
        } else {
            // If the next block ID is invalid, end the conversation.
            setHistory(prev => [...prev, userMessage]);
            setCurrentBlockId(null);
        }
    };

    const currentBlock = funnelFlow?.blocks[currentBlockId || ''];
    const options = currentBlock?.options || [];

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-surface via-surface/95 to-surface/90 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Native Whop Header */}
            <div className="flex-shrink-0 p-0 border-b border-border/30 dark:border-border/20 bg-surface/80 dark:bg-surface/60 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
                        <Text size="3" weight="semi-bold" className="text-foreground">
                            AI Funnel Bot
                        </Text>
                        <div className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50">
                            <Text size="1" weight="medium" className="text-green-700 dark:text-green-300">
                                Online
                            </Text>
                        </div>
                    </div>
                    
                    {/* Selected Offer Display */}
                    {selectedOffer && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/30 rounded-xl">
                            <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                            <Text size="2" weight="medium" className="text-violet-700 dark:text-violet-300">
                                {selectedOffer}
                            </Text>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Chat Messages Area */}
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-0 space-y-4">
                {history.map((msg, index) => (
                    <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.type === 'bot' && (
                            <div className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                                    <Text size="1" weight="bold" className="text-white">
                                        AI
                                    </Text>
                                </div>
                                <div className="max-w-xs lg:max-w-md px-4 py-3 bg-white dark:bg-gray-800 border border-border/50 dark:border-border/30 rounded-2xl shadow-sm">
                                    <Text size="2" className="text-foreground whitespace-pre-wrap">
                                        {msg.text}
                                    </Text>
                                </div>
                            </div>
                        )}
                        
                        {msg.type === 'user' && (
                            <div className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                                    <Text size="1" weight="bold" className="text-white">
                                        You
                                    </Text>
                                </div>
                                <div className="max-w-xs lg:max-w-md px-4 py-3 bg-violet-500 text-white rounded-2xl shadow-sm">
                                    <Text size="2" className="text-white whitespace-pre-wrap">
                                        {msg.text}
                                    </Text>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            
            {/* Response Options */}
            {options.length > 0 && (
                <div className="flex-shrink-0 p-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
                    <div className="space-y-3">
                        <Text size="2" weight="medium" className="text-muted-foreground text-center">
                            Choose your response:
                        </Text>
                        <div className="flex flex-col items-end space-y-2">
                            {options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleOptionClick(opt, i)}
                                    className="max-w-xs lg:max-w-md p-3 bg-white dark:bg-gray-800 border border-border/50 dark:border-border/30 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:border-violet-200 dark:hover:border-violet-500/50 transition-all duration-200 text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700/30 flex items-center justify-center flex-shrink-0">
                                            <Text size="1" weight="bold" className="text-violet-700 dark:text-violet-300">
                                                {i + 1}
                                            </Text>
                                        </div>
                                        <Text size="2" className="text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                                            {opt.text}
                                        </Text>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Conversation End State */}
            {options.length === 0 && currentBlockId && (
                <div className="flex-shrink-0 p-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
                    <div className="text-center space-y-3">
                        <Text size="2" className="text-muted-foreground">
                            Conversation ended.
                        </Text>
                        <Button
                            size="2"
                            color="violet"
                            onClick={startConversation}
                            className="px-6 py-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
                        >
                            Start Over
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FunnelPreviewChat;



