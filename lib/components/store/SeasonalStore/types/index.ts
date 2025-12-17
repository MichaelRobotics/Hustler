export interface Product {
  id: number | string;
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
  // WHOP attachment support for product images
  imageAttachmentId?: string | null;
  imageAttachmentUrl?: string | null;
  whopProductId?: string; // ID of the actual Whop product/app (for synced products)
  // Product type and file support
  type?: "LINK" | "FILE"; // Product type: LINK for external links, FILE for downloadable files
  storageUrl?: string; // File download URL for FILE type products
  productImages?: string[]; // Array of up to 3 product image URLs for FILE type products
  // Badge support
  badge?: 'new' | '5star' | 'bestseller' | null;
  // Promo support
  promoDiscountType?: 'percentage' | 'fixed';
  promoDiscountAmount?: number;
  promoLimitQuantity?: number; // Limit amount of sold products on discounted price
  promoShowFireIcon?: boolean; // Show red fire icon + "X left" text on right corner
  promoQuantityLeft?: number; // Track remaining quantity (calculated from limit - sold)
  promoScope?: 'product' | 'plan'; // Whether promo applies to product or plan
  promoCodeId?: string; // ID of selected promo code from database
  promoCode?: string; // Promo code string (saved to template for display)
  promoDurationType?: 'one-time' | 'forever' | 'duration_months'; // Discount duration type
  promoDurationMonths?: number; // Duration in months (when duration_months selected)
  checkoutConfigurationId?: string; // Checkout configuration ID (if checkout-only)
  salesCount?: number;
  showSalesCount?: boolean;
  starRating?: number;
  reviewCount?: number;
  showRatingInfo?: boolean;
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

export interface LegacyTheme {
  name: string;
  themePrompt?: string;
  accent: string;
  card: string;
  text: string;
  welcomeColor: string;
  background: string;
  backgroundImage?: string | null;
  placeholderImage?: string | null; // Refined placeholder image for custom themes
  mainHeader?: string | null; // AI-generated main header text (for custom themes)
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
  isUploadingImage: boolean;
  isGeneratingImage: boolean;
}

export interface DiscountMessage {
  message: string;
  offsetHours: number;
  sendAsEmail?: boolean;
  emailSubject?: string;
  emailContent?: string;
  fromEmail?: string;
  isEmailHtml?: boolean;
}

export interface DiscountSettings {
  enabled: boolean;
  globalDiscount: boolean;
  globalDiscountType: 'percentage' | 'fixed';
  globalDiscountAmount: number;
  percentage: number;
  startDate: string;
  endDate: string;
  discountText: string;
  promoCode: string;
  durationType?: 'one-time' | 'forever' | 'duration_months';
  durationMonths?: number;
  quantityPerProduct?: number;
  seasonalDiscountId?: string; // ID linking to experience seasonal discount
  prePromoMessages: DiscountMessage[];
  activePromoMessages: DiscountMessage[];
}

export interface StoreTemplate {
  id: string;
  name: string;
  createdAt: Date;
  experienceId: string;
  userId: string;
  themeId: string | null;
  themeSnapshot: Theme; // Snapshot of theme at creation time
  currentSeason: string;
  templateData: {
    // Theme-specific data
    themeTextStyles: Record<string, FixedTextStyles>;
    themeLogos: Record<string, LogoAsset>;
    themeGeneratedBackgrounds: Record<string, string | null>;
    themeUploadedBackgrounds: Record<string, string | null>;
    themeProducts: Record<string, Product[]>;
    themeFloatingAssets: Record<string, FloatingAsset[]>;
    
    // Legacy compatibility
    products: Product[];
    floatingAssets: FloatingAsset[];
    fixedTextStyles: FixedTextStyles;
    logoAsset: LogoAsset;
    generatedBackground: string | null;
    uploadedBackground: string | null;
    
    // WHOP attachment support
    backgroundAttachmentId?: string | null;
    backgroundAttachmentUrl?: string | null;
    logoAttachmentId?: string | null;
    logoAttachmentUrl?: string | null;
    
    // Current theme styling
    currentTheme?: LegacyTheme;
    
    // Promo button styling
    promoButton?: {
      text: string;
      buttonClass: string;
      ringClass: string;
      ringHoverClass: string;
      icon: string;
    };
    
    // Discount settings
    discountSettings?: DiscountSettings;
  };
  isLive: boolean;
  isLastEdited: boolean;
  updatedAt: Date;
}

export interface Theme {
  id: string;
  experienceId: string;
  name: string;
  season: string;
  themePrompt?: string;
  accentColor?: string;
  ringColor?: string;
  placeholderImage?: string | null; // Refined product placeholder image for custom themes
  mainHeader?: string | null; // AI-generated main header text
  subHeader?: string | null; // AI-generated subheader text
  card?: string;
  text?: string;
  welcomeColor?: string;
  background?: string;
  aiMessage?: string;
  emojiTip?: string;
  createdAt: Date;
  updatedAt: Date;
}


export interface SeasonalStoreState {
  products: Product[];
  floatingAssets: FloatingAsset[];
  availableAssets: FloatingAsset[];
  currentSeason: string;
  discountSettings: DiscountSettings;
  allThemes: Record<string, Theme>;
  fixedTextStyles: FixedTextStyles;
  logoAsset: LogoAsset;
  generatedBackground: string | null;
  uploadedBackground: string | null;
  backgroundAttachmentId: string | null;
  backgroundAttachmentUrl: string | null;
  logoAttachmentId: string | null;
  logoAttachmentUrl: string | null;
  apiError: string | null;
  editorState: EditorState;
  loadingState: LoadingState;
}

