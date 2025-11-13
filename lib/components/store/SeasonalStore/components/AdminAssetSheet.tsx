import React, { useState, useCallback, useEffect } from 'react';
import { FloatingAsset, LegacyTheme, FixedTextStyles } from '../types/index';
import { 
  SettingsIcon, 
  XIcon, 
  ImagePlusIcon, 
  SearchIcon, 
  TrashIcon, 
  GrabIcon, 
  LayersIcon,
  ZapIcon,
  PaletteIcon,
  EditIcon
} from './Icons';
import { emojiToSvgDataURL } from '../services/aiService';
import { useBackgroundAnalysis } from '../utils/backgroundAnalyzer';
import { DeleteThemeNotification } from './DeleteThemeNotification';

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
}) => {
  // Debug logging
  console.log('🎨 AdminAssetSheet render:', { isOpen, isEditorView, selectedAssetId });
  
  // Early return before any hooks
  if (!isOpen || !isEditorView) return null;

  // Use background analysis from parent for dynamic text colors

  const [manualSearch, setManualSearch] = useState('');
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemePrompt, setNewThemePrompt] = useState('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  
  // Section visibility state
  const [showCustomThemeDesigner, setShowCustomThemeDesigner] = useState(false);
  const [showEditThemePrompt, setShowEditThemePrompt] = useState(false);
  const [showDeleteCustomThemes, setShowDeleteCustomThemes] = useState(false);
  
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
  const filteredEmojis = searchEmojis(manualSearch);

  // Group by category for display
  const groupedEmojis = filteredEmojis.reduce((acc, item) => {
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
  }, {} as Record<string, typeof EMOJI_DATABASE>);

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

  return (
    <div
      className={`fixed inset-y-0 right-0 w-full md:w-80 bg-gray-900/70 backdrop-blur-md text-white shadow-2xl transform transition-transform duration-500 z-[60] p-0 border-l border-gray-700/50 overflow-hidden flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Background & Theme Manager"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
        <h3 className={`text-sm font-semibold tracking-wide flex items-center ${backgroundAnalysis?.recommendedTextColor === 'white' ? 'text-white' : 'text-black'}`}>
          <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Background & Theme
        </h3>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
          <XIcon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
        {/* Background Controls */}
        <div>
          <div className="space-y-3">
            {/* Upload Background */}
            {handleBgImageUpload && (
              <label htmlFor="bg-upload-modal" className="cursor-pointer w-full px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center justify-center space-x-2" title="Upload Background">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="font-semibold">Upload Background</span>
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

        {/* Manual Emoji Bank */}
        <div>
          <h4 className="text-3xl font-extrabold text-cyan-400 mb-6 flex items-center">
            <SearchIcon className="w-8 h-8 mr-3"/> Emoji Bank
          </h4>
          <div className="mb-8"></div>
          
          <input
            type="search"
            placeholder="Search emojis (e.g., 'gift', 'heart')"
            value={manualSearch}
            onChange={(e) => setManualSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 mb-4"
          />

          <div className="max-h-60 overflow-y-auto space-y-3 p-1 rounded-lg">
            {(() => {
              // If searching, show all results in one section
              if (manualSearch.trim()) {
                return (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                      🔍 Search Results ({filteredEmojis.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {filteredEmojis.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEmoji(item.emoji);
                          }}
                          className="text-2xl p-1 bg-gray-800 hover:bg-cyan-900/50 rounded-md transition-colors"
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
                  <h5 className="text-sm font-semibold uppercase text-gray-300 mt-2 mb-1">{category}</h5>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectEmoji(item.emoji);
                        }}
                        className="text-2xl p-1 bg-gray-800 hover:bg-cyan-900/50 rounded-md transition-colors"
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

        {/* Theme Controls */}
        <div>
          <div className="space-y-3">
            {/* Theme Selector */}
            {setCurrentSeason && (
              <div className="space-y-2">
                <label htmlFor="season-select" className="text-sm font-semibold text-gray-300">Theme:</label>
                <select
                  id="season-select"
                  value={currentSeason}
                  onChange={(e) => { 
                    setCurrentSeason(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {Object.keys(allThemes).map(s => (
                    <option key={s} value={s}>{allThemes[s].name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Theme Up Background */}
            {handleGenerateBgClick && (
              <button 
                onClick={handleGenerateBgClick}
                disabled={loadingState?.isImageLoading}
                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 ${
                  loadingState?.isImageLoading 
                    ? 'bg-gradient-to-r from-indigo-800 to-purple-800 text-indigo-400 cursor-not-allowed shadow-indigo-500/25' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40 text-white'
                }`}
                title="Theme Up Background"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold">Theme Up Background</span>
              </button>
            )}
          </div>
        </div>

        {/* Text Editor */}
        {selectedAssetId && ['mainHeader', 'headerMessage', 'subHeader', 'promoMessage'].includes(selectedAssetId) && (
          <div className="p-3 bg-gray-900 rounded-xl border border-blue-600/50">
            <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Text Editor
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              Edit the selected text content. Changes are applied immediately.
            </p>
            
            <textarea
              placeholder="Edit text content"
              value={selectedAssetId === 'mainHeader' ? fixedTextStyles.mainHeader.content : 
                     selectedAssetId === 'headerMessage' ? fixedTextStyles.headerMessage.content : 
                     selectedAssetId === 'subHeader' ? fixedTextStyles.subHeader.content : 
                     fixedTextStyles.promoMessage.content}
              onChange={(e) => {
                const newContent = e.target.value;
                if (selectedAssetId === 'mainHeader') {
                  setFixedTextStyles(prev => ({
                    ...prev, 
                    mainHeader: {...prev.mainHeader, content: newContent}
                  }));
                } else if (selectedAssetId === 'headerMessage') {
                  setFixedTextStyles(prev => ({
                    ...prev, 
                    headerMessage: {...prev.headerMessage, content: newContent}
                  }));
                } else if (selectedAssetId === 'subHeader') {
                  setFixedTextStyles(prev => ({
                    ...prev, 
                    subHeader: {...prev.subHeader, content: newContent}
                  }));
                } else if (selectedAssetId === 'promoMessage') {
                  setFixedTextStyles(prev => ({
                    ...prev, 
                    promoMessage: {...prev.promoMessage, content: newContent}
                  }));
                }
              }}
              className="w-full p-2 mb-3 text-sm rounded-lg bg-gray-800 text-white placeholder-gray-500 border-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
            />
            
            {/* Typography Controls */}
            <div className="space-y-3 mb-4">
              <h5 className="text-sm font-semibold text-gray-300">Typography</h5>
              
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
        )}


        {/* Custom Theme Designer */}
        <div>
          <button
            onClick={() => setShowCustomThemeDesigner(!showCustomThemeDesigner)}
            className="w-full mb-4 px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 flex items-center justify-center space-x-2"
          >
            <PaletteIcon className="w-5 h-5" />
            <span className="font-semibold">Custom Theme Designer</span>
            <svg className={`w-5 h-5 transition-transform duration-300 ${showCustomThemeDesigner ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showCustomThemeDesigner && (
            <div className="mb-6">
          {/* Limit warning */}
          {!canAddCustomTheme && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">
                ⚠️ Maximum of {maxCustomThemes} custom themes reached. Delete some custom themes to create new ones.
              </p>
            </div>
          )}
          <label className="block text-sm font-semibold text-gray-300 mb-2">Theme name</label>
          <input
            type="text"
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
            placeholder="Theme name (e.g., 'Neon Summer')"
            className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 mb-4"
          />

          <label className="block text-sm font-semibold text-gray-300 mb-2">Prompt</label>
          <textarea
            value={newThemePrompt}
            placeholder="Enter AI prompt description (e.g., 'An underwater scene with bright bioluminescence')"
            onChange={(e) => setNewThemePrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 mb-4"
          />

          <button 
            onClick={() => {
              console.log('🎨 [AdminAssetSheet] Button clicked!', { 
                newThemeName: newThemeName.trim(), 
                newThemePrompt: newThemePrompt.trim(), 
                isGeneratingTheme,
                canAddCustomTheme
              });
              handleNewThemeSave();
            }} 
            className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm font-semibold ${
              (newThemeName.trim() && newThemePrompt.trim() && !isGeneratingTheme && canAddCustomTheme) ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700' : 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed'
            }`}
            disabled={!newThemeName.trim() || !newThemePrompt.trim() || isGeneratingTheme || !canAddCustomTheme}
          >
            {isGeneratingTheme ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating AI Theme...
              </>
            ) : (
              <>
                <ZapIcon className="w-4 h-4 mr-2" /> 
                Generate AI Theme
              </>
            )}
          </button>
            </div>
          )}
        </div>


        {/* Edit Theme - Moved to Bottom */}
        <div>
          <button
            onClick={() => setShowEditThemePrompt(!showEditThemePrompt)}
            className="w-full mb-4 px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center space-x-2"
          >
            <EditIcon className="w-5 h-5" />
            <span className="font-semibold">Edit Theme</span>
            <svg className={`w-5 h-5 transition-transform duration-300 ${showEditThemePrompt ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showEditThemePrompt && (
            <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Current Theme: <span className="text-blue-400">{theme?.name || currentSeason}</span>
          </label>
          <textarea
            value={currentPromptValue}
            onChange={(e) => setCurrentPromptValue(e.target.value)}
            placeholder="Enter AI prompt description (e.g., 'A mystical forest with glowing mushrooms and ethereal lighting')"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 mb-4"
          />
          <button 
            onClick={() => {
              handleUpdateTheme(currentSeason, { themePrompt: currentPromptValue });
            }}
            className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm font-semibold ${
              currentPromptValue.trim() ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed'
            }`}
            disabled={!currentPromptValue.trim()}
          >
            <SettingsIcon className="w-4 h-4 mr-2" /> 
            Apply Changes
          </button>
            </div>
          )}
        </div>
        
        
        {/* Selected Asset Info */}
        {selectedAsset && (
          <div className="p-3 bg-cyan-900/30 rounded-xl border border-cyan-400 shadow-lg sticky top-[5.5rem] z-20">
            
            <p className="text-sm text-gray-300 mb-3">
              Drag to move, corner to resize, top handle to rotate.
            </p>

            <button 
              onClick={() => onDeleteFloatingAsset(selectedAsset.id)} 
              className={`w-full mt-4 py-2 text-sm rounded-lg bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 transition-colors flex items-center justify-center font-semibold ${selectedAsset.isLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedAsset.isLogo}
            >
              <TrashIcon className={`w-4 h-4 mr-2`} /> Delete Asset
            </button>
          </div>
        )}

        {/* Delete Custom Themes - Moved to Bottom */}
        <div>
          <button
            onClick={() => setShowDeleteCustomThemes(!showDeleteCustomThemes)}
            className="w-full mb-4 px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 flex items-center justify-center space-x-2"
          >
            <TrashIcon className="w-5 h-5" />
            <span className="font-semibold">Delete Custom Themes</span>
            <svg className={`w-5 h-5 transition-transform duration-300 ${showDeleteCustomThemes ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showDeleteCustomThemes && (
            <div className="mb-6">
          <p className="text-sm text-gray-300 mb-4">
            Remove custom themes you've created. Default themes cannot be deleted.
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
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
                  <div className="text-center text-gray-400 text-sm py-4">
                    No custom themes created yet
                  </div>
                );
              }
              
              return uniqueCustomThemes.map((themeData, index) => {
                const isCurrentTheme = theme?.name === themeData.name;
                return (
                  <div key={`${themeData._key}-${index}`} className={`flex items-center gap-2 p-3 rounded-lg border ${isCurrentTheme ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800/50 border-gray-600'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="truncate" title={themeData.name}>{themeData.name}</span>
                        {isCurrentTheme && <span className="flex-shrink-0 text-xs bg-blue-500 text-white px-2 py-1 rounded">CURRENT</span>}
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
                            
                            // Delete from database if onDeleteTheme callback is provided
                            if (onDeleteTheme && experienceId) {
                              await onDeleteTheme(themeId);
                              console.log('✅ Theme deleted from database:', themeId);
                            } else if (!onDeleteTheme || !experienceId) {
                              console.warn('⚠️ Cannot delete theme from database: missing onDeleteTheme or experienceId');
                            }
                          }
                          
                          // Remove from frontend state
                          const updatedThemes = { ...allThemes };
                          delete updatedThemes[themeData._key];
                          setAllThemes(updatedThemes);
                          
                          console.log('✅ Theme removed from frontend:', themeData._key);
                          
                          // Update notification to show success
                          setDeleteNotification({ isOpen: true, isDeleting: false, themeName: themeData.name });
                          
                          // Note: If deleting the currently active theme, currentSeason will still point to the deleted key
                          // The parent component should handle switching to a fallback theme if needed
                        } catch (error) {
                          console.error('❌ Failed to delete theme:', error);
                          // Still show error in notification briefly
                          setDeleteNotification({ isOpen: true, isDeleting: false, themeName: `Error: ${(error as Error).message}` });
                          setTimeout(() => {
                            setDeleteNotification({ isOpen: false, isDeleting: false, themeName: '' });
                          }, 3000);
                        }
                      }}
                      className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete custom theme"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                );
              });
            })()}
          </div>
            </div>
          )}
        </div>
        </div>
      </div>
      
      {/* Delete Theme Notification - Same style as Save notification */}
      <DeleteThemeNotification
        isOpen={deleteNotification.isOpen}
        isDeleting={deleteNotification.isDeleting}
        themeName={deleteNotification.themeName}
        onClose={() => setDeleteNotification({ isOpen: false, isDeleting: false, themeName: '' })}
      />
    </div>
  );
};
