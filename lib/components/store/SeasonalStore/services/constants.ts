import { Theme, EmojiCategory } from '../types';

// Initial Themes Data
export const initialThemes: Record<string, Theme> = {
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

// Initial Products Data
export const initialProducts = [
  {
    id: 1,
    name: 'Ceramic Mug',
    description: 'A simple drinking mug for daily use.',
    price: 18.99,
    image: 'https://placehold.co/200x200/cccccc/000000?text=BASE+MUG',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Throw Blanket',
    description: 'A basic blanket for the couch.',
    price: 59.99,
    image: 'https://placehold.co/200x200/94a3b8/000000?text=BASE+BLANKET',
    containerAsset: undefined,
  },
];

// Theme-specific Products
export const winterProducts = [
  {
    id: 1,
    name: 'Cozy Knit Scarf',
    description: 'Warm wool scarf for winter.',
    price: 29.99,
    image: 'https://placehold.co/200x200/4f46e5/ffffff?text=KNIT+SCARF',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Hot Chocolate Set',
    description: 'Premium cocoa with marshmallows.',
    price: 24.99,
    image: 'https://placehold.co/200x200/8b5cf6/ffffff?text=HOT+CHOCO',
    containerAsset: undefined,
  },
  {
    id: 3,
    name: 'Fuzzy Slippers',
    description: 'Comfortable indoor footwear.',
    price: 39.99,
    image: 'https://placehold.co/200x200/06b6d4/ffffff?text=FUZZY+SLIPPERS',
    containerAsset: undefined,
  },
  {
    id: 4,
    name: 'Winter Blanket',
    description: 'Extra warm throw blanket.',
    price: 59.99,
    image: 'https://placehold.co/200x200/3b82f6/ffffff?text=WINTER+BLANKET',
    containerAsset: undefined,
  },
];

export const summerProducts = [
  {
    id: 1,
    name: 'Beach Towel',
    description: 'Large colorful beach towel.',
    price: 19.99,
    image: 'https://placehold.co/200x200/f59e0b/ffffff?text=BEACH+TOWEL',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Sunglasses',
    description: 'UV protection sunglasses.',
    price: 34.99,
    image: 'https://placehold.co/200x200/eab308/ffffff?text=SUNGLASSES',
    containerAsset: undefined,
  },
  {
    id: 3,
    name: 'Cooler Bag',
    description: 'Insulated picnic cooler.',
    price: 29.99,
    image: 'https://placehold.co/200x200/10b981/ffffff?text=COOLER+BAG',
    containerAsset: undefined,
  },
  {
    id: 4,
    name: 'Sun Hat',
    description: 'Wide-brim sun protection hat.',
    price: 24.99,
    image: 'https://placehold.co/200x200/f97316/ffffff?text=SUN+HAT',
    containerAsset: undefined,
  },
];

export const fallProducts = [
  {
    id: 1,
    name: 'Pumpkin Spice Candle',
    description: 'Aromatic fall-scented candle.',
    price: 18.99,
    image: 'https://placehold.co/200x200/ea580c/ffffff?text=PUMPKIN+CANDLE',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Cozy Sweater',
    description: 'Warm autumn sweater.',
    price: 49.99,
    image: 'https://placehold.co/200x200/d97706/ffffff?text=AUTUMN+SWEATER',
    containerAsset: undefined,
  },
  {
    id: 3,
    name: 'Apple Cider Mix',
    description: 'Premium spiced cider blend.',
    price: 14.99,
    image: 'https://placehold.co/200x200/c2410c/ffffff?text=APPLE+CIDER',
    containerAsset: undefined,
  },
  {
    id: 4,
    name: 'Fall Wreath',
    description: 'Decorative autumn wreath.',
    price: 34.99,
    image: 'https://placehold.co/200x200/b45309/ffffff?text=FALL+WREATH',
    containerAsset: undefined,
  },
];

export const holidayProducts = [
  {
    id: 1,
    name: 'Christmas Ornament Set',
    description: 'Handcrafted glass ornaments.',
    price: 29.99,
    image: 'https://placehold.co/200x200/dc2626/ffffff?text=CHRISTMAS+ORNAMENTS',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Holiday Lights',
    description: 'LED string lights for decoration.',
    price: 19.99,
    image: 'https://placehold.co/200x200/16a34a/ffffff?text=HOLIDAY+LIGHTS',
    containerAsset: undefined,
  },
  {
    id: 3,
    name: 'Gift Wrapping Kit',
    description: 'Complete gift wrapping supplies.',
    price: 24.99,
    image: 'https://placehold.co/200x200/7c3aed/ffffff?text=GIFT+WRAP',
    containerAsset: undefined,
  },
  {
    id: 4,
    name: 'Holiday Mug',
    description: 'Festive ceramic coffee mug.',
    price: 16.99,
    image: 'https://placehold.co/200x200/0891b2/ffffff?text=HOLIDAY+MUG',
    containerAsset: undefined,
  },
];

export const springProducts = [
  {
    id: 1,
    name: 'Garden Seeds Kit',
    description: 'Organic flower and herb seeds.',
    price: 19.99,
    image: 'https://placehold.co/200x200/22c55e/ffffff?text=GARDEN+SEEDS',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Spring Scarf',
    description: 'Light floral print scarf.',
    price: 24.99,
    image: 'https://placehold.co/200x200/ec4899/ffffff?text=SPRING+SCARF',
    containerAsset: undefined,
  },
  {
    id: 3,
    name: 'Rain Boots',
    description: 'Colorful waterproof boots.',
    price: 39.99,
    image: 'https://placehold.co/200x200/8b5cf6/ffffff?text=RAIN+BOOTS',
    containerAsset: undefined,
  },
  {
    id: 4,
    name: 'Flower Pot Set',
    description: 'Ceramic planters for herbs.',
    price: 29.99,
    image: 'https://placehold.co/200x200/06b6d4/ffffff?text=FLOWER+POTS',
    containerAsset: undefined,
  },
];

export const cyberProducts = [
  {
    id: 1,
    name: 'RGB Gaming Mouse',
    description: 'High-precision gaming mouse.',
    price: 79.99,
    image: 'https://placehold.co/200x200/06b6d4/ffffff?text=GAMING+MOUSE',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Mechanical Keyboard',
    description: 'RGB backlit mechanical keyboard.',
    price: 129.99,
    image: 'https://placehold.co/200x200/8b5cf6/ffffff?text=KEYBOARD',
    containerAsset: undefined,
  },
  {
    id: 3,
    name: 'Gaming Headset',
    description: 'Surround sound gaming headset.',
    price: 89.99,
    image: 'https://placehold.co/200x200/3b82f6/ffffff?text=GAMING+HEADSET',
    containerAsset: undefined,
  },
  {
    id: 4,
    name: 'LED Strip Lights',
    description: 'Smart RGB LED room lighting.',
    price: 34.99,
    image: 'https://placehold.co/200x200/10b981/ffffff?text=LED+STRIPS',
    containerAsset: undefined,
  },
];

export const halloweenProducts = [
  {
    id: 1,
    name: 'Glowing Jack-O-Lantern',
    description: 'Hand-carved pumpkin with LED lights.',
    price: 24.99,
    image: 'https://placehold.co/200x200/ff6600/000000?text=JACK-O-LANTERN',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Haunted House Decor',
    description: 'Spooky miniature haunted mansion.',
    price: 39.99,
    image: 'https://placehold.co/200x200/333333/ffffff?text=HAUNTED+HOUSE',
    containerAsset: undefined,
  },
  {
    id: 3,
    name: 'Ghostly Candles',
    description: 'Flickering LED candles with ghost effects.',
    price: 19.99,
    image: 'https://placehold.co/200x200/ffffff/000000?text=GHOST+CANDLES',
    containerAsset: undefined,
  },
  {
    id: 4,
    name: 'Bat Wing Cloak',
    description: 'Dramatic black cape for Halloween.',
    price: 49.99,
    image: 'https://placehold.co/200x200/000000/ffffff?text=BAT+CLOAK',
    containerAsset: undefined,
  },
];

// Default Logo Asset
export const defaultLogo = { 
  src: "https://placehold.co/150x150/000000/ffffff?text=LOGO", 
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
