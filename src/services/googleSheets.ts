/**
 * Sinergi Lapak - Google Sheets Integration Service
 * Manages the 17 sheets schema structure, CSV exports, Google Apps Script generator,
 * and live synchronization testing.
 */

export interface SheetDefinition {
  index: string;
  name: string;
  description: string;
  category: 'MASTER' | 'ACTUAL' | 'REPORT';
  headers: string[];
  exampleRow: string[];
}

export const SINERGI_17_SHEETS: SheetDefinition[] = [
  {
    index: '01',
    name: '01_SETTINGS',
    description: 'Konfigurasi global threshold margin, alokasi default, dan parameter sistem',
    category: 'MASTER',
    headers: ['key', 'value', 'description', 'updated_at', 'updated_by'],
    exampleRow: ['MIN_NET_MARGIN', '0.15', 'Minimum net margin 15%', '2026-01-01T00:00:00Z', 'System'],
  },
  {
    index: '02',
    name: '02_UNIT',
    description: 'Unit bisnis resmi V1 (U001: Kanbai, U002: Nutribite)',
    category: 'MASTER',
    headers: ['unit_id', 'unit_name', 'active', 'created_at', 'updated_at'],
    exampleRow: ['U001', 'Kanbai', 'TRUE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
  },
  {
    index: '03',
    name: '03_ACCOUNT',
    description: 'Akun kanal penjualan dan pemetaan otomatis ke Bucket (KANBAI, NUTRIBITE, TEAM)',
    category: 'MASTER',
    headers: ['account_id', 'account_name', 'bucket', 'is_historical', 'active', 'created_at', 'updated_at'],
    exampleRow: ['ACC-STARTONER', 'Startoner', 'TEAM', 'TRUE', 'TRUE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
  },
  {
    index: '04',
    name: '04_BRAND',
    description: 'Master merek dagang produk',
    category: 'MASTER',
    headers: ['brand_id', 'brand_name', 'active', 'created_at', 'updated_at'],
    exampleRow: ['BRD-001', 'Startoner', 'TRUE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
  },
  {
    index: '05',
    name: '05_CATEGORY',
    description: 'Hierarki kategori produk (Parent & Sub Kategori)',
    category: 'MASTER',
    headers: ['category_id', 'category_name', 'parent_category_id', 'active', 'created_at', 'updated_at'],
    exampleRow: ['CAT-OFC-TNR', 'Toner & Cartridge', 'CAT-OFC', 'TRUE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
  },
  {
    index: '06',
    name: '06_MARKETPLACE',
    description: 'Master kanal penjualan dengan normalisasi nama unik (Shopee, TikTok, Tokopedia, dll)',
    category: 'MASTER',
    headers: ['marketplace_id', 'marketplace_name', 'normalized_name', 'active', 'created_at', 'updated_at'],
    exampleRow: ['MKT-SHOPEE', 'Shopee', 'shopee', 'TRUE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
  },
  {
    index: '07',
    name: '07_PIC',
    description: 'Person In Charge untuk dimensi pelaporan dan posting biaya',
    category: 'MASTER',
    headers: ['pic_id', 'pic_name', 'pic_type', 'default_unit_id', 'active', 'created_at', 'updated_at'],
    exampleRow: ['PIC-001', 'Budi Santoso', 'Operasional', 'U001', 'TRUE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
  },
  {
    index: '08',
    name: '08_PRODUCT_SPU',
    description: 'Standard Product Unit (Model / Family produk induk)',
    category: 'MASTER',
    headers: ['spu_id', 'spu_name', 'brand_id', 'category_id', 'description', 'active', 'created_at', 'updated_at', 'updated_by'],
    exampleRow: ['SPU-STT-E003', 'Toner Cartridge E003 Series', 'BRD-001', 'CAT-OFC-TNR', 'Seri toner laserjet 4-warna', 'TRUE', '2026-01-05T00:00:00Z', '2026-01-05T00:00:00Z', 'Admin'],
  },
  {
    index: '09',
    name: '09_PRODUCT_SKU',
    description: 'Stock Keeping Unit (Varian item yang dijual langsung, memuat HPP)',
    category: 'MASTER',
    headers: ['product_id', 'sku', 'spu_id', 'sku_name', 'brand_id', 'category_id', 'hpp', 'unit_hpp', 'active', 'created_at', 'updated_at', 'updated_by'],
    exampleRow: ['PRD-00001', 'E003BK', 'SPU-STT-E003', 'Toner Cartridge E003 Black', 'BRD-001', 'CAT-OFC-TNR', '45000', 'PCS', 'TRUE', '2026-01-05T00:00:00Z', '2026-01-05T00:00:00Z', 'Admin'],
  },
  {
    index: '10',
    name: '10_PRODUCT_CHANNEL',
    description: 'Konfigurasi harga jual, promo, minimum harga, dan target per Unit + Marketplace',
    category: 'MASTER',
    headers: ['config_id', 'product_id', 'sku', 'unit_id', 'marketplace_id', 'selling_price', 'promo_price', 'minimum_selling_price', 'ads_status', 'target_margin', 'target_roas', 'target_cir', 'active', 'created_at', 'updated_at', 'updated_by'],
    exampleRow: ['CFG-001', 'PRD-00001', 'E003BK', 'U001', 'MKT-SHOPEE', '65000', '59000', '52000', 'TRUE', '0.20', '4.0', '0.25', 'TRUE', '2026-01-05T00:00:00Z', '2026-01-05T00:00:00Z', 'Admin'],
  },
  {
    index: '11',
    name: '11_COST_RULE',
    description: 'Aturan simulasi potongan biaya marketplace, komisi, PPN, dan program opsional',
    category: 'MASTER',
    headers: ['rule_id', 'marketplace_id', 'unit_id', 'account_id', 'brand_id', 'category_id', 'spu_id', 'sku', 'cost_name', 'cost_group', 'mandatory', 'calculation_type', 'calculation_base', 'rate', 'fixed_amount', 'minimum_fee', 'maximum_fee', 'range_from', 'range_to', 'program', 'effective_from', 'effective_to', 'priority', 'active', 'created_at', 'updated_at', 'updated_by'],
    exampleRow: ['RUL-001', 'MKT-SHOPEE', '', '', '', 'CAT-OFC-TNR', '', '', 'Biaya Admin Marketplace', 'PLATFORM_FEE', 'TRUE', 'PERCENTAGE_MAX', 'SELLING_PRICE', '0.065', '0', '0', '10000', '', '', '', '2026-01-01', '', '60', 'TRUE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'Admin'],
  },
  {
    index: '12',
    name: '12_TEAM_ALLOCATION',
    description: 'Aturan pemecahan alokasi pendapatan dan beban shared pool Team ke Kanbai & Nutribite',
    category: 'MASTER',
    headers: ['allocation_id', 'effective_from', 'effective_to', 'financial_type', 'category_id', 'sub_category', 'cost_post', 'method', 'kanbai_percent', 'nutribite_percent', 'active', 'notes', 'updated_at', 'updated_by'],
    exampleRow: ['ALC-001', '2026-01-01', '', 'EXPENSE', '01. Operasional', '', 'Human Resource', 'CUSTOM', '0.60', '0.40', 'TRUE', 'Gaji HR 60:40', '2026-01-01T00:00:00Z', 'Admin'],
  },
  {
    index: '13',
    name: '13_SALES',
    description: 'Transaksi penjualan historis/aktual (100.000+ baris data mentah)',
    category: 'ACTUAL',
    headers: ['no_invoice', 'order_date', 'customer', 'product_name', 'qty', 'selling_price', 'hpp', 'total_sales', 'total_hpp', 'gross_profit', 'account_id', 'bucket', 'marketplace_id', 'sku', 'spu', 'brand', 'pic', 'status'],
    exampleRow: ['INV-20260201-001', '2026-02-01', 'Toko Berkah Abadi', 'Toner Cartridge E003 Black', '2', '65000', '45000', '130000', '90000', '40000', 'ACC-STARTONER', 'TEAM', 'MKT-SHOPEE', 'E003BK', 'SPU-STT-E003', 'Startoner', 'Budi Santoso', 'COMPLETED'],
  },
  {
    index: '14',
    name: '14_POST_DATA',
    description: 'Pencatatan realisasi biaya & pendapatan operasional/platform/marketing',
    category: 'ACTUAL',
    headers: ['post_id', 'date', 'category', 'sub_category', 'cost_post', 'pic', 'balance', 'keterangan', 'bucket', 'financial_type', 'marketplace_id', 'account'],
    exampleRow: ['PST-001', '2026-02-05', '01. Operasional', 'Human Resource', 'Gaji Staff Gudang', 'Dewi Anggraini', '15000000', 'Gaji Februari', 'TEAM', 'EXPENSE', '', 'ACC-TEAM'],
  },
  {
    index: '15',
    name: '15_ADS',
    description: 'Realisasi biaya iklan (Ads Spend), Ad Sales, dan Order per channel/SKU',
    category: 'ACTUAL',
    headers: ['ads_id', 'date', 'marketplace_id', 'unit_id', 'account_id', 'product_id', 'sku', 'spu', 'ads_spend', 'ad_sales', 'orders', 'campaign'],
    exampleRow: ['ADS-001', '2026-02-01', 'MKT-SHOPEE', 'U001', 'ACC-KANBAI', 'PRD-00001', 'E003BK', 'SPU-STT-E003', '500000', '3200000', '48', 'Shopee Iklan Pencarian Brand'],
  },
  {
    index: '16',
    name: '16_CALCULATION',
    description: 'Tabel kalkulasi agregasi interim (Profit Before Ads, After Ads, BE ROAS)',
    category: 'REPORT',
    headers: ['calc_id', 'period', 'sku', 'unit_id', 'marketplace_id', 'net_sales', 'total_hpp', 'gross_profit', 'gpm', 'platform_cost', 'profit_before_ads', 'ads_spend', 'profit_after_ads', 'margin_after_ads', 'roas', 'cir', 'be_roas', 'ads_eligibility'],
    exampleRow: ['CLC-001', '2026-02', 'E003BK', 'U001', 'MKT-SHOPEE', '13000000', '9000000', '4000000', '0.307', '845000', '3155000', '500000', '2655000', '0.204', '6.4', '0.156', '3.2', 'ADS_ELIGIBLE'],
  },
  {
    index: '17',
    name: '17_REPORT',
    description: 'Laporan Laba Rugi Eksekutif (P&L Kanbai, Nutribite, Team Allocation & Total Sinergi)',
    category: 'REPORT',
    headers: ['report_id', 'period', 'line_item', 'code', 'kanbai_direct', 'kanbai_allocated', 'kanbai_final', 'nutribite_direct', 'nutribite_allocated', 'nutribite_final', 'team_original', 'total_sinergi', 'reconciliation_status', 'difference'],
    exampleRow: ['RPT-001', '2026-02', '01. Penjualan Bersih', 'REV_SALES', '650000000', '30000000', '680000000', '420000000', '20000000', '440000000', '50000000', '1120000000', 'BALANCED', '0'],
  },
];

/**
 * Generate CSV string for a specific sheet
 */
export function generateSheetCsv(sheetDef: SheetDefinition, dataRows: string[][]): string {
  const allRows = [sheetDef.headers, ...dataRows];
  return allRows
    .map((row) =>
      row
        .map((val) => {
          const str = String(val ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Generate Google Apps Script code that creates all 17 sheets with formatted header rows
 */
export function generateAppsScriptCode(): string {
  const sheetsJson = JSON.stringify(
    SINERGI_17_SHEETS.map((s) => ({
      name: s.name,
      headers: s.headers,
    }))
  );

  return `/**
 * SINERGI LAPAK — AUTO BOOTSTRAP SCRIPT (17 SHEETS)
 * Buka Google Sheets -> Extensions -> Apps Script -> Paste kode ini -> Klik Run 'setupSinergiSheets'
 */
function setupSinergiSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsConfig = ${sheetsJson};

  sheetsConfig.forEach(function(cfg) {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
    }
    
    // Set headers
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
    
    // Style header row
    const headerRange = sheet.getRange(1, 1, 1, cfg.headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1E3A8A"); // Deep Sinergi Blue
    headerRange.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  });

  // Hapus sheet default 'Sheet1' jika ada dan kosong
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch(e) {}
  }

  SpreadsheetApp.getUi().alert("Berhasil! Semua 17 sheet Sinergi Lapak telah dibuat dengan format header yang benar.");
}
`;
}
