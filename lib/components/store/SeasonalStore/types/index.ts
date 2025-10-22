export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  containerAsset?: ContainerAsset;
  cardClass?: string;
  buttonText?: string;
  buttonClass?: string;
  buttonAnimColor?: string;
  titleClass?: string;
  descClass?: string;
  buttonLink?: string;
}

export interface ContainerAsset {
  src: string;
  alt: string;
  id: string;
  scale: number;
  rotation: number;
}

export interface FloatingAsset {
  id: string;
  type: 'image' | 'text' | 'promo-ticket';
  src?: string;
  alt: string;
  x: string;
  y: string;
  rotation: string;
  scale: number;
  z: number;
  content?: string;
  color?: string;
  styleClass?: string;
  isPromoMessage?: boolean;
  isPromoCode?: boolean;
  isLogo?: boolean;
  customData?: {
    ticketStyle?: 'default' | 'new' | 'premium' | 'sale';
    title?: string;
    discount?: string;
  };
}

export interface Theme {
  name: string;
  themePrompt: string;
  accent: string;
  card: string;
  text: string;
  welcomeColor: string;
  background: string;
  backgroundImage?: string | null;
  aiMessage: string;
  emojiTip: string;
}

export interface FixedTextStyles {
  mainHeader: TextStyle;
  headerMessage: TextStyle;
  promoMessage: TextStyle;
  subHeader: TextStyle;
}

export interface TextStyle {
  content: string;
  color: string;
  styleClass: string;
}

export interface LogoAsset {
  src: string;
  shape: 'round' | 'square';
  alt: string;
}

export interface EmojiCategory {
  category: string;
  emojis: string[];
}

export interface ApiError {
  message: string;
  type?: string;
}

export interface AIGenerationOptions {
  prompt: string;
  theme?: string;
  model?: string;
}

export interface DragData {
  asset: FloatingAsset;
  offset: { x: number; y: number };
}

export interface EditorState {
  isEditorView: boolean;
  isSheetOpen: boolean;
  isAdminSheetOpen: boolean;
  selectedAssetId: string | null;
}

export interface LoadingState {
  isTextLoading: boolean;
  isImageLoading: boolean;
}

export interface StoreTemplate {
  id: string;
  name: string;
  createdAt: Date;
  products: Product[];
  floatingAssets: FloatingAsset[];
  currentSeason: string;
  theme: Theme;
  fixedTextStyles: FixedTextStyles;
  logoAsset: LogoAsset;
  generatedBackground: string | null;
  uploadedBackground: string | null;
  // Theme-specific data (new)
  themeTextStyles?: Record<string, FixedTextStyles>;
  themeLogos?: Record<string, LogoAsset>;
  themeGeneratedBackgrounds?: Record<string, string | null>;
  themeUploadedBackgrounds?: Record<string, string | null>;
  themeProducts?: Record<string, Product[]>;
}

export interface SeasonalStoreState {
  products: Product[];
  floatingAssets: FloatingAsset[];
  availableAssets: FloatingAsset[];
  currentSeason: string;
  allThemes: Record<string, Theme>;
  fixedTextStyles: FixedTextStyles;
  logoAsset: LogoAsset;
  generatedBackground: string | null;
  uploadedBackground: string | null;
  apiError: string | null;
  editorState: EditorState;
  loadingState: LoadingState;
}

