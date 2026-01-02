// Shared TypeScript interfaces for product components

export interface Product {
  id: number | string;
  name: string;
  description: string;
  price: number;
  image: string;
  containerAsset?: {
    src: string;
    alt: string;
    id: string;
    scale: number;
    rotation: number;
  };
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
  whopProductId?: string;
  // Product type and file support
  type?: "LINK" | "FILE" | "WHOP";
  storageUrl?: string;
  productImages?: string[];
  // Badge support
  badge?: 'new' | '5star' | 'bestseller' | null;
  // Promo support
  promoEnabled?: boolean;
  promoDiscountType?: 'percentage' | 'fixed';
  promoDiscountAmount?: number;
  promoLimitQuantity?: number;
  promoQuantityLeft?: number;
  promoShowFireIcon?: boolean;
  promoScope?: 'product' | 'plan';
  promoCodeId?: string;
  promoCode?: string;
  promoDurationType?: 'one-time' | 'forever' | 'duration_months';
  promoDurationMonths?: number;
  checkoutConfigurationId?: string;
  planId?: string; // Whop plan ID associated with this resource
  salesCount?: number;
  showSalesCount?: boolean;
  starRating?: number;
  reviewCount?: number;
  showRatingInfo?: boolean;
}

export interface FormattingToolbarProps {
  show: boolean;
  elementRef: HTMLDivElement | null;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  quickColors: string[];
  activeSubToolbar: 'color' | null;
  setActiveSubToolbar: React.Dispatch<React.SetStateAction<'color' | null>>;
  onBold: () => void;
  onItalic: () => void;
  onColorChange: (color: string) => void;
  onClose: () => void;
}

export interface ProductEditorSectionProps {
  currentProduct: Product | null;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
}

export interface ProductDisplaySectionProps {
  product: Product;
  isEditorView: boolean;
  onUpdateProduct: (id: number | string, updates: Partial<Product>) => void;
}



