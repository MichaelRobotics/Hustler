'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, Heading, Text, Separator } from 'frosted-ui';
import { MessageSquare, Bold, Italic, Type, Image } from 'lucide-react';
import { TurnIntoMenu } from './TurnIntoMenu';
import { ImageUploadModal } from './ImageUploadModal';
import { LinkModal } from './LinkModal';

export interface DiscountMessage {
  message: string;
  offsetHours: number;
  sendAsEmail?: boolean;
  emailSubject?: string;
  emailContent?: string;
  fromEmail?: string;
  isEmailHtml?: boolean;
}

interface MessageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  timingLabel: string; // "before discount starts" or "after discount starts"
  message: DiscountMessage | undefined;
  onMessageChange: (updates: Partial<DiscountMessage>) => void;
}

export const MessageEditorModal: React.FC<MessageEditorModalProps> = ({
  isOpen,
  onClose,
  title,
  timingLabel,
  message,
  onMessageChange,
}) => {
  const [messageView, setMessageView] = React.useState<'message' | 'email'>('message');
  const [emailStep, setEmailStep] = React.useState<1 | 2 | 3>(1);
  const [showEmailToolbar, setShowEmailToolbar] = React.useState(false);
  const [showTurnIntoMenu, setShowTurnIntoMenu] = React.useState(false);
  const [turnIntoMenuPosition, setTurnIntoMenuPosition] = React.useState({ top: 0, left: 0 });
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [showLinkModal, setShowLinkModal] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [emailContentEditableRef, setEmailContentEditableRef] = React.useState<HTMLDivElement | null>(null);

  const isEmail = message?.sendAsEmail || false;

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setMessageView('message');
      setEmailStep(1);
      setShowEmailToolbar(false);
      setShowTurnIntoMenu(false);
    }
  }, [isOpen]);

  // Sync contentEditable with emailContent
  React.useEffect(() => {
    if (emailContentEditableRef && message?.emailContent !== undefined) {
      if (emailContentEditableRef.innerHTML !== (message.emailContent || '')) {
        emailContentEditableRef.innerHTML = message.emailContent || '';
      }
    }
  }, [emailContentEditableRef, message?.emailContent]);

  const handleClose = () => {
    setShowEmailToolbar(false);
    setShowTurnIntoMenu(false);
    setEmailStep(1);
    onClose();
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[70]" />
          <Dialog.Content 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 text-foreground shadow-2xl z-[70] rounded-lg"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <Dialog.Title asChild>
                <Heading size="5" weight="bold" className="flex items-center gap-3 text-gray-900 dark:text-white text-2xl font-bold tracking-tight">
                  <MessageSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  {title}
                </Heading>
              </Dialog.Title>
            </div>

            {/* Content */}
            {message && (
              <div className="px-8 py-6 space-y-6 bg-gray-50 dark:bg-gray-950">
                {/* Offset Hours */}
                <div>
                  <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                    Timing
                  </Text>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={message.offsetHours || 0}
                        onChange={(e) => {
                          const offset = parseInt(e.target.value) || 0;
                          onMessageChange({ offsetHours: offset });
                        }}
                        className="w-20 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <Text size="2" className="text-gray-600 dark:text-gray-400">
                      hours {timingLabel}
                    </Text>
                  </div>
                </div>

                <Separator size="1" color="gray" />

                {/* Send Email Too Checkbox */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEmail}
                      onChange={(e) => {
                        const sendAsEmail = e.target.checked;
                        const updates: Partial<DiscountMessage> = { sendAsEmail };
                        if (sendAsEmail) {
                          if (!message.emailSubject) {
                            updates.emailSubject = '';
                          }
                          if (!message.emailContent) {
                            updates.emailContent = message.message || '';
                          }
                          setMessageView('email');
                          setEmailStep(1);
                        } else {
                          setMessageView('message');
                        }
                        onMessageChange(updates);
                      }}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300">
                      Send email too
                    </Text>
                  </label>
                </div>

                {/* Message/Email View Toggle */}
                {isEmail && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="2"
                      variant={messageView === 'message' ? 'solid' : 'soft'}
                      color="violet"
                      onClick={() => setMessageView('message')}
                      className="!px-3 !py-1.5 text-xs"
                    >
                      Message
                    </Button>
                    <Button
                      size="2"
                      variant={messageView === 'email' ? 'solid' : 'soft'}
                      color="violet"
                      onClick={() => {
                        setMessageView('email');
                        setEmailStep(1);
                      }}
                      className="!px-3 !py-1.5 text-xs"
                    >
                      Email
                    </Button>
                  </div>
                )}

                <Separator size="1" color="gray" />

                {/* Message Content */}
                {(!isEmail || messageView === 'message') && (
                  <div>
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                      Message Content
                    </Text>
                    <textarea
                      value={message.message || ''}
                      onChange={(e) => {
                        const updates: Partial<DiscountMessage> = { message: e.target.value };
                        if (message.sendAsEmail && !message.emailContent) {
                          updates.emailContent = e.target.value;
                        }
                        onMessageChange(updates);
                      }}
                      placeholder="Enter your message here..."
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                      rows={8}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* Email Fields - 3 Step Setup */}
                {isEmail && messageView === 'email' && (
                  <>
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <div className={`flex items-center gap-2 ${emailStep >= 1 ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${emailStep >= 1 ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          1
                        </div>
                        <Text size="2" weight="medium">Domain</Text>
                      </div>
                      <div className={`w-12 h-0.5 ${emailStep >= 2 ? 'bg-violet-600 dark:bg-violet-400' : 'bg-gray-300 dark:bg-gray-700'}`} />
                      <div className={`flex items-center gap-2 ${emailStep >= 2 ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${emailStep >= 2 ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          2
                        </div>
                        <Text size="2" weight="medium">Subject</Text>
                      </div>
                      <div className={`w-12 h-0.5 ${emailStep >= 3 ? 'bg-violet-600 dark:bg-violet-400' : 'bg-gray-300 dark:bg-gray-700'}`} />
                      <div className={`flex items-center gap-2 ${emailStep >= 3 ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${emailStep >= 3 ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          3
                        </div>
                        <Text size="2" weight="medium">Message</Text>
                      </div>
                    </div>

                    <Separator size="1" color="gray" />

                    {/* Step 1: Email Domain */}
                    {emailStep === 1 && (
                      <div>
                        <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                          Domain
                        </Text>
                        <input
                          type="email"
                          value={message.fromEmail || ''}
                          onChange={(e) => onMessageChange({ fromEmail: e.target.value })}
                          placeholder="sender@example.com"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                        <div className="flex justify-end mt-4">
                          <Button
                            size="3"
                            color="violet"
                            variant="solid"
                            onClick={() => setEmailStep(2)}
                            className="!px-6 !py-3"
                            disabled={!message.fromEmail?.trim()}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Subject */}
                    {emailStep === 2 && (
                      <div>
                        <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                          Subject
                        </Text>
                        <input
                          type="text"
                          value={message.emailSubject || ''}
                          onChange={(e) => onMessageChange({ emailSubject: e.target.value })}
                          placeholder="Enter email subject..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                        <div className="flex justify-between mt-4">
                          <Button
                            size="3"
                            color="gray"
                            variant="soft"
                            onClick={() => setEmailStep(1)}
                            className="!px-6 !py-3"
                          >
                            Back
                          </Button>
                          <Button
                            size="3"
                            color="violet"
                            variant="solid"
                            onClick={() => setEmailStep(3)}
                            className="!px-6 !py-3"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Email Message Content */}
                    {emailStep === 3 && (
                      <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                          <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300">
                            Message
                          </Text>
                        </div>
                        {/* Formatting Toolbar */}
                        {showEmailToolbar && (
                          <div className="absolute top-12 right-0 z-10 flex items-center gap-1 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                            <Button
                              size="1"
                              variant="ghost"
                              color="gray"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.execCommand('bold', false);
                                if (emailContentEditableRef) {
                                  onMessageChange({ emailContent: emailContentEditableRef.innerHTML });
                                }
                              }}
                              className="!p-2 !w-8 !h-8"
                              title="Bold"
                            >
                              <Bold className="w-4 h-4" />
                            </Button>
                            <Button
                              size="1"
                              variant="ghost"
                              color="gray"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.execCommand('italic', false);
                                if (emailContentEditableRef) {
                                  onMessageChange({ emailContent: emailContentEditableRef.innerHTML });
                                }
                              }}
                              className="!p-2 !w-8 !h-8"
                              title="Italic"
                            >
                              <Italic className="w-4 h-4" />
                            </Button>
                            <Button
                              size="1"
                              variant="ghost"
                              color="gray"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const buttonRect = e.currentTarget.getBoundingClientRect();
                                setTurnIntoMenuPosition({
                                  top: buttonRect.bottom + 4,
                                  left: buttonRect.left
                                });
                                setShowTurnIntoMenu(true);
                              }}
                              className="!p-2 !w-8 !h-8"
                              title="Turn into"
                            >
                              <Type className="w-4 h-4" />
                            </Button>
                            <Button
                              size="1"
                              variant="ghost"
                              color="gray"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowImageModal(true);
                              }}
                              className="!p-2 !w-8 !h-8"
                              title="Image"
                            >
                              <Image className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <div
                          ref={setEmailContentEditableRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            onMessageChange({ emailContent: e.currentTarget.innerHTML });
                          }}
                          onSelect={() => {
                            const selection = window.getSelection();
                            if (selection && selection.toString().trim().length > 0) {
                              setShowEmailToolbar(true);
                            } else {
                              setShowEmailToolbar(false);
                              setShowTurnIntoMenu(false);
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              if (!showTurnIntoMenu && !showImageModal && !showLinkModal) {
                                setShowEmailToolbar(false);
                              }
                            }, 200);
                          }}
                          className="w-full h-auto px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                          style={{ 
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            minHeight: '42px',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          data-placeholder="Enter email message..."
                        />
                        <div className="flex justify-start mt-4">
                          <Button
                            size="3"
                            color="gray"
                            variant="soft"
                            onClick={() => setEmailStep(2)}
                            className="!px-6 !py-3"
                          >
                            Back
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    size="3"
                    color="gray"
                    variant="soft"
                    onClick={handleClose}
                    className="!px-6 !py-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="3"
                    color="violet"
                    variant="solid"
                    onClick={handleClose}
                    className="!px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Turn Into Menu */}
      <TurnIntoMenu
        isOpen={showTurnIntoMenu}
        onClose={() => setShowTurnIntoMenu(false)}
        position={turnIntoMenuPosition}
        contentEditableRef={emailContentEditableRef}
        onContentUpdate={(html) => {
          onMessageChange({ emailContent: html });
        }}
        onShowLinkModal={(selectedText) => {
          setLinkUrl(selectedText);
          setShowLinkModal(true);
        }}
      />

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        inputId="message-editor-image-upload"
        onImageSelect={(imageUrl) => {
          if (emailContentEditableRef) {
            emailContentEditableRef.focus();
            const selection = window.getSelection();
            let range: Range;
            if (selection && selection.rangeCount > 0) {
              range = selection.getRangeAt(0);
            } else {
              range = document.createRange();
              range.selectNodeContents(emailContentEditableRef);
              range.collapse(false);
            }
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = '';
            img.style.maxWidth = '100%';
            range.insertNode(img);
            range.setStartAfter(img);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            
            onMessageChange({ emailContent: emailContentEditableRef.innerHTML });
          }
        }}
      />

      {/* Link Modal */}
      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        linkUrl={linkUrl}
        onLinkUrlChange={setLinkUrl}
        onInsert={() => {
          if (emailContentEditableRef && linkUrl) {
            emailContentEditableRef.focus();
            const selection = window.getSelection();
            let range: Range;
            let selectedText = '';
            
            if (selection && selection.rangeCount > 0) {
              range = selection.getRangeAt(0);
              selectedText = range.toString();
            } else {
              range = document.createRange();
              if (emailContentEditableRef.childNodes.length > 0) {
                range.selectNodeContents(emailContentEditableRef);
                range.collapse(false);
              } else {
                range.setStart(emailContentEditableRef, 0);
                range.setEnd(emailContentEditableRef, 0);
              }
            }
            
            const link = document.createElement('a');
            link.href = linkUrl;
            link.textContent = selectedText || linkUrl;
            link.style.color = '#6366f1';
            link.style.textDecoration = 'underline';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            if (selectedText) {
              range.deleteContents();
            }
            range.insertNode(link);
            
            range.setStartAfter(link);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            
            onMessageChange({ emailContent: emailContentEditableRef.innerHTML });
          }
        }}
      />
    </>
  );
};




