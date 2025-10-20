import React from 'react';

interface PromoMessageContentProps {
  message: string;
  isEditorView: boolean;
  color: string;
}

export const PromoMessageContent: React.FC<PromoMessageContentProps> = ({ 
  message, 
  isEditorView, 
  color 
}) => {
  // Pattern matches **KEYWORD**
  const parts = message.split(/(\*\*.*?\*\*)/g);
  
  // Component for the pulsing gift text
  const PulsingText = ({ content }: { content: string }) => {
    const glowColor = '#4ade80';
    const keywordStyle = { 
      color: glowColor,
      textShadow: `0 0 8px ${glowColor}, 0 0 15px ${glowColor}50`, 
    };
    
    return (
      <span className="inline-flex items-center mx-1">
        <span 
          className="inline-block font-extrabold text-5xl sm:text-6xl animate-pulse transition-all duration-700"
          style={keywordStyle}
        >
          {content.toUpperCase()}
        </span>
      </span>
    );
  };

  return (
    <React.Fragment>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2);
          return <PulsingText key={index} content={content} />;
        }
        const textStyle = { color };
        return <span key={index} style={textStyle}>{part}</span>;
      })}
    </React.Fragment>
  );
};

