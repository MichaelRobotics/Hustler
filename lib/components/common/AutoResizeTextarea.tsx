'use client';

import React from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

/**
 * --- Auto-Resize Textarea Component ---
 * A textarea that automatically adjusts its height to fit the content.
 * This provides a better user experience by eliminating the need for manual resizing and scrollbars.
 *
 * @param {AutoResizeTextareaProps} props - The props passed to the component.
 * @param {string} props.value - The current value of the textarea.
 * @param {function} props.onChange - The function to call when the textarea value changes.
 * @param {string} [props.className] - Additional CSS classes to apply to the textarea.
 * @param {object} props - Any other props to pass to the textarea element.
 * @returns {JSX.Element} The rendered textarea component.
 */
const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({ 
  value, 
  onChange, 
  className, 
  ...props 
}) => {
    // Create a ref to hold the textarea DOM element.
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Use useLayoutEffect to measure and adjust the textarea's height
    // before the browser paints the screen. This prevents flickering.
    React.useLayoutEffect(() => {
        if (textareaRef.current) {
            // Temporarily reset the height to 'auto' to allow the browser
            // to calculate the natural scrollHeight of the content.
            textareaRef.current.style.height = 'auto';
            
            // Set the textarea's height to its scrollHeight to perfectly fit the content.
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]); // This effect re-runs whenever the textarea's value changes.

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            className={className}
            // Hide the vertical scrollbar as the height adjusts automatically.
            style={{ overflow: 'hidden' }}
            {...props}
        />
    );
};

export default AutoResizeTextarea;


