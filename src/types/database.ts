/**
 * Sinergi Lapak - Master Types Definition
 * Corresponds to Sheets 01 to 17
 */

export type BucketType = 'KANBAI' | 'NUTRIBITE' | 'TEAM';

export type FinancialType = 'REVENUE' | 'EXPENSE' | 'OTHER_INCOME';

export type AllocationMethod = 'CUSTOM' | 'SALES_PROPORTION';

export type ProductHealthStatus = 'ADS_ELIGIBLE' | 'ORGANIC_ONLY' | 'REVIEW' | 'NOT_PROFITABLE';

// 01_SETTINGS
export interface SettingsRecord {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by: string;
}

// 02_UNIT
export interface UnitRecord {
  unit_id: string; // U001, U002
  unit_name: string; // Kanbai, Nutribite
  active: boolean;
  created_at: string;
  updated_at: string;
}

// 03_ACCOUNT
export interface AccountRecord {
  account_id: string;
  account_name: string;
  bucket: BucketType;
  is_historical: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// 04_BRAND
export interface BrandRecord {
  brand_id: string;
  brand_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// 05_CATEGORY
export interface CategoryRecord {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// 06_MARKETPLACE
export interface MarketplaceRecord {
  marketplace_id: string;
  marketplace_name: string;
  normalized_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// 07_PIC
export interface PicRecord {
  pic_id: string;
  pic_name: string;
  pic_type: string; // Operasional, Marketing, Finance, Logistik, dll
  default_unit_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// 08_PRODUCT_SPU
export interface ProductSpuRecord {
  spu_id: string; // e.g. SPU-STT-E003
  spu_name: string;
  brand_id: string;
  category_id: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

// 09_PRODUCT_SKU
export interface ProductSkuRecord {
  product_id: string;
  sku: string; // Unique
  spu_id: string;
  sku_name: string;
  brand_id: string;
  category_id: string;
  hpp: number;
  unit_hpp: string; // PCS, BOX, SET, BTL
  active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

// 10_PRODUCT_CHANNEL (Phase 2 Preview)
export interface ProductChannelRecord {
  config_id: string;
  product_id: string;
  sku: string;
  unit_id: string;
  marketplace_id: string;
  selling_price: number;
  promo_price: number;
  minimum_selling_price: number;
  ads_status: boolean;
  target_margin: number;
  target_roas: number;
  target_cir: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

// 11_COST_RULE (Phase 2 Preview)
export type CalculationType = 
  | 'PERCENTAGE'
  | 'FIXED'
  | 'PERCENTAGE_MAX'
  | 'PERCENTAGE_MIN'
  | 'PERCENTAGE_MIN_MAX'
  | 'FIXED_PERCENTAGE'
  | 'TIER';

export type CalculationBase = 'SELLING_PRICE' | 'NET_SALES' | 'ORDER' | 'QTY' | 'OTHER';

export interface CostRuleRecord {
  rule_id: string;
  marketplace_id: string;
  unit_id?: string | null;
  account_id?: string | null;
  brand_id?: string | null;
  category_id?: string | null;
  spu_id?: string | null;
  sku?: string | null;
  cost_name: string;
  cost_group: string;
  mandatory: boolean;
  calculation_type: CalculationType;
  calculation_base: CalculationBase;
  rate: number;
  fixed_amount: number;
  minimum_fee?: number | null;
  maximum_fee?: number | null;
  range_from?: number | null;
  range_to?: number | null;
  program?: string | null;
  effective_from: string;
  effective_to?: string | null;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

// 12_TEAM_ALLOCATION (Phase 3 Preview)
export interface TeamAllocationRecord {
  allocation_id: string;
  effective_from: string;
  effective_to?: string | null;
  financial_type: FinancialType;
  category_id?: string | null;
  sub_category?: string | null;
  cost_post?: string | null;
  method: AllocationMethod;
  kanbai_percent: number;
  nutribite_percent: number;
  active: boolean;
  notes: string;
  updated_at: string;
  updated_by: string;
}

// 13_SALES
export interface SalesRecord {
  no_invoice: string;
  order_date: string;
  customer: string;
  product_name: string;
  qty: number;
  selling_price: number;
  hpp: number;
  total_sales: number;
  total_hpp: number;
  gross_profit: number;
  account_id: string;
  bucket: BucketType;
  marketplace_id: string;
  sku: string;
  spu: string;
  brand: string;
  pic: string;
  status: 'COMPLETED' | 'CANCELLED' | 'RETURNED';
}

// 14_POST_DATA
export interface PostDataRecord {
  post_id: string;
  date: string;
  category: string; // 01. Operasional, 02. Platform Cost, 03. Marketing, 04. Biaya Lain-lain, 05. Pendapatan Lain-lain
  sub_category: string;
  cost_post: string;
  pic: string;
  balance: number;
  keterangan: string;
  bucket: BucketType;
  financial_type: FinancialType;
  marketplace_id?: string | null;
  account?: string | null;
}

// 15_ADS
export interface AdsRecord {
  ads_id: string;
  date: string;
  marketplace_id: string;
  unit_id: string;
  account_id: string;
  product_id?: string | null;
  sku: string;
  spu?: string | null;
  campaign: string;
  ads_spend: number;
  ad_sales: number;
  orders: number;
  roas: number;
  cir: number;
  created_at: string;
}

// Full State for Database
export interface DatabaseState {
  settings: SettingsRecord[];
  units: UnitRecord[];
  accounts: AccountRecord[];
  brands: BrandRecord[];
  categories: CategoryRecord[];
  marketplaces: MarketplaceRecord[];
  pics: PicRecord[];
  spus: ProductSpuRecord[];
  skus: ProductSkuRecord[];
  productChannels: ProductChannelRecord[];
  costRules: CostRuleRecord[];
  teamAllocations: TeamAllocationRecord[];
  sales: SalesRecord[];
  postData: PostDataRecord[];
  ads: AdsRecord[];
  // Google Sheets Sync Configuration
  sheetsConfig: GoogleSheetsConfig;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetNamePrefix: string;
  isConnected: boolean;
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}
