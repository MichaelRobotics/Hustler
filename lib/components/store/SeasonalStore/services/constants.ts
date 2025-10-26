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
    name: 'Autumn Harvest',
    themePrompt: 'A rich, cozy forest scene with deep reds, oranges, and brown tones.',
    accent: 'bg-orange-600 hover:bg-orange-700 text-white ring-orange-500',
    card: 'bg-amber-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-orange-500/30',
    text: 'text-amber-900',
    welcomeColor: 'text-orange-100',
    background: 'bg-gradient-to-br from-orange-600 to-red-600',
    aiMessage: "Embrace the autumn season with our handpicked collection of cozy essentials",
    emojiTip: "🍂🎃🌰 (e.g., 'pumpkin icon')",
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
  'Spooky Night': {
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
