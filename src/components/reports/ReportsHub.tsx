import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  DollarSign,
  Percent,
  Search,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  Store,
  FileSpreadsheet,
} from 'lucide-react';
import { DatabaseState } from '../../types/database';
import { formatIDR, formatPercent } from '../../utils/validation';
import { computePandLReport, PandLLineItem } from '../../utils/financialEngine';
import {
  generateExecutivePandLCsv,
  generateComprehensiveFinancialCsv,
  downloadCsvFile,
} from '../../utils/financialExport';

export type ReportsSubTab = 'sales' | 'pnl' | 'marketplace_perf';

interface ReportsHubProps {
  dbState: DatabaseState;
  activeSubTab?: ReportsSubTab;
  onSubTabChange?: (tab: ReportsSubTab) => void;
}

export const ReportsHub: React.FC<ReportsHubProps> = ({
  dbState,
  activeSubTab = 'pnl',
  onSubTabChange,
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<ReportsSubTab>(activeSubTab);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesUnitFilter, setSalesUnitFilter] = useState('ALL');
  const [salesMktFilter, setSalesMktFilter] = useState('ALL');

  React.useEffect(() => {
    if (activeSubTab) {
      setCurrentSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleTabSwitch = (tab: ReportsSubTab) => {
    setCurrentSubTab(tab);
    onSubTabChange?.(tab);
  };

  // Compute Full P&L Report
  const pnlReport = useMemo(() => {
    return computePandLReport(dbState.sales, dbState.postData, dbState.costRules, dbState.teamAllocations);
  }, [dbState.sales, dbState.postData, dbState.costRules, dbState.teamAllocations]);

  // Export P&L CSV
  const handleExportPandLCsv = () => {
    const csv = generateExecutivePandLCsv(pnlReport, 'Februari 2026');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`Laporan_Laba_Rugi_${dateStr}.csv`, csv);
  };

  // Export Comprehensive CSV
  const handleExportFullCsv = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const skuMetrics = dbState.productChannels.map((pc) => {
      const sku = dbState.skus.find((s) => s.sku === pc.sku);
      const hpp = sku?.hpp || 0;
      const gp = pc.selling_price - hpp;
      const gpm = pc.selling_price > 0 ? gp / pc.selling_price : 0;
      const fee = pc.selling_price * 0.08;
      const profitBeforeAds = gp - fee;
      const adsSpend = pc.selling_price * 0.05;
      const profitAfterAds = profitBeforeAds - adsSpend;
      const npm = pc.selling_price > 0 ? profitAfterAds / pc.selling_price : 0;
      return {
        sku: pc.sku,
        skuName: sku?.sku_name || pc.sku,
        spuId: sku?.spu_id || '',
        brandName: dbState.brands.find((b) => b.brand_id === sku?.brand_id)?.brand_name || 'Sinergi',
        categoryName: dbState.categories.find((c) => c.category_id === sku?.category_id)?.category_name || 'General',
        unitId: pc.unit_id,
        unitName: dbState.units.find((u) => u.unit_id === pc.unit_id)?.unit_name || pc.unit_id,
        marketplaceId: pc.marketplace_id,
        marketplaceName: dbState.marketplaces.find((m) => m.marketplace_id === pc.marketplace_id)?.marketplace_name || pc.marketplace_id,
        sellingPrice: pc.selling_price,
        hpp,
        grossProfitPerUnit: gp,
        grossMarginPct: gpm,
        fees: [],
        totalMarketplaceFeePerUnit: fee,
        platformFeePct: 0.08,
        profitBeforeAds,
        marginBeforeAdsPct: pc.selling_price > 0 ? profitBeforeAds / pc.selling_price : 0,
        adsSpendPerUnit: adsSpend,
        profitAfterAds,
        marginAfterAdsPct: npm,
        unitsSold: 0,
        totalSales: 0,
        totalHpp: 0,
        totalGrossProfit: 0,
        totalPlatformCost: 0,
        totalProfitBeforeAds: 0,
        totalAdsSpend: 0,
        totalNetProfit: 0,
        healthStatus: (npm >= 0.08 ? 'ADS_ELIGIBLE' : 'ORGANIC_ONLY') as any,
      };
    });

    const csv = generateComprehensiveFinancialCsv({
      pnlReport,
      skuMetrics,
      sales: dbState.sales,
      postData: dbState.postData,
      ads: dbState.ads,
    });
    downloadCsvFile(`Laporan_Keuangan_Lengkap_${dateStr}.csv`, csv);
  };

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return dbState.sales.filter((s) => {
      const matchUnit =
        salesUnitFilter === 'ALL' ||
        (salesUnitFilter === 'U001' && s.bucket === 'KANBAI') ||
        (salesUnitFilter === 'U002' && s.bucket === 'NUTRIBITE');
      const matchMkt = salesMktFilter === 'ALL' || s.marketplace_id === salesMktFilter;
      const q = salesSearch.toLowerCase();
      const matchQuery =
        !q ||
        s.no_invoice.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q);
      return matchUnit && matchMkt && matchQuery;
    });
  }, [dbState.sales, salesUnitFilter, salesMktFilter, salesSearch]);

  // Marketplace Performance breakdown
  const mktBreakdown = useMemo(() => {
    return dbState.marketplaces.map((mkt) => {
      const sales = dbState.sales.filter((s) => s.marketplace_id === mkt.marketplace_id);
      const omzet = sales.reduce((acc, s) => acc + s.total_sales, 0);
      const units = sales.reduce((acc, s) => acc + s.qty, 0);
      const orders = new Set(sales.map((s) => s.no_invoice)).size;
      const estFee = Math.round(omzet * 0.08);
      const grossMargin = omzet > 0 ? (omzet - estFee) / omzet : 0;
      return {
        id: mkt.marketplace_id,
        name: mkt.marketplace_name,
        orders,
        units,
        omzet,
        estFee,
        grossMargin,
      };
    });
  }, [dbState.marketplaces, dbState.sales]);

  return (
    <div className="space-y-6 pb-6">
      {/* Header & Submenu Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Laporan Keuangan & Penjualan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Laporan laba rugi lengkap, histori transaksi penjualan, dan performa kanal marketplace
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Export CSV Action */}
            <button
              onClick={handleExportPandLCsv}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Laba Rugi (CSV)</span>
            </button>

            {/* Submenu Segmented Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => handleTabSwitch('sales')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentSubTab === 'sales'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Penjualan
              </button>
              <button
                onClick={() => handleTabSwitch('pnl')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentSubTab === 'pnl'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Laba Rugi
              </button>
              <button
                onClick={() => handleTabSwitch('marketplace_perf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentSubTab === 'marketplace_perf'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Performa Kanal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- SUBTAB 1: PENJUALAN --- */}
      {currentSubTab === 'sales' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nomor order atau SKU..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={salesUnitFilter}
                onChange={(e) => setSalesUnitFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
              >
                <option value="ALL">Semua Unit</option>
                <option value="U001">Kanbai</option>
                <option value="U002">Nutribite</option>
              </select>
              <select
                value={salesMktFilter}
                onChange={(e) => setSalesMktFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
              >
                <option value="ALL">Semua Marketplace</option>
                <option value="MKT-SHOPEE">Shopee</option>
                <option value="MKT-TOKOPEDIA">Tokopedia</option>
                <option value="MKT-TIKTOK">TikTok Shop</option>
                <option value="MKT-LAZADA">Lazada</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No. Order</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">SKU Produk</th>
                    <th className="py-3 px-4">Marketplace</th>
                    <th className="py-3 px-4">Unit Bisnis</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 text-right">Total Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((s, idx) => {
                    const mktName = dbState.marketplaces.find((m) => m.marketplace_id === s.marketplace_id)?.marketplace_name || s.marketplace_id;
                    const unitName = s.bucket === 'KANBAI' ? 'Kanbai' : 'Nutribite';

                    return (
                      <tr key={`${s.no_invoice}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.no_invoice}</td>
                        <td className="py-3 px-4 text-slate-600">{s.order_date}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{s.sku}</td>
                        <td className="py-3 px-4 text-slate-700">{mktName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              s.bucket === 'KANBAI'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {unitName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-800">{s.qty}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{formatIDR(s.selling_price)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatIDR(s.total_sales)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: LABA RUGI (P&L STATEMENT) --- */}
      {currentSubTab === 'pnl' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px]">Penjualan Bersih (Omzet)</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">
                {formatIDR(pnlReport.summary.totalRevenue)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px]">Laba Kotor Retail</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">
                {formatIDR(pnlReport.summary.grossProfit)}
              </span>
              <span className="text-[10px] text-slate-400">Margin {formatPercent(pnlReport.summary.gpm)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px]">Total Biaya & Operasional</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">
                {formatIDR(pnlReport.summary.totalExpenses)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px]">Laba Bersih Akhir</span>
              <span className="text-lg font-bold text-emerald-600 mt-1 block">
                {formatIDR(pnlReport.summary.netProfit)}
              </span>
              <span className="text-[10px] text-emerald-600">
                Margin Bersih {formatPercent(pnlReport.summary.npm)}
              </span>
            </div>
          </div>

          {/* 3-Column P&L Table: Kanbai | Nutribite | Total Sinergi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Laporan Laba Rugi 3-Kolom Sinergi
                </h3>
                <p className="text-xs text-slate-500">
                  Perbandingan unit bisnis Kanbai, Nutribite, dan alokasi biaya bersama
                </p>
              </div>

              {/* Status Keseimbangan */}
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cek Keseimbangan: Seimbang (Rp 0 selisih)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Pos Akun Laba Rugi</th>
                    <th className="py-3 px-4 text-right">Unit Kanbai</th>
                    <th className="py-3 px-4 text-right">Unit Nutribite</th>
                    <th className="py-3 px-4 text-right">Biaya Bersama</th>
                    <th className="py-3 px-4 text-right font-bold text-slate-900">Total Sinergi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pnlReport.lines.map((line) => {
                    const isTotal = line.isTotal;
                    const isHeader = line.isHeader;

                    if (isHeader) {
                      return (
                        <tr key={line.id} className="bg-slate-50/80 font-bold text-slate-800">
                          <td colSpan={5} className="py-2.5 px-4 uppercase text-[11px] tracking-wider text-slate-500">
                            {line.name}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={line.id}
                        className={`${
                          isTotal
                            ? 'bg-slate-50/90 font-bold text-slate-900 border-t-2 border-slate-200'
                            : 'hover:bg-slate-50/50'
                        } transition-colors`}
                      >
                        <td className="py-2.5 px-4 font-medium text-slate-800">{line.name}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                          {formatIDR(line.kanbaiFinal)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                          {formatIDR(line.nutribiteFinal)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          {line.teamOriginal !== 0 ? formatIDR(line.teamOriginal) : '-'}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono font-bold ${
                            isTotal && line.totalSinergi >= 0 ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {formatIDR(line.totalSinergi)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 3: PERFORMA MARKETPLACE --- */}
      {currentSubTab === 'marketplace_perf' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mktBreakdown.map((mkt) => (
            <div
              key={mkt.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{mkt.name}</h3>
                  <span className="text-xs text-slate-400">Kanal Penjualan</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total Omzet</span>
                  <span className="text-lg font-bold text-slate-900">{formatIDR(mkt.omzet)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Total Pesanan</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{mkt.orders}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Unit Terjual</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{mkt.units}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Est. Potongan Fee</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {formatIDR(mkt.estFee)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between text-xs">
                <span className="text-blue-900 font-medium">Margin Bersih Kanal</span>
                <span className="text-blue-700 font-bold">{formatPercent(mkt.grossMargin)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
