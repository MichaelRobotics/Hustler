'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, Heading, Text, Card, Separator } from 'frosted-ui';
import { 
  Settings, 
  X, 
  ImagePlus, 
  Search, 
  Trash2, 
  GripVertical, 
  Layers,
  Zap,
  Palette,
  Edit,
  Upload,
  ChevronDown,
  Type
} from 'lucide-react';
import { FloatingAsset, LegacyTheme, FixedTextStyles } from '../types/index';
import { emojiToSvgDataURL } from '../actions/aiService';
import { useBackgroundAnalysis } from '../utils/backgroundAnalyzer';
import { DeleteThemeNotification } from './DeleteThemeNotification';
import { normalizeHtmlContent, decodeHtmlEntitiesForTextarea } from '../utils/html';

interface AdminAssetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  floatingAssets: FloatingAsset[];
  availableAssets: FloatingAsset[];
  setAvailableAssets: (assets: FloatingAsset[] | ((prev: FloatingAsset[]) => FloatingAsset[])) => void;
  onDeleteFloatingAsset: (id: string) => void;
  onGenerateAsset: (prompt: string) => Promise<void>;
  isTextLoading: boolean;
  isImageLoading: boolean;
  apiError: string | null;
  selectedAssetId: string | null;
  onSelectAsset: (id: string | null) => void;
  currentSeason: string;
  isEditorView: boolean;
  allThemes: Record<string, LegacyTheme>;
  setAllThemes: (themes: Record<string, LegacyTheme> | ((prev: Record<string, LegacyTheme>) => Record<string, LegacyTheme>)) => void;
  handleAddCustomTheme: (themeData: LegacyTheme) => Promise<any>;
  handleUpdateTheme: (season: string, updates: Partial<LegacyTheme>) => void;
  handleUpdateAsset: (id: string, updates: Partial<FloatingAsset>) => void;
  handleAddFloatingAsset: (assetData: Partial<FloatingAsset>) => void;
  // Text editing props
  fixedTextStyles: FixedTextStyles;
  setFixedTextStyles: (styles: FixedTextStyles | ((prev: FixedTextStyles) => FixedTextStyles)) => void;
  backgroundAnalysis?: { recommendedTextColor: 'black' | 'white' };
  // Limit props
  canAddCustomTheme?: boolean;
  canAddTemplate?: boolean;
  maxCustomThemes?: number;
  maxCustomTemplates?: number;
  // Current theme prop - the actually viewed theme (may be custom or default)
  currentTheme?: LegacyTheme | null;
  // Database props for theme deletion
  experienceId?: string;
  onDeleteTheme?: (themeId: string) => Promise<void>;
  // Theme generation notification callback
  onThemeGeneration?: (isGenerating: boolean, themeName: string) => void;
  // Background controls props
  handleGenerateBgClick?: () => void;
  handleBgImageUpload?: (file: File) => void;
  setCurrentSeason?: (season: string) => void;
  loadingState?: {
    isImageLoading: boolean;
  };
  // Origin template for company theme
  originTemplate?: {
    defaultThemeData: {
      name?: string;
      card?: string;
      text?: string;
      welcomeColor?: string;
      accent?: string;
      ringColor?: string;
      mainHeader?: string | null;
      subHeader?: string | null;
      aiMessage?: string;
      emojiTip?: string;
      themePrompt?: string;
      placeholderImage?: string | null;
      background?: string | null;
    };
    themePrompt?: string | null;
  } | null;
}


export const AdminAssetSheet: React.FC<AdminAssetSheetProps> = ({
  isOpen,
  onClose,
  floatingAssets,
  availableAssets,
  setAvailableAssets,
  onDeleteFloatingAsset,
  onGenerateAsset,
  isTextLoading,
  isImageLoading,
  apiError,
  selectedAssetId,
  onSelectAsset,
  currentSeason,
  isEditorView,
  allThemes,
  setAllThemes,
  handleAddCustomTheme,
  handleUpdateTheme,
  handleUpdateAsset,
  handleAddFloatingAsset,
  fixedTextStyles,
  setFixedTextStyles,
  backgroundAnalysis,
  canAddCustomTheme = true,
  canAddTemplate = true,
  maxCustomThemes = 10,
  maxCustomTemplates = 10,
  currentTheme,
  experienceId,
  onDeleteTheme,
  onThemeGeneration,
  handleGenerateBgClick,
  handleBgImageUpload,
  setCurrentSeason,
  loadingState,
  originTemplate,
}) => {
  // Debug logging
  console.log('🎨 AdminAssetSheet render:', { isOpen, isEditorView, selectedAssetId });
  
  // Prevent body scroll and viewport movement on mobile when modal is open
  useEffect(() => {
    if (isOpen && isEditorView) {
      // Lock body scroll to prevent background movement
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalHeight = document.body.style.height;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Lock body to prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        // Restore body styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.top = originalTop;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, isEditorView]);

  // Use background analysis from parent for dynamic text colors

  const [manualSearch, setManualSearch] = useState('');
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemePrompt, setNewThemePrompt] = useState('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  
  // Section visibility state
  const [showThemeSettingsDropdown, setShowThemeSettingsDropdown] = useState(false);
  const [selectedThemeSetting, setSelectedThemeSetting] = useState<'custom' | 'edit' | 'delete' | null>(null);
  const themeSettingsDropdownRef = React.useRef<HTMLDivElement>(null);
  const themeSettingsButtonRef = React.useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  // Calculate dropdown position when it opens
  useEffect(() => {
    if (showThemeSettingsDropdown) {
      // Calculate position immediately and also after a small delay to ensure DOM is updated
      const calculatePosition = () => {
        if (themeSettingsButtonRef.current) {
          const rect = themeSettingsButtonRef.current.getBoundingClientRect();
          const dropdownHeight = 150; // Approximate height of dropdown (3 buttons)
          setDropdownPosition({
            top: rect.top - dropdownHeight - 8, // Position above the button with 8px margin
            left: rect.left,
            width: rect.width
          });
        }
      };
      
      // Try immediately
      calculatePosition();
      
      // Also try after a small delay to ensure DOM is updated
      const timer = setTimeout(calculatePosition, 10);
      return () => clearTimeout(timer);
    } else {
      setDropdownPosition(null);
    }
  }, [showThemeSettingsDropdown]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showThemeSettingsDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on the button or dropdown menu
      if (
        themeSettingsButtonRef.current?.contains(target as Node) ||
        target.closest('[data-dropdown-menu]')
      ) {
        return;
      }
      
      // Close the dropdown
      setShowThemeSettingsDropdown(false);
    };

    // Use a longer delay to avoid closing immediately when opening
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 150);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showThemeSettingsDropdown]);
  
  // Theme deletion notification state
  const [deleteNotification, setDeleteNotification] = useState<{
    isOpen: boolean;
    isDeleting: boolean;
    themeName: string;
  }>({ isOpen: false, isDeleting: false, themeName: '' });
  
  const selectedAsset = floatingAssets.find(a => a.id === selectedAssetId);
  // Use the passed currentTheme prop if available, otherwise fall back to allThemes[currentSeason]
  // This ensures we correctly identify the currently viewed theme (including custom themes)
  const theme = currentTheme || allThemes[currentSeason];
  
  // Current theme prompt editing
  const [currentPromptValue, setCurrentPromptValue] = useState(theme?.themePrompt || '');

  // Comprehensive emoji database with proper search functionality
  const EMOJI_DATABASE = [
    // Halloween & Spooky
    { emoji: '🎃', name: 'Pumpkin', keywords: ['pumpkin', 'halloween', 'orange', 'jack', 'lantern', 'carved'] },
    { emoji: '👻', name: 'Ghost', keywords: ['ghost', 'spooky', 'white', 'scary', 'spirit', 'haunted'] },
    { emoji: '💀', name: 'Skull', keywords: ['skull', 'bone', 'death', 'spooky', 'skeleton', 'dead'] },
    { emoji: '🕷️', name: 'Spider', keywords: ['spider', 'web', 'bug', 'creepy', 'arachnid', 'crawly'] },
    { emoji: '🦇', name: 'Bat', keywords: ['bat', 'flying', 'dark', 'night', 'winged', 'vampire'] },
    { emoji: '🧙‍♀️', name: 'Witch', keywords: ['witch', 'magic', 'hat', 'broom', 'spell', 'wizard'] },
    { emoji: '🧹', name: 'Broom', keywords: ['broom', 'cleaning', 'witch', 'flying', 'sweep', 'handle'] },
    { emoji: '🍭', name: 'Candy', keywords: ['candy', 'sweet', 'lollipop', 'treat', 'sugar', 'sucker'] },
    { emoji: '⚰️', name: 'Coffin', keywords: ['coffin', 'death', 'burial', 'dark', 'grave', 'casket'] },
    { emoji: '🔮', name: 'Crystal Ball', keywords: ['crystal', 'ball', 'magic', 'fortune', 'future', 'prediction'] },
    { emoji: '🧟‍♂️', name: 'Zombie', keywords: ['zombie', 'undead', 'walking', 'dead', 'monster', 'infected'] },
    { emoji: '🧛‍♂️', name: 'Vampire', keywords: ['vampire', 'blood', 'fangs', 'night', 'undead', 'dracula'] },

    // Christmas & Winter
    { emoji: '🎄', name: 'Tree', keywords: ['tree', 'christmas', 'pine', 'decorated', 'holiday', 'fir'] },
    { emoji: '🎁', name: 'Gift', keywords: ['gift', 'present', 'box', 'wrapped', 'surprise', 'package'] },
    { emoji: '🎅', name: 'Santa', keywords: ['santa', 'claus', 'beard', 'red', 'christmas', 'jolly'] },
    { emoji: '⛄', name: 'Snowman', keywords: ['snowman', 'snow', 'winter', 'carrot', 'frosty', 'cold'] },
    { emoji: '🔔', name: 'Bell', keywords: ['bell', 'ring', 'sound', 'gold', 'jingle', 'chime'] },
    { emoji: '⭐', name: 'Star', keywords: ['star', 'bright', 'shining', 'gold', 'sparkle', 'twinkle'] },
    { emoji: '👼', name: 'Angel', keywords: ['angel', 'wings', 'heaven', 'white', 'divine', 'holy'] },
    { emoji: '🦌', name: 'Reindeer', keywords: ['reindeer', 'deer', 'antlers', 'brown', 'rudolph', 'christmas'] },
    { emoji: '🛷', name: 'Sleigh', keywords: ['sleigh', 'sled', 'santa', 'ride', 'snow', 'winter'] },
    { emoji: '🎀', name: 'Bow', keywords: ['bow', 'ribbon', 'decoration', 'gift', 'pretty', 'tie'] },
    { emoji: '🔥', name: 'Fire', keywords: ['fire', 'flame', 'warm', 'cozy', 'heat', 'burn'] },
    { emoji: '❄️', name: 'Snowflake', keywords: ['snowflake', 'snow', 'ice', 'cold', 'winter', 'frozen'] },
    { emoji: '🧊', name: 'Ice', keywords: ['ice', 'cold', 'frozen', 'crystal', 'winter', 'chill'] },
    { emoji: '🥶', name: 'Cold Face', keywords: ['cold', 'freezing', 'blue', 'face', 'winter', 'chilly'] },
    { emoji: '☕', name: 'Hot Drink', keywords: ['hot', 'drink', 'coffee', 'warm', 'mug', 'beverage'] },
    { emoji: '🧤', name: 'Mittens', keywords: ['mittens', 'gloves', 'hands', 'warm', 'winter', 'fingers'] },
    { emoji: '🧣', name: 'Scarf', keywords: ['scarf', 'neck', 'warm', 'wrapped', 'winter', 'cozy'] },
    { emoji: '🥾', name: 'Boots', keywords: ['boots', 'shoes', 'feet', 'warm', 'winter', 'hiking'] },
    { emoji: '🎿', name: 'Ski', keywords: ['ski', 'snow', 'sport', 'winter', 'slope', 'mountain'] },
    { emoji: '🐧', name: 'Penguin', keywords: ['penguin', 'bird', 'black', 'white', 'antarctic', 'waddle'] },
    { emoji: '🐻‍❄️', name: 'Polar Bear', keywords: ['polar', 'bear', 'white', 'arctic', 'cold', 'snow'] },

    // Spring & Nature
    { emoji: '🌸', name: 'Flower', keywords: ['flower', 'blossom', 'pink', 'spring', 'petal', 'bloom'] },
    { emoji: '🌷', name: 'Tulip', keywords: ['tulip', 'flower', 'red', 'spring', 'bulb', 'garden'] },
    { emoji: '🌹', name: 'Rose', keywords: ['rose', 'flower', 'red', 'love', 'romantic', 'thorn'] },
    { emoji: '🌻', name: 'Sunflower', keywords: ['sunflower', 'yellow', 'bright', 'summer', 'sun', 'seed'] },
    { emoji: '🦋', name: 'Butterfly', keywords: ['butterfly', 'wings', 'colorful', 'flying', 'insect', 'beautiful'] },
    { emoji: '🐝', name: 'Bee', keywords: ['bee', 'buzz', 'yellow', 'black', 'honey', 'pollen'] },
    { emoji: '🐞', name: 'Ladybug', keywords: ['ladybug', 'red', 'spots', 'bug', 'lucky', 'garden'] },
    { emoji: '🌈', name: 'Rainbow', keywords: ['rainbow', 'colors', 'arc', 'sky', 'rain', 'prism'] },
    { emoji: '☀️', name: 'Sun', keywords: ['sun', 'bright', 'yellow', 'warm', 'day', 'light'] },
    { emoji: '🌧️', name: 'Rain', keywords: ['rain', 'water', 'drops', 'cloud', 'wet', 'storm'] },
    { emoji: '☂️', name: 'Umbrella', keywords: ['umbrella', 'rain', 'protection', 'cover', 'dry', 'shelter'] },
    { emoji: '🌱', name: 'Seedling', keywords: ['seedling', 'plant', 'grow', 'green', 'sprout', 'new'] },

    // Summer & Beach
    { emoji: '🏖️', name: 'Beach', keywords: ['beach', 'sand', 'ocean', 'summer', 'shore', 'vacation'] },
    { emoji: '🌴', name: 'Palm Tree', keywords: ['palm', 'tree', 'tropical', 'green', 'coconut', 'island'] },
    { emoji: '🕶️', name: 'Sunglasses', keywords: ['sunglasses', 'glasses', 'sun', 'cool', 'shade', 'style'] },
    { emoji: '🍦', name: 'Ice Cream', keywords: ['ice', 'cream', 'cold', 'sweet', 'dessert', 'treat'] },
    { emoji: '🍉', name: 'Watermelon', keywords: ['watermelon', 'fruit', 'red', 'green', 'summer', 'juicy'] },
    { emoji: '🍋', name: 'Lemon', keywords: ['lemon', 'yellow', 'sour', 'citrus', 'fruit', 'tart'] },
    { emoji: '🥥', name: 'Coconut', keywords: ['coconut', 'tropical', 'brown', 'white', 'milk', 'island'] },
    { emoji: '🩴', name: 'Flip Flops', keywords: ['flip', 'flops', 'sandals', 'beach', 'summer', 'feet'] },
    { emoji: '🏊‍♂️', name: 'Swimming', keywords: ['swimming', 'pool', 'water', 'sport', 'swim', 'dive'] },
    { emoji: '🏄‍♂️', name: 'Surfing', keywords: ['surfing', 'wave', 'ocean', 'board', 'ride', 'beach'] },
    { emoji: '⛺', name: 'Camping', keywords: ['camping', 'tent', 'outdoor', 'nature', 'wild', 'adventure'] },

    // Fall & Harvest
    { emoji: '🍂', name: 'Leaf', keywords: ['leaf', 'brown', 'fall', 'autumn', 'tree', 'season'] },
    { emoji: '🍁', name: 'Maple Leaf', keywords: ['maple', 'leaf', 'red', 'canada', 'fall', 'autumn'] },
    { emoji: '🍎', name: 'Apple', keywords: ['apple', 'red', 'fruit', 'harvest', 'healthy', 'crisp'] },
    { emoji: '🌰', name: 'Acorn', keywords: ['acorn', 'nut', 'brown', 'oak', 'tree', 'squirrel'] },
    { emoji: '🍄', name: 'Mushroom', keywords: ['mushroom', 'fungus', 'red', 'white', 'forest', 'spotted'] },
    { emoji: '🧥', name: 'Sweater', keywords: ['sweater', 'warm', 'clothing', 'cozy', 'knit', 'comfortable'] },
    { emoji: '🌳', name: 'Tree', keywords: ['tree', 'green', 'nature', 'tall', 'forest', 'wood'] },
    { emoji: '🐿️', name: 'Squirrel', keywords: ['squirrel', 'brown', 'nut', 'tail', 'forest', 'cute'] },
    { emoji: '🦉', name: 'Owl', keywords: ['owl', 'bird', 'wise', 'night', 'hoot', 'nocturnal'] },

    // General & Symbols
    { emoji: '❤️', name: 'Heart', keywords: ['heart', 'love', 'red', 'emotion', 'romance', 'passion'] },
    { emoji: '💎', name: 'Diamond', keywords: ['diamond', 'gem', 'blue', 'precious', 'jewel', 'sparkle'] },
    { emoji: '⚡', name: 'Lightning', keywords: ['lightning', 'bolt', 'electric', 'yellow', 'power', 'energy'] },
    { emoji: '✨', name: 'Sparkles', keywords: ['sparkles', 'stars', 'magic', 'shiny', 'glitter', 'shine'] },
    { emoji: '🎉', name: 'Party', keywords: ['party', 'celebration', 'confetti', 'fun', 'festive', 'joy'] },
    { emoji: '🏆', name: 'Trophy', keywords: ['trophy', 'award', 'gold', 'winner', 'victory', 'champion'] },
    { emoji: '👑', name: 'Crown', keywords: ['crown', 'king', 'royal', 'gold', 'queen', 'majesty'] },
    { emoji: '💰', name: 'Money', keywords: ['money', 'cash', 'dollar', 'green', 'wealth', 'rich'] }
  ];

  // Smart search function
  const searchEmojis = (query: string) => {
    if (!query.trim()) return EMOJI_DATABASE;
    
    const searchTerm = query.toLowerCase().trim();
    
    return EMOJI_DATABASE.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      item.keywords.some(keyword => keyword.includes(searchTerm)) ||
      item.emoji.includes(searchTerm)
    );
  };

  // Get filtered results
  const filteredEmojis = useMemo(() => searchEmojis(manualSearch), [manualSearch]);

  // Group by category for display
  const groupedEmojis = useMemo(() => filteredEmojis.reduce((acc, item) => {
    let category = 'General & Symbols';
    
    if (['🎃', '👻', '💀', '🕷️', '🦇', '🧙‍♀️', '🧹', '🍭', '⚰️', '🔮', '🧟‍♂️', '🧛‍♂️'].includes(item.emoji)) {
      category = 'Halloween & Spooky';
    } else if (['🎄', '🎁', '🎅', '⛄', '🔔', '⭐', '👼', '🦌', '🛷', '🎀', '🔥', '❄️', '🧊', '🥶', '☕', '🧤', '🧣', '🥾', '🎿', '🐧', '🐻‍❄️'].includes(item.emoji)) {
      category = 'Christmas & Winter';
    } else if (['🌸', '🌷', '🌹', '🌻', '🦋', '🐝', '🐞', '🌈', '☀️', '🌧️', '☂️', '🌱'].includes(item.emoji)) {
      category = 'Spring & Nature';
    } else if (['🏖️', '🌴', '🕶️', '🍦', '🍉', '🍋', '🥥', '🩴', '🏊‍♂️', '🏄‍♂️', '⛺'].includes(item.emoji)) {
      category = 'Summer & Beach';
    } else if (['🍂', '🍁', '🍎', '🌰', '🍄', '🧥', '🌳', '🐿️', '🦉'].includes(item.emoji)) {
      category = 'Fall & Harvest';
    }

    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof EMOJI_DATABASE>), [filteredEmojis]);

  // Handler to manually select an emoji from the bank
  const handleSelectEmoji = useCallback((emoji: string) => {
    const imageUrl = emojiToSvgDataURL(emoji);
    const newAsset: FloatingAsset = {
      id: crypto.randomUUID(),
      src: imageUrl,
      alt: `Emoji: ${emoji}`,
      type: 'image',
      x: '50%',
      y: '300px',
      rotation: '0',
      scale: 1.0,
      z: 50
    };
    handleAddFloatingAsset(newAsset);
    setManualSearch('');
    // Close the panel when emoji is selected
    onClose();
  }, [handleAddFloatingAsset, onClose]);


  // Handler for Promo Ticket Creation
  const handleCreatePromoTicket = useCallback((style: 'default' | 'premium' | 'sale' | 'new') => {
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const ticketData = {
      id: ticketId,
      type: 'promo-ticket' as const,
      alt: `${style} promo sticker`,
      x: '50%',
      y: '300px',
      rotation: '0',
      scale: 1,
      z: 10,
      customData: {
        ticketStyle: style,
        title: style === 'premium' ? 'PREMIUM' : style === 'sale' ? 'SALE' : style === 'new' ? 'NEW' : 'PROMO',
        discount: style === 'premium' ? '70%' : '50%'
      }
    };
    
    console.log('🎫 Creating promo sticker:', ticketData);
    handleAddFloatingAsset(ticketData);
  }, [handleAddFloatingAsset]);


  const handleNewThemeSave = useCallback(async () => {
    console.log('🎨 [AdminAssetSheet] handleNewThemeSave called!', { 
      newThemeName: newThemeName.trim(), 
      newThemePrompt: newThemePrompt.trim(), 
      isGeneratingTheme 
    });
    
    if (!newThemeName.trim() || !newThemePrompt.trim() || isGeneratingTheme) {
      console.log('🎨 [AdminAssetSheet] Early return due to validation:', { 
        hasName: !!newThemeName.trim(), 
        hasPrompt: !!newThemePrompt.trim(), 
        isGenerating: isGeneratingTheme 
      });
      return;
    }

    const formattedName = newThemeName.trim().replace(/\s+/g, ' ');
    const themeKey = formattedName;

    console.log('🎨 [AdminAssetSheet] Starting AI theme generation:', { formattedName, prompt: newThemePrompt.trim() });
    setIsGeneratingTheme(true);
    
    // Close the sheet and show notification
    onClose();
    onThemeGeneration?.(true, formattedName);

    try {
      // Generate AI-powered theme colors and background
      console.log('🎨 [AdminAssetSheet] Calling API endpoint...');
      const themeResponse = await fetch('/api/seasonal-store/generate-custom-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          themeName: formattedName,
          themePrompt: newThemePrompt.trim(),
        }),
      });

      console.log('🎨 [AdminAssetSheet] API response status:', themeResponse.status);
      
      if (!themeResponse.ok) {
        const errorText = await themeResponse.text();
        console.error('🎨 [AdminAssetSheet] API error response:', errorText);
        throw new Error(`Failed to generate custom theme: ${themeResponse.status} - ${errorText}`);
      }

      const themeData = await themeResponse.json();
      console.log('🎨 [AdminAssetSheet] Generated theme data:', themeData);

      const newThemeData = {
        name: formattedName,
        themePrompt: newThemePrompt.trim(),
        accent: themeData.accent,
        card: themeData.card,
        text: themeData.text,
        welcomeColor: themeData.welcomeColor,
        background: themeData.background,
        backgroundImage: themeData.backgroundImage,
        placeholderImage: themeData.placeholderImage || themeData.backgroundImage, // Store refined placeholder
        aiMessage: themeData.aiMessage,
        mainHeader: themeData.mainHeader, // Store generated mainHeader
        emojiTip: themeData.emojiTip,
      };

      await handleAddCustomTheme(newThemeData);
      setNewThemeName('');
      setNewThemePrompt('');
      
      // Update notification to show completed
      onThemeGeneration?.(false, formattedName);
    } catch (error) {
      console.error('🎨 [AdminAssetSheet] Error generating custom theme:', error);
      
      // Show user-friendly error message
      alert(`Failed to generate AI theme: ${(error as Error).message}\n\nFalling back to basic theme.`);
      
      // Fallback to basic theme if AI generation fails
      const newThemeData = {
        name: formattedName,
        themePrompt: newThemePrompt.trim(),
        accent: 'bg-indigo-500 hover:bg-indigo-600 text-white ring-indigo-400',
        card: 'bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-indigo-500/30',
        text: 'text-gray-800',
        welcomeColor: 'text-yellow-300',
        background: `bg-[url('https://placehold.co/1920x1080/000000/ffffff?text=AI+Theme+BG')] bg-cover bg-center`,
        aiMessage: `Welcome to our custom ${formattedName} collection!`,
        emojiTip: "✨",
      };

      await handleAddCustomTheme(newThemeData);
      setNewThemeName('');
      setNewThemePrompt('');
      
      // Update notification to show completed even on error (fallback theme was created)
      onThemeGeneration?.(false, formattedName);
    } finally {
      setIsGeneratingTheme(false);
    }
  }, [newThemeName, newThemePrompt, handleAddCustomTheme, isGeneratingTheme, onClose, onThemeGeneration]);

  if (!isEditorView) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-transparent z-50" />
        <Dialog.Description className="sr-only">
          Background and Theme Manager
        </Dialog.Description>
        <Dialog.Content
          className={`fixed inset-y-0 right-0 w-full md:w-[420px] bg-white dark:bg-gray-900 text-foreground shadow-2xl z-[60] flex flex-col transform transition-transform duration-500 ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onEscapeKeyDown={onClose}
          onPointerDownOutside={(e) => {
            // Don't close if clicking on the dropdown menu
            const target = e.target as HTMLElement;
            if (target.closest('[data-dropdown-menu]')) {
              e.preventDefault();
              return;
            }
            onClose();
          }}
          onInteractOutside={(e) => {
            // Don't close if clicking on the dropdown menu
            const target = e.target as HTMLElement;
            if (target.closest('[data-dropdown-menu]')) {
              e.preventDefault();
              return;
            }
            onClose();
          }}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title asChild>
                <Heading
                  size="5"
                  weight="bold"
                  className="flex items-center gap-3 text-gray-900 dark:text-white text-2xl font-bold tracking-tight"
                >
                  <Settings className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  Background & Theme
                </Heading>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  size="2"
                  variant="soft"
                  color="gray"
                  className="!px-4 !py-2"
                >
                  Close
                </Button>
              </Dialog.Close>
            </div>
            <Separator size="1" color="gray" />
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50 dark:bg-gray-950 overflow-x-visible">
            <div className="space-y-6 min-w-0">
              {/* Theme Controls */}
              <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
                <div className="fui-reset px-6 py-6">
                  <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
                    Theme
                </Heading>
                <div className="space-y-3">
                  {/* Theme Selector */}
                  {setCurrentSeason && (() => {
                    // Filter themes to only show those from the "themes" table
                    // Include: initial themes, database themes (db_*), Company (if from database), and origin template theme
                    // Exclude: template themes (template_*) and custom themes (custom_*)
                    const initialThemeKeys = ['Winter', 'Summer', 'Fall', 'Autumn', 'Holiday Cheer', 'Spring Renewal', 'Cyber Sale', 'Black Friday'];
                    
                    // Build available themes map including origin template theme if it exists
                    const availableThemesMap: Record<string, LegacyTheme> = { ...allThemes };
                    
                    // Add origin template theme if it exists
                    if (originTemplate?.defaultThemeData) {
                      const originData = originTemplate.defaultThemeData;
                      const originTheme: LegacyTheme = {
                        name: originData.name || 'Company Theme',
                        themePrompt: originData.themePrompt || originTemplate.themePrompt || '',
                        accent: originData.accent || 'bg-indigo-500',
                        card: originData.card || 'bg-white/95 backdrop-blur-sm shadow-xl',
                        text: originData.text || 'text-gray-800',
                        welcomeColor: originData.welcomeColor || 'text-yellow-300',
                        background: originData.background || '',
                        placeholderImage: originData.placeholderImage || originData.background || null,
                        mainHeader: originData.mainHeader || null,
                        aiMessage: originData.aiMessage || originData.subHeader || '',
                        emojiTip: originData.emojiTip || '🎁',
                      };
                      // Use 'Company' key for origin template theme
                      availableThemesMap['Company'] = originTheme;
                    }
                    
                    const availableThemeKeys = Object.keys(availableThemesMap).filter(key => {
                      // Include initial themes
                      if (initialThemeKeys.includes(key)) return true;
                      // Include database themes (keys starting with db_)
                      if (key.startsWith('db_')) return true;
                      // Include Company theme (from database or origin template)
                      if (key === 'Company') return true;
                      // Exclude template themes and custom themes
                      return false;
                    });
                    
                    return (
                      <div className="relative" style={{ zIndex: 1000 }}>
                        <select
                          id="season-select"
                          value={currentSeason}
                          onChange={(e) => { 
                            setCurrentSeason(e.target.value);
                          }}
                          className="w-full px-4 py-2.5 pr-10 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 text-sm appearance-none cursor-pointer"
                          style={{ zIndex: 1000, boxSizing: 'border-box' }}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {availableThemeKeys.map(s => (
                            <option key={s} value={s}>{availableThemesMap[s].name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                      </div>
                    );
                  })()}

                  {/* Theme Up Background */}
                  {handleGenerateBgClick && (
                      <Button
                        size="3"
                        color="violet"
                        variant="solid"
                      onClick={handleGenerateBgClick}
                        disabled={loadingState?.isImageLoading}
                      className="w-full !px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 flex items-center justify-center gap-2"
                      >
                      <Zap className="w-5 h-5" />
                      <span>Theme Up Background</span>
                      </Button>
                  )}
                  </div>
                </div>
              </Card>

              {/* Dropdown Menu - Rendered in Portal to escape Dialog overflow */}
              {showThemeSettingsDropdown && typeof window !== 'undefined' && createPortal(
                <>
                  {/* Backdrop overlay to ensure dropdown is on top layer */}
                  <div 
                    className="fixed inset-0 z-[99998] bg-transparent pointer-events-auto"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      // Only close if clicking directly on backdrop, not on dropdown
                      if (!target.closest('[data-dropdown-menu]')) {
                        setShowThemeSettingsDropdown(false);
                      }
                    }}
                  />
                  {/* Dropdown Menu */}
                  <div 
                    data-dropdown-menu
                    className="fixed z-[99999] bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden min-w-[200px] pointer-events-auto"
                    style={dropdownPosition ? {
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      width: `${dropdownPosition.width}px`
                    } : { 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)',
                      width: '200px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedThemeSetting('custom');
                        setShowThemeSettingsDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:!bg-violet-100 dark:hover:!bg-violet-900/40 active:!bg-violet-200 dark:active:!bg-violet-900/60 transition-all duration-200 flex items-center gap-2 text-gray-900 dark:text-white group cursor-pointer"
                    >
                      <Palette className="w-5 h-5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                      <span className="group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">Custom Theme...</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedThemeSetting('edit');
                        setShowThemeSettingsDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:!bg-violet-100 dark:hover:!bg-violet-900/40 active:!bg-violet-200 dark:active:!bg-violet-900/60 transition-all duration-200 flex items-center gap-2 text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 group cursor-pointer"
                    >
                      <Edit className="w-5 h-5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                      <span className="group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">Edit Theme</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedThemeSetting('delete');
                        setShowThemeSettingsDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:!bg-red-100 dark:hover:!bg-red-900/40 active:!bg-red-200 dark:active:!bg-red-900/60 transition-all duration-200 flex items-center gap-2 text-red-600 dark:text-red-400 border-t border-gray-200 dark:border-gray-700 group cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors" />
                      <span className="group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">Delete Theme...</span>
                    </button>
                </div>
                </>,
                document.body
              )}

              {/* Emoji Bank */}
              <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
                <div className="fui-reset px-6 py-6">
                  <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  Emoji Bank
                </Heading>
                
                <input
                  type="search"
                  placeholder="Search emojis (e.g., 'gift', 'heart')"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 mb-4 text-sm"
                />

                <div className="max-h-60 overflow-y-auto space-y-3 p-1 rounded-lg">
                  {(() => {
                    // If searching, show all results in one section
                    if (manualSearch.trim()) {
                      return (
                        <div>
                          <Text size="2" weight="semi-bold" className="text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                            🔍 Search Results ({filteredEmojis.length})
                          </Text>
                          <div className="flex flex-wrap gap-2">
                            {filteredEmojis.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectEmoji(item.emoji);
                                }}
                                className="text-2xl p-1 bg-gray-100 dark:bg-gray-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-md transition-colors"
                                title={`${item.name} (${item.keywords.slice(0, 3).join(', ')})`}
                              >
                                {item.emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Show categorized view when not searching
                    return Object.entries(groupedEmojis).map(([category, items]) => (
                      <div key={category}>
                        <Text size="2" weight="semi-bold" className="text-gray-700 dark:text-gray-300 mt-2 mb-1 uppercase">
                          {category}
                        </Text>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEmoji(item.emoji);
                              }}
                              className="text-2xl p-1 bg-gray-100 dark:bg-gray-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-md transition-colors"
                              title={item.name}
                            >
                              {item.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                </div>
              </Card>

              {/* Background Controls */}
              <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
                <div className="fui-reset px-6 py-6">
                  <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
                    Background
                </Heading>
                <div className="space-y-3">
                  {/* Upload Background */}
                  {handleBgImageUpload && (
                    <label htmlFor="bg-upload-modal" className="cursor-pointer">
                      <Button
                        size="3"
                        color="violet"
                        variant="solid"
                        className="w-full !px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 flex items-center justify-center gap-2"
                        disabled={loadingState?.isImageLoading}
                        asChild
                      >
                        <span>
                          <Upload className="w-5 h-5" />
                          <span>Upload Background</span>
                        </span>
                      </Button>
                      <input 
                        type="file" 
                        id="bg-upload-modal" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => { 
                          if (e.target.files?.[0] && handleBgImageUpload) {
                            handleBgImageUpload(e.target.files[0]);
                          }
                        }}
                        disabled={loadingState?.isImageLoading}
                      />
                    </label>
                  )}
                  </div>
                </div>
              </Card>

              {/* Theme Settings Section */}
              <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
                <div className="fui-reset px-6 py-6">
                  <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
                    Theme Settings
                  </Heading>
                  
                  {/* Theme Settings Dropdown */}
                  <div className="relative" ref={themeSettingsDropdownRef}>
                    <div ref={themeSettingsButtonRef}>
                      <Button
                        size="3"
                        color="violet"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setShowThemeSettingsDropdown(!showThemeSettingsDropdown);
                        }}
                        className="w-full !px-6 !py-3 mb-4 flex items-center justify-between shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          <span>Theme Settings</span>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showThemeSettingsDropdown ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Theme Settings Content Sections - Below Theme Settings Section */}
              {selectedThemeSetting === 'custom' && (
                <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
                  <div className="fui-reset px-6 py-6">
                    <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                      <Palette className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      Custom Theme Designer
                    </Heading>
                    
                    {/* Limit warning */}
                    {!canAddCustomTheme && (
                      <div className="mb-4 p-3 border border-red-500/50 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <Text size="2" className="text-red-600 dark:text-red-400">
                          ⚠️ Maximum of {maxCustomThemes} custom themes reached. Delete some custom themes to create new ones.
                        </Text>
                    </div>
                  )}
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2">Theme name</Text>
                    <input
                      type="text"
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="Theme name (e.g., 'Neon Summer')"
                      className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 mb-4 text-sm"
                    />

                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2">Prompt</Text>
                    <textarea
                      value={newThemePrompt}
                      placeholder="Enter AI prompt description (e.g., 'An underwater scene with bright bioluminescence')"
                      onChange={(e) => setNewThemePrompt(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 mb-4 text-sm"
                      style={{ fontSize: '16px' }}
                      onFocus={(e) => {
                        e.target.style.fontSize = '16px';
                      }}
                    />

                    <Button
                      size="3"
                      color="violet"
                      variant="solid"
                      onClick={() => {
                        console.log('🎨 [AdminAssetSheet] Button clicked!', { 
                          newThemeName: newThemeName.trim(), 
                          newThemePrompt: newThemePrompt.trim(), 
                          isGeneratingTheme,
                          canAddCustomTheme
                        });
                        handleNewThemeSave();
                      }}
                      disabled={!newThemeName.trim() || !newThemePrompt.trim() || isGeneratingTheme || !canAddCustomTheme}
                      className="w-full !px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 flex items-center justify-center gap-2"
                    >
                      {isGeneratingTheme ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Generating AI Theme...</span>
                        </>
                      ) : (
                        <>
                      <Zap className="w-5 h-5" />
                          <span>Generate AI Theme</span>
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {selectedThemeSetting === 'edit' && (
                <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
                  <div className="fui-reset px-6 py-6">
                    <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                      <Edit className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      Edit Theme
                    </Heading>
                    
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2">
                      Current Theme: <span className="text-violet-600 dark:text-violet-400">{theme?.name || currentSeason}</span>
                    </Text>
                    <textarea
                      value={currentPromptValue}
                      onChange={(e) => setCurrentPromptValue(e.target.value)}
                      placeholder="Enter AI prompt description (e.g., 'A mystical forest with glowing mushrooms and ethereal lighting')"
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 mb-4 text-sm"
                      style={{ fontSize: '16px' }}
                      onFocus={(e) => {
                        e.target.style.fontSize = '16px';
                      }}
                    />
                    <Button
                      size="3"
                      color="violet"
                      variant="solid"
                      onClick={() => {
                        handleUpdateTheme(currentSeason, { themePrompt: currentPromptValue });
                      }}
                      disabled={!currentPromptValue.trim()}
                      className="w-full !px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 flex items-center justify-center gap-2"
                    >
                      <Settings className="w-5 h-5" />
                      <span>Apply Changes</span>
                    </Button>
                </div>
              </Card>
              )}

              {selectedThemeSetting === 'delete' && (
                <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
                  <div className="fui-reset px-6 py-6">
                    <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      Delete Custom Themes
                    </Heading>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(() => {
                        // Default theme names that should not be deletable
                        const defaultThemeNames = ['Winter Frost', 'Summer Sun', 'Autumn Harvest', 'Holiday Cheer', 'Spring Renewal', 'Cyber Monday', 'Halloween Spooky', 'Spooky Night'];
                        
                        // Get custom themes by excluding default themes and checking for custom_ or db_ prefix in keys
                        // This includes both frontend-created themes (custom_) and database-loaded themes (db_)
                        const customThemeEntries = Object.entries(allThemes).filter(([key, themeData]) => {
                          // Include themes with custom_ or db_ prefix (these are custom themes)
                          const isCustomKey = key.startsWith('custom_') || key.startsWith('db_');
                          // Also exclude default theme names (in case they're stored with different keys)
                          const isNotDefaultName = !defaultThemeNames.includes(themeData.name);
                          return isCustomKey && isNotDefaultName;
                        });
                        
                        // Convert to array of theme objects with their keys
                        const uniqueCustomThemes = customThemeEntries.map(([key, theme]) => ({ ...theme, _key: key }));
                        
                        console.log('🔍 Custom themes for deletion:', uniqueCustomThemes);
                        console.log('🔍 Current theme:', theme?.name);
                        console.log('🔍 Current theme key (if custom):', theme && Object.entries(allThemes).find(([k, t]) => t.name === theme.name)?.[0]);
                        console.log('🔍 All themes keys:', Object.keys(allThemes));
                        
                        if (uniqueCustomThemes.length === 0) {
                          return (
                            <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
                              No custom themes created yet
                            </div>
                          );
                        }
                        
                        return uniqueCustomThemes.map((themeData, index) => {
                          const isCurrentTheme = theme?.name === themeData.name;
                          return (
                            <div 
                              key={`${themeData._key}-${index}`} 
                              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                                isCurrentTheme 
                                  ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700' 
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                  <span className="truncate" title={themeData.name}>{themeData.name}</span>
                                  {isCurrentTheme && (
                                    <span className="flex-shrink-0 text-xs bg-violet-600 dark:bg-violet-500 text-white px-2 py-1 rounded-md font-semibold">
                                      CURRENT
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  // Show deleting notification immediately
                                  setDeleteNotification({ isOpen: true, isDeleting: true, themeName: themeData.name });
                                  
                                  try {
                                    // Check if this is a database theme (db_ prefix) or frontend-only theme (custom_ prefix)
                                    if (themeData._key.startsWith('db_')) {
                                      // Extract theme ID from key (format: db_${themeId})
                                      const themeId = themeData._key.replace('db_', '');
                                      
                                      // Call onDeleteTheme if available (for database themes)
                                      if (onDeleteTheme && experienceId) {
                                        await onDeleteTheme(themeId);
                                        console.log('✅ [AdminAssetSheet] Database theme deleted:', themeId);
                                      }
                                    }
                                    
                                    // Remove from allThemes state (works for both custom_ and db_ themes)
                                    setAllThemes(prev => {
                                      const updated = { ...prev };
                                      delete updated[themeData._key];
                                      return updated;
                                    });
                                    
                                    // If this was the current theme, switch to a built-in theme
                                    if (isCurrentTheme) {
                                      const builtInThemeKey = Object.keys(allThemes).find(key => 
                                        !key.startsWith('custom_') && !key.startsWith('db_')
                                      );
                                      if (builtInThemeKey && setCurrentSeason) {
                                        setCurrentSeason(builtInThemeKey);
                                      }
                                    }
                                    
                                    // Show success notification
                                    setDeleteNotification({ isOpen: true, isDeleting: false, themeName: themeData.name });
                                    
                                    // Auto-close notification after 2 seconds
                                    setTimeout(() => {
                                      setDeleteNotification({ isOpen: false, isDeleting: false, themeName: '' });
                                    }, 2000);
                                  } catch (error) {
                                    console.error('❌ [AdminAssetSheet] Error deleting theme:', error);
                                    alert(`Failed to delete theme: ${(error as Error).message}`);
                                    setDeleteNotification({ isOpen: false, isDeleting: false, themeName: '' });
                                  }
                                }}
                                disabled={deleteNotification.isDeleting}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete theme"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </Card>
              )}

              {/* Text Editor */}
              {selectedAssetId && ['mainHeader', 'headerMessage', 'subHeader', 'promoMessage'].includes(selectedAssetId) && (
                <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
                  <div className="fui-reset px-6 py-6">
                    <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                    <Type className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    Text Editor
                  </Heading>
                  <Text size="2" className="text-gray-600 dark:text-gray-400 mb-4">
                    Edit the selected text content. Changes are applied immediately.
                  </Text>
            
            <textarea
              placeholder="Edit text"
              value={(() => {
                const rawContent = selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.content : 
                     selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.content : 
                     selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.content : 
                                 fixedTextStyles.promoMessage.content;
                // First normalize to prevent double-encoding, then decode entities for textarea display
                const normalized = normalizeHtmlContent(rawContent || '');
                return decodeHtmlEntitiesForTextarea(normalized);
              })()}
              maxLength={selectedAssetId === 'mainHeader' ? 20 : undefined}
              style={{ fontSize: '16px' }}
              onFocus={(e) => {
                // Prevent iOS zoom on focus
                e.target.style.fontSize = '16px';
              }}
              onChange={(e) => {
                const newContent = e.target.value;
                // Normalize content before saving to prevent double-encoding
                // User input is plain text, but normalize in case there are any entities
                const normalizedContent = normalizeHtmlContent(newContent);
                if (selectedAssetId === 'mainHeader') {
                  // Enforce 20 character limit for mainHeader
                  const limitedContent = normalizedContent.slice(0, 20);
                  setFixedTextStyles(prev => ({
                    ...prev, 
                    mainHeader: {...prev.mainHeader, content: limitedContent}
                  }));
                } else if (selectedAssetId === 'headerMessage') {
                  setFixedTextStyles(prev => ({
                    ...prev, 
                    headerMessage: {...prev.headerMessage, content: normalizedContent}
                  }));
                } else if (selectedAssetId === 'subHeader') {
                  setFixedTextStyles(prev => ({
                    ...prev, 
                    subHeader: {...prev.subHeader, content: normalizedContent}
                  }));
                } else if (selectedAssetId === 'promoMessage') {
                  setFixedTextStyles(prev => ({
                    ...prev, 
                    promoMessage: {...prev.promoMessage, content: normalizedContent}
                  }));
                }
              }}
                  className="w-full px-4 py-2.5 mb-4 text-sm rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 h-20 resize-none"
                />
                
                {/* Typography Controls */}
                <div className="space-y-3 mb-4">
                  <Text size="2" weight="semi-bold" className="text-gray-700 dark:text-gray-300">Typography</Text>
              
              {/* Font Size */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400 w-16">Size:</label>
                <select
                  value={selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.styleClass : 
                         selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.styleClass : 
                         selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.styleClass : 
                         fixedTextStyles.promoMessage.styleClass}
                  onChange={(e) => {
                    const newStyleClass = e.target.value;
                    if (selectedAssetId === 'mainHeader') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        mainHeader: {...prev.mainHeader, styleClass: newStyleClass}
                      }));
                    } else if (selectedAssetId === 'headerMessage') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        headerMessage: {...prev.headerMessage, styleClass: newStyleClass}
                      }));
                    } else if (selectedAssetId === 'subHeader') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        subHeader: {...prev.subHeader, styleClass: newStyleClass}
                      }));
                    } else if (selectedAssetId === 'promoMessage') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        promoMessage: {...prev.promoMessage, styleClass: newStyleClass}
                      }));
                    }
                  }}
                  className="flex-1 p-2 text-xs rounded bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg">Extra Large (6xl)</option>
                  <option value="text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg">Large (5xl)</option>
                  <option value="text-4xl sm:text-5xl font-bold tracking-tight drop-shadow-lg">XL (4xl)</option>
                  <option value="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-lg">3XL</option>
                  <option value="text-2xl sm:text-3xl font-bold tracking-tight drop-shadow-lg">2XL</option>
                  <option value="text-xl sm:text-2xl font-light italic drop-shadow-md">Large (xl)</option>
                  <option value="text-lg sm:text-xl font-medium drop-shadow-md">Medium (lg)</option>
                  <option value="text-base sm:text-lg font-normal">Base</option>
                  <option value="text-sm sm:text-base font-normal">Small</option>
                </select>
              </div>
              
              {/* Font Weight */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400 w-16">Weight:</label>
                <select
                  onChange={(e) => {
                    const currentStyle = selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.styleClass : 
                                       selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.styleClass : 
                                       fixedTextStyles.promoMessage.styleClass;
                    const newStyleClass = currentStyle.replace(/font-\w+/g, e.target.value);
                    if (selectedAssetId === 'mainHeader') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        mainHeader: {...prev.mainHeader, styleClass: newStyleClass}
                      }));
                    } else if (selectedAssetId === 'headerMessage') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        headerMessage: {...prev.headerMessage, styleClass: newStyleClass}
                      }));
                    } else if (selectedAssetId === 'subHeader') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        subHeader: {...prev.subHeader, styleClass: newStyleClass}
                      }));
                    } else if (selectedAssetId === 'promoMessage') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        promoMessage: {...prev.promoMessage, styleClass: newStyleClass}
                      }));
                    }
                  }}
                  className="flex-1 p-2 text-xs rounded bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="font-thin">Thin</option>
                  <option value="font-light">Light</option>
                  <option value="font-normal">Normal</option>
                  <option value="font-medium">Medium</option>
                  <option value="font-semibold">Semi Bold</option>
                  <option value="font-bold">Bold</option>
                  <option value="font-extrabold">Extra Bold</option>
                  <option value="font-black">Black</option>
                </select>
              </div>
              
              {/* Bold and Italic Toggles */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-400">Bold:</label>
                  <button
                    onClick={() => {
                      const currentStyle = selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.styleClass : 
                                         selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.styleClass : 
                                         selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.styleClass : 
                                         fixedTextStyles.promoMessage.styleClass;
                      const isBold = currentStyle.includes('font-bold') || currentStyle.includes('font-extrabold') || currentStyle.includes('font-black');
                      const newStyleClass = isBold 
                        ? currentStyle.replace(/font-\w+/g, 'font-normal')
                        : currentStyle.replace(/font-\w+/g, 'font-bold');
                      
                      if (selectedAssetId === 'mainHeader') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          mainHeader: {...prev.mainHeader, styleClass: newStyleClass}
                        }));
                      } else if (selectedAssetId === 'headerMessage') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          headerMessage: {...prev.headerMessage, styleClass: newStyleClass}
                        }));
                      } else if (selectedAssetId === 'subHeader') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          subHeader: {...prev.subHeader, styleClass: newStyleClass}
                        }));
                      } else if (selectedAssetId === 'promoMessage') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          promoMessage: {...prev.promoMessage, styleClass: newStyleClass}
                        }));
                      }
                    }}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      (selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.styleClass : 
                       selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.styleClass : 
                       selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.styleClass : 
                       fixedTextStyles.promoMessage.styleClass).includes('font-bold') || 
                      (selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.styleClass : 
                       selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.styleClass : 
                       selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.styleClass : 
                       fixedTextStyles.promoMessage.styleClass).includes('font-extrabold') ||
                      (selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.styleClass : 
                       selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.styleClass : 
                       selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.styleClass : 
                       fixedTextStyles.promoMessage.styleClass).includes('font-black')
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 hover:from-gray-500 hover:to-gray-600'
                    }`}
                  >
                    B
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-400">Italic:</label>
                  <button
                    onClick={() => {
                      const currentStyle = selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.styleClass : 
                                         selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.styleClass : 
                                         selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.styleClass : 
                                         fixedTextStyles.promoMessage.styleClass;
                      const isItalic = currentStyle.includes('italic');
                      const newStyleClass = isItalic 
                        ? currentStyle.replace(' italic', '').replace('italic', '')
                        : currentStyle + ' italic';
                      
                      if (selectedAssetId === 'mainHeader') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          mainHeader: {...prev.mainHeader, styleClass: newStyleClass}
                        }));
                      } else if (selectedAssetId === 'headerMessage') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          headerMessage: {...prev.headerMessage, styleClass: newStyleClass}
                        }));
                      } else if (selectedAssetId === 'subHeader') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          subHeader: {...prev.subHeader, styleClass: newStyleClass}
                        }));
                      } else if (selectedAssetId === 'promoMessage') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          promoMessage: {...prev.promoMessage, styleClass: newStyleClass}
                        }));
                      }
                    }}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      (selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.styleClass : 
                       selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.styleClass : 
                       selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.styleClass : 
                       fixedTextStyles.promoMessage.styleClass).includes('italic')
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 hover:from-gray-500 hover:to-gray-600'
                    }`}
                  >
                    I
                  </button>
                </div>
              </div>
            </div>
            
            {/* Color Controls */}
            <div className="space-y-3 mb-4">
              <h5 className="text-sm font-semibold text-gray-300">Color</h5>
              
              {/* Color Picker */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400 w-16">Color:</label>
                <input
                  type="color"
                  value={selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.color : 
                         selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.color : 
                         selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.color : 
                         fixedTextStyles.promoMessage.color}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    if (selectedAssetId === 'mainHeader') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        mainHeader: {...prev.mainHeader, color: newColor}
                      }));
                    } else if (selectedAssetId === 'headerMessage') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        headerMessage: {...prev.headerMessage, color: newColor}
                      }));
                    } else if (selectedAssetId === 'subHeader') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        subHeader: {...prev.subHeader, color: newColor}
                      }));
                    } else if (selectedAssetId === 'promoMessage') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        promoMessage: {...prev.promoMessage, color: newColor}
                      }));
                    }
                  }}
                  className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.color : 
                         selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.color : 
                         selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.color : 
                         fixedTextStyles.promoMessage.color}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    if (selectedAssetId === 'mainHeader') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        mainHeader: {...prev.mainHeader, color: newColor}
                      }));
                    } else if (selectedAssetId === 'headerMessage') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        headerMessage: {...prev.headerMessage, color: newColor}
                      }));
                    } else if (selectedAssetId === 'subHeader') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        subHeader: {...prev.subHeader, color: newColor}
                      }));
                    } else if (selectedAssetId === 'promoMessage') {
                      setFixedTextStyles(prev => ({
                        ...prev, 
                        promoMessage: {...prev.promoMessage, color: newColor}
                      }));
                    }
                  }}
                  placeholder="#FFEDD5"
                  className="flex-1 p-2 text-xs rounded bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Quick Color Presets */}
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Warm', color: '#FFEDD5' },
                  { name: 'Gold', color: '#FDBA74' },
                  { name: 'White', color: '#FFFFFF' },
                  { name: 'Cream', color: '#FEF3C7' },
                  { name: 'Orange', color: '#FB923C' },
                  { name: 'Red', color: '#EF4444' },
                  { name: 'Blue', color: '#3B82F6' },
                  { name: 'Green', color: '#10B981' },
                  { name: 'Purple', color: '#8B5CF6' },
                  { name: 'Pink', color: '#EC4899' }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      if (selectedAssetId === 'mainHeader') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          mainHeader: {...prev.mainHeader, color: preset.color}
                        }));
                      } else if (selectedAssetId === 'headerMessage') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          headerMessage: {...prev.headerMessage, color: preset.color}
                        }));
                      } else if (selectedAssetId === 'subHeader') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          subHeader: {...prev.subHeader, color: preset.color}
                        }));
                      } else if (selectedAssetId === 'promoMessage') {
                        setFixedTextStyles(prev => ({
                          ...prev, 
                          promoMessage: {...prev.promoMessage, color: preset.color}
                        }));
                      }
                    }}
                    className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 transition-colors"
                    style={{ backgroundColor: preset.color, color: preset.color === '#FFFFFF' ? '#000000' : '#FFFFFF' }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Reset to default content
                  if (selectedAssetId === 'mainHeader') {
                    setFixedTextStyles(prev => ({
                      ...prev, 
                      mainHeader: {...prev.mainHeader, content: 'CLICK, MAIN HEADER TEXT'}
                    }));
                  } else if (selectedAssetId === 'headerMessage') {
                    setFixedTextStyles(prev => ({
                      ...prev, 
                      headerMessage: {...prev.headerMessage, content: allThemes[currentSeason].aiMessage}
                    }));
                  } else if (selectedAssetId === 'subHeader') {
                    setFixedTextStyles(prev => ({
                      ...prev, 
                      subHeader: {...prev.subHeader, content: allThemes[currentSeason].aiMessage}
                    }));
                  } else if (selectedAssetId === 'promoMessage') {
                    setFixedTextStyles(prev => ({
                      ...prev, 
                      promoMessage: {...prev.promoMessage, content: 'Our Merchant has **GIFT** for you!'}
                    }));
                  }
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => onSelectAsset(null)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
              >
                Done
              </button>
            </div>
                  </div>
                    </Card>
                  )}
        
              {/* Selected Asset Info */}
              {selectedAsset && (
                <Card className="p-6 border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 sticky top-[5.5rem] z-20 overflow-visible min-w-0">
                  <div className="fui-reset px-6 py-6">
                  <Text size="2" className="text-gray-700 dark:text-gray-300 mb-4">
                    Drag to move, corner to resize, top handle to rotate.
                  </Text>

                  <Button
                    size="3"
                    color="red"
                    variant="solid"
                    onClick={() => onDeleteFloatingAsset(selectedAsset.id)}
                    disabled={selectedAsset.isLogo}
                    className="w-full !px-6 !py-3 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105 transition-all duration-300 dark:shadow-red-500/30 dark:hover:shadow-red-500/50 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete Asset</span>
                  </Button>
                  </div>
                </Card>
              )}
                  </div>
          </div>
          
          {/* Delete Theme Notification */}
          <DeleteThemeNotification
            isOpen={deleteNotification.isOpen}
            isDeleting={deleteNotification.isDeleting}
            themeName={deleteNotification.themeName}
            onClose={() => setDeleteNotification({ isOpen: false, isDeleting: false, themeName: '' })}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
