import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Percent,
  TrendingUp,
  Megaphone,
  Store,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  X,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import {
  DatabaseState,
  CostRuleRecord,
  CalculationType,
} from '../../types/database';
import { storageService } from '../../services/storageService';
import { formatIDR, formatPercent } from '../../utils/validation';
import {
  calculateDynamicCostRules,
  DynamicFeeCalculationResult,
  CalculatedFeeItem,
  PriorityTier,
} from '../../utils/costRules';
import { CostRuleHierarchySection } from './CostRuleHierarchySection';

export type PricingSubTab = 'calculator' | 'fees' | 'ads_sim';

const getTierBadge = (tier: PriorityTier) => {
  switch (tier) {
    case 'SKU':
      return { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Level 6: SKU' };
    case 'SPU':
      return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Level 5: SPU' };
    case 'BRAND':
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Level 4: Brand' };
    case 'CATEGORY':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Level 3: Kategori' };
    case 'UNIT':
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Level 2: Unit' };
    case 'MARKETPLACE':
    case 'DEFAULT':
    default:
      return { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Level 1: Umum' };
  }
};

interface PricingAndProfitHubProps {
  dbState: DatabaseState;
  activeSubTab?: PricingSubTab;
  onSubTabChange?: (tab: PricingSubTab) => void;
}

export const PricingAndProfitHub: React.FC<PricingAndProfitHubProps> = ({
  dbState,
  activeSubTab = 'calculator',
  onSubTabChange,
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<PricingSubTab>(activeSubTab);

  React.useEffect(() => {
    if (activeSubTab) {
      setCurrentSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleTabSwitch = (tab: PricingSubTab) => {
    setCurrentSubTab(tab);
    onSubTabChange?.(tab);
  };

  // --- TAB 1: KALKULATOR HARGA STATE ---
  const [calcSku, setCalcSku] = useState<string>(dbState.skus[0]?.sku || '');
  const [calcMarketplace, setCalcMarketplace] = useState<string>('MKT-SHOPEE');
  const [calcUnit, setCalcUnit] = useState<string>('U001');
  const [calcTargetMargin, setCalcTargetMargin] = useState<number>(0.15); // 15%
  const [calcCustomHpp, setCalcCustomHpp] = useState<number>(0);
  const [useCustomHpp, setUseCustomHpp] = useState<boolean>(false);
  const [calcIncludeOptionalPrograms, setCalcIncludeOptionalPrograms] = useState<boolean>(true);
  const [calcAdsTargetRate, setCalcAdsTargetRate] = useState<number>(0.05); // 5% Target Ads Budget

  // Active SKU object
  const activeSkuObj = useMemo(() => {
    return dbState.skus.find((s) => s.sku === calcSku);
  }, [dbState.skus, calcSku]);

  const effectiveHpp = useCustomHpp ? calcCustomHpp : activeSkuObj?.hpp || 25000;

  // Real dynamic calculation for calculator using Cost Rule Engine
  const calcResult = useMemo(() => {
    const activePrograms = calcIncludeOptionalPrograms
      ? ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL']
      : ['ALL_MANDATORY'];

    const lookupContextBase = {
      marketplaceId: calcMarketplace,
      categoryId: activeSkuObj?.category_id || '',
      brandId: activeSkuObj?.brand_id || '',
      spuId: activeSkuObj?.spu_id || '',
      sku: calcSku,
      unitId: calcUnit,
      activePrograms,
    };

    // Iteratively resolve price with dynamic cost rules (handles caps, fixed fees, percentages)
    let currentPrice = Math.max(1000, effectiveHpp * 1.35);

    for (let i = 0; i < 4; i++) {
      const tempFee = calculateDynamicCostRules(
        { ...lookupContextBase, sellingPrice: currentPrice },
        dbState.costRules
      );
      const dynamicFeeRate = currentPrice > 0 ? tempFee.totalFeeAmount / currentPrice : 0;
      const divisor = 1 - dynamicFeeRate - calcAdsTargetRate - calcTargetMargin;
      if (divisor > 0.05) {
        currentPrice = effectiveHpp / divisor;
      } else {
        currentPrice = effectiveHpp * 1.5;
        break;
      }
    }

    const recommendedPrice = Math.max(effectiveHpp, Math.round(currentPrice / 500) * 500);

    // Final accurate dynamic fee evaluation at recommended price
    const feeResult = calculateDynamicCostRules(
      { ...lookupContextBase, sellingPrice: recommendedPrice },
      dbState.costRules
    );

    const totalFeeAmount = feeResult.totalFeeAmount;
    const effectiveFeeRate = feeResult.effectiveFeeRate;
    const grossProfit = recommendedPrice - effectiveHpp;
    const profitBeforeAds = grossProfit - totalFeeAmount;
    const adsBudget = Math.round(recommendedPrice * calcAdsTargetRate);
    const netProfit = profitBeforeAds - adsBudget;
    const netMargin = recommendedPrice > 0 ? netProfit / recommendedPrice : 0;
    const beRoas = profitBeforeAds > 0 ? recommendedPrice / profitBeforeAds : 0;

    return {
      recommendedPrice,
      feeResult,
      totalFeeAmount,
      effectiveFeeRate,
      hasConfiguredFees: feeResult.hasConfiguredFees,
      warning: feeResult.warning,
      breakdown: feeResult.breakdown,
      appliedTiers: feeResult.appliedTiers,
      grossProfit,
      profitBeforeAds,
      adsBudget,
      netProfit,
      netMargin,
      beRoas,
    };
  }, [
    effectiveHpp,
    calcTargetMargin,
    calcAdsTargetRate,
    calcMarketplace,
    activeSkuObj,
    calcSku,
    calcUnit,
    calcIncludeOptionalPrograms,
    dbState.costRules,
  ]);

  // --- TAB 3: SIMULASI IKLAN STATE ---
  const [simSellingPrice, setSimSellingPrice] = useState<number>(75000);
  const [simHpp, setSimHpp] = useState<number>(30000);
  const [simFeeRate, setSimFeeRate] = useState<number>(0.08); // 8%
  const [simTargetRoas, setSimTargetRoas] = useState<number>(4.0); // 4x

  const simResult = useMemo(() => {
    const feeAmount = Math.round(simSellingPrice * simFeeRate);
    const grossProfit = simSellingPrice - simHpp;
    const profitBeforeAds = grossProfit - feeAmount;

    // Ads spend derived from Target ROAS: Ads = SellingPrice / ROAS
    const adsSpend = simTargetRoas > 0 ? Math.round(simSellingPrice / simTargetRoas) : 0;
    const cir = simSellingPrice > 0 ? adsSpend / simSellingPrice : 0;
    const netProfit = profitBeforeAds - adsSpend;
    const netMargin = simSellingPrice > 0 ? netProfit / simSellingPrice : 0;

    // Break Even ROAS
    const beRoas = profitBeforeAds > 0 ? simSellingPrice / profitBeforeAds : 0;

    let status: 'SAFE' | 'WARNING' | 'LOSS' = 'SAFE';
    if (netProfit < 0) {
      status = 'LOSS';
    } else if (netMargin < 0.08) {
      status = 'WARNING';
    }

    return {
      feeAmount,
      grossProfit,
      profitBeforeAds,
      adsSpend,
      cir,
      netProfit,
      netMargin,
      beRoas,
      status,
    };
  }, [simSellingPrice, simHpp, simFeeRate, simTargetRoas]);

  return (
    <div className="space-y-6 pb-6">
      {/* Header & Submenu Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Harga & Profitabilitas Retail
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kalkulator harga jual ideal, aturan biaya marketplace, dan simulasi batas aman iklan
            </p>
          </div>

          {/* Submenu Segmented Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabSwitch('calculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'calculator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kalkulator Harga
            </button>
            <button
              onClick={() => handleTabSwitch('fees')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'fees'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Biaya Marketplace ({dbState.costRules.length})
            </button>
            <button
              onClick={() => handleTabSwitch('ads_sim')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'ads_sim'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Simulasi Iklan
            </button>
          </div>
        </div>
      </div>

      {/* --- SUBTAB 1: KALKULATOR HARGA --- */}
      {currentSubTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Parameter Perhitungan</h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih Produk (SKU)</label>
                <select
                  value={calcSku}
                  onChange={(e) => {
                    setCalcSku(e.target.value);
                    setUseCustomHpp(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {dbState.skus.map((s) => (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} - {s.sku_name} (HPP: {formatIDR(s.hpp)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Marketplace</label>
                  <select
                    value={calcMarketplace}
                    onChange={(e) => setCalcMarketplace(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                  >
                    {dbState.marketplaces.map((m) => (
                      <option key={m.marketplace_id} value={m.marketplace_id}>
                        {m.marketplace_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit Bisnis</label>
                  <select
                    value={calcUnit}
                    onChange={(e) => setCalcUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                  >
                    {dbState.units.map((u) => (
                      <option key={u.unit_id} value={u.unit_id}>
                        {u.unit_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700">Target Margin Bersih</label>
                  <span className="font-bold text-blue-700">{formatPercent(calcTargetMargin)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.01"
                  value={calcTargetMargin}
                  onChange={(e) => setCalcTargetMargin(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>5% (Tipis)</span>
                  <span>15% (Sehat)</span>
                  <span>40% (Tinggi)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700">Target Budget Iklan</label>
                  <span className="font-bold text-slate-800">{formatPercent(calcAdsTargetRate)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.15"
                  step="0.005"
                  value={calcAdsTargetRate}
                  onChange={(e) => setCalcAdsTargetRate(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>1%</span>
                  <span>5% (Standar)</span>
                  <span>15% (Agresif)</span>
                </div>
              </div>

              {/* Toggle Optional Programs */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calcIncludeOptionalPrograms}
                    onChange={(e) => setCalcIncludeOptionalPrograms(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block text-[11px]">
                      Sertakan Program Opsional Marketplace
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Hitung Gratis Ongkir XTRA, Cashback, & biaya program ke dalam harga rekomendasi.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-slate-700">Gunakan HPP Kustom</label>
                  <input
                    type="checkbox"
                    checked={useCustomHpp}
                    onChange={(e) => setUseCustomHpp(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                {useCustomHpp && (
                  <div className="mt-2">
                    <input
                      type="number"
                      placeholder="Masukkan HPP (Rp)"
                      value={calcCustomHpp}
                      onChange={(e) => setCalcCustomHpp(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center & Right: Calculation Results */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Hasil Rekomendasi Harga Retail Ideal
                </span>
                <div className="flex items-baseline space-x-3 mt-1">
                  <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
                    {formatIDR(calcResult.recommendedPrice)}
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    Margin Bersih Target: {formatPercent(calcResult.netMargin)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                  Biaya Efektif Marketplace
                </span>
                <span className="text-base font-bold text-amber-700 font-mono">
                  {formatPercent(calcResult.effectiveFeeRate)} ({formatIDR(calcResult.totalFeeAmount)})
                </span>
              </div>
            </div>

            {/* Financial Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Biaya Modal (HPP)</span>
                <span className="font-bold text-slate-900 mt-1 block font-mono">{formatIDR(effectiveHpp)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {calcResult.recommendedPrice > 0
                    ? formatPercent(effectiveHpp / calcResult.recommendedPrice)
                    : '-'} dari harga
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <span className="text-amber-700 block text-[11px] font-medium">Potongan Marketplace</span>
                <span className="font-bold text-amber-900 mt-1 block font-mono">
                  {formatIDR(calcResult.totalFeeAmount)}
                </span>
                <span className="text-[10px] text-amber-600 block mt-0.5">
                  Tarif Efektif {formatPercent(calcResult.effectiveFeeRate)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                <span className="text-indigo-700 block text-[11px] font-medium">Batas Budget Iklan</span>
                <span className="font-bold text-indigo-900 mt-1 block font-mono">{formatIDR(calcResult.adsBudget)}</span>
                <span className="text-[10px] text-indigo-600 block mt-0.5">
                  Target ROAS ~{(1 / (calcAdsTargetRate || 0.05)).toFixed(1)}x
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-emerald-700 block text-[11px] font-medium">Laba Bersih Estimasi</span>
                <span className="font-bold text-emerald-800 mt-1 block font-mono">{formatIDR(calcResult.netProfit)}</span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  Margin {formatPercent(calcResult.netMargin)}
                </span>
              </div>
            </div>

            {/* Rincian Lengkap Potongan Biaya Marketplace (Dinamis dari Cost Rule Engine) */}
            <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900">
                    Rincian Potongan Biaya Marketplace (Aturan Dinamis)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {calcResult.feeResult.fees.length} Komponen Aktif
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Target: <strong className="text-slate-800">{activeSkuObj?.sku}</strong> (Kategori: {dbState.categories.find(c => c.category_id === activeSkuObj?.category_id)?.category_name || activeSkuObj?.category_id})
                </div>
              </div>

              {/* Warning if no rules configured */}
              {!calcResult.hasConfiguredFees && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold">Biaya Belum Diatur untuk Marketplace Ini!</span>
                  </div>
                  <p className="text-slate-600">
                    {calcResult.warning || 'Belum ada aturan biaya yang terdaftar untuk kombinasi marketplace, kategori, dan produk ini. Sistem tidak mengasumsikan 0% secara otomatis.'}
                  </p>
                  <button
                    onClick={() => handleTabSwitch('fees')}
                    className="inline-flex items-center space-x-1.5 font-semibold text-blue-600 hover:text-blue-700 mt-1"
                  >
                    <span>Buka Menu Biaya Marketplace untuk menambah aturan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick Summary Pill by Canonical Types */}
              {calcResult.hasConfiguredFees && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-medium">Biaya Admin</span>
                    <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                      {formatIDR(calcResult.breakdown.adminFee)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-medium">Biaya Layanan</span>
                    <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                      {formatIDR(calcResult.breakdown.serviceFee)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-medium">Biaya Transaksi / Pembayaran</span>
                    <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                      {formatIDR(calcResult.breakdown.paymentFee)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-medium">Gratis Ongkir Xtra</span>
                    <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                      {formatIDR(calcResult.breakdown.freeShippingFee)}
                    </span>
                  </div>
                </div>
              )}

              {/* Granular Rule-by-Rule Itemized List */}
              {calcResult.feeResult.fees.length > 0 && (
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Tingkat Prioritas</th>
                        <th className="py-2.5 px-3">Komponen Biaya</th>
                        <th className="py-2.5 px-3">Ketentuan / Formula</th>
                        <th className="py-2.5 px-3 text-right">Potongan (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calcResult.feeResult.fees.map((fee, idx) => {
                        const badge = getTierBadge(fee.priorityTier);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                              <span className="ml-1 text-[10px] font-mono text-slate-400">
                                (P:{fee.specificityScore})
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{fee.costName}</div>
                              {fee.program && (
                                <div className="text-[10px] text-blue-600 font-medium">
                                  Program: {fee.program}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">
                              {fee.rate > 0 ? formatPercent(fee.rate) : ''}
                              {fee.rate > 0 && fee.fixedAmount > 0 ? ' + ' : ''}
                              {fee.fixedAmount > 0 ? formatIDR(fee.fixedAmount) : ''}
                              {fee.matchedRule?.maximum_fee
                                ? ` (Maks. ${formatIDR(fee.matchedRule.maximum_fee)})`
                                : ''}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-900 font-mono">
                              {formatIDR(fee.feeAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Safety Indicators */}
            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-blue-900 font-medium">
                  Break-Even ROAS: <span className="font-bold">{calcResult.beRoas.toFixed(2)}x</span>
                </span>
              </div>
              <span className="text-blue-700 text-[11px]">
                Iklan tetap menghasilkan keuntungan selama efisiensi ROAS di atas {calcResult.beRoas.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: BIAYA MARKETPLACE (COST RULE HIERARCHY) --- */}
      {currentSubTab === 'fees' && (
        <CostRuleHierarchySection dbState={dbState} />
      )}

      {/* --- SUBTAB 3: SIMULASI IKLAN --- */}
      {currentSubTab === 'ads_sim' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Simulasi Efisiensi Iklan</h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  step="500"
                  value={simSellingPrice}
                  onChange={(e) => setSimSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Biaya Modal (HPP)</label>
                <input
                  type="number"
                  step="500"
                  value={simHpp}
                  onChange={(e) => setSimHpp(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700">Potongan Marketplace</label>
                  <span className="font-bold text-slate-900">{formatPercent(simFeeRate)}</span>
                </div>
                <input
                  type="range"
                  min="0.04"
                  max="0.15"
                  step="0.005"
                  value={simFeeRate}
                  onChange={(e) => setSimFeeRate(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700">Target ROAS Iklan</label>
                  <span className="font-bold text-blue-700">{simTargetRoas.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.2"
                  value={simTargetRoas}
                  onChange={(e) => setSimTargetRoas(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">Status Kelayakan Iklan</div>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    simResult.status === 'SAFE'
                      ? 'text-emerald-600'
                      : simResult.status === 'WARNING'
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {simResult.status === 'SAFE'
                    ? 'Aman untuk Diklankan'
                    : simResult.status === 'WARNING'
                    ? 'Perhatian: Margin Tipis'
                    : 'Rugi: Iklan Melebihi Batas'}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Break-Even ROAS</span>
                <span className="text-xl font-black text-slate-900">
                  {simResult.beRoas.toFixed(2)}x
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Beban Iklan per Produk</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  {formatIDR(simResult.adsSpend)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">CIR (Cost of Income)</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  {formatPercent(simResult.cir)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Laba Bersih Akhir</span>
                <span
                  className={`font-bold mt-1 block ${
                    simResult.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatIDR(simResult.netProfit)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Margin Bersih Akhir</span>
                <span
                  className={`font-bold mt-1 block ${
                    simResult.netMargin >= 0.08 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {formatPercent(simResult.netMargin)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <p>
                <strong>Panduan Operasional Retail:</strong> Jika ROAS kampanye berada di bawah{' '}
                <strong>{simResult.beRoas.toFixed(2)}x</strong>, setiap pesanan dari iklan akan menghasilkan kerugian.
                Tingkatkan harga jual atau sesuaikan HPP untuk memberi ruang margin iklan yang lebih aman.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
