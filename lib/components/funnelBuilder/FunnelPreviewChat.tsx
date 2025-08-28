'use client';

import React from 'react';

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
const FunnelPreviewChat: React.FC<FunnelPreviewChatProps> = ({ funnelFlow }) => {
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
        const userMessage: ChatMessage = { type: 'user', text: (index + 1).toString() };
        
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
        <div className="h-full flex flex-col p-4 bg-gray-800/50">
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-2 space-y-4">
                {history.map((msg, index) => (
                    <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl whitespace-pre-wrap ${msg.type === 'user' ? 'bg-violet-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                 <div ref={chatEndRef} />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
                {options.length > 0 ? (
                    <div className="flex flex-col items-end space-y-2">
                        {options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleOptionClick(opt, i)}
                                    className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl whitespace-pre-wrap bg-violet-600 text-white rounded-br-none hover:bg-violet-700 transition-colors text-left"
                                >
                                    {i + 1}
                                </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-gray-500 mb-4">Conversation ended.</p>
                        <button onClick={startConversation} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
                            Start Over
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FunnelPreviewChat;



