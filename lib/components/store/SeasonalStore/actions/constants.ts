import { LegacyTheme, EmojiCategory } from '../types';

// Initial Themes Data
export const initialThemes: Record<string, LegacyTheme> = {
  Winter: {
    name: 'Winter Frost',
    themePrompt: 'A chilly, cozy landscape with soft snow and icy blue colors.',
    accent: 'bg-blue-600 hover:bg-blue-700 text-white ring-blue-500',
    card: 'bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-blue-500/30',
    text: 'text-gray-800',
    welcomeColor: 'text-blue-200',
    background: 'bg-gradient-to-br from-blue-900 to-blue-700',
    aiMessage: "Discover our curated winter collection with premium items for the season",
    emojiTip: "❄️🎁☕ (e.g., 'gift box with a bow')",
  },
  Summer: {
    name: 'Summer Sun',
    themePrompt: 'A vibrant, warm beach scene with bright yellows and oranges.',
    accent: 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 ring-yellow-400',
    card: 'bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-yellow-500/30',
    text: 'text-gray-800',
    welcomeColor: 'text-yellow-100',
    background: 'bg-gradient-to-br from-yellow-400 to-orange-500',
    aiMessage: "Explore our summer essentials and trending items for the warm season",
    emojiTip: "☀️🏖️🍦 (e.g., 'ice cream cone')",
  },
  Fall: {
    name: 'Spooky Night',
    themePrompt: 'A dark, eerie Halloween night with glowing jack-o-lanterns, swirling fog, twisted trees, and mysterious shadows. Deep blacks, electric orange, and ghostly purple tones.',
    accent: 'bg-orange-600 hover:bg-orange-700 text-black ring-yellow-400',
    card: 'bg-gray-900/95 backdrop-blur-md shadow-2xl hover:shadow-orange-500/30 border border-orange-500/30 shadow-orange-500/20',
    text: 'text-orange-100',
    welcomeColor: 'text-orange-200',
    background: 'bg-gradient-to-br from-gray-900 via-black to-orange-900',
    aiMessage: "Beware! Our haunted collection emerges from the shadows. Dare to discover what lurks in the darkness...",
    emojiTip: "👻🎃💀🦇 (e.g., 'haunted house')",
  },
  Autumn: {
    name: 'Autumn Harvest',
    themePrompt: 'A warm, cozy autumn scene with golden leaves, pumpkin patches, and harvest fields. Rich oranges, deep reds, warm browns, and amber tones.',
    accent: 'bg-amber-600 hover:bg-amber-700 text-white ring-orange-400',
    card: 'bg-amber-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-orange-500/30',
    text: 'text-amber-900',
    welcomeColor: 'text-amber-200',
    background: 'bg-gradient-to-br from-amber-600 via-orange-600 to-red-700',
    aiMessage: "Embrace the cozy season with our autumn collection featuring warm tones and harvest essentials",
    emojiTip: "🍂🍁🍎🌰 (e.g., 'falling maple leaf')",
  },
  'Holiday Cheer': {
    name: 'Holiday Cheer',
    themePrompt: 'A festive, traditional Christmas scene with deep reds and greens.',
    accent: 'bg-red-600 hover:bg-red-700 text-white ring-green-500',
    card: 'bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-red-500/30',
    text: 'text-gray-800',
    welcomeColor: 'text-red-200',
    background: 'bg-gradient-to-br from-red-600 to-green-600',
    aiMessage: "Celebrate the holidays with our special collection of festive gifts and decor",
    emojiTip: "🎄🎁🔔 (e.g., 'holiday bell')",
  },
  'Spring Renewal': {
    name: 'Spring Renewal',
    themePrompt: 'A light, fresh garden scene with pastel pinks, greens, and soft light.',
    accent: 'bg-pink-400 hover:bg-pink-500 text-white ring-green-400',
    card: 'bg-green-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-pink-400/30',
    text: 'text-green-800',
    welcomeColor: 'text-pink-100',
    background: 'bg-gradient-to-br from-green-400 to-pink-400',
    aiMessage: "Blossom into savings! Our Spring Renewal line brings fresh starts and bright ideas.",
    emojiTip: "🌸🌱🦋 (e.g., 'pink blossom')",
  },
  'Cyber Sale': {
    name: 'Cyber Sale',
    themePrompt: 'A futuristic, dark scene with neon cyan, purple, and geometric grid lines.',
    accent: 'bg-cyan-400 hover:bg-cyan-300 text-gray-900 ring-purple-600',
    card: 'bg-gray-900/90 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-cyan-400/50 border border-cyan-400',
    text: 'text-cyan-300',
    welcomeColor: 'text-purple-400',
    background: 'bg-gradient-to-br from-gray-900 to-purple-900',
    aiMessage: "WARNING: Systems online. Initiate maximum savings protocols during our Cyber Sale!",
    emojiTip: "💻⚡🔮 (e.g., 'lightning bolt')",
  },
  'Black Friday': {
    name: 'Black Friday',
    themePrompt: 'A bold, high-energy Black Friday sale scene with deep blacks, vibrant gold accents, and dramatic lighting. Premium luxury aesthetics with bold typography and urgent sale messaging.',
    accent: 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 ring-yellow-400',
    card: 'bg-gray-900/95 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-yellow-500/30 border border-yellow-500/30',
    text: 'text-white',
    welcomeColor: 'text-yellow-300',
    background: 'bg-gradient-to-br from-black via-gray-900 to-gray-800',
    aiMessage: "BLACK FRIDAY SALE! Massive discounts and exclusive deals. Don't miss out on these limited-time offers!",
    emojiTip: "💰💎⚡🔥🛍️ (e.g., 'shopping bag with deals')",
  },
};



// Default Logo Asset
export const defaultLogo = { 
  src: "https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp", 
  shape: 'square' as const,
  alt: 'Default Store Logo'
};

// Emoji Bank Data
export const EMOJI_BANK: EmojiCategory[] = [
  { 
    category: 'Seasonal & Universal Promotions (100+ Emojis)', 
    emojis: [
      // Winter/Cold
      '❄️', '☃️', '🎁', '☕', '🧥', '🧤', '🧣', '🎿', '⛸️', '🏔️', '⛷️', '🏂', '⛸️', '🎿', '🏔️',
      // Cozy/Home
      '🏠', '🔥', '🛋️', '🛏️', '🕯️', '🕯️', '🕯️', '🕯️', '🕯️',
      // Celebration/Gifting/New Year
      '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍾', '✨', '🎆', '🎇', '🎊', '🎉', '🎈', '🎁',
      
      // Spring/Easter/Renewal
      '🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '🌿', '🌱', '🌧️', '☔', '🌦️',
      '🐰', '🥚', '🐣', '🐥', '🐤',
      '🧹', '🧽', '🧼', '🧴', '🧺',

      // Summer/Sales/Vacation
      '☀️', '🏖️', '🌊', '🏄', '🏊', '⛵', '🚤', '🏝️', '🌴', '🍹', '🍦', '🏖️', '🌊', '🏄', '🏊',
      
      // Autumn/Halloween/Thanksgiving
      '🍂', '🍁', '🎃', '🌰', '🌾', '🌽', '🍎', '🍏', '🥧', '🦃', '🍗',
      '👻', '⚰️', '🕷️', '🕸️', '🦇', '🧛', '🧙', '🧚', '🧜', '🧝',

      // Love/Valentine's Day
      '❤️', '💕', '💖', '💗', '💘', '💝', '💞', '💟', '💌', '💍',

      // Universal Sales & Deals
      'SALE', '🏷️', '💰', '💸', '💳', '⚡', '🔥', '✅', '❌', '❓', '❗',
      '📈', '📊', '📉', '🏷️', '💎', '⭐', '🌟', '💫', '✨', '🎯', '🎪', '⬆️', '⬇️', '🔄', '⚙️', '🔧', '🛠️', '🔨', '⚒️', '🪚'
    ] 
  },
  { 
    category: 'Shopping & Commerce', 
    emojis: [
      '🛒', '🛍️', '💳', '💰', '💸', '🏪', '🏬', '🏢', '🏭', '🏗️', 
      '📦', '📋', '📄', '📃', '📊', '📈', '📉', '💼', '🎒', '👜', '💼'
    ] 
  },
  { 
    category: 'Delivery & Transport', 
    emojis: [
      '🚚', '🚛', '🚜', '✈️', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '⛽', 
      '🚢', '⛵', '🚤', '🏍️', '🚲', '🛴'
    ] 
  },
  { 
    category: 'Cyber & Tech', 
    emojis: [
      '💻', '⚙️', '🔧', '🛠️', '💾', '💿', '📀', '⌨️', '🖱️', '🖥️', '📱', 
      '📞', '☎️', '📠', '📧', '💻'
    ] 
  },
  { 
    category: 'Nature & Food', 
    emojis: [
      '🌳', '🌲', '🌴', '🌵', '🌱', '🌿', '🍀', '🌾', '🌺', '🌸', '🌻', 
      '🌷', '🌹', '🌼', '🌻', '🌺', '🌹', '🌷', '🌼', '🌿', '🌱', '🌾', 
      '🌳', '🌲', '🌴', '🌵', '🌱', '🌿', '🍀', '🌾'
    ] 
  },
  { 
    category: 'Clothing & Fashion', 
    emojis: [
      '👕', '👖', '👗', '👘', '👙', '👚', '👛', '👜', '👝', '👞', '👟', 
      '👠', '👡', '👢', '👣', '👤', '👥'
    ] 
  },
  { 
    category: 'Emotions & Reactions', 
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', 
      '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙'
    ] 
  },
  { 
    category: 'Science & Medical', 
    emojis: [
      '🔬', '🔭', '🔮', '🧪', '🧫', '🧬', '🧭', '🧮', '🧯', '🧰', 
      '⚛️', '⚗️', '🧲', '⚖️', '🔧', '🛠️', '✏️', '📝', '📋'
    ] 
  }
];

// Text Style Options
export const textStyleOptions = [
  { label: 'Display (Large)', class: 'text-7xl font-extrabold tracking-tight' },
  { label: 'Header (H1)', class: 'text-5xl font-bold' },
  { label: 'Subtitle (H2)', class: 'text-4xl font-semibold' },
  { label: 'Promo (H3)', class: 'text-3xl font-medium' },
  { label: 'Body (P)', class: 'text-xl font-normal' },
];

// Theme Default Text Styles
export interface ThemeDefaultText {
  mainHeader: string;
  headerMessage: string;
  subHeader: string;
  promoMessage: string;
}

export const themeDefaultTexts: Record<string, ThemeDefaultText> = {
  'Winter': { mainHeader: 'WINTER COLLECTION', headerMessage: 'WINTER COLLECTION', subHeader: 'Discover our curated winter collection with premium items for the season', promoMessage: 'COZY DEALS' },
  'Winter Frost': { mainHeader: 'WINTER COLLECTION', headerMessage: 'WINTER COLLECTION', subHeader: 'Discover our curated winter collection with premium items for the season', promoMessage: 'COZY DEALS' },
  'Summer': { mainHeader: 'SUMMER ESSENTIALS', headerMessage: 'SUMMER ESSENTIALS', subHeader: 'Explore our summer essentials and trending items for the warm season', promoMessage: 'BEACH READY' },
  'Summer Sun': { mainHeader: 'SUMMER ESSENTIALS', headerMessage: 'SUMMER ESSENTIALS', subHeader: 'Explore our summer essentials and trending items for the warm season', promoMessage: 'BEACH READY' },
  'Fall': { mainHeader: 'SPOOKY NIGHT', headerMessage: 'SPOOKY NIGHT', subHeader: "Beware! Our haunted collection emerges from the shadows. Dare to discover what lurks in the darkness...", promoMessage: 'BOO! DEALS' },
  'Spooky Night': { mainHeader: 'SPOOKY NIGHT', headerMessage: 'SPOOKY NIGHT', subHeader: "Beware! Our haunted collection emerges from the shadows. Dare to discover what lurks in the darkness...", promoMessage: 'BOO! DEALS' },
  'Autumn': { mainHeader: 'AUTUMN HARVEST', headerMessage: 'AUTUMN HARVEST', subHeader: 'Embrace the cozy season with our autumn collection featuring warm tones and harvest essentials', promoMessage: 'FALL SAVINGS' },
  'Autumn Harvest': { mainHeader: 'AUTUMN HARVEST', headerMessage: 'AUTUMN HARVEST', subHeader: 'Embrace the cozy season with our autumn collection featuring warm tones and harvest essentials', promoMessage: 'FALL SAVINGS' },
  'Holiday Cheer': { mainHeader: 'HOLIDAY CHEER', headerMessage: 'HOLIDAY CHEER', subHeader: 'Celebrate the holidays with our special collection of festive gifts and decor', promoMessage: 'GIFT GUIDE' },
  'Spring Renewal': { mainHeader: 'SPRING RENEWAL', headerMessage: 'SPRING RENEWAL', subHeader: "Blossom into savings! Our Spring Renewal line brings fresh starts and bright ideas.", promoMessage: 'FRESH DEALS' },
  'Cyber Sale': { mainHeader: 'CYBER SALE', headerMessage: 'CYBER SALE', subHeader: "WARNING: Systems online. Initiate maximum savings protocols during our Cyber Sale!", promoMessage: 'TECH DEALS' },
  'Black Friday': { mainHeader: 'BLACK FRIDAY', headerMessage: 'BLACK FRIDAY', subHeader: "SPECIAL OFFERS", promoMessage: '50% OFF' },
};

// Helper function to get theme default text
export const getThemeDefaultText = (themeName: string, fallbackAiMessage?: string): ThemeDefaultText => {
  return themeDefaultTexts[themeName] || { 
    mainHeader: 'Edit Headline', 
    headerMessage: 'Edit Headline', 
    subHeader: fallbackAiMessage || 'Add a short supporting subheader',
    promoMessage: '' 
  };
};

// Helper function to convert Tailwind color classes to hex values for text colors
export const getThemeTextColor = (welcomeColor: string | undefined): string => {
  if (!welcomeColor) return '#FFFFFF';
  
  // Map Tailwind color classes to hex values
  const colorMap: Record<string, string> = {
    'text-blue-200': '#BFDBFE',      // Winter
    'text-yellow-100': '#FEF3C7',    // Summer  
    'text-yellow-200': '#FDE68A',
    'text-yellow-300': '#FCD34D',    // Black Friday
    'text-orange-100': '#FFEDD5',    // Fall
    'text-orange-200': '#FED7AA',    // Spooky
    'text-red-200': '#FECACA',        // Holiday
    'text-pink-100': '#FCE7F3',      // Spring
    'text-purple-400': '#C084FC',    // Cyber
    'text-cyan-300': '#67E8F9',      // Cyber Sale
    'text-green-200': '#BBF7D0',     // Spring
    'text-amber-200': '#FDE68A',     // Autumn
  };
  
  return colorMap[welcomeColor] || '#FFFFFF';
};

/**
 * Comprehensive emoji database for button text formatting and product customization
 * Used by ProductEditorModal and other components for emoji selection
 */
export interface EmojiDatabaseEntry {
  emoji: string;
  name: string;
  keywords: string[];
}

export const EMOJI_DATABASE: EmojiDatabaseEntry[] = [
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
  { emoji: '💰', name: 'Money', keywords: ['money', 'cash', 'dollar', 'green', 'wealth', 'rich'] },
];
