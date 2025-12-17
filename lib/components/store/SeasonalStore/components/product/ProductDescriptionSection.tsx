'use client';

import React from 'react';
import type { Product } from './types';
import { FormattingToolbar } from './FormattingToolbar';
import { normalizeHtmlContent, truncateHTMLToTwoLines } from '../../utils/html';

interface ProductDescriptionSectionProps {
  product: Product;
  isEditorView: boolean;
  descClass: string | undefined;
  descHasHtmlFormatting: boolean;
  showDescToolbar: boolean;
  descRef: HTMLDivElement | null;
  setDescRef: (ref: HTMLDivElement | null) => void;
  descToolbarRef: React.RefObject<HTMLDivElement | null>;
  showDescColorPicker: boolean;
  setShowDescColorPicker: (show: boolean) => void;
  selectedDescColor: string;
  setSelectedDescColor: (color: string) => void;
  quickColors: string[];
  activeDescSubToolbar: 'color' | null;
  setActiveDescSubToolbar: React.Dispatch<React.SetStateAction<'color' | null>>;
  setShowDescToolbar: (show: boolean) => void;
  setShowNameToolbar: (show: boolean) => void;
  setShowNameColorPicker: (show: boolean) => void;
  setActiveNameSubToolbar: (subToolbar: 'color' | null) => void;
  onUpdateProduct: (id: number | string, updates: Partial<Product>) => void;
}

const ProductDescriptionSectionComponent: React.FC<ProductDescriptionSectionProps> = ({
  product,
  isEditorView,
  descClass,
  descHasHtmlFormatting,
  showDescToolbar,
  descRef,
  setDescRef,
  descToolbarRef,
  showDescColorPicker,
  setShowDescColorPicker,
  selectedDescColor,
  setSelectedDescColor,
  quickColors,
  activeDescSubToolbar,
  setActiveDescSubToolbar,
  setShowDescToolbar,
  setShowNameToolbar,
  setShowNameColorPicker,
  setActiveNameSubToolbar,
  onUpdateProduct,
}) => {
  if (isEditorView) {
    return (
      <div className="relative">
        <FormattingToolbar
          show={showDescToolbar}
          elementRef={descRef}
          toolbarRef={descToolbarRef}
          showColorPicker={showDescColorPicker}
          setShowColorPicker={setShowDescColorPicker}
          selectedColor={selectedDescColor}
          setSelectedColor={setSelectedDescColor}
          quickColors={quickColors}
          activeSubToolbar={activeDescSubToolbar}
          setActiveSubToolbar={setActiveDescSubToolbar}
          onClose={() => {
            setShowDescToolbar(false);
            setShowDescColorPicker(false);
            setActiveDescSubToolbar(null);
          }}
          onBold={() => {
            if (descRef) {
              descRef.focus();
              const range = document.createRange();
              range.selectNodeContents(descRef);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.execCommand('bold', false);
              selection?.removeAllRanges();
              const content = descRef.innerHTML || descRef.textContent || '';
              onUpdateProduct(product.id, { description: content });
            }
          }}
          onItalic={() => {
            if (descRef) {
              descRef.focus();
              const range = document.createRange();
              range.selectNodeContents(descRef);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.execCommand('italic', false);
              selection?.removeAllRanges();
              const content = descRef.innerHTML || descRef.textContent || '';
              onUpdateProduct(product.id, { description: content });
            }
          }}
          onColorChange={(color) => {
            if (descRef) {
              descRef.focus();
              const range = document.createRange();
              range.selectNodeContents(descRef);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.execCommand('foreColor', false, color);
              selection?.removeAllRanges();
              const content = descRef.innerHTML || descRef.textContent || '';
              onUpdateProduct(product.id, { description: content });
            }
          }}
        />
        <div
          ref={setDescRef}
          contentEditable
          className={`text-xs mb-1 ${descClass} flex-grow cursor-text hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1 outline-none`}
          style={{
            minHeight: '1.5rem',
            maxHeight: '3rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word',
            lineHeight: '1.5rem',
            whiteSpace: 'normal',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowNameToolbar(false);
            setShowNameColorPicker(false);
            setActiveNameSubToolbar(null);
            setShowDescToolbar(true);
          }}
          onSelect={() => {
            setShowNameToolbar(false);
            setShowNameColorPicker(false);
            setActiveNameSubToolbar(null);
            setShowDescToolbar(true);
          }}
          onBlur={(e) => {
            const relatedTarget = e.relatedTarget as Node;
            const toolbarElement = descToolbarRef.current;
            const isClickingToolbar = toolbarElement && (
              toolbarElement.contains(relatedTarget) || relatedTarget === toolbarElement
            );
            let content = descRef?.innerHTML || descRef?.textContent || '';
            content = truncateHTMLToTwoLines(content);
            if (descRef && descRef.innerHTML !== content) {
              descRef.innerHTML = content;
            }
            onUpdateProduct(product.id, { description: content });
            if (!isClickingToolbar) {
              setTimeout(() => {
                if (!showDescToolbar) return;
                const activeElement = document.activeElement;
                if (!toolbarElement?.contains(activeElement)) {
                  setShowDescToolbar(false);
                  setShowDescColorPicker(false);
                  setActiveDescSubToolbar(null);
                }
              }, 200);
            }
          }}
          onInput={() => {
            const rawContent = descRef?.innerHTML || descRef?.textContent || '';
            const content = normalizeHtmlContent(rawContent);
            onUpdateProduct(product.id, { description: content });
          }}
        />
      </div>
    );
  }

  return (
    <p 
      className={`text-xs mb-1 ${descHasHtmlFormatting ? '' : descClass}`}
      dangerouslySetInnerHTML={{ __html: product.description || '' }}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        wordBreak: 'break-word',
        maxHeight: '3rem',
        lineHeight: '1.5rem',
      }}
    />
  );
};

export const ProductDescriptionSection = React.memo(ProductDescriptionSectionComponent) as React.FC<ProductDescriptionSectionProps>;

