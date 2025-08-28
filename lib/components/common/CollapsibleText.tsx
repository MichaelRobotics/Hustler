'use client';

import React from 'react';

interface CollapsibleTextProps {
  text: string;
  maxLength?: number;
}

/**
 * --- Collapsible Text Component ---
 * This component displays text that can be expanded or collapsed if it exceeds a certain length.
 * It's useful for displaying long strings of text in a compact way, such as in tables or lists.
 *
 * @param {CollapsibleTextProps} props - The props passed to the component.
 * @param {string} props.text - The full text to be displayed.
 * @param {number} [props.maxLength=20] - The character limit before the text becomes collapsible.
 * @returns {JSX.Element} The rendered text component.
 */
const CollapsibleText: React.FC<CollapsibleTextProps> = ({ text, maxLength = 20 }) => {
    // State to track whether the full text is shown or not.
    const [isExpanded, setIsExpanded] = React.useState(false);

    // If the text is shorter than or equal to the max length, just render it as a simple span.
    if (text.length <= maxLength) {
        return <span className="truncate">{text}</span>;
    }

    // If the text is longer, render a clickable span that toggles the expanded state.
    return (
        <span
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer hover:underline"
            title={isExpanded ? "Click to collapse" : "Click to expand"}
        >
            {/* Show the full text if expanded, otherwise show the truncated version with an ellipsis. */}
            {isExpanded ? text : `${text.substring(0, maxLength)}...`}
        </span>
    );
};

export default CollapsibleText;


