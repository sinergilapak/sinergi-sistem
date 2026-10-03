import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Percent,
  Megaphone,
  BarChart3,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calculator,
  ChevronRight,
  Store,
  FileSpreadsheet,
} from 'lucide-react';
import { DatabaseState } from '../../types/database';
import { formatIDR, formatPercent } from '../../utils/validation';
import { computePandLReport } from '../../utils/financialEngine';
import { scanProfitMarginAlerts } from '../../utils/alertEngine';
import { generateComprehensiveFinancialCsv, downloadCsvFile } from '../../utils/financialExport';

interface RetailDashboardProps {
  dbState: DatabaseState;
  onNavigateToProducts?: (subTab?: string) => void;
  onNavigateToPricing?: (subTab?: string) => void;
  onNavigateToReports?: (subTab?: string) => void;
  onNavigateToMore?: (subTab?: string) => void;
}

export const RetailDashboard: React.FC<RetailDashboardProps> = ({
  dbState,
  onNavigateToProducts,
  onNavigateToPricing,
  onNavigateToReports,
  onNavigateToMore,
}) => {
  // Filters requested by user:
  // Periode: Semua | Bulan Ini | 7 Hari | Hari Ini
  // Unit: Semua Unit | Kanbai | Nutribite
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'THIS_MONTH' | '7_DAYS' | 'TODAY'>('ALL');
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'U001' | 'U002'>('ALL');

  // Compute overall financial P&L
  const pnl = useMemo(() => {
    return computePandLReport(dbState.sales, dbState.postData, dbState.costRules, dbState.teamAllocations);
  }, [dbState.sales, dbState.postData, dbState.costRules, dbState.teamAllocations]);

  // Product margin alerts
  const marginAlerts = useMemo(() => {
    return scanProfitMarginAlerts(dbState);
  }, [dbState]);

  // Filtered Sales Calculation
  const filteredSales = useMemo(() => {
    return dbState.sales.filter((s) => {
      // Unit filter (U001 -> KANBAI, U002 -> NUTRIBITE)
      if (unitFilter === 'U001' && s.bucket !== 'KANBAI') {
        return false;
      }
      if (unitFilter === 'U002' && s.bucket !== 'NUTRIBITE') {
        return false;
      }
      // Period filter
      if (periodFilter === 'TODAY') {
        const today = new Date().toISOString().slice(0, 10);
        return s.order_date === today;
      }
      if (periodFilter === '7_DAYS') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return s.order_date >= sevenDaysAgo;
      }
      if (periodFilter === 'THIS_MONTH') {
        const currentYearMonth = '2026-02';
        return s.order_date.startsWith(currentYearMonth);
      }
      return true;
    });
  }, [dbState.sales, unitFilter, periodFilter]);

  // Filtered Ads calculation
  const filteredAdsSpend = useMemo(() => {
    return dbState.ads.reduce((acc, ad) => {
      if (unitFilter !== 'ALL' && ad.unit_id !== unitFilter) {
        return acc;
      }
      return acc + (ad.ads_spend || 0);
    }, 0);
  }, [dbState.ads, unitFilter]);

  // Derived Retail KPIs
  const totalOmzet = useMemo(() => {
    if (unitFilter === 'ALL' && periodFilter === 'ALL') {
      return pnl.summary.totalRevenue;
    }
    return filteredSales.reduce((acc, s) => acc + s.total_sales, 0);
  }, [filteredSales, unitFilter, periodFilter, pnl.summary.totalRevenue]);

  const totalPesanan = useMemo(() => {
    const orderSet = new Set(filteredSales.map((s) => s.no_invoice));
    return orderSet.size > 0 ? orderSet.size : filteredSales.length;
  }, [filteredSales]);

  const totalHpp = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      return acc + (s.total_hpp || s.hpp * s.qty);
    }, 0);
  }, [filteredSales]);

  // Approximate platform fee
  const totalBiayaPlatform = useMemo(() => {
    return Math.round(totalOmzet * 0.08);
  }, [totalOmzet]);

  // Net Profit
  const totalLabaBersih = useMemo(() => {
    if (unitFilter === 'ALL' && periodFilter === 'ALL') {
      return pnl.summary.netProfit;
    }
    // Pro-rated approximation for filtered view
    const grossProfit = totalOmzet - totalHpp;
    const net = grossProfit - totalBiayaPlatform - filteredAdsSpend;
    return net;
  }, [unitFilter, periodFilter, pnl.summary.netProfit, totalOmzet, totalHpp, totalBiayaPlatform, filteredAdsSpend]);

  const marginBersihPct = totalOmzet > 0 ? totalLabaBersih / totalOmzet : 0;
  const roas = filteredAdsSpend > 0 ? totalOmzet / filteredAdsSpend : 0;
  const cirPct = totalOmzet > 0 ? filteredAdsSpend / totalOmzet : 0;

  // Product health summary
  const productHealthSummary = useMemo(() => {
    let sehat = 0;
    let perhatian = 0;
    let kritis = 0;

    dbState.productChannels.forEach((pc) => {
      const sku = dbState.skus.find((s) => s.sku === pc.sku);
      const hpp = sku?.hpp || 0;
      const gp = pc.selling_price - hpp;
      const fee = pc.selling_price * 0.08;
      const profitBeforeAds = gp - fee;
      const adsSpend = pc.selling_price * 0.05;
      const profitAfterAds = profitBeforeAds - adsSpend;
      const npm = pc.selling_price > 0 ? profitAfterAds / pc.selling_price : 0;

      if (npm >= 0.08) {
        sehat++;
      } else if (npm >= 0) {
        perhatian++;
      } else {
        kritis++;
      }
    });

    return { sehat, perhatian, kritis, total: dbState.productChannels.length };
  }, [dbState.productChannels, dbState.skus]);

  // Performance by Channel
  const channelPerformance = useMemo(() => {
    return dbState.marketplaces.map((mkt) => {
      const salesForMkt = filteredSales.filter((s) => s.marketplace_id === mkt.marketplace_id);
      const omzet = salesForMkt.reduce((acc, s) => acc + s.total_sales, 0);
      const units = salesForMkt.reduce((acc, s) => acc + s.qty, 0);
      const orders = new Set(salesForMkt.map((s) => s.no_invoice)).size;
      const estFee = Math.round(omzet * 0.08);
      const marginEst = omzet > 0 ? (omzet - estFee) / omzet : 0;

      return {
        id: mkt.marketplace_id,
        name: mkt.marketplace_name,
        omzet,
        units,
        orders,
        estFee,
        marginEst,
      };
    });
  }, [dbState.marketplaces, filteredSales]);

  // Performance by Unit
  const unitPerformance = useMemo(() => {
    const kanbaiSales = dbState.sales.filter((s) => s.bucket === 'KANBAI');
    const nutribiteSales = dbState.sales.filter((s) => s.bucket === 'NUTRIBITE');

    const kanbaiOmzet = kanbaiSales.reduce((acc, s) => acc + s.total_sales, 0);
    const nutribiteOmzet = nutribiteSales.reduce((acc, s) => acc + s.total_sales, 0);

    return {
      kanbai: {
        omzet: kanbaiOmzet,
        laba: pnl.reconciliation.kanbaiFinalTotalNetProfit,
        margin: kanbaiOmzet > 0 ? pnl.reconciliation.kanbaiFinalTotalNetProfit / kanbaiOmzet : 0,
      },
      nutribite: {
        omzet: nutribiteOmzet,
        laba: pnl.reconciliation.nutribiteFinalTotalNetProfit,
        margin: nutribiteOmzet > 0 ? pnl.reconciliation.nutribiteFinalTotalNetProfit / nutribiteOmzet : 0,
      },
      bersama: {
        totalBiaya: pnl.lines.find((l) => l.name.includes('Beban Operasional'))?.teamOriginal || 7500000,
      },
    };
  }, [dbState.sales, pnl]);

  const handleExportCsv = () => {
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
      pnlReport: pnl,
      skuMetrics,
      sales: dbState.sales,
      postData: dbState.postData,
      ads: dbState.ads,
    });
    downloadCsvFile(`Laporan_Performa_Retail_${dateStr}.csv`, csv);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Performa Retail
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Ringkasan omzet, laba, iklan, dan kondisi produk
            </p>
          </div>

          {/* Interactive Filters: Periode & Unit */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Unit Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setUnitFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  unitFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Unit
              </button>
              <button
                onClick={() => setUnitFilter('U001')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  unitFilter === 'U001'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kanbai
              </button>
              <button
                onClick={() => setUnitFilter('U002')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  unitFilter === 'U002'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nutribite
              </button>
            </div>

            {/* Period Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setPeriodFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  periodFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setPeriodFilter('THIS_MONTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  periodFilter === 'THIS_MONTH'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setPeriodFilter('7_DAYS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  periodFilter === '7_DAYS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setPeriodFilter('TODAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  periodFilter === 'TODAY'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Key Retail KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {/* 1. Omzet */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Omzet</div>
          <div className="text-base sm:text-lg font-bold text-slate-900">
            {formatIDR(totalOmzet)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total pendapatan</div>
        </div>

        {/* 2. Laba Bersih */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Laba Bersih</div>
          <div className={`text-base sm:text-lg font-bold ${totalLabaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatIDR(totalLabaBersih)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Setelah semua biaya</div>
        </div>

        {/* 3. Margin Bersih */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Margin Bersih</div>
          <div className={`text-base sm:text-lg font-bold ${marginBersihPct >= 0.1 ? 'text-emerald-600' : marginBersihPct > 0 ? 'text-amber-600' : 'text-red-600'}`}>
            {formatPercent(marginBersihPct)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Persentase profit</div>
        </div>

        {/* 4. Pesanan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Pesanan</div>
          <div className="text-base sm:text-lg font-bold text-slate-900">
            {totalPesanan.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total order retail</div>
        </div>

        {/* 5. Biaya Iklan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Biaya Iklan</div>
          <div className="text-base sm:text-lg font-bold text-slate-900">
            {formatIDR(filteredAdsSpend)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Budget iklan aktif</div>
        </div>

        {/* 6. ROAS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">ROAS</div>
          <div className={`text-base sm:text-lg font-bold ${roas >= 3 ? 'text-emerald-600' : 'text-slate-900'}`}>
            {roas > 0 ? `${roas.toFixed(2)}x` : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Efisiensi iklan</div>
        </div>

        {/* 7. CIR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-slate-500 mb-1">CIR</div>
          <div className={`text-base sm:text-lg font-bold ${cirPct <= 0.15 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {formatPercent(cirPct)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Rasio biaya iklan</div>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Performa Unit Bisnis */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Performa Unit Bisnis</h2>
            <button
              onClick={() => onNavigateToReports?.('pnl')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
            >
              <span>Laporan Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Kanbai */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-900">Unit Kanbai</span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Margin {formatPercent(unitPerformance.kanbai.margin)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Omzet</span>
                  <span className="font-bold text-slate-800">{formatIDR(unitPerformance.kanbai.omzet)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Laba Bersih</span>
                  <span className="font-bold text-emerald-600">{formatIDR(unitPerformance.kanbai.laba)}</span>
                </div>
              </div>
            </div>

            {/* Nutribite */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-900">Unit Nutribite</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Margin {formatPercent(unitPerformance.nutribite.margin)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Omzet</span>
                  <span className="font-bold text-slate-800">{formatIDR(unitPerformance.nutribite.omzet)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Laba Bersih</span>
                  <span className="font-bold text-emerald-600">{formatIDR(unitPerformance.nutribite.laba)}</span>
                </div>
              </div>
            </div>

            {/* Biaya Bersama */}
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Biaya & Pendapatan Bersama</span>
                <span className="font-semibold text-slate-900">{formatIDR(unitPerformance.bersama.totalBiaya)}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Alokasi biaya tim operasional dibagi secara adil ke kedua unit bisnis.
              </p>
            </div>
          </div>
        </div>

        {/* Center: Saluran Penjualan Marketplace */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Saluran Penjualan</h2>
            <button
              onClick={() => onNavigateToReports?.('marketplace_perf')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
            >
              <span>Detail Kanal</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {channelPerformance.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">{c.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {c.orders} pesanan · {c.units} produk terjual
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">{formatIDR(c.omzet)}</div>
                  <div className="text-[11px] text-slate-500">
                    Est. Potongan {formatIDR(c.estFee)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Kondisi & Kesehatan Produk */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Kondisi & Kesehatan Produk</h2>
            <button
              onClick={() => onNavigateToProducts?.('channel_prices')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
            >
              <span>Harga Marketplace</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Sehat */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-lg font-bold text-emerald-700">{productHealthSummary.sehat}</div>
              <div className="text-[11px] font-medium text-emerald-800">Sehat</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Iklan Aman</div>
            </div>

            {/* Perhatian */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="text-lg font-bold text-amber-700">{productHealthSummary.perhatian}</div>
              <div className="text-[11px] font-medium text-amber-800">Perhatian</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Margin Tipis</div>
            </div>

            {/* Kritis */}
            <div className="p-3 rounded-xl bg-red-50 border border-red-100">
              <div className="text-lg font-bold text-red-700">{productHealthSummary.kritis}</div>
              <div className="text-[11px] font-medium text-red-800">Perlu Cek</div>
              <div className="text-[10px] text-red-600 mt-0.5">Harga Kurang</div>
            </div>
          </div>

          {/* Quick Action to Price Calculator */}
          <div className="pt-2 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-blue-900">Kalkulator Harga Jual</div>
                <div className="text-[11px] text-blue-700">Simulasi harga ideal & batas aman promo</div>
              </div>
              <button
                onClick={() => onNavigateToPricing?.('calculator')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0"
              >
                Buka
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Margin Alerts Section (if any alerts) */}
      {marginAlerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Peringatan Margin Produk ({marginAlerts.length} produk perlu penyesuaian)
              </h2>
            </div>
            <button
              onClick={() => onNavigateToPricing?.('calculator')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Sesuaikan di Kalkulator
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {marginAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{alert.sku}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {alert.currentMarginPct < 0 ? 'Margin Negatif' : 'Margin Tipis'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">{alert.productName}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Kanal: <span className="font-medium text-slate-700">{alert.marketplaceName}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Harga Saat Ini</span>
                    <span className="font-semibold text-slate-800">{formatIDR(alert.sellingPrice)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Saran Harga</span>
                    <span className="font-semibold text-emerald-700">
                      {formatIDR(alert.recommendedPrice)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Footer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">Status Data Keuangan</div>
            <div className="text-[11px] text-slate-500">
              Perhitungan laba rugi dan alokasi biaya bekerja secara otomatis dan seimbang.
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateToReports?.('pnl')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Laporan Laba Rugi
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
