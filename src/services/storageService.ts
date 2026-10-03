/**
 * Sinergi Lapak - Storage and State Management Service
 */

import {
  DatabaseState,
  SettingsRecord,
  UnitRecord,
  AccountRecord,
  BrandRecord,
  CategoryRecord,
  MarketplaceRecord,
  PicRecord,
  ProductSpuRecord,
  ProductSkuRecord,
  ProductChannelRecord,
  CostRuleRecord,
  TeamAllocationRecord,
  SalesRecord,
  PostDataRecord,
  AdsRecord,
} from '../types/database';
import { determineAccountBucket, normalizeMarketplaceName } from '../utils/validation';

const STORAGE_KEY = 'sinergi_lapak_database_v1';

export const INITIAL_DATABASE_STATE: DatabaseState = {
  settings: [
    {
      key: 'MIN_NET_MARGIN',
      value: '0.15',
      description: 'Margin bersih minimum untuk kelayakan produk (15%)',
      updated_at: new Date().toISOString(),
      updated_by: 'System',
    },
    {
      key: 'MIN_ADS_MARGIN',
      value: '0.08',
      description: 'Margin minimum setelah iklan untuk Ads Eligible (8%)',
      updated_at: new Date().toISOString(),
      updated_by: 'System',
    },
    {
      key: 'DEFAULT_ALLOCATION_METHOD',
      value: 'SALES_PROPORTION',
      description: 'Metode alokasi default jika tidak ada rule spesifik (SALES_PROPORTION / CUSTOM)',
      updated_at: new Date().toISOString(),
      updated_by: 'System',
    },
    {
      key: 'TAX_RATE',
      value: '0.11',
      description: 'Tarif PPN berlaku (11%)',
      updated_at: new Date().toISOString(),
      updated_by: 'System',
    },
  ],
  units: [
    {
      unit_id: 'U001',
      unit_name: 'Kanbai',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      unit_id: 'U002',
      unit_name: 'Nutribite',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  accounts: [
    {
      account_id: 'ACC-KANBAI',
      account_name: 'Kanbai',
      bucket: 'KANBAI',
      is_historical: false,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-NUTRIBITE',
      account_name: 'Nutribite',
      bucket: 'NUTRIBITE',
      is_historical: false,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-THELAPAK',
      account_name: 'TheLapak',
      bucket: 'TEAM',
      is_historical: true,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-KAKIKOMI',
      account_name: 'Kakikomi',
      bucket: 'TEAM',
      is_historical: true,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-REMAX',
      account_name: 'Remax',
      bucket: 'TEAM',
      is_historical: true,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-BLUETRONIX',
      account_name: 'Bluetronix',
      bucket: 'TEAM',
      is_historical: true,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-DIGINEX',
      account_name: 'Diginex',
      bucket: 'TEAM',
      is_historical: true,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-TEAM',
      account_name: 'Team',
      bucket: 'TEAM',
      is_historical: false,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-STARTONER',
      account_name: 'Startoner',
      bucket: 'TEAM',
      is_historical: true,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      account_id: 'ACC-APRINSLI',
      account_name: 'Aprin-SLI',
      bucket: 'TEAM',
      is_historical: true,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  brands: [
    {
      brand_id: 'BRD-001',
      brand_name: 'Startoner',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      brand_id: 'BRD-002',
      brand_name: 'Nutribite',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      brand_id: 'BRD-003',
      brand_name: 'Remax',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      brand_id: 'BRD-004',
      brand_name: 'Bluetronix',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      brand_id: 'BRD-005',
      brand_name: 'Diginex',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      brand_id: 'BRD-006',
      brand_name: 'Kanbai Choice',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  categories: [
    {
      category_id: 'CAT-ELK',
      category_name: 'Elektronik & Gadget',
      parent_category_id: null,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      category_id: 'CAT-ELK-ACC',
      category_name: 'Aksesoris Handphone',
      parent_category_id: 'CAT-ELK',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      category_id: 'CAT-ELK-AUD',
      category_name: 'Audio & Speaker',
      parent_category_id: 'CAT-ELK',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      category_id: 'CAT-OFC',
      category_name: 'Office & Printing',
      parent_category_id: null,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      category_id: 'CAT-OFC-TNR',
      category_name: 'Toner & Cartridge',
      parent_category_id: 'CAT-OFC',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      category_id: 'CAT-OFC-INK',
      category_name: 'Tinta Refill',
      parent_category_id: 'CAT-OFC',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      category_id: 'CAT-HLT',
      category_name: 'Health & Nutrition',
      parent_category_id: null,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      category_id: 'CAT-HLT-VIT',
      category_name: 'Vitamin & Suplemen',
      parent_category_id: 'CAT-HLT',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      category_id: 'CAT-HLT-HRB',
      category_name: 'Herbal Alami',
      parent_category_id: 'CAT-HLT',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  marketplaces: [
    {
      marketplace_id: 'MKT-SHOPEE',
      marketplace_name: 'Shopee',
      normalized_name: 'shopee',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      marketplace_id: 'MKT-TIKTOK',
      marketplace_name: 'TikTok',
      normalized_name: 'tiktok',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      marketplace_id: 'MKT-TOKOPEDIA',
      marketplace_name: 'Tokopedia',
      normalized_name: 'tokopedia',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      marketplace_id: 'MKT-LAZADA',
      marketplace_name: 'Lazada',
      normalized_name: 'lazada',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      marketplace_id: 'MKT-BLIBLI',
      marketplace_name: 'Blibli',
      normalized_name: 'blibli',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      marketplace_id: 'MKT-CASH',
      marketplace_name: 'Cash',
      normalized_name: 'cash',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  pics: [
    {
      pic_id: 'PIC-001',
      pic_name: 'Budi Santoso',
      pic_type: 'Operasional',
      default_unit_id: 'U001',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      pic_id: 'PIC-002',
      pic_name: 'Siti Rahma',
      pic_type: 'Marketing',
      default_unit_id: 'U002',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      pic_id: 'PIC-003',
      pic_name: 'Dewi Anggraini',
      pic_type: 'Finance',
      default_unit_id: null,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      pic_id: 'PIC-004',
      pic_name: 'Hendra Wijaya',
      pic_type: 'Logistik',
      default_unit_id: null,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  spus: [
    {
      spu_id: 'SPU-STT-E003',
      spu_name: 'Toner Cartridge E003 Series',
      brand_id: 'BRD-001',
      category_id: 'CAT-OFC-TNR',
      description: 'Cartridge toner laserjet premium seri E003 4-warna.',
      active: true,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: '2026-01-05T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      spu_id: 'SPU-RMX-CB01',
      spu_name: 'Fast Charging Data Cable Series',
      brand_id: 'BRD-003',
      category_id: 'CAT-ELK-ACC',
      description: 'Kabel data braided fast charge 2.4A berbagai konektor.',
      active: true,
      created_at: '2026-01-06T00:00:00.000Z',
      updated_at: '2026-01-06T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      spu_id: 'SPU-NTB-VITC',
      spu_name: 'Nutribite Pure Vitamin C 500mg Series',
      brand_id: 'BRD-002',
      category_id: 'CAT-HLT-VIT',
      description: 'Suplemen vitamin C murni non-acidic aman di lambung.',
      active: true,
      created_at: '2026-01-07T00:00:00.000Z',
      updated_at: '2026-01-07T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      spu_id: 'SPU-BLU-EAR1',
      spu_name: 'Bluetronix Pro Audio Earphones Series',
      brand_id: 'BRD-004',
      category_id: 'CAT-ELK-AUD',
      description: 'Wireless Bluetooth 5.3 Earphones dengan Bass Boost.',
      active: true,
      created_at: '2026-01-08T00:00:00.000Z',
      updated_at: '2026-01-08T00:00:00.000Z',
      updated_by: 'Admin',
    },
  ],
  skus: [
    {
      product_id: 'PRD-00001',
      sku: 'E003BK',
      spu_id: 'SPU-STT-E003',
      sku_name: 'Toner Cartridge E003 Black',
      brand_id: 'BRD-001',
      category_id: 'CAT-OFC-TNR',
      hpp: 45000,
      unit_hpp: 'PCS',
      active: true,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: '2026-01-05T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      product_id: 'PRD-00002',
      sku: 'E003CY',
      spu_id: 'SPU-STT-E003',
      sku_name: 'Toner Cartridge E003 Cyan',
      brand_id: 'BRD-001',
      category_id: 'CAT-OFC-TNR',
      hpp: 47000,
      unit_hpp: 'PCS',
      active: true,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: '2026-01-05T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      product_id: 'PRD-00003',
      sku: 'E003MG',
      spu_id: 'SPU-STT-E003',
      sku_name: 'Toner Cartridge E003 Magenta',
      brand_id: 'BRD-001',
      category_id: 'CAT-OFC-TNR',
      hpp: 47000,
      unit_hpp: 'PCS',
      active: true,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: '2026-01-05T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      product_id: 'PRD-00004',
      sku: 'E003YW',
      spu_id: 'SPU-STT-E003',
      sku_name: 'Toner Cartridge E003 Yellow',
      brand_id: 'BRD-001',
      category_id: 'CAT-OFC-TNR',
      hpp: 47000,
      unit_hpp: 'PCS',
      active: true,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: '2026-01-05T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      product_id: 'PRD-00005',
      sku: 'RMX-CL10',
      spu_id: 'SPU-RMX-CB01',
      sku_name: 'Remax Cable Lightning 1m Braided',
      brand_id: 'BRD-003',
      category_id: 'CAT-ELK-ACC',
      hpp: 22000,
      unit_hpp: 'PCS',
      active: true,
      created_at: '2026-01-06T00:00:00.000Z',
      updated_at: '2026-01-06T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      product_id: 'PRD-00006',
      sku: 'RMX-CT10',
      spu_id: 'SPU-RMX-CB01',
      sku_name: 'Remax Cable Type-C 1m Braided',
      brand_id: 'BRD-003',
      category_id: 'CAT-ELK-ACC',
      hpp: 24000,
      unit_hpp: 'PCS',
      active: true,
      created_at: '2026-01-06T00:00:00.000Z',
      updated_at: '2026-01-06T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      product_id: 'PRD-00007',
      sku: 'NTB-VC60',
      spu_id: 'SPU-NTB-VITC',
      sku_name: 'Nutribite Pure Vitamin C 500mg 60 Kapsul',
      brand_id: 'BRD-002',
      category_id: 'CAT-HLT-VIT',
      hpp: 65000,
      unit_hpp: 'BTL',
      active: true,
      created_at: '2026-01-07T00:00:00.000Z',
      updated_at: '2026-01-07T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      product_id: 'PRD-00008',
      sku: 'NTB-VC120',
      spu_id: 'SPU-NTB-VITC',
      sku_name: 'Nutribite Pure Vitamin C 500mg 120 Kapsul',
      brand_id: 'BRD-002',
      category_id: 'CAT-HLT-VIT',
      hpp: 115000,
      unit_hpp: 'BTL',
      active: true,
      created_at: '2026-01-07T00:00:00.000Z',
      updated_at: '2026-01-07T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      product_id: 'PRD-00009',
      sku: 'BLU-TWS01',
      spu_id: 'SPU-BLU-EAR1',
      sku_name: 'Bluetronix TWS Pro Bass Earbuds',
      brand_id: 'BRD-004',
      category_id: 'CAT-ELK-AUD',
      hpp: 89000,
      unit_hpp: 'SET',
      active: true,
      created_at: '2026-01-08T00:00:00.000Z',
      updated_at: '2026-01-08T00:00:00.000Z',
      updated_by: 'Admin',
    },
  ],
  productChannels: [
    {
      config_id: 'CFG-001',
      product_id: 'PRD-00001',
      sku: 'E003BK',
      unit_id: 'U001', // Kanbai
      marketplace_id: 'MKT-SHOPEE',
      selling_price: 65000,
      promo_price: 59000,
      minimum_selling_price: 52000,
      ads_status: true,
      target_margin: 0.20,
      target_roas: 4.0,
      target_cir: 0.25,
      active: true,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: '2026-01-05T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      config_id: 'CFG-002',
      product_id: 'PRD-00001',
      sku: 'E003BK',
      unit_id: 'U002', // Nutribite (CASE 1: Different selling price & margin!)
      marketplace_id: 'MKT-SHOPEE',
      selling_price: 68000,
      promo_price: 62000,
      minimum_selling_price: 54000,
      ads_status: true,
      target_margin: 0.22,
      target_roas: 4.2,
      target_cir: 0.23,
      active: true,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: '2026-01-05T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      config_id: 'CFG-003',
      product_id: 'PRD-00001',
      sku: 'E003BK',
      unit_id: 'U001', // Kanbai
      marketplace_id: 'MKT-TIKTOK', // CASE 2: Different marketplace fee!
      selling_price: 62000,
      promo_price: 58000,
      minimum_selling_price: 50000,
      ads_status: true,
      target_margin: 0.18,
      target_roas: 3.8,
      target_cir: 0.26,
      active: true,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: '2026-01-05T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      config_id: 'CFG-004',
      product_id: 'PRD-00005',
      sku: 'RMX-CL10',
      unit_id: 'U001',
      marketplace_id: 'MKT-SHOPEE',
      selling_price: 35000,
      promo_price: 29900,
      minimum_selling_price: 26000,
      ads_status: true,
      target_margin: 0.22,
      target_roas: 4.5,
      target_cir: 0.22,
      active: true,
      created_at: '2026-01-06T00:00:00.000Z',
      updated_at: '2026-01-06T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      config_id: 'CFG-005',
      product_id: 'PRD-00007',
      sku: 'NTB-VC60',
      unit_id: 'U002',
      marketplace_id: 'MKT-SHOPEE',
      selling_price: 95000,
      promo_price: 89000,
      minimum_selling_price: 78000,
      ads_status: true,
      target_margin: 0.25,
      target_roas: 5.0,
      target_cir: 0.20,
      active: true,
      created_at: '2026-01-07T00:00:00.000Z',
      updated_at: '2026-01-07T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      config_id: 'CFG-006',
      product_id: 'PRD-00008',
      sku: 'NTB-VC120',
      unit_id: 'U002',
      marketplace_id: 'MKT-SHOPEE',
      selling_price: 169000,
      promo_price: 155000,
      minimum_selling_price: 135000,
      ads_status: true,
      target_margin: 0.28,
      target_roas: 5.5,
      target_cir: 0.18,
      active: true,
      created_at: '2026-01-07T00:00:00.000Z',
      updated_at: '2026-01-07T00:00:00.000Z',
      updated_by: 'Admin',
    },
  ],
  costRules: [
    {
      rule_id: 'RUL-SHP-01',
      marketplace_id: 'MKT-SHOPEE',
      cost_name: 'Biaya Administrasi Shopee',
      cost_group: 'PLATFORM_FEE',
      mandatory: true,
      calculation_type: 'PERCENTAGE_MAX',
      calculation_base: 'SELLING_PRICE',
      rate: 0.065, // 6.5% max Rp 10.000
      fixed_amount: 0,
      maximum_fee: 10000,
      minimum_fee: 0,
      effective_from: '2026-01-01',
      priority: 50,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      rule_id: 'RUL-SHP-02',
      marketplace_id: 'MKT-SHOPEE',
      cost_name: 'Biaya Layanan Transaksi',
      cost_group: 'PAYMENT_FEE',
      mandatory: true,
      calculation_type: 'PERCENTAGE_MIN',
      calculation_base: 'SELLING_PRICE',
      rate: 0.01, // 1% min Rp 1.000
      fixed_amount: 0,
      minimum_fee: 1000,
      maximum_fee: null,
      effective_from: '2026-01-01',
      priority: 50,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      rule_id: 'RUL-SHP-03',
      marketplace_id: 'MKT-SHOPEE',
      cost_name: 'Program Gratis Ongkir Xtra',
      cost_group: 'SHIPPING_PROGRAM',
      mandatory: false,
      calculation_type: 'PERCENTAGE_MAX',
      calculation_base: 'SELLING_PRICE',
      rate: 0.04, // 4% max Rp 10.000
      fixed_amount: 0,
      maximum_fee: 10000,
      minimum_fee: 0,
      program: 'FREE_SHIPPING',
      effective_from: '2026-01-01',
      priority: 50,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      rule_id: 'RUL-TT-01',
      marketplace_id: 'MKT-TIKTOK',
      cost_name: 'Komisi Marketplace TikTok Shop',
      cost_group: 'PLATFORM_FEE',
      mandatory: true,
      calculation_type: 'PERCENTAGE',
      calculation_base: 'SELLING_PRICE',
      rate: 0.05, // 5%
      fixed_amount: 0,
      effective_from: '2026-01-01',
      priority: 50,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      rule_id: 'RUL-TT-02',
      marketplace_id: 'MKT-TIKTOK',
      cost_name: 'Program Subsidi Gratis Ongkir TikTok',
      cost_group: 'SHIPPING_PROGRAM',
      mandatory: false,
      calculation_type: 'PERCENTAGE_MAX',
      calculation_base: 'SELLING_PRICE',
      rate: 0.035, // 3.5% max Rp 10.000
      fixed_amount: 0,
      maximum_fee: 10000,
      program: 'FREE_SHIPPING',
      effective_from: '2026-01-01',
      priority: 50,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      rule_id: 'RUL-TOK-01',
      marketplace_id: 'MKT-TOKOPEDIA',
      cost_name: 'Biaya Layanan Tokopedia Power Merchant',
      cost_group: 'PLATFORM_FEE',
      mandatory: true,
      calculation_type: 'PERCENTAGE_MAX',
      calculation_base: 'SELLING_PRICE',
      rate: 0.06,
      fixed_amount: 0,
      maximum_fee: 10000,
      effective_from: '2026-01-01',
      priority: 50,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      rule_id: 'RUL-CASH-01',
      marketplace_id: 'MKT-CASH',
      cost_name: 'Biaya Kanal Langsung / Tunai',
      cost_group: 'PLATFORM_FEE',
      mandatory: true,
      calculation_type: 'FIXED',
      calculation_base: 'SELLING_PRICE',
      rate: 0,
      fixed_amount: 0,
      effective_from: '2026-01-01',
      priority: 50,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
  ],
  teamAllocations: [
    {
      allocation_id: 'ALC-001',
      effective_from: '2026-01-01',
      financial_type: 'REVENUE',
      method: 'CUSTOM',
      kanbai_percent: 0.6,
      nutribite_percent: 0.4,
      active: true,
      notes: 'Alokasi pendapatan Team default 60% Kanbai : 40% Nutribite',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
    {
      allocation_id: 'ALC-002',
      effective_from: '2026-01-01',
      financial_type: 'EXPENSE',
      method: 'CUSTOM',
      kanbai_percent: 0.6,
      nutribite_percent: 0.4,
      active: true,
      notes: 'Alokasi beban umum Team 60% Kanbai : 40% Nutribite',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'Admin',
    },
  ],
  sales: [
    // Kanbai Direct Sales
    {
      no_invoice: 'INV-202602-001',
      order_date: '2026-02-01',
      customer: 'PT Mandiri Grafika',
      product_name: 'Toner Cartridge E003 Black',
      qty: 120,
      selling_price: 65000,
      hpp: 45000,
      total_sales: 7800000,
      total_hpp: 5400000,
      gross_profit: 2400000,
      account_id: 'ACC-KANBAI',
      bucket: 'KANBAI',
      marketplace_id: 'MKT-SHOPEE',
      sku: 'E003BK',
      spu: 'SPU-STT-E003',
      brand: 'Startoner',
      pic: 'Budi Santoso',
      status: 'COMPLETED',
    },
    {
      no_invoice: 'INV-202602-002',
      order_date: '2026-02-02',
      customer: 'Toko Cyber Print',
      product_name: 'Toner Cartridge E003 Cyan',
      qty: 85,
      selling_price: 67000,
      hpp: 47000,
      total_sales: 5695000,
      total_hpp: 3995000,
      gross_profit: 1700000,
      account_id: 'ACC-KANBAI',
      bucket: 'KANBAI',
      marketplace_id: 'MKT-SHOPEE',
      sku: 'E003CY',
      spu: 'SPU-STT-E003',
      brand: 'Startoner',
      pic: 'Budi Santoso',
      status: 'COMPLETED',
    },
    {
      no_invoice: 'INV-202602-003',
      order_date: '2026-02-03',
      customer: 'Gadget Central',
      product_name: 'Remax Cable Lightning 1m',
      qty: 350,
      selling_price: 35000,
      hpp: 22000,
      total_sales: 12250000,
      total_hpp: 7700000,
      gross_profit: 4550000,
      account_id: 'ACC-KANBAI',
      bucket: 'KANBAI',
      marketplace_id: 'MKT-SHOPEE',
      sku: 'RMX-CL10',
      spu: 'SPU-RMX-CB01',
      brand: 'Remax',
      pic: 'Siti Rahma',
      status: 'COMPLETED',
    },
    {
      no_invoice: 'INV-202602-004',
      order_date: '2026-02-04',
      customer: 'Audio Mart Indo',
      product_name: 'Bluetronix TWS Pro Bass Earbuds',
      qty: 110,
      selling_price: 139000,
      hpp: 89000,
      total_sales: 15290000,
      total_hpp: 9790000,
      gross_profit: 5500000,
      account_id: 'ACC-KANBAI',
      bucket: 'KANBAI',
      marketplace_id: 'MKT-TIKTOK',
      sku: 'BLU-TWS01',
      spu: 'SPU-BLU-EAR1',
      brand: 'Bluetronix',
      pic: 'Siti Rahma',
      status: 'COMPLETED',
    },
    // Nutribite Direct Sales
    {
      no_invoice: 'INV-202602-005',
      order_date: '2026-02-01',
      customer: 'Apotek Sehat Sejahtera',
      product_name: 'Nutribite Pure Vitamin C 500mg 60 Kapsul',
      qty: 240,
      selling_price: 95000,
      hpp: 65000,
      total_sales: 22800000,
      total_hpp: 15600000,
      gross_profit: 7200000,
      account_id: 'ACC-NUTRIBITE',
      bucket: 'NUTRIBITE',
      marketplace_id: 'MKT-SHOPEE',
      sku: 'NTB-VC60',
      spu: 'SPU-NTB-VITC',
      brand: 'Nutribite',
      pic: 'Siti Rahma',
      status: 'COMPLETED',
    },
    {
      no_invoice: 'INV-202602-006',
      order_date: '2026-02-03',
      customer: 'Klinik Prima Husada',
      product_name: 'Nutribite Pure Vitamin C 500mg 120 Kapsul',
      qty: 180,
      selling_price: 169000,
      hpp: 115000,
      total_sales: 30420000,
      total_hpp: 20700000,
      gross_profit: 9720000,
      account_id: 'ACC-NUTRIBITE',
      bucket: 'NUTRIBITE',
      marketplace_id: 'MKT-SHOPEE',
      sku: 'NTB-VC120',
      spu: 'SPU-NTB-VITC',
      brand: 'Nutribite',
      pic: 'Siti Rahma',
      status: 'COMPLETED',
    },
    // Team Shared Pool Sales (Historical accounts: Startoner, Remax, TheLapak)
    {
      no_invoice: 'INV-202602-007',
      order_date: '2026-02-02',
      customer: 'CV Mega Print',
      product_name: 'Toner Cartridge E003 Magenta',
      qty: 90,
      selling_price: 67000,
      hpp: 47000,
      total_sales: 6030000,
      total_hpp: 4230000,
      gross_profit: 1800000,
      account_id: 'ACC-STARTONER',
      bucket: 'TEAM',
      marketplace_id: 'MKT-TOKOPEDIA',
      sku: 'E003MG',
      spu: 'SPU-STT-E003',
      brand: 'Startoner',
      pic: 'Budi Santoso',
      status: 'COMPLETED',
    },
    {
      no_invoice: 'INV-202602-008',
      order_date: '2026-02-04',
      customer: 'Toko Remax Jaya',
      product_name: 'Remax Cable Type-C 1m',
      qty: 200,
      selling_price: 38000,
      hpp: 24000,
      total_sales: 7600000,
      total_hpp: 4800000,
      gross_profit: 2800000,
      account_id: 'ACC-REMAX',
      bucket: 'TEAM',
      marketplace_id: 'MKT-TOKOPEDIA',
      sku: 'RMX-CT10',
      spu: 'SPU-RMX-CB01',
      brand: 'Remax',
      pic: 'Budi Santoso',
      status: 'COMPLETED',
    },
    // Negative transaction example (Section 28 & 62: Return/Refund)
    {
      no_invoice: 'INV-202602-RET01',
      order_date: '2026-02-05',
      customer: 'Retur Pelanggan',
      product_name: 'Toner Cartridge E003 Black Retur',
      qty: -2,
      selling_price: 65000,
      hpp: 45000,
      total_sales: -130000,
      total_hpp: -90000,
      gross_profit: -40000,
      account_id: 'ACC-KANBAI',
      bucket: 'KANBAI',
      marketplace_id: 'MKT-SHOPEE',
      sku: 'E003BK',
      spu: 'SPU-STT-E003',
      brand: 'Startoner',
      pic: 'Budi Santoso',
      status: 'RETURNED',
    },
  ],
  postData: [
    // Operasional
    {
      post_id: 'PST-001',
      date: '2026-02-05',
      category: '01. Operasional',
      sub_category: 'Human Resource',
      cost_post: 'Gaji Staff Operasional & Packing',
      pic: 'Dewi Anggraini',
      balance: 14500000,
      keterangan: 'Gaji bulan Februari tim gudang Kanbai',
      bucket: 'KANBAI',
      financial_type: 'EXPENSE',
      account: 'ACC-KANBAI',
    },
    {
      post_id: 'PST-002',
      date: '2026-02-05',
      category: '01. Operasional',
      sub_category: 'Human Resource',
      cost_post: 'Gaji Staff QC & Distribusi Nutribite',
      pic: 'Dewi Anggraini',
      balance: 12000000,
      keterangan: 'Gaji bulan Februari tim QC Nutribite',
      bucket: 'NUTRIBITE',
      financial_type: 'EXPENSE',
      account: 'ACC-NUTRIBITE',
    },
    {
      post_id: 'PST-003',
      date: '2026-02-05',
      category: '01. Operasional',
      sub_category: 'Logistik',
      cost_post: 'Sewa Gudang Bersama Team',
      pic: 'Hendra Wijaya',
      balance: 8000000,
      keterangan: 'Biaya sewa fasilitas gudang shared pool',
      bucket: 'TEAM',
      financial_type: 'EXPENSE',
      account: 'ACC-TEAM',
    },
    // Platform Cost
    {
      post_id: 'PST-004',
      date: '2026-02-10',
      category: '02. Platform Cost',
      sub_category: 'Komisi Marketplace',
      cost_post: 'Potongan Fee Shopee Kanbai',
      pic: 'Dewi Anggraini',
      balance: 3850000,
      keterangan: 'Admin fee dan payment fee marketplace Shopee',
      bucket: 'KANBAI',
      financial_type: 'EXPENSE',
      marketplace_id: 'MKT-SHOPEE',
      account: 'ACC-KANBAI',
    },
    {
      post_id: 'PST-005',
      date: '2026-02-10',
      category: '02. Platform Cost',
      sub_category: 'Komisi Marketplace',
      cost_post: 'Potongan Fee Shopee Nutribite',
      pic: 'Dewi Anggraini',
      balance: 5120000,
      keterangan: 'Admin fee dan fee program gratis ongkir Nutribite',
      bucket: 'NUTRIBITE',
      financial_type: 'EXPENSE',
      marketplace_id: 'MKT-SHOPEE',
      account: 'ACC-NUTRIBITE',
    },
    {
      post_id: 'PST-006',
      date: '2026-02-10',
      category: '02. Platform Cost',
      sub_category: 'Komisi Marketplace',
      cost_post: 'Potongan Fee Marketplace Tokopedia Team',
      pic: 'Dewi Anggraini',
      balance: 1350000,
      keterangan: 'Potongan komisi Tokopedia akun Startoner & Remax',
      bucket: 'TEAM',
      financial_type: 'EXPENSE',
      marketplace_id: 'MKT-TOKOPEDIA',
      account: 'ACC-TEAM',
    },
    // Marketing (Ads Spend)
    {
      post_id: 'PST-007',
      date: '2026-02-08',
      category: '03. Marketing',
      sub_category: 'Marketing-Ads',
      cost_post: 'Shopee Iklan Pencarian & Produk Serupa',
      pic: 'Siti Rahma',
      balance: 4200000,
      keterangan: 'Top up Shopee Ads Kanbai',
      bucket: 'KANBAI',
      financial_type: 'EXPENSE',
      account: 'ACC-KANBAI',
    },
    {
      post_id: 'PST-008',
      date: '2026-02-08',
      category: '03. Marketing',
      sub_category: 'Marketing-Ads',
      cost_post: 'Shopee Iklan & Kolaborasi Nutribite',
      pic: 'Siti Rahma',
      balance: 5800000,
      keterangan: 'Top up Ads & program boosting Nutribite',
      bucket: 'NUTRIBITE',
      financial_type: 'EXPENSE',
      account: 'ACC-NUTRIBITE',
    },
    {
      post_id: 'PST-009',
      date: '2026-02-08',
      category: '03. Marketing',
      sub_category: 'Marketing-Ads',
      cost_post: 'Iklan Bersama Team',
      pic: 'Siti Rahma',
      balance: 1500000,
      keterangan: 'Iklan promosi marketplace akun Team',
      bucket: 'TEAM',
      financial_type: 'EXPENSE',
      account: 'ACC-TEAM',
    },
    // Biaya Lain-lain
    {
      post_id: 'PST-010',
      date: '2026-02-12',
      category: '04. Biaya Lain-lain',
      sub_category: 'Bank & Administrasi',
      cost_post: 'Biaya Transfer Antar Bank & Materai',
      pic: 'Dewi Anggraini',
      balance: 450000,
      keterangan: 'Biaya administrasi operasional',
      bucket: 'KANBAI',
      financial_type: 'EXPENSE',
    },
    // Pendapatan Lain-lain (05)
    {
      post_id: 'PST-011',
      date: '2026-02-14',
      category: '05. Pendapatan Lain-lain',
      sub_category: 'Subsidi Platform',
      cost_post: 'Subsidi Cashback & Diskon Shopee',
      pic: 'Dewi Anggraini',
      balance: 1800000,
      keterangan: 'Reimbursement subsidi campaign dari Shopee',
      bucket: 'KANBAI',
      financial_type: 'OTHER_INCOME',
    },
    {
      post_id: 'PST-012',
      date: '2026-02-14',
      category: '05. Pendapatan Lain-lain',
      sub_category: 'Subsidi Platform',
      cost_post: 'Insentif Performa Campaign Nutribite',
      pic: 'Dewi Anggraini',
      balance: 2400000,
      keterangan: 'Insentif penjualan brand Nutribite',
      bucket: 'NUTRIBITE',
      financial_type: 'OTHER_INCOME',
    },
    {
      post_id: 'PST-013',
      date: '2026-02-14',
      category: '05. Pendapatan Lain-lain',
      sub_category: 'Pendapatan Lain-lain',
      cost_post: 'Pendapatan Bunga Jasa Giro Bersama',
      pic: 'Dewi Anggraini',
      balance: 500000,
      keterangan: 'Bunga bank shared pool Team',
      bucket: 'TEAM',
      financial_type: 'OTHER_INCOME',
    },
  ],
  ads: [
    {
      ads_id: 'ADS-001',
      date: '2026-02-01',
      marketplace_id: 'MKT-SHOPEE',
      unit_id: 'U001',
      account_id: 'ACC-KANBAI',
      product_id: 'PRD-00001',
      sku: 'E003BK',
      spu: 'SPU-STT-E003',
      campaign: 'Shopee Search Ads - Toner Series',
      ads_spend: 1200000,
      ad_sales: 6800000,
      orders: 104,
      roas: 5.67,
      cir: 0.176,
      created_at: '2026-02-01T00:00:00.000Z',
    },
    {
      ads_id: 'ADS-002',
      date: '2026-02-03',
      marketplace_id: 'MKT-SHOPEE',
      unit_id: 'U001',
      account_id: 'ACC-KANBAI',
      product_id: 'PRD-00005',
      sku: 'RMX-CL10',
      spu: 'SPU-RMX-CBL1',
      campaign: 'Shopee Discovery Ads - Cable Lightning',
      ads_spend: 900000,
      ad_sales: 4200000,
      orders: 120,
      roas: 4.67,
      cir: 0.214,
      created_at: '2026-02-03T00:00:00.000Z',
    },
    {
      ads_id: 'ADS-003',
      date: '2026-02-05',
      marketplace_id: 'MKT-SHOPEE',
      unit_id: 'U002',
      account_id: 'ACC-NUTRIBITE',
      product_id: 'PRD-00007',
      sku: 'NTB-VC60',
      spu: 'SPU-NTB-VITC',
      campaign: 'Shopee Flash Sale & Brand Ads - Vitamin C',
      ads_spend: 1800000,
      ad_sales: 11400000,
      orders: 120,
      roas: 6.33,
      cir: 0.158,
      created_at: '2026-02-05T00:00:00.000Z',
    },
    {
      ads_id: 'ADS-004',
      date: '2026-02-07',
      marketplace_id: 'MKT-TIKTOK',
      unit_id: 'U001',
      account_id: 'ACC-KANBAI',
      product_id: 'PRD-00001',
      sku: 'E003BK',
      spu: 'SPU-STT-E003',
      campaign: 'TikTok Shop Live Stream GMV Ads',
      ads_spend: 850000,
      ad_sales: 3800000,
      orders: 61,
      roas: 4.47,
      cir: 0.224,
      created_at: '2026-02-07T00:00:00.000Z',
    },
    {
      ads_id: 'ADS-005',
      date: '2026-02-10',
      marketplace_id: 'MKT-SHOPEE',
      unit_id: 'U002',
      account_id: 'ACC-NUTRIBITE',
      product_id: 'PRD-00008',
      sku: 'NTB-VC120',
      spu: 'SPU-NTB-VITC',
      campaign: 'Shopee In-Feed Ads - Family Pack Vitamin C',
      ads_spend: 1400000,
      ad_sales: 7600000,
      orders: 45,
      roas: 5.43,
      cir: 0.184,
      created_at: '2026-02-10T00:00:00.000Z',
    },
  ],
  sheetsConfig: {
    spreadsheetId: '',
    sheetNamePrefix: '',
    isConnected: false,
    lastSyncedAt: null,
    syncStatus: 'idle',
  },
};

class StorageService {
  private state: DatabaseState;
  private listeners: Set<(state: DatabaseState) => void> = new Set();

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): DatabaseState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify minimum structure
        if (parsed.units && parsed.accounts && parsed.skus) {
          return {
            ...INITIAL_DATABASE_STATE,
            ...parsed,
            productChannels: parsed.productChannels || INITIAL_DATABASE_STATE.productChannels,
            costRules: parsed.costRules || INITIAL_DATABASE_STATE.costRules,
            teamAllocations: parsed.teamAllocations || INITIAL_DATABASE_STATE.teamAllocations,
            sales: parsed.sales || INITIAL_DATABASE_STATE.sales,
            postData: parsed.postData || INITIAL_DATABASE_STATE.postData,
            ads: parsed.ads || INITIAL_DATABASE_STATE.ads,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load database from localStorage, using initial seed data.', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public subscribe(listener: (state: DatabaseState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to write database to localStorage', e);
    }
    this.listeners.forEach((listener) => listener(this.state));
  }

  // SPU Operations
  public addSpu(data: Omit<ProductSpuRecord, 'created_at' | 'updated_at'>): ProductSpuRecord {
    const now = new Date().toISOString();
    const newSpu: ProductSpuRecord = {
      ...data,
      created_at: now,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      spus: [newSpu, ...this.state.spus],
    };
    this.notify();
    return newSpu;
  }

  public updateSpu(spuId: string, updates: Partial<ProductSpuRecord>): void {
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      spus: this.state.spus.map((s) => (s.spu_id === spuId ? { ...s, ...updates, updated_at: now } : s)),
    };
    this.notify();
  }

  public deleteSpu(spuId: string): { success: boolean; error?: string } {
    // Check if any SKU depends on this SPU
    const hasSkus = this.state.skus.some((s) => s.spu_id === spuId);
    if (hasSkus) {
      return { success: false, error: 'Tidak dapat menghapus SPU karena masih memiliki SKU terkait.' };
    }
    this.state = {
      ...this.state,
      spus: this.state.spus.filter((s) => s.spu_id !== spuId),
    };
    this.notify();
    return { success: true };
  }

  // SKU Operations
  public addSku(data: Omit<ProductSkuRecord, 'product_id' | 'created_at' | 'updated_at'>): {
    success: boolean;
    sku?: ProductSkuRecord;
    error?: string;
  } {
    const trimmedSku = data.sku.trim().toUpperCase();
    if (this.state.skus.some((s) => s.sku.toUpperCase() === trimmedSku)) {
      return { success: false, error: `SKU "${trimmedSku}" sudah terdaftar.` };
    }

    const nextIdNumber = this.state.skus.length + 1;
    const productId = `PRD-${String(nextIdNumber).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const newSku: ProductSkuRecord = {
      ...data,
      product_id: productId,
      sku: trimmedSku,
      created_at: now,
      updated_at: now,
    };

    this.state = {
      ...this.state,
      skus: [newSku, ...this.state.skus],
    };
    this.notify();
    return { success: true, sku: newSku };
  }

  public updateSku(productId: string, updates: Partial<ProductSkuRecord>): { success: boolean; error?: string } {
    const existing = this.state.skus.find((s) => s.product_id === productId);
    if (!existing) {
      return { success: false, error: 'SKU tidak ditemukan' };
    }

    if (updates.sku) {
      const trimmed = updates.sku.trim().toUpperCase();
      const duplicate = this.state.skus.find((s) => s.sku.toUpperCase() === trimmed && s.product_id !== productId);
      if (duplicate) {
        return { success: false, error: `SKU "${trimmed}" sudah digunakan oleh produk lain.` };
      }
      updates.sku = trimmed;
    }

    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      skus: this.state.skus.map((s) => (s.product_id === productId ? { ...s, ...updates, updated_at: now } : s)),
    };
    this.notify();
    return { success: true };
  }

  public deleteSku(productId: string): void {
    this.state = {
      ...this.state,
      skus: this.state.skus.filter((s) => s.product_id !== productId),
    };
    this.notify();
  }

  // Account Operations
  public addAccount(accountName: string, isHistorical: boolean = false): AccountRecord {
    const trimmedName = accountName.trim();
    const bucket = determineAccountBucket(trimmedName);
    const nextAccId = `ACC-${trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
    const now = new Date().toISOString();

    const newAcc: AccountRecord = {
      account_id: nextAccId,
      account_name: trimmedName,
      bucket,
      is_historical: isHistorical,
      active: true,
      created_at: now,
      updated_at: now,
    };

    this.state = {
      ...this.state,
      accounts: [...this.state.accounts, newAcc],
    };
    this.notify();
    return newAcc;
  }

  public toggleAccountStatus(accountId: string): void {
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      accounts: this.state.accounts.map((a) =>
        a.account_id === accountId ? { ...a, active: !a.active, updated_at: now } : a
      ),
    };
    this.notify();
  }

  // Brand Operations
  public addBrand(brandName: string): BrandRecord {
    const trimmed = brandName.trim();
    const brandId = `BRD-${String(this.state.brands.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newBrand: BrandRecord = {
      brand_id: brandId,
      brand_name: trimmed,
      active: true,
      created_at: now,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      brands: [...this.state.brands, newBrand],
    };
    this.notify();
    return newBrand;
  }

  // Category Operations
  public addCategory(name: string, parentId: string | null = null): CategoryRecord {
    const trimmed = name.trim();
    const catId = `CAT-${String(this.state.categories.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newCat: CategoryRecord = {
      category_id: catId,
      category_name: trimmed,
      parent_category_id: parentId,
      active: true,
      created_at: now,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      categories: [...this.state.categories, newCat],
    };
    this.notify();
    return newCat;
  }

  // Marketplace Operations
  public addMarketplace(name: string): MarketplaceRecord {
    const trimmed = name.trim();
    const normalized = normalizeMarketplaceName(trimmed);
    const mktId = `MKT-${normalized.toUpperCase()}`;
    const now = new Date().toISOString();
    const newMkt: MarketplaceRecord = {
      marketplace_id: mktId,
      marketplace_name: trimmed,
      normalized_name: normalized,
      active: true,
      created_at: now,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      marketplaces: [...this.state.marketplaces, newMkt],
    };
    this.notify();
    return newMkt;
  }

  // PIC Operations
  public addPic(name: string, type: string, defaultUnit: string | null): PicRecord {
    const picId = `PIC-${String(this.state.pics.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newPic: PicRecord = {
      pic_id: picId,
      pic_name: name.trim(),
      pic_type: type.trim(),
      default_unit_id: defaultUnit,
      active: true,
      created_at: now,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      pics: [...this.state.pics, newPic],
    };
    this.notify();
    return newPic;
  }

  // Settings
  public updateSetting(key: string, value: string, updatedBy: string = 'Admin'): void {
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      settings: this.state.settings.map((s) => (s.key === key ? { ...s, value, updated_at: now, updated_by: updatedBy } : s)),
    };
    this.notify();
  }

  // Sheets Config
  public updateSheetsConfig(config: Partial<DatabaseState['sheetsConfig']>): void {
    this.state = {
      ...this.state,
      sheetsConfig: {
        ...this.state.sheetsConfig,
        ...config,
      },
    };
    this.notify();
  }

  // Product Channel Operations (Phase 2)
  public addProductChannel(
    record: Omit<ProductChannelRecord, 'config_id' | 'created_at' | 'updated_at'>
  ): ProductChannelRecord {
    const now = new Date().toISOString();
    const configId = `CFG-${String(this.state.productChannels.length + 1).padStart(3, '0')}`;
    const newRecord: ProductChannelRecord = {
      ...record,
      config_id: configId,
      created_at: now,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      productChannels: [...this.state.productChannels, newRecord],
    };
    this.notify();
    return newRecord;
  }

  public updateProductChannel(configId: string, updates: Partial<ProductChannelRecord>): void {
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      productChannels: this.state.productChannels.map((c) =>
        c.config_id === configId ? { ...c, ...updates, updated_at: now } : c
      ),
    };
    this.notify();
  }

  public deleteProductChannel(configId: string): void {
    this.state = {
      ...this.state,
      productChannels: this.state.productChannels.filter((c) => c.config_id !== configId),
    };
    this.notify();
  }

  public updateProductChannelPrice(sku: string, unitId: string, marketplaceId: string, newSellingPrice: number): void {
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      productChannels: this.state.productChannels.map((c) => {
        if (c.sku === sku && c.unit_id === unitId && c.marketplace_id === marketplaceId) {
          return {
            ...c,
            selling_price: newSellingPrice,
            updated_at: now,
            updated_by: 'AlertsModule',
          };
        }
        return c;
      }),
    };
    this.notify();
  }

  // Cost Rule Operations (Phase 2)
  public addCostRule(
    record: Omit<CostRuleRecord, 'rule_id' | 'created_at' | 'updated_at'>
  ): CostRuleRecord {
    const now = new Date().toISOString();
    const ruleId = `RUL-${String(this.state.costRules.length + 1).padStart(3, '0')}`;
    const newRecord: CostRuleRecord = {
      ...record,
      rule_id: ruleId,
      created_at: now,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      costRules: [...this.state.costRules, newRecord],
    };
    this.notify();
    return newRecord;
  }

  public updateCostRule(ruleId: string, updates: Partial<CostRuleRecord>): void {
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      costRules: this.state.costRules.map((r) =>
        r.rule_id === ruleId ? { ...r, ...updates, updated_at: now } : r
      ),
    };
    this.notify();
  }

  public deleteCostRule(ruleId: string): void {
    this.state = {
      ...this.state,
      costRules: this.state.costRules.filter((r) => r.rule_id !== ruleId),
    };
    this.notify();
  }

  // Team Allocation Operations (Phase 2)
  public addTeamAllocation(
    record: Omit<TeamAllocationRecord, 'allocation_id' | 'updated_at'>
  ): TeamAllocationRecord {
    const now = new Date().toISOString();
    const allocId = `ALC-${String(this.state.teamAllocations.length + 1).padStart(3, '0')}`;
    const newRecord: TeamAllocationRecord = {
      ...record,
      allocation_id: allocId,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      teamAllocations: [...this.state.teamAllocations, newRecord],
    };
    this.notify();
    return newRecord;
  }

  public updateTeamAllocation(allocationId: string, updates: Partial<TeamAllocationRecord>): void {
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      teamAllocations: this.state.teamAllocations.map((a) =>
        a.allocation_id === allocationId ? { ...a, ...updates, updated_at: now } : a
      ),
    };
    this.notify();
  }

  public deleteTeamAllocation(allocationId: string): void {
    this.state = {
      ...this.state,
      teamAllocations: this.state.teamAllocations.filter((a) => a.allocation_id !== allocationId),
    };
    this.notify();
  }

  // Sales Operations (Phase 3 - Sheet 13)
  public addSalesRecord(
    record: Omit<SalesRecord, 'total_sales' | 'total_hpp' | 'gross_profit'>
  ): SalesRecord {
    const totalSales = record.qty * record.selling_price;
    const totalHpp = record.qty * record.hpp;
    const grossProfit = totalSales - totalHpp;

    const newRecord: SalesRecord = {
      ...record,
      total_sales: totalSales,
      total_hpp: totalHpp,
      gross_profit: grossProfit,
    };

    this.state = {
      ...this.state,
      sales: [newRecord, ...this.state.sales],
    };
    this.notify();
    return newRecord;
  }

  public batchAddSales(records: SalesRecord[]): void {
    this.state = {
      ...this.state,
      sales: [...records, ...this.state.sales],
    };
    this.notify();
  }

  public updateSalesRecord(noInvoice: string, updates: Partial<SalesRecord>): void {
    this.state = {
      ...this.state,
      sales: this.state.sales.map((s) => {
        if (s.no_invoice === noInvoice) {
          const merged = { ...s, ...updates };
          const totalSales = merged.qty * merged.selling_price;
          const totalHpp = merged.qty * merged.hpp;
          const grossProfit = totalSales - totalHpp;
          return {
            ...merged,
            total_sales: totalSales,
            total_hpp: totalHpp,
            gross_profit: grossProfit,
          };
        }
        return s;
      }),
    };
    this.notify();
  }

  public deleteSalesRecord(noInvoice: string): void {
    this.state = {
      ...this.state,
      sales: this.state.sales.filter((s) => s.no_invoice !== noInvoice),
    };
    this.notify();
  }

  // Post Data Operations (Phase 3 - Sheet 14)
  public addPostDataRecord(record: Omit<PostDataRecord, 'post_id'>): PostDataRecord {
    const postId = `PST-${String(this.state.postData.length + 1).padStart(3, '0')}`;
    const newRecord: PostDataRecord = {
      ...record,
      post_id: postId,
    };
    this.state = {
      ...this.state,
      postData: [newRecord, ...this.state.postData],
    };
    this.notify();
    return newRecord;
  }

  public updatePostDataRecord(postId: string, updates: Partial<PostDataRecord>): void {
    this.state = {
      ...this.state,
      postData: this.state.postData.map((p) => (p.post_id === postId ? { ...p, ...updates } : p)),
    };
    this.notify();
  }

  public deletePostDataRecord(postId: string): void {
    this.state = {
      ...this.state,
      postData: this.state.postData.filter((p) => p.post_id !== postId),
    };
    this.notify();
  }

  // Ads Operations (Phase 3 - Sheet 15)
  public addAdsRecord(
    record: Omit<AdsRecord, 'ads_id' | 'created_at' | 'roas' | 'cir'>
  ): AdsRecord {
    const now = new Date().toISOString();
    const adsId = `ADS-${String(this.state.ads.length + 1).padStart(3, '0')}`;
    const roas = record.ads_spend > 0 ? parseFloat((record.ad_sales / record.ads_spend).toFixed(2)) : 0;
    const cir = record.ad_sales > 0 ? parseFloat((record.ads_spend / record.ad_sales).toFixed(3)) : 0;

    const newRecord: AdsRecord = {
      ...record,
      ads_id: adsId,
      roas,
      cir,
      created_at: now,
    };

    this.state = {
      ...this.state,
      ads: [newRecord, ...this.state.ads],
    };
    this.notify();
    return newRecord;
  }

  public updateAdsRecord(adsId: string, updates: Partial<AdsRecord>): void {
    this.state = {
      ...this.state,
      ads: this.state.ads.map((a) => {
        if (a.ads_id === adsId) {
          const merged = { ...a, ...updates };
          const roas = merged.ads_spend > 0 ? parseFloat((merged.ad_sales / merged.ads_spend).toFixed(2)) : 0;
          const cir = merged.ad_sales > 0 ? parseFloat((merged.ads_spend / merged.ad_sales).toFixed(3)) : 0;
          return {
            ...merged,
            roas,
            cir,
          };
        }
        return a;
      }),
    };
    this.notify();
  }

  public deleteAdsRecord(adsId: string): void {
    this.state = {
      ...this.state,
      ads: this.state.ads.filter((a) => a.ads_id !== adsId),
    };
    this.notify();
  }

  // Reset to initial seed
  public resetToDefaultSeed(): void {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));
    this.notify();
  }

  // Replace entire state (e.g. from JSON backup or restore)
  public replaceState(newState: DatabaseState): void {
    this.state = { ...newState };
    this.notify();
  }

  // Import rows into a specific sheet
  public importSheetRows(sheetIndex: string, rows: Record<string, any>[]): { success: boolean; count: number; message: string } {
    try {
      const now = new Date().toISOString();
      if (sheetIndex === '01') {
        const settings: SettingsRecord[] = rows.map((r) => ({
          key: String(r.key || '').trim(),
          value: String(r.value || '').trim(),
          description: String(r.description || ''),
          updated_at: r.updated_at || now,
          updated_by: r.updated_by || 'Import',
        })).filter((s) => s.key);
        this.state = { ...this.state, settings };
      } else if (sheetIndex === '02') {
        const units: UnitRecord[] = rows.map((r) => ({
          unit_id: String(r.unit_id || '').trim(),
          unit_name: String(r.unit_name || '').trim(),
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
        })).filter((u) => u.unit_id);
        this.state = { ...this.state, units };
      } else if (sheetIndex === '03') {
        const accounts: AccountRecord[] = rows.map((r) => ({
          account_id: String(r.account_id || '').trim(),
          account_name: String(r.account_name || '').trim(),
          bucket: (String(r.bucket || '').toUpperCase() as any) || 'TEAM',
          is_historical: String(r.is_historical).toLowerCase() === 'true',
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
        })).filter((a) => a.account_id);
        this.state = { ...this.state, accounts };
      } else if (sheetIndex === '04') {
        const brands: BrandRecord[] = rows.map((r) => ({
          brand_id: String(r.brand_id || '').trim(),
          brand_name: String(r.brand_name || '').trim(),
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
        })).filter((b) => b.brand_id);
        this.state = { ...this.state, brands };
      } else if (sheetIndex === '05') {
        const categories: CategoryRecord[] = rows.map((r) => ({
          category_id: String(r.category_id || '').trim(),
          category_name: String(r.category_name || '').trim(),
          parent_category_id: r.parent_category_id ? String(r.parent_category_id).trim() : null,
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
        })).filter((c) => c.category_id);
        this.state = { ...this.state, categories };
      } else if (sheetIndex === '06') {
        const marketplaces: MarketplaceRecord[] = rows.map((r) => ({
          marketplace_id: String(r.marketplace_id || '').trim(),
          marketplace_name: String(r.marketplace_name || '').trim(),
          normalized_name: normalizeMarketplaceName(String(r.marketplace_name || r.normalized_name || '')),
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
        })).filter((m) => m.marketplace_id);
        this.state = { ...this.state, marketplaces };
      } else if (sheetIndex === '07') {
        const pics: PicRecord[] = rows.map((r) => ({
          pic_id: String(r.pic_id || '').trim(),
          pic_name: String(r.pic_name || '').trim(),
          pic_type: String(r.pic_type || 'Operasional'),
          default_unit_id: r.default_unit_id ? String(r.default_unit_id).trim() : null,
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
        })).filter((p) => p.pic_id);
        this.state = { ...this.state, pics };
      } else if (sheetIndex === '08') {
        const spus: ProductSpuRecord[] = rows.map((r) => ({
          spu_id: String(r.spu_id || '').trim(),
          spu_name: String(r.spu_name || '').trim(),
          brand_id: String(r.brand_id || '').trim(),
          category_id: String(r.category_id || '').trim(),
          description: String(r.description || ''),
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
          updated_by: r.updated_by || 'Import',
        })).filter((s) => s.spu_id);
        this.state = { ...this.state, spus };
      } else if (sheetIndex === '09') {
        const skus: ProductSkuRecord[] = rows.map((r) => ({
          product_id: String(r.product_id || '').trim() || `PRD-${Date.now().toString().slice(-5)}`,
          sku: String(r.sku || '').trim(),
          spu_id: String(r.spu_id || '').trim(),
          sku_name: String(r.sku_name || '').trim(),
          brand_id: String(r.brand_id || '').trim(),
          category_id: String(r.category_id || '').trim(),
          hpp: Number(r.hpp) || 0,
          unit_hpp: String(r.unit_hpp || 'PCS').toUpperCase(),
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
          updated_by: r.updated_by || 'Import',
        })).filter((s) => s.sku);
        this.state = { ...this.state, skus };
      } else if (sheetIndex === '10') {
        const productChannels: ProductChannelRecord[] = rows.map((r) => ({
          config_id: String(r.config_id || '').trim() || `CFG-${Date.now().toString().slice(-5)}`,
          product_id: String(r.product_id || '').trim(),
          sku: String(r.sku || '').trim(),
          unit_id: String(r.unit_id || '').trim(),
          marketplace_id: String(r.marketplace_id || '').trim(),
          selling_price: Number(r.selling_price) || 0,
          promo_price: Number(r.promo_price) || Number(r.selling_price) || 0,
          minimum_selling_price: Number(r.minimum_selling_price) || 0,
          ads_status: String(r.ads_status).toLowerCase() === 'true',
          target_margin: Number(r.target_margin) || 0.15,
          target_roas: Number(r.target_roas) || 4.0,
          target_cir: Number(r.target_cir) || 0.25,
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
          updated_by: r.updated_by || 'Import',
        })).filter((pc) => pc.sku);
        this.state = { ...this.state, productChannels };
      } else if (sheetIndex === '11') {
        const costRules: CostRuleRecord[] = rows.map((r, i) => ({
          rule_id: String(r.rule_id || '').trim() || `RUL-${i + 1}`,
          marketplace_id: String(r.marketplace_id || '').trim(),
          unit_id: r.unit_id ? String(r.unit_id).trim() : null,
          account_id: r.account_id ? String(r.account_id).trim() : null,
          brand_id: r.brand_id ? String(r.brand_id).trim() : null,
          category_id: r.category_id ? String(r.category_id).trim() : null,
          spu_id: r.spu_id ? String(r.spu_id).trim() : null,
          sku: r.sku ? String(r.sku).trim() : null,
          cost_name: String(r.cost_name || '').trim(),
          cost_group: String(r.cost_group || 'PLATFORM_FEE').trim(),
          mandatory: String(r.mandatory).toLowerCase() === 'true',
          calculation_type: (String(r.calculation_type || 'PERCENTAGE').toUpperCase() as any),
          calculation_base: (String(r.calculation_base || 'SELLING_PRICE').toUpperCase() as any),
          rate: Number(r.rate) || 0,
          fixed_amount: Number(r.fixed_amount) || 0,
          minimum_fee: r.minimum_fee ? Number(r.minimum_fee) : null,
          maximum_fee: r.maximum_fee ? Number(r.maximum_fee) : null,
          range_from: r.range_from ? Number(r.range_from) : null,
          range_to: r.range_to ? Number(r.range_to) : null,
          program: r.program ? String(r.program).trim() : null,
          effective_from: r.effective_from || '2026-01-01',
          effective_to: r.effective_to ? String(r.effective_to) : null,
          priority: Number(r.priority) || 50,
          active: String(r.active).toLowerCase() !== 'false',
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
          updated_by: r.updated_by || 'Import',
        })).filter((cr) => cr.cost_name);
        this.state = { ...this.state, costRules };
      } else if (sheetIndex === '12') {
        const teamAllocations: TeamAllocationRecord[] = rows.map((r, i) => ({
          allocation_id: String(r.allocation_id || '').trim() || `ALC-${i + 1}`,
          effective_from: r.effective_from || '2026-01-01',
          effective_to: r.effective_to ? String(r.effective_to) : null,
          financial_type: (String(r.financial_type || 'EXPENSE').toUpperCase() as any),
          category_id: r.category_id ? String(r.category_id).trim() : null,
          sub_category: r.sub_category ? String(r.sub_category).trim() : null,
          cost_post: r.cost_post ? String(r.cost_post).trim() : null,
          method: (String(r.method || 'CUSTOM').toUpperCase() as any),
          kanbai_percent: Number(r.kanbai_percent) || 0.5,
          nutribite_percent: Number(r.nutribite_percent) || 0.5,
          active: String(r.active).toLowerCase() !== 'false',
          notes: String(r.notes || ''),
          updated_at: r.updated_at || now,
          updated_by: r.updated_by || 'Import',
        }));
        this.state = { ...this.state, teamAllocations };
      } else if (sheetIndex === '13') {
        const sales: SalesRecord[] = rows.map((r) => ({
          no_invoice: String(r.no_invoice || '').trim(),
          order_date: String(r.order_date || '').trim(),
          customer: String(r.customer || '').trim(),
          product_name: String(r.product_name || '').trim(),
          qty: Number(r.qty) || 1,
          selling_price: Number(r.selling_price) || 0,
          hpp: Number(r.hpp) || 0,
          total_sales: Number(r.total_sales) || (Number(r.qty) * Number(r.selling_price)),
          total_hpp: Number(r.total_hpp) || (Number(r.qty) * Number(r.hpp)),
          gross_profit: Number(r.gross_profit) || ((Number(r.selling_price) - Number(r.hpp)) * Number(r.qty)),
          account_id: String(r.account_id || '').trim(),
          bucket: (String(r.bucket || 'TEAM').toUpperCase() as any),
          marketplace_id: String(r.marketplace_id || '').trim(),
          sku: String(r.sku || '').trim(),
          spu: String(r.spu || '').trim(),
          brand: String(r.brand || '').trim(),
          pic: String(r.pic || '').trim(),
          status: (String(r.status || 'COMPLETED').toUpperCase() as any),
        })).filter((s) => s.no_invoice);
        this.state = { ...this.state, sales };
      } else if (sheetIndex === '14') {
        const postData: PostDataRecord[] = rows.map((r, i) => ({
          post_id: String(r.post_id || '').trim() || `PST-${i + 1}`,
          date: String(r.date || '').trim(),
          category: String(r.category || '01. Operasional').trim(),
          sub_category: String(r.sub_category || '').trim(),
          cost_post: String(r.cost_post || '').trim(),
          pic: String(r.pic || '').trim(),
          balance: Number(r.balance) || 0,
          keterangan: String(r.keterangan || '').trim(),
          bucket: (String(r.bucket || 'TEAM').toUpperCase() as any),
          financial_type: (String(r.financial_type || 'EXPENSE').toUpperCase() as any),
          marketplace_id: r.marketplace_id ? String(r.marketplace_id).trim() : null,
          account: r.account ? String(r.account).trim() : null,
        }));
        this.state = { ...this.state, postData };
      } else if (sheetIndex === '15') {
        const ads: AdsRecord[] = rows.map((r, i) => {
          const adsSpend = Number(r.ads_spend) || 0;
          const adSales = Number(r.ad_sales) || 0;
          return {
            ads_id: String(r.ads_id || '').trim() || `ADS-${i + 1}`,
            date: String(r.date || '').trim(),
            marketplace_id: String(r.marketplace_id || '').trim(),
            unit_id: String(r.unit_id || '').trim(),
            account_id: String(r.account_id || '').trim(),
            product_id: r.product_id ? String(r.product_id).trim() : null,
            sku: String(r.sku || '').trim(),
            spu: r.spu ? String(r.spu).trim() : null,
            campaign: String(r.campaign || '').trim(),
            ads_spend: adsSpend,
            ad_sales: adSales,
            orders: Number(r.orders) || 0,
            roas: adsSpend > 0 ? parseFloat((adSales / adsSpend).toFixed(2)) : 0,
            cir: adSales > 0 ? parseFloat((adsSpend / adSales).toFixed(3)) : 0,
            created_at: r.created_at || now,
          };
        });
        this.state = { ...this.state, ads };
      }
      this.notify();
      return { success: true, count: rows.length, message: `Berhasil mengimpor ${rows.length} baris data ke Sheet ${sheetIndex}.` };
    } catch (err: any) {
      return { success: false, count: 0, message: `Gagal mengimpor: ${err?.message || 'Format tidak valid'}` };
    }
  }
}

export const storageService = new StorageService();
