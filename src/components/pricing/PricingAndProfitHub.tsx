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
} from 'lucide-react';
import {
  DatabaseState,
  CostRuleRecord,
  CalculationType,
} from '../../types/database';
import { storageService } from '../../services/storageService';
import { formatIDR, formatPercent } from '../../utils/validation';
import { getApplicableMarketplaceFees } from '../../utils/financialEngine';

export type PricingSubTab = 'calculator' | 'fees' | 'ads_sim';

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

  // Active SKU object
  const activeSkuObj = useMemo(() => {
    return dbState.skus.find((s) => s.sku === calcSku);
  }, [dbState.skus, calcSku]);

  const effectiveHpp = useCustomHpp ? calcCustomHpp : activeSkuObj?.hpp || 25000;

  // Real calculation for calculator
  const calcResult = useMemo(() => {
    // Estimasi biaya platform ~8.5%
    const estFeeRate = 0.085;
    const estAdsRate = 0.05; // 5% ads target

    // Target Selling Price formula: Price = HPP / (1 - FeeRate - AdsRate - TargetMargin)
    const divisor = 1 - estFeeRate - estAdsRate - calcTargetMargin;
    const recommendedPrice = divisor > 0 ? Math.round(effectiveHpp / divisor / 500) * 500 : effectiveHpp * 1.5;

    // Platform Fee Breakdown using real rules
    const feeResult = getApplicableMarketplaceFees(
      recommendedPrice,
      calcMarketplace,
      activeSkuObj?.category_id || '',
      activeSkuObj?.brand_id || '',
      activeSkuObj?.spu_id || '',
      calcSku,
      calcUnit,
      dbState.costRules
    );

    const totalFeeAmount = feeResult.totalFeeAmount;
    const grossProfit = recommendedPrice - effectiveHpp;
    const profitBeforeAds = grossProfit - totalFeeAmount;
    const adsBudget = Math.round(recommendedPrice * estAdsRate);
    const netProfit = profitBeforeAds - adsBudget;
    const netMargin = recommendedPrice > 0 ? netProfit / recommendedPrice : 0;
    const beRoas = profitBeforeAds > 0 ? recommendedPrice / profitBeforeAds : 0;

    return {
      recommendedPrice,
      fees: feeResult.fees,
      totalFeeAmount,
      grossProfit,
      profitBeforeAds,
      adsBudget,
      netProfit,
      netMargin,
      beRoas,
    };
  }, [effectiveHpp, calcTargetMargin, calcMarketplace, activeSkuObj, calcSku, calcUnit, dbState.costRules]);

  // --- TAB 2: BIAYA MARKETPLACE (COST RULES) STATE ---
  const [selectedFeeMkt, setSelectedFeeMkt] = useState<string>('ALL');
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<CostRuleRecord | null>(null);

  // Fee Form
  const [formMktId, setFormMktId] = useState('MKT-SHOPEE');
  const [formCostName, setFormCostName] = useState('Biaya Admin');
  const [formCostGroup, setFormCostGroup] = useState('PLATFORM_FEE');
  const [formCalcType, setFormCalcType] = useState<CalculationType>('PERCENTAGE_MAX');
  const [formRate, setFormRate] = useState(0.065);
  const [formFixedAmount, setFormFixedAmount] = useState(0);
  const [formMaxFee, setFormMaxFee] = useState(10000);
  const [formMinFee, setFormMinFee] = useState(0);

  const openAddFee = () => {
    setEditingFee(null);
    setFormMktId('MKT-SHOPEE');
    setFormCostName('Biaya Layanan');
    setFormCostGroup('PLATFORM_FEE');
    setFormCalcType('PERCENTAGE');
    setFormRate(0.04);
    setFormFixedAmount(0);
    setFormMaxFee(0);
    setFormMinFee(0);
    setIsFeeModalOpen(true);
  };

  const openEditFee = (rule: CostRuleRecord) => {
    setEditingFee(rule);
    setFormMktId(rule.marketplace_id);
    setFormCostName(rule.cost_name);
    setFormCostGroup(rule.cost_group);
    setFormCalcType(rule.calculation_type);
    setFormRate(rule.rate);
    setFormFixedAmount(rule.fixed_amount);
    setFormMaxFee(rule.maximum_fee || 0);
    setFormMinFee(rule.minimum_fee || 0);
    setIsFeeModalOpen(true);
  };

  const handleSaveFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFee) {
      storageService.updateCostRule(editingFee.rule_id, {
        marketplace_id: formMktId,
        cost_name: formCostName,
        cost_group: formCostGroup,
        calculation_type: formCalcType,
        rate: formRate,
        fixed_amount: formFixedAmount,
        maximum_fee: formMaxFee > 0 ? formMaxFee : null,
        minimum_fee: formMinFee > 0 ? formMinFee : null,
      });
    } else {
      storageService.addCostRule({
        marketplace_id: formMktId,
        cost_name: formCostName,
        cost_group: formCostGroup,
        mandatory: true,
        calculation_type: formCalcType,
        calculation_base: 'SELLING_PRICE',
        rate: formRate,
        fixed_amount: formFixedAmount,
        maximum_fee: formMaxFee > 0 ? formMaxFee : null,
        minimum_fee: formMinFee > 0 ? formMinFee : null,
        program: null,
        effective_from: '2026-01-01',
        priority: 50,
        active: true,
        updated_by: 'Admin',
      });
    }
    setIsFeeModalOpen(false);
  };

  const handleDeleteFee = (rule: CostRuleRecord) => {
    if (confirm(`Hapus aturan biaya "${rule.cost_name}"?`)) {
      storageService.deleteCostRule(rule.rule_id);
    }
  };

  const filteredCostRules = useMemo(() => {
    return dbState.costRules.filter((r) => {
      if (selectedFeeMkt !== 'ALL' && r.marketplace_id !== selectedFeeMkt) {
        return false;
      }
      return true;
    });
  }, [dbState.costRules, selectedFeeMkt]);

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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="MKT-SHOPEE">Shopee</option>
                    <option value="MKT-TOKOPEDIA">Tokopedia</option>
                    <option value="MKT-TIKTOK">TikTok Shop</option>
                    <option value="MKT-LAZADA">Lazada</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit Bisnis</label>
                  <select
                    value={calcUnit}
                    onChange={(e) => setCalcUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="U001">Kanbai</option>
                    <option value="U002">Nutribite</option>
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
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>5% (Tipis)</span>
                  <span>15% (Sehat)</span>
                  <span>40% (Tinggi)</span>
                </div>
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
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Hasil Rekomendasi Harga
              </span>
              <div className="flex items-baseline space-x-3 mt-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
                  {formatIDR(calcResult.recommendedPrice)}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Perkiraan harga jual retail ideal
                </div>
              </div>
            </div>

            {/* Financial Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Biaya Modal (HPP)</span>
                <span className="font-bold text-slate-900 mt-1 block">{formatIDR(effectiveHpp)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Potongan Marketplace</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  {formatIDR(calcResult.totalFeeAmount)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Batas Budget Iklan</span>
                <span className="font-bold text-slate-900 mt-1 block">{formatIDR(calcResult.adsBudget)}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-emerald-700 block text-[11px] font-medium">Laba Bersih Estimasi</span>
                <span className="font-bold text-emerald-800 mt-1 block">{formatIDR(calcResult.netProfit)}</span>
              </div>
            </div>

            {/* Detail Biaya Marketplace */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <div className="text-xs font-bold text-slate-900 mb-2">
                Rincian Potongan Biaya Marketplace Terkait
              </div>
              {calcResult.fees.length > 0 ? (
                calcResult.fees.map((fee, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0">
                    <span>{fee.costName}</span>
                    <span className="font-semibold text-slate-900">{formatIDR(fee.feeAmount)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-xs text-slate-600 py-1">
                  <span>Biaya Layanan Standar (~8.5%)</span>
                  <span className="font-semibold text-slate-900">{formatIDR(calcResult.totalFeeAmount)}</span>
                </div>
              )}
            </div>

            {/* Safety Indicators */}
            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="text-blue-900 font-medium">
                  Break-Even ROAS: <span className="font-bold">{calcResult.beRoas.toFixed(2)}x</span>
                </span>
              </div>
              <span className="text-blue-700 text-[11px]">
                Iklan tetap untung selama ROAS di atas {calcResult.beRoas.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: BIAYA MARKETPLACE (COST RULES) --- */}
      {currentSubTab === 'fees' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-700">Filter Marketplace:</span>
              <select
                value={selectedFeeMkt}
                onChange={(e) => setSelectedFeeMkt(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
              >
                <option value="ALL">Semua Marketplace</option>
                <option value="MKT-SHOPEE">Shopee</option>
                <option value="MKT-TOKOPEDIA">Tokopedia</option>
                <option value="MKT-TIKTOK">TikTok Shop</option>
                <option value="MKT-LAZADA">Lazada</option>
              </select>
            </div>

            <button
              onClick={openAddFee}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Aturan Biaya</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Potongan Biaya</th>
                    <th className="py-3 px-4">Marketplace</th>
                    <th className="py-3 px-4">Kategori Biaya</th>
                    <th className="py-3 px-4">Tarif Persentase</th>
                    <th className="py-3 px-4">Batas Maksimal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCostRules.map((rule) => {
                    const mktName = dbState.marketplaces.find((m) => m.marketplace_id === rule.marketplace_id)?.marketplace_name || rule.marketplace_id;
                    const groupLabel =
                      rule.cost_group === 'PLATFORM_FEE'
                        ? 'Biaya Admin'
                        : rule.cost_group === 'SHIPPING_FEE'
                        ? 'Gratis Ongkir'
                        : rule.cost_group === 'CAMPAIGN'
                        ? 'Promo Campaign'
                        : 'Lainnya';

                    return (
                      <tr key={rule.rule_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{rule.cost_name}</div>
                          {rule.program && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Program: {rule.program}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{mktName}</td>
                        <td className="py-3 px-4 text-slate-600">{groupLabel}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formatPercent(rule.rate)}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {rule.maximum_fee ? formatIDR(rule.maximum_fee) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              rule.active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {rule.active ? 'Aktif' : 'Non-aktif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditFee(rule)}
                            className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                            title="Edit Aturan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFee(rule)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Hapus Aturan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal: Tambah/Edit Aturan Biaya */}
      {isFeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingFee ? 'Edit Aturan Biaya' : 'Tambah Aturan Biaya Marketplace'}
              </h3>
              <button onClick={() => setIsFeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFee} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Potongan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Biaya Admin Gratis Ongkir"
                  value={formCostName}
                  onChange={(e) => setFormCostName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Marketplace</label>
                  <select
                    value={formMktId}
                    onChange={(e) => setFormMktId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="MKT-SHOPEE">Shopee</option>
                    <option value="MKT-TOKOPEDIA">Tokopedia</option>
                    <option value="MKT-TIKTOK">TikTok Shop</option>
                    <option value="MKT-LAZADA">Lazada</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori Biaya</label>
                  <select
                    value={formCostGroup}
                    onChange={(e) => setFormCostGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="PLATFORM_FEE">Biaya Admin</option>
                    <option value="SHIPPING_FEE">Gratis Ongkir</option>
                    <option value="CAMPAIGN">Promo Campaign</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tarif Persentase (0 - 1)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    required
                    value={formRate}
                    onChange={(e) => setFormRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatPercent(formRate)}
                  </span>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Batas Maksimal Potongan</label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={formMaxFee}
                    onChange={(e) => setFormMaxFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsFeeModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan Aturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
