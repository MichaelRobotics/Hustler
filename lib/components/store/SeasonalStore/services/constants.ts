import { LegacyTheme, Product, LogoAsset } from '../types';

// Initial Themes Data
export const initialThemes: Record<string, LegacyTheme> = {
  'Winter Frost': {
    name: 'Winter Frost',
    themePrompt: 'A serene winter landscape with snow-covered trees and icy blue tones.',
    accent: 'bg-blue-500 hover:bg-blue-600 text-white ring-blue-400',
    card: 'bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-blue-500/30',
    text: 'text-gray-800',
    welcomeColor: 'text-blue-200',
    background: 'bg-gradient-to-br from-blue-600 to-cyan-400',
    aiMessage: "Embrace the chill with our curated winter essentials and cozy comforts",
    emojiTip: "❄️🧥🔥 (e.g., 'snowflake icon')",
  },
  'Summer Sun': {
    name: 'Summer Sun',
    themePrompt: 'A bright, sunny beach scene with warm yellows and ocean blues.',
    accent: 'bg-yellow-500 hover:bg-yellow-600 text-white ring-orange-400',
    card: 'bg-yellow-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-yellow-500/30',
    text: 'text-yellow-800',
    welcomeColor: 'text-yellow-100',
    background: 'bg-gradient-to-br from-yellow-400 to-orange-500',
    aiMessage: "Soak up the sunshine with our vibrant summer collection and beach essentials",
    emojiTip: "☀️🏖️🌊 (e.g., 'sun icon')",
  },
  'Autumn Harvest': {
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
    themePrompt: 'A dark, mysterious Halloween scene with purples, oranges, and spooky elements.',
    accent: 'bg-purple-600 hover:bg-purple-700 text-white ring-orange-500',
    card: 'bg-gray-900/90 backdrop-blur-sm shadow-2xl hover:shadow-3xl shadow-purple-500/50',
    text: 'text-orange-300',
    welcomeColor: 'text-purple-200',
    background: 'bg-gradient-to-br from-purple-900 to-orange-600',
    aiMessage: "Enter if you dare! Our spooky collection brings the perfect fright to your night.",
    emojiTip: "🎃👻🦇 (e.g., 'pumpkin icon')",
  },
};

// Default Products (2 products)
export const initialProducts = [
  {
    id: 1,
    name: 'Base Product 1',
    description: 'Default product description.',
    price: 19.99,
    image: 'https://placehold.co/200x200/6b7280/ffffff?text=PRODUCT+1',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Base Product 2',
    description: 'Another default product.',
    price: 29.99,
    image: 'https://placehold.co/200x200/94a3b8/000000?text=PRODUCT+2',
    containerAsset: undefined,
  },
];

// Theme-specific Products (2 products per theme)
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
];

export const springProducts = [
  {
    id: 1,
    name: 'Garden Seeds Kit',
    description: 'Organic seeds for spring planting.',
    price: 14.99,
    image: 'https://placehold.co/200x200/22c55e/ffffff?text=GARDEN+SEEDS',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'Flower Pot Set',
    description: 'Ceramic pots for your garden.',
    price: 24.99,
    image: 'https://placehold.co/200x200/84cc16/ffffff?text=FLOWER+POTS',
    containerAsset: undefined,
  },
];

export const cyberProducts = [
  {
    id: 1,
    name: 'Gaming Headset',
    description: 'High-quality gaming audio.',
    price: 79.99,
    image: 'https://placehold.co/200x200/8b5cf6/ffffff?text=GAMING+HEADSET',
    containerAsset: undefined,
  },
  {
    id: 2,
    name: 'RGB Keyboard',
    description: 'Mechanical keyboard with RGB lighting.',
    price: 129.99,
    image: 'https://placehold.co/200x200/06b6d4/ffffff?text=RGB+KEYBOARD',
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
];

// Default Logo Asset
export const defaultLogo = { 
  src: "https://placehold.co/150x150/000000/ffffff?text=LOGO",
  alt: "Default Logo",
  shape: "square" as const
};