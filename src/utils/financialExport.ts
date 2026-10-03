/**
 * Sinergi Lapak - Financial CSV Export Utility
 * Generates formatted, production-grade CSV files for external record-keeping,
 * accounting, tax audit, and ERP integrations.
 */

import { DatabaseState, SalesRecord, PostDataRecord, AdsRecord } from '../types/database';
import { PandLReportResult, SkuFinancialMetrics } from './financialEngine';

/**
 * Escape CSV field to prevent formula injection and preserve quotes/commas
 */
export function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers browser download of a CSV file with UTF-8 BOM
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  // \uFEFF BOM ensures Microsoft Excel and Google Sheets open the CSV with correct UTF-8 encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Export Executive P&L Statement (Laporan Laba Rugi 3-Kolom Sinergi)
 */
export function generateExecutivePandLCsv(pnlReport: PandLReportResult, periodLabel = 'Februari 2026'): string {
  const exportDate = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  const headerComments = [
    `# =========================================================================`,
    `# SINERGI LAPAK - LAPORAN LABA RUGI EKSEKUTIF (P&L STATEMENT)`,
    `# Dokumen Resmi Pembukuan Eksternal & Arsip Keuangan`,
    `# Tanggal Ekspor: ${exportDate}`,
    `# Periode Buku: ${periodLabel}`,
    `# Status Audit: ${pnlReport.reconciliation.isBalanced ? 'BALANCED & RECONCILED' : 'UNBALANCED'}`,
    `# Selisih Rekonsiliasi: Rp ${pnlReport.reconciliation.difference}`,
    `# Prinsip: Anti Double-Counting (Kanbai Direct + Nutribite Direct + Team Original = Total Sinergi)`,
    `# =========================================================================`,
    ``,
  ];

  const headers = [
    'No',
    'Kode Baris',
    'Pos Laba Rugi',
    'Kanbai Direct (Rp)',
    'Kanbai Alokasi Team (Rp)',
    'Kanbai Total Final (Rp)',
    'Nutribite Direct (Rp)',
    'Nutribite Alokasi Team (Rp)',
    'Nutribite Total Final (Rp)',
    'Team Shared Pool Original (Rp)',
    'Total Sinergi Konsolidasi (Rp)',
    'Status Rekonsiliasi',
  ];

  const rows = pnlReport.lines.map((line, idx) => [
    idx + 1,
    line.id,
    escapeCsvValue(line.name),
    line.kanbaiDirect,
    line.kanbaiAllocated,
    line.kanbaiFinal,
    line.nutribiteDirect,
    line.nutribiteAllocated,
    line.nutribiteFinal,
    line.teamOriginal,
    line.totalSinergi,
    pnlReport.reconciliation.isBalanced ? 'BALANCED' : 'SELISIH',
  ]);

  const summaryFooter = [
    ``,
    `# --- RINGKASAN EKSEKUTIF ---`,
    `# Total Omzet Penjualan Bersih: Rp ${pnlReport.summary.totalRevenue.toLocaleString('id-ID')}`,
    `# Total Laba Kotor (Gross Profit): Rp ${pnlReport.summary.grossProfit.toLocaleString('id-ID')} (${(pnlReport.summary.gpm * 100).toFixed(1)}%)`,
    `# Total Beban Platform Marketplace: Rp ${pnlReport.summary.totalPlatformCost.toLocaleString('id-ID')}`,
    `# Total Beban Pemasaran & Ads: Rp ${pnlReport.summary.totalMarketing.toLocaleString('id-ID')}`,
    `# Total Laba Bersih Sinergi: Rp ${pnlReport.summary.netProfit.toLocaleString('id-ID')} (${(pnlReport.summary.npm * 100).toFixed(1)}%)`,
    `# Kontribusi Kanbai Final: Rp ${pnlReport.reconciliation.kanbaiFinalTotalNetProfit.toLocaleString('id-ID')}`,
    `# Kontribusi Nutribite Final: Rp ${pnlReport.reconciliation.nutribiteFinalTotalNetProfit.toLocaleString('id-ID')}`,
  ];

  return [
    ...headerComments,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
    ...summaryFooter,
  ].join('\n');
}

/**
 * 2. Export SKU Unit Economics & Margin Matrix
 */
export function generateSkuEconomicsCsv(skuMetrics: SkuFinancialMetrics[]): string {
  const exportDate = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const headerComments = [
    `# =========================================================================`,
    `# SINERGI LAPAK - UNIT ECONOMICS SKU & MARGIN MATRIX`,
    `# Analisis Margin Bersih per Varian Produk dan Kanal Penjualan`,
    `# Tanggal Ekspor: ${exportDate}`,
    `# Total SKU Terdaftar: ${skuMetrics.length}`,
    `# =========================================================================`,
    ``,
  ];

  const headers = [
    'SKU',
    'Nama Produk SKU',
    'Model SPU',
    'Brand',
    'Kategori',
    'Unit Bisnis',
    'Marketplace',
    'HPP Dasar (COGS Rp)',
    'Harga Jual Normal (Rp)',
    'Gross Profit per Unit (Rp)',
    'Gross Margin (%)',
    'Biaya Marketplace per Unit (Rp)',
    'Persentase Fee Platform (%)',
    'Laba Sebelum Iklan (Rp)',
    'Margin Sebelum Iklan (%)',
    'Alokasi Biaya Iklan (Rp)',
    'Laba Bersih Akhir SKU (Rp)',
    'Net Margin Akhir (%)',
    'Unit Terjual (Volume)',
    'Total Omzet (Rp)',
    'Total Laba Bersih (Rp)',
    'Status Kelayakan Iklan',
  ];

  const rows = skuMetrics.map((item) => [
    escapeCsvValue(item.sku),
    escapeCsvValue(item.skuName),
    escapeCsvValue(item.spuId),
    escapeCsvValue(item.brandName),
    escapeCsvValue(item.categoryName),
    escapeCsvValue(item.unitName),
    escapeCsvValue(item.marketplaceName),
    item.hpp,
    item.sellingPrice,
    item.grossProfitPerUnit,
    `${(item.grossMarginPct * 100).toFixed(1)}%`,
    item.totalMarketplaceFeePerUnit,
    `${(item.platformFeePct * 100).toFixed(1)}%`,
    item.profitBeforeAds,
    `${(item.marginBeforeAdsPct * 100).toFixed(1)}%`,
    item.adsSpendPerUnit,
    item.profitAfterAds,
    `${(item.marginAfterAdsPct * 100).toFixed(1)}%`,
    item.unitsSold,
    item.totalSales,
    item.totalNetProfit,
    item.healthStatus,
  ]);

  return [...headerComments, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * 3. Export Sales Ledger (Buku Besar Penjualan Aktual)
 */
export function generateSalesLedgerCsv(sales: SalesRecord[]): string {
  const exportDate = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const headerComments = [
    `# =========================================================================`,
    `# SINERGI LAPAK - BUKU BESAR TRANSAKSI PENJUALAN (SALES LEDGER)`,
    `# Catatan Transaksi Penjualan Historis & Aktual Multi-Channel`,
    `# Tanggal Ekspor: ${exportDate}`,
    `# Total Transaksi: ${sales.length}`,
    `# =========================================================================`,
    ``,
  ];

  const headers = [
    'No Invoice',
    'Tanggal Order',
    'Nama Pelanggan',
    'SKU',
    'Nama Produk',
    'Brand',
    'Model SPU',
    'PIC Penanggung Jawab',
    'Akun Kanal',
    'Bucket Akun',
    'Marketplace ID',
    'Kuantitas (Qty)',
    'Harga Jual Satuan (Rp)',
    'HPP Satuan (Rp)',
    'Total Omzet Penjualan (Rp)',
    'Total HPP (Rp)',
    'Total Laba Kotor (Rp)',
    'Status Transaksi',
  ];

  const rows = sales.map((s) => [
    escapeCsvValue(s.no_invoice),
    s.order_date,
    escapeCsvValue(s.customer),
    escapeCsvValue(s.sku),
    escapeCsvValue(s.product_name),
    escapeCsvValue(s.brand),
    escapeCsvValue(s.spu),
    escapeCsvValue(s.pic),
    escapeCsvValue(s.account_id),
    s.bucket,
    s.marketplace_id,
    s.qty,
    s.selling_price,
    s.hpp,
    s.total_sales,
    s.total_hpp,
    s.gross_profit,
    s.status,
  ]);

  return [...headerComments, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * 4. Export Operational Expenses (Buku Realisasi Biaya & Post Data)
 */
export function generateExpensesLedgerCsv(postData: PostDataRecord[]): string {
  const exportDate = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const headerComments = [
    `# =========================================================================`,
    `# SINERGI LAPAK - REALISASI BEBAN & POSTING KAS (EXPENSES LEDGER)`,
    `# Pencatatan Biaya Operasional, Platform, Marketing & Alokasi Team`,
    `# Tanggal Ekspor: ${exportDate}`,
    `# Total Record Beban: ${postData.length}`,
    `# =========================================================================`,
    ``,
  ];

  const headers = [
    'ID Post',
    'Tanggal Pencatatan',
    'Kategori Biaya',
    'Sub Kategori',
    'Pos Beban',
    'PIC Penanggung Jawab',
    'Nominal Saldo (Rp)',
    'Keterangan / Uraian',
    'Bucket Unit',
    'Jenis Finansial',
    'Marketplace',
    'Akun Terkait',
  ];

  const rows = postData.map((pd) => [
    escapeCsvValue(pd.post_id),
    pd.date,
    escapeCsvValue(pd.category),
    escapeCsvValue(pd.sub_category),
    escapeCsvValue(pd.cost_post),
    escapeCsvValue(pd.pic),
    pd.balance,
    escapeCsvValue(pd.keterangan),
    pd.bucket,
    pd.financial_type,
    escapeCsvValue(pd.marketplace_id || '-'),
    escapeCsvValue(pd.account || '-'),
  ]);

  return [...headerComments, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * 5. Comprehensive Financial Package (All-in-One Master CSV Record for External Auditors)
 */
export function generateComprehensiveFinancialCsv(params: {
  pnlReport: PandLReportResult;
  skuMetrics: SkuFinancialMetrics[];
  sales: SalesRecord[];
  postData: PostDataRecord[];
  ads: AdsRecord[];
}): string {
  const { pnlReport, skuMetrics, sales, postData } = params;
  const exportDate = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const sections: string[] = [];

  // Section 1: Metadata & Executive Summary
  sections.push(
    [
      `# =========================================================================`,
      `# PAKET ARSIP KEUANGAN LENGKAP - SINERGI LAPAK MULTI-CHANNEL RETAIL`,
      `# Standar Laporan Keuangan Ritel Multi-Platform (Kanbai, Nutribite & Shared Team)`,
      `# Tanggal Cetak Dokumen: ${exportDate}`,
      `# Status Validasi Rekonsiliasi: ${pnlReport.reconciliation.isBalanced ? 'SEIMBANG (Rp 0 Selisih)' : 'TERDETEKSI SELISIH'}`,
      `# Total Penjualan Bersih Konsolidasi: Rp ${pnlReport.summary.totalRevenue.toLocaleString('id-ID')}`,
      `# Total Laba Kotor Konsolidasi: Rp ${pnlReport.summary.grossProfit.toLocaleString('id-ID')} (${(pnlReport.summary.gpm * 100).toFixed(1)}%)`,
      `# Total Laba Bersih Sinergi: Rp ${pnlReport.summary.netProfit.toLocaleString('id-ID')} (${(pnlReport.summary.npm * 100).toFixed(1)}%)`,
      `# =========================================================================`,
      ``,
    ].join('\n')
  );

  // Section 2: P&L Statement
  sections.push(
    [
      `### BAGIAN 1: LAPORAN LABA RUGI EKSEKUTIF (P&L CONSOLIDATION)`,
      [
        'Kode',
        'Nama Pos Laba Rugi',
        'Kanbai Direct',
        'Kanbai Alokasi Team',
        'Kanbai Final',
        'Nutribite Direct',
        'Nutribite Alokasi Team',
        'Nutribite Final',
        'Team Original Pool',
        'Total Sinergi',
      ].join(','),
      ...pnlReport.lines.map((l) =>
        [
          l.id,
          escapeCsvValue(l.name),
          l.kanbaiDirect,
          l.kanbaiAllocated,
          l.kanbaiFinal,
          l.nutribiteDirect,
          l.nutribiteAllocated,
          l.nutribiteFinal,
          l.teamOriginal,
          l.totalSinergi,
        ].join(',')
      ),
      ``,
    ].join('\n')
  );

  // Section 3: SKU Economics
  sections.push(
    [
      `### BAGIAN 2: UNIT ECONOMICS & MARGIN PRODUK PER KANAL`,
      [
        'SKU',
        'Nama SKU',
        'Unit',
        'Marketplace',
        'HPP (COGS)',
        'Harga Jual',
        'Gross Profit',
        'Gross Margin %',
        'Biaya Platform Fee',
        'Laba Sebelum Iklan',
        'Alokasi Ads',
        'Laba Bersih Akhir',
        'Net Margin %',
        'Status Kelayakan Ads',
      ].join(','),
      ...skuMetrics.map((i) =>
        [
          escapeCsvValue(i.sku),
          escapeCsvValue(i.skuName),
          escapeCsvValue(i.unitName),
          escapeCsvValue(i.marketplaceName),
          i.hpp,
          i.sellingPrice,
          i.grossProfitPerUnit,
          `${(i.grossMarginPct * 100).toFixed(1)}%`,
          i.totalMarketplaceFeePerUnit,
          i.profitBeforeAds,
          i.adsSpendPerUnit,
          i.profitAfterAds,
          `${(i.marginAfterAdsPct * 100).toFixed(1)}%`,
          i.healthStatus,
        ].join(',')
      ),
      ``,
    ].join('\n')
  );

  // Section 4: Sales Ledger
  sections.push(
    [
      `### BAGIAN 3: BUKU BESAR TRANSAKSI PENJUALAN AKTUAL`,
      [
        'No Invoice',
        'Tanggal Order',
        'Pelanggan',
        'SKU',
        'Qty',
        'Harga Satuan',
        'HPP Satuan',
        'Total Omzet',
        'Total HPP',
        'Gross Profit',
        'Bucket',
        'Kanal Marketplace',
        'PIC',
      ].join(','),
      ...sales.map((s) =>
        [
          escapeCsvValue(s.no_invoice),
          s.order_date,
          escapeCsvValue(s.customer),
          escapeCsvValue(s.sku),
          s.qty,
          s.selling_price,
          s.hpp,
          s.total_sales,
          s.total_hpp,
          s.gross_profit,
          s.bucket,
          escapeCsvValue(s.marketplace_id),
          escapeCsvValue(s.pic),
        ].join(',')
      ),
      ``,
    ].join('\n')
  );

  // Section 5: Expenses Ledger
  sections.push(
    [
      `### BAGIAN 4: REALISASI BEBAN & POSTING KAS OPERASIONAL`,
      [
        'ID Post',
        'Tanggal',
        'Kategori',
        'Sub Kategori',
        'Pos Beban',
        'PIC',
        'Nominal (Rp)',
        'Keterangan',
        'Bucket',
      ].join(','),
      ...postData.map((pd) =>
        [
          escapeCsvValue(pd.post_id),
          pd.date,
          escapeCsvValue(pd.category),
          escapeCsvValue(pd.sub_category),
          escapeCsvValue(pd.cost_post),
          escapeCsvValue(pd.pic),
          pd.balance,
          escapeCsvValue(pd.keterangan),
          pd.bucket,
        ].join(',')
      ),
    ].join('\n')
  );

  return sections.join('\n\n');
}
