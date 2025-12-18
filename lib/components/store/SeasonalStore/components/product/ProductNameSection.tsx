'use client';

import React, { useRef } from 'react';
import type { Product } from './types';
import { FormattingToolbar } from './FormattingToolbar';
import { normalizeHtmlContent, normalizeExecCommandHtml } from '../../utils/html';

interface ProductNameSectionProps {
  product: Product;
  isEditorView: boolean;
  titleClass: string | undefined;
  nameHasHtmlFormatting: boolean;
  showNameToolbar: boolean;
  nameRef: HTMLDivElement | null;
  setNameRef: (ref: HTMLDivElement | null) => void;
  nameToolbarRef: React.RefObject<HTMLDivElement | null>;
  showNameColorPicker: boolean;
  setShowNameColorPicker: (show: boolean) => void;
  selectedNameColor: string;
  setSelectedNameColor: (color: string) => void;
  quickColors: string[];
  activeNameSubToolbar: 'color' | null;
  setActiveNameSubToolbar: React.Dispatch<React.SetStateAction<'color' | null>>;
  setShowNameToolbar: (show: boolean) => void;
  setShowDescToolbar: (show: boolean) => void;
  setShowDescColorPicker: (show: boolean) => void;
  setActiveDescSubToolbar: (subToolbar: 'color' | null) => void;
  onUpdateProduct: (id: number | string, updates: Partial<Product>) => void;
}

export const ProductNameSection: React.FC<ProductNameSectionProps> = ({
  product,
  isEditorView,
  titleClass,
  nameHasHtmlFormatting,
  showNameToolbar,
  nameRef,
  setNameRef,
  nameToolbarRef,
  showNameColorPicker,
  setShowNameColorPicker,
  selectedNameColor,
  setSelectedNameColor,
  quickColors,
  activeNameSubToolbar,
  setActiveNameSubToolbar,
  setShowNameToolbar,
  setShowDescToolbar,
  setShowDescColorPicker,
  setActiveDescSubToolbar,
  onUpdateProduct,
}) => {
  if (isEditorView) {
    return (
      <div className="relative">
        <FormattingToolbar
          show={showNameToolbar}
          elementRef={nameRef}
          toolbarRef={nameToolbarRef}
          showColorPicker={showNameColorPicker}
          setShowColorPicker={setShowNameColorPicker}
          selectedColor={selectedNameColor}
          setSelectedColor={setSelectedNameColor}
          quickColors={quickColors}
          activeSubToolbar={activeNameSubToolbar}
          setActiveSubToolbar={setActiveNameSubToolbar}
          hideBoldItalic={true}
          onClose={() => {
            setShowNameToolbar(false);
            setShowNameColorPicker(false);
            setActiveNameSubToolbar(null);
          }}
          onBold={() => {
            if (nameRef) {
              nameRef.focus();
              const range = document.createRange();
              range.selectNodeContents(nameRef);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.execCommand('bold', false);
              selection?.removeAllRanges();
              let content = nameRef.innerHTML || nameRef.textContent || '';
              // Normalize HTML tags (convert <b> to <strong>, inline styles to <strong>)
              content = normalizeExecCommandHtml(content);
              // Update the DOM with normalized content
              if (nameRef.innerHTML !== content) {
                nameRef.innerHTML = content;
              }
              onUpdateProduct(product.id, { name: content });
            }
          }}
          onItalic={() => {
            if (nameRef) {
              nameRef.focus();
              const range = document.createRange();
              range.selectNodeContents(nameRef);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.execCommand('italic', false);
              selection?.removeAllRanges();
              let content = nameRef.innerHTML || nameRef.textContent || '';
              // Normalize HTML tags (convert <i> to <em>, inline styles to <em>)
              content = normalizeExecCommandHtml(content);
              // Update the DOM with normalized content
              if (nameRef.innerHTML !== content) {
                nameRef.innerHTML = content;
              }
              onUpdateProduct(product.id, { name: content });
            }
          }}
          onColorChange={(color) => {
            if (nameRef) {
              nameRef.focus();
              const range = document.createRange();
              range.selectNodeContents(nameRef);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.execCommand('foreColor', false, color);
              selection?.removeAllRanges();
              let content = nameRef.innerHTML || nameRef.textContent || '';
              // Normalize HTML tags (preserve color, convert <b> to <strong>, <i> to <em>)
              content = normalizeExecCommandHtml(content);
              // Update the DOM with normalized content
              if (nameRef.innerHTML !== content) {
                nameRef.innerHTML = content;
              }
              onUpdateProduct(product.id, { name: content });
            }
          }}
        />
        <div
          ref={setNameRef}
          contentEditable
          className={`text-lg font-bold mb-0.5 ${titleClass} cursor-text hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1 outline-none`}
          onClick={(e) => {
            e.stopPropagation();
            setShowDescToolbar(false);
            setShowDescColorPicker(false);
            setActiveDescSubToolbar(null);
            setShowNameToolbar(true);
          }}
          onSelect={() => {
            setShowDescToolbar(false);
            setShowDescColorPicker(false);
            setActiveDescSubToolbar(null);
            setShowNameToolbar(true);
          }}
          onBlur={(e) => {
            const relatedTarget = e.relatedTarget as Node;
            const toolbarElement = nameToolbarRef.current;
            const isClickingToolbar = toolbarElement && (
              toolbarElement.contains(relatedTarget) || relatedTarget === toolbarElement
            );
            let content = nameRef?.innerHTML || nameRef?.textContent || '';
            // Normalize HTML before saving
            content = normalizeExecCommandHtml(content);
            // Update the DOM with normalized content if it changed
            if (nameRef && nameRef.innerHTML !== content) {
              nameRef.innerHTML = content;
            }
            onUpdateProduct(product.id, { name: content });
            if (!isClickingToolbar) {
              setTimeout(() => {
                if (!showNameToolbar) return;
                const activeElement = document.activeElement;
                if (!toolbarElement?.contains(activeElement)) {
                  setShowNameToolbar(false);
                  setShowNameColorPicker(false);
                  setActiveNameSubToolbar(null);
                }
              }, 200);
            }
          }}
          onInput={() => {
            const rawContent = nameRef?.innerHTML || nameRef?.textContent || '';
            let content = normalizeHtmlContent(rawContent);
            // Normalize execCommand HTML tags
            content = normalizeExecCommandHtml(content);
            // Update the DOM with normalized content if it changed
            if (nameRef && nameRef.innerHTML !== content) {
              nameRef.innerHTML = content;
            }
            onUpdateProduct(product.id, { name: content });
          }}
        />
      </div>
    );
  }

  // Normalize HTML for preview mode (convert <font>, <b>, <i> tags)
  const normalizedName = React.useMemo(() => {
    if (!product.name) return '';
    return normalizeExecCommandHtml(product.name);
  }, [product.name]);

  return (
    <h2 
      className={`text-lg font-bold mb-0.5 ${nameHasHtmlFormatting ? '' : titleClass}`}
      dangerouslySetInnerHTML={{ __html: normalizedName }}
    />
  );
};



