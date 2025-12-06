'use client';

import React from 'react';
import { createPortal } from 'react-dom';

interface TurnIntoOption {
  label: string;
  tag: 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'blockquote' | 'a';
}

const turnIntoOptions: TurnIntoOption[] = [
  { label: 'Body Text', tag: 'p' },
  { label: 'Heading 1', tag: 'h1' },
  { label: 'Heading 2', tag: 'h2' },
  { label: 'Heading 3', tag: 'h3' },
  { label: 'List', tag: 'ul' },
  { label: 'Quote', tag: 'blockquote' },
  { label: 'Link', tag: 'a' },
];

interface TurnIntoMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  contentEditableRef: HTMLDivElement | null;
  onContentUpdate: (html: string) => void;
  onShowLinkModal: (selectedText: string) => void;
}

export const TurnIntoMenu: React.FC<TurnIntoMenuProps> = ({
  isOpen,
  onClose,
  position,
  contentEditableRef,
  onContentUpdate,
  onShowLinkModal,
}) => {
  if (!isOpen || typeof window === 'undefined') return null;

  const handleOptionClick = (e: React.MouseEvent, option: TurnIntoOption) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!contentEditableRef) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (option.tag === 'a') {
      onShowLinkModal(selectedText || '');
      onClose();
      return;
    }

    if (option.tag === 'ul') {
      const contents = range.extractContents();
      const listItem = document.createElement('li');
      if (contents.textContent?.trim()) {
        listItem.appendChild(contents);
      } else {
        listItem.textContent = selectedText || 'List item';
      }
      const list = document.createElement('ul');
      list.style.marginTop = '8px';
      list.style.marginBottom = '8px';
      list.style.paddingLeft = '24px';
      list.style.listStyleType = 'disc';
      list.style.listStylePosition = 'inside';
      list.appendChild(listItem);
      range.insertNode(list);
      onContentUpdate(contentEditableRef.innerHTML);
    } else if (option.tag === 'blockquote') {
      const contents = range.extractContents();
      const blockquote = document.createElement('blockquote');
      blockquote.style.marginTop = '12px';
      blockquote.style.marginBottom = '12px';
      blockquote.style.paddingLeft = '16px';
      blockquote.style.borderLeft = '4px solid #e5e7eb';
      blockquote.style.fontStyle = 'italic';
      blockquote.style.color = '#6b7280';
      if (contents.textContent?.trim()) {
        blockquote.appendChild(contents);
      } else {
        blockquote.textContent = selectedText || '';
      }
      range.insertNode(blockquote);
      onContentUpdate(contentEditableRef.innerHTML);
    } else {
      const contents = range.extractContents();
      const element = document.createElement(option.tag);
      
      if (option.tag === 'h1') {
        element.style.fontSize = '2em';
        element.style.fontWeight = 'bold';
        element.style.marginTop = '16px';
        element.style.marginBottom = '12px';
        element.style.lineHeight = '1.2';
      } else if (option.tag === 'h2') {
        element.style.fontSize = '1.5em';
        element.style.fontWeight = 'bold';
        element.style.marginTop = '14px';
        element.style.marginBottom = '10px';
        element.style.lineHeight = '1.3';
      } else if (option.tag === 'h3') {
        element.style.fontSize = '1.25em';
        element.style.fontWeight = 'bold';
        element.style.marginTop = '12px';
        element.style.marginBottom = '8px';
        element.style.lineHeight = '1.4';
      } else if (option.tag === 'p') {
        element.style.marginTop = '8px';
        element.style.marginBottom = '8px';
      }
      
      if (contents.textContent?.trim()) {
        element.appendChild(contents);
      } else {
        element.textContent = selectedText || '';
      }
      range.insertNode(element);
      onContentUpdate(contentEditableRef.innerHTML);
    }

    // Collapse selection after insertion
    selection.removeAllRanges();
    onClose();
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[99998]"
        onClick={onClose}
        style={{ pointerEvents: 'auto' }}
      />
      <div
        className="fixed z-[99999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[140px]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-1">
          <div className="text-[11px] px-2 py-1 text-gray-600 dark:text-gray-400 opacity-60 font-semibold">
            TURN INTO
          </div>
          {turnIntoOptions.map((option, idx) => (
            <button
              key={option.tag}
              type="button"
              onClick={(e) => handleOptionClick(e, option)}
              className={`w-full px-3 py-2 text-sm text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                idx === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-transparent'
              }`}
              style={{ pointerEvents: 'auto' }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
};

