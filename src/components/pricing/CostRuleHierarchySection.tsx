import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Tag,
  Package,
  Store,
  Building2,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  DatabaseState,
  CostRuleRecord,
  CalculationType,
  CalculationBase,
} from '../../types/database';
import { storageService } from '../../services/storageService';
import { formatIDR, formatPercent } from '../../utils/validation';
import {
  PriorityTier,
  PRIORITY_WEIGHTS,
  evaluateRulePriority,
  calculateDynamicCostRules,
  getCanonicalCostType,
} from '../../utils/costRules';

interface CostRuleHierarchySectionProps {
  dbState: DatabaseState;
}

export const CostRuleHierarchySection: React.FC<CostRuleHierarchySectionProps> = ({
  dbState,
}) => {
  // Filter States
  const [selectedHierarchy, setSelectedHierarchy] = useState<string>('ALL');
  const [selectedMkt, setSelectedMkt] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showTester, setShowTester] = useState<boolean>(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CostRuleRecord | null>(null);

  // Form States
  const [formHierarchyScope, setFormHierarchyScope] = useState<PriorityTier>('CATEGORY');
  const [formMktId, setFormMktId] = useState<string>('MKT-SHOPEE');
  const [formUnitId, setFormUnitId] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<string>(dbState.categories[0]?.category_id || '');
  const [formBrandId, setFormBrandId] = useState<string>(dbState.brands[0]?.brand_id || '');
  const [formSpuId, setFormSpuId] = useState<string>(dbState.spus[0]?.spu_id || '');
  const [formSku, setFormSku] = useState<string>(dbState.skus[0]?.sku || '');
  const [formCostName, setFormCostName] = useState<string>('Biaya Administrasi');
  const [formCostGroup, setFormCostGroup] = useState<string>('PLATFORM_FEE');
  const [formMandatory, setFormMandatory] = useState<boolean>(true);
  const [formProgram, setFormProgram] = useState<string>('');
  const [formCalcType, setFormCalcType] = useState<CalculationType>('PERCENTAGE');
  const [formCalcBase, setFormCalcBase] = useState<CalculationBase>('SELLING_PRICE');
  const [formRate, setFormRate] = useState<number>(0.065);
  const [formFixedAmount, setFormFixedAmount] = useState<number>(0);
  const [formMaxFee, setFormMaxFee] = useState<number>(0);
  const [formMinFee, setFormMinFee] = useState<number>(0);
  const [formEffectiveFrom, setFormEffectiveFrom] = useState<string>('2026-01-01');
  const [formEffectiveTo, setFormEffectiveTo] = useState<string>('');
  const [formPriority, setFormPriority] = useState<number>(300);
  const [formActive, setFormActive] = useState<boolean>(true);

  // Inspector / Tester States
  const [testSku, setTestSku] = useState<string>(dbState.skus[0]?.sku || '');
  const [testMkt, setTestMkt] = useState<string>('MKT-SHOPEE');
  const [testPrice, setTestPrice] = useState<number>(100000);
  const [testIncludeOptional, setTestIncludeOptional] = useState<boolean>(true);

  // Evaluated rule list with hierarchy priority
  const enrichedRules = useMemo(() => {
    return dbState.costRules.map((r) => {
      const priorityInfo = evaluateRulePriority(r);
      const mktName =
        dbState.marketplaces.find((m) => m.marketplace_id === r.marketplace_id)?.marketplace_name ||
        (r.marketplace_id === 'ALL' ? 'Semua Marketplace' : r.marketplace_id);
      const catName = dbState.categories.find((c) => c.category_id === r.category_id)?.category_name;
      const brandName = dbState.brands.find((b) => b.brand_id === r.brand_id)?.brand_name;
      const spuName = dbState.spus.find((s) => s.spu_id === r.spu_id)?.spu_name;
      const skuObj = dbState.skus.find((s) => s.sku === r.sku);
      const unitName = dbState.units.find((u) => u.unit_id === r.unit_id)?.unit_name;

      return {
        ...r,
        priorityInfo,
        mktName,
        catName,
        brandName,
        spuName,
        skuObj,
        unitName,
      };
    });
  }, [dbState]);

  // Hierarchy Tier Counts
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: enrichedRules.length,
      SKU: 0,
      SPU: 0,
      BRAND: 0,
      CATEGORY: 0,
      UNIT: 0,
      MARKETPLACE: 0,
      DEFAULT: 0,
    };
    enrichedRules.forEach((r) => {
      counts[r.priorityInfo.tier] = (counts[r.priorityInfo.tier] || 0) + 1;
    });
    return counts;
  }, [enrichedRules]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return enrichedRules.filter((r) => {
      // Filter by Marketplace
      if (selectedMkt !== 'ALL' && r.marketplace_id !== 'ALL' && r.marketplace_id !== selectedMkt) {
        return false;
      }
      // Filter by Hierarchy
      if (selectedHierarchy !== 'ALL' && r.priorityInfo.tier !== selectedHierarchy) {
        return false;
      }
      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.cost_name.toLowerCase().includes(q);
        const matchSku = r.sku ? r.sku.toLowerCase().includes(q) : false;
        const matchCat = r.catName ? r.catName.toLowerCase().includes(q) : false;
        const matchBrand = r.brandName ? r.brandName.toLowerCase().includes(q) : false;
        const matchSpu = r.spuName ? r.spuName.toLowerCase().includes(q) : false;
        const matchProgram = r.program ? r.program.toLowerCase().includes(q) : false;
        return matchName || matchSku || matchCat || matchBrand || matchSpu || matchProgram;
      }
      return true;
    });
  }, [enrichedRules, selectedMkt, selectedHierarchy, searchQuery]);

  // Tester Evaluation
  const testSelectedSkuObj = useMemo(() => {
    return dbState.skus.find((s) => s.sku === testSku);
  }, [dbState.skus, testSku]);

  const testEvaluationResult = useMemo(() => {
    if (!testSelectedSkuObj) return null;
    const activePrograms = testIncludeOptional
      ? ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL']
      : ['ALL_MANDATORY'];

    return calculateDynamicCostRules(
      {
        sellingPrice: testPrice,
        marketplaceId: testMkt,
        categoryId: testSelectedSkuObj.category_id,
        brandId: testSelectedSkuObj.brand_id,
        spuId: testSelectedSkuObj.spu_id,
        sku: testSelectedSkuObj.sku,
        unitId: 'U001',
        activePrograms,
      },
      dbState.costRules
    );
  }, [testSelectedSkuObj, testPrice, testMkt, testIncludeOptional, dbState.costRules]);

  // Open Add Rule
  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormHierarchyScope('CATEGORY');
    setFormMktId('MKT-SHOPEE');
    setFormUnitId('');
    setFormCategoryId(dbState.categories[0]?.category_id || '');
    setFormBrandId(dbState.brands[0]?.brand_id || '');
    setFormSpuId(dbState.spus[0]?.spu_id || '');
    setFormSku(dbState.skus[0]?.sku || '');
    setFormCostName('Biaya Administrasi Kategori');
    setFormCostGroup('PLATFORM_FEE');
    setFormMandatory(true);
    setFormProgram('');
    setFormCalcType('PERCENTAGE');
    setFormCalcBase('SELLING_PRICE');
    setFormRate(0.065);
    setFormFixedAmount(0);
    setFormMaxFee(0);
    setFormMinFee(0);
    setFormEffectiveFrom('2026-01-01');
    setFormEffectiveTo('');
    setFormPriority(PRIORITY_WEIGHTS.CATEGORY);
    setFormActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Rule
  const handleOpenEdit = (rule: CostRuleRecord) => {
    setEditingRule(rule);
    const priorityInfo = evaluateRulePriority(rule);
    setFormHierarchyScope(priorityInfo.tier);
    setFormMktId(rule.marketplace_id);
    setFormUnitId(rule.unit_id || '');
    setFormCategoryId(rule.category_id || '');
    setFormBrandId(rule.brand_id || '');
    setFormSpuId(rule.spu_id || '');
    setFormSku(rule.sku || '');
    setFormCostName(rule.cost_name);
    setFormCostGroup(rule.cost_group);
    setFormMandatory(rule.mandatory);
    setFormProgram(rule.program || '');
    setFormCalcType(rule.calculation_type);
    setFormCalcBase(rule.calculation_base);
    setFormRate(rule.rate);
    setFormFixedAmount(rule.fixed_amount);
    setFormMaxFee(rule.maximum_fee || 0);
    setFormMinFee(rule.minimum_fee || 0);
    setFormEffectiveFrom(rule.effective_from || '2026-01-01');
    setFormEffectiveTo(rule.effective_to || '');
    setFormPriority(rule.priority || priorityInfo.score);
    setFormActive(rule.active);
    setIsModalOpen(true);
  };

  // Scope change handler adjusts default priority score
  const handleScopeChange = (tier: PriorityTier) => {
    setFormHierarchyScope(tier);
    setFormPriority(PRIORITY_WEIGHTS[tier] || 50);
  };

  // Save Rule
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare target identifiers based on hierarchy scope
    const rulePayload = {
      marketplace_id: formMktId,
      unit_id: formHierarchyScope === 'UNIT' ? formUnitId : null,
      category_id: formHierarchyScope === 'CATEGORY' ? formCategoryId : null,
      brand_id: formHierarchyScope === 'BRAND' ? formBrandId : null,
      spu_id: formHierarchyScope === 'SPU' ? formSpuId : null,
      sku: formHierarchyScope === 'SKU' ? formSku : null,
      cost_name: formCostName.trim(),
      cost_group: formCostGroup,
      mandatory: formMandatory,
      program: formProgram.trim() ? formProgram.trim() : null,
      calculation_type: formCalcType,
      calculation_base: formCalcBase,
      rate: formRate,
      fixed_amount: formFixedAmount,
      maximum_fee: formMaxFee > 0 ? formMaxFee : null,
      minimum_fee: formMinFee > 0 ? formMinFee : null,
      effective_from: formEffectiveFrom || '2026-01-01',
      effective_to: formEffectiveTo ? formEffectiveTo : null,
      priority: formPriority,
      active: formActive,
      updated_by: 'Admin',
    };

    if (editingRule) {
      storageService.updateCostRule(editingRule.rule_id, rulePayload);
    } else {
      storageService.addCostRule(rulePayload);
    }

    setIsModalOpen(false);
  };

  // Delete Rule
  const handleDeleteRule = (rule: CostRuleRecord) => {
    if (confirm(`Hapus aturan biaya "${rule.cost_name}" (${rule.rule_id})?`)) {
      storageService.deleteCostRule(rule.rule_id);
    }
  };

  // Helper for tier badge color
  const getTierBadge = (tier: PriorityTier, score: number) => {
    switch (tier) {
      case 'SKU':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Level 6: SKU',
          scoreLabel: `P: ${score}`,
        };
      case 'SPU':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Level 5: SPU',
          scoreLabel: `P: ${score}`,
        };
      case 'BRAND':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Level 4: Brand',
          scoreLabel: `P: ${score}`,
        };
      case 'CATEGORY':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Level 3: Kategori',
          scoreLabel: `P: ${score}`,
        };
      case 'UNIT':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Level 2: Unit',
          scoreLabel: `P: ${score}`,
        };
      case 'MARKETPLACE':
      case 'DEFAULT':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Level 1: Umum',
          scoreLabel: `P: ${score}`,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">
              Aturan Biaya Marketplace (Cost Rule Engine)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              Hierarki 6 Tingkat
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Kelola potongan biaya marketplace dinamis berdasarkan urutan prioritas:
            <span className="font-semibold text-slate-700 ml-1">
              SKU &gt; SPU &gt; Brand &gt; Kategori &gt; Unit &gt; Marketplace Umum
            </span>
            . Aturan yang lebih spesifik otomatis meng-override aturan umum.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowTester(!showTester)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
              showTester
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{showTester ? 'Tutup Penguji' : 'Uji Resolusi Hierarki'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Aturan Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Hierarchy Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setSelectedHierarchy('SKU')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedHierarchy === 'SKU'
              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-100'
              : 'bg-white border-slate-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-purple-700">SKU (Level 6)</span>
            <span className="text-[10px] font-mono text-purple-500 font-semibold">P: 600</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{tierCounts.SKU || 0}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Override Tertinggi</p>
        </div>

        <div
          onClick={() => setSelectedHierarchy('SPU')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedHierarchy === 'SPU'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-100'
              : 'bg-white border-slate-200 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-indigo-700">SPU (Level 5)</span>
            <span className="text-[10px] font-mono text-indigo-500 font-semibold">P: 500</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{tierCounts.SPU || 0}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Model Produk</p>
        </div>

        <div
          onClick={() => setSelectedHierarchy('BRAND')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedHierarchy === 'BRAND'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100'
              : 'bg-white border-slate-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-blue-700">Brand (Level 4)</span>
            <span className="text-[10px] font-mono text-blue-500 font-semibold">P: 400</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{tierCounts.BRAND || 0}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Spesifik Merek</p>
        </div>

        <div
          onClick={() => setSelectedHierarchy('CATEGORY')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedHierarchy === 'CATEGORY'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-100'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-emerald-700">Kategori (Level 3)</span>
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">P: 300</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{tierCounts.CATEGORY || 0}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Tarif Komisi Kategori</p>
        </div>

        <div
          onClick={() => setSelectedHierarchy('UNIT')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedHierarchy === 'UNIT'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-100'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-amber-700">Unit (Level 2)</span>
            <span className="text-[10px] font-mono text-amber-500 font-semibold">P: 200</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{tierCounts.UNIT || 0}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Kanbai / Nutribite</p>
        </div>

        <div
          onClick={() => setSelectedHierarchy('MARKETPLACE')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedHierarchy === 'MARKETPLACE'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-700">Umum (Level 1)</span>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">P: 100</span>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {(tierCounts.MARKETPLACE || 0) + (tierCounts.DEFAULT || 0)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Tarif Dasar / Default</p>
        </div>
      </div>

      {/* --- INTERACTIVE HIERARCHY INSPECTOR / TESTER --- */}
      {showTester && (
        <div className="bg-gradient-to-br from-blue-50/60 via-white to-slate-50 rounded-2xl border border-blue-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Penguji Resolusi Hierarki Biaya (Live Inspector)
              </h3>
            </div>
            <span className="text-[11px] text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md font-medium">
              Verifikasi Aturan Pemenang Secara Real-time
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Pilih SKU Produk:</label>
              <select
                value={testSku}
                onChange={(e) => setTestSku(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
              >
                {dbState.skus.map((s) => (
                  <option key={s.sku} value={s.sku}>
                    {s.sku} - {s.sku_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Pilih Marketplace:</label>
              <select
                value={testMkt}
                onChange={(e) => setTestMkt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
              >
                <option value="MKT-SHOPEE">Shopee</option>
                <option value="MKT-TOKOPEDIA">Tokopedia</option>
                <option value="MKT-TIKTOK">TikTok Shop</option>
                <option value="MKT-LAZADA">Lazada</option>
                <option value="MKT-BLIBLI">Blibli</option>
                <option value="MKT-CASH">Penjualan Langsung (Cash / 0%)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Harga Jual Simulasi (Rp):</label>
              <input
                type="number"
                step="1000"
                value={testPrice}
                onChange={(e) => setTestPrice(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-900"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center space-x-2 text-slate-700 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testIncludeOptional}
                  onChange={(e) => setTestIncludeOptional(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs">Sertakan Program Opsional (Gratis Ongkir Xtra)</span>
              </label>
            </div>
          </div>

          {/* Test Result Display */}
          {testEvaluationResult && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600">Hasil Evaluasi SKU:</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {testSelectedSkuObj?.sku} ({testSelectedSkuObj?.sku_name})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Kategori:{' '}
                    {dbState.categories.find((c) => c.category_id === testSelectedSkuObj?.category_id)
                      ?.category_name || testSelectedSkuObj?.category_id}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <div>
                    <span className="text-slate-500">Total Potongan: </span>
                    <span className="font-bold text-amber-700">
                      {formatIDR(testEvaluationResult.totalFeeAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tarif Efektif: </span>
                    <span className="font-bold text-blue-700">
                      {formatPercent(testEvaluationResult.effectiveFeeRate)}
                    </span>
                  </div>
                </div>
              </div>

              {testEvaluationResult.warning && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Peringatan Sistem:</strong> {testEvaluationResult.warning}. Mohon buat
                    aturan biaya untuk kategori atau marketplace ini.
                  </span>
                </div>
              )}

              {/* Breakdown of applied winning rules */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Tingkat Hirarki Pemenang</th>
                      <th className="py-2 px-3">Komponen Biaya</th>
                      <th className="py-2 px-3">Tarif / Ketentuan</th>
                      <th className="py-2 px-3 text-right">Potongan (Rp)</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {testEvaluationResult.fees.map((fee, idx) => {
                      const badge = getTierBadge(fee.priorityTier, fee.specificityScore);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                            <span className="ml-1.5 text-[10px] font-mono text-slate-400">
                              (Skor: {fee.specificityScore})
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900">{fee.costName}</div>
                            {fee.program && (
                              <div className="text-[10px] text-slate-400">Program: {fee.program}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-mono">
                            {fee.rate > 0 ? formatPercent(fee.rate) : formatIDR(fee.fixedAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-800 font-mono">
                            {formatIDR(fee.feeAmount)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Berlaku (Winning)</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Hierarchy Level Quick Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedHierarchy('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedHierarchy === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Tingkat ({tierCounts.ALL})
            </button>
            <button
              onClick={() => setSelectedHierarchy('SKU')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedHierarchy === 'SKU'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              SKU ({tierCounts.SKU})
            </button>
            <button
              onClick={() => setSelectedHierarchy('SPU')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedHierarchy === 'SPU'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              SPU ({tierCounts.SPU})
            </button>
            <button
              onClick={() => setSelectedHierarchy('BRAND')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedHierarchy === 'BRAND'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Brand ({tierCounts.BRAND})
            </button>
            <button
              onClick={() => setSelectedHierarchy('CATEGORY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedHierarchy === 'CATEGORY'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Kategori ({tierCounts.CATEGORY})
            </button>
            <button
              onClick={() => setSelectedHierarchy('UNIT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedHierarchy === 'UNIT'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Unit ({tierCounts.UNIT})
            </button>
            <button
              onClick={() => setSelectedHierarchy('MARKETPLACE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedHierarchy === 'MARKETPLACE'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Umum ({tierCounts.MARKETPLACE + tierCounts.DEFAULT})
            </button>
          </div>

          {/* Marketplace Selector & Search */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedMkt}
              onChange={(e) => setSelectedMkt(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium"
            >
              <option value="ALL">Semua Marketplace</option>
              <option value="MKT-SHOPEE">Shopee</option>
              <option value="MKT-TOKOPEDIA">Tokopedia</option>
              <option value="MKT-TIKTOK">TikTok Shop</option>
              <option value="MKT-LAZADA">Lazada</option>
              <option value="MKT-BLIBLI">Blibli</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari aturan, SKU, Kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs w-48 sm:w-56"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tingkat Hirarki & Target</th>
                <th className="py-3 px-4">Nama Potongan Biaya</th>
                <th className="py-3 px-4">Marketplace & Unit</th>
                <th className="py-3 px-4">Kategori Biaya</th>
                <th className="py-3 px-4">Tarif / Formula</th>
                <th className="py-3 px-4">Batas Maksimal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <p className="text-sm">Tidak ada aturan biaya yang sesuai dengan filter.</p>
                    <button
                      onClick={handleOpenAdd}
                      className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                    >
                      + Tambah aturan baru untuk tingkat ini
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const badge = getTierBadge(rule.priorityInfo.tier, rule.priorityInfo.score);

                  // Target display label
                  let targetLabel = 'Umum (Seluruh Produk)';
                  if (rule.priorityInfo.tier === 'SKU') {
                    targetLabel = `SKU: ${rule.sku} ${rule.skuObj ? `(${rule.skuObj.sku_name})` : ''}`;
                  } else if (rule.priorityInfo.tier === 'SPU') {
                    targetLabel = `SPU: ${rule.spuName || rule.spu_id}`;
                  } else if (rule.priorityInfo.tier === 'BRAND') {
                    targetLabel = `Brand: ${rule.brandName || rule.brand_id}`;
                  } else if (rule.priorityInfo.tier === 'CATEGORY') {
                    targetLabel = `Kategori: ${rule.catName || rule.category_id}`;
                  } else if (rule.priorityInfo.tier === 'UNIT') {
                    targetLabel = `Unit: ${rule.unitName || rule.unit_id}`;
                  }

                  const groupLabel =
                    rule.cost_group === 'PLATFORM_FEE'
                      ? 'Biaya Admin'
                      : rule.cost_group === 'SERVICE_FEE'
                      ? 'Biaya Layanan'
                      : rule.cost_group === 'PAYMENT_FEE'
                      ? 'Biaya Transaksi'
                      : rule.cost_group === 'SHIPPING_FEE' || rule.cost_group === 'SHIPPING_PROGRAM'
                      ? 'Gratis Ongkir'
                      : rule.cost_group === 'CAMPAIGN'
                      ? 'Promo Campaign'
                      : rule.cost_group === 'TAX'
                      ? 'Pajak'
                      : 'Lainnya';

                  return (
                    <tr key={rule.rule_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Hierarchy Badge and Target */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {badge.scoreLabel}
                          </span>
                        </div>
                        <div className="font-medium text-slate-900 mt-1 max-w-[220px] truncate" title={targetLabel}>
                          {targetLabel}
                        </div>
                      </td>

                      {/* Rule Name & Program */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{rule.cost_name}</div>
                        {rule.program && (
                          <div className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5 font-medium">
                            Program: {rule.program}
                          </div>
                        )}
                        {!rule.mandatory && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">Program Opsional</span>
                        )}
                      </td>

                      {/* Marketplace & Unit */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{rule.mktName}</div>
                        {rule.unitName && (
                          <div className="text-[10px] text-slate-500">Unit: {rule.unitName}</div>
                        )}
                      </td>

                      {/* Cost Group */}
                      <td className="py-3 px-4 text-slate-600">{groupLabel}</td>

                      {/* Rate / Formula */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">
                          {rule.rate > 0 ? formatPercent(rule.rate) : '-'}
                        </div>
                        {rule.fixed_amount > 0 && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            + {formatIDR(rule.fixed_amount)}
                          </div>
                        )}
                      </td>

                      {/* Max Fee */}
                      <td className="py-3 px-4 text-slate-700 font-mono">
                        {rule.maximum_fee ? formatIDR(rule.maximum_fee) : '-'}
                      </td>

                      {/* Active Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            rule.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {rule.active ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit Aturan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Hapus Aturan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: TAMBAH / EDIT ATURAN BIAYA BERTINGKAT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRule ? 'Edit Aturan Biaya' : 'Tambah Aturan Biaya Marketplace'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan cakupan hierarki dan ketentuan potongan biaya marketplace.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              {/* 1. Hierarchy Scope Selector */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900">
                    1. Tingkat Hierarki Aturan (Scope Target)
                  </label>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    Bobot Prioritas: {formPriority}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleScopeChange('DEFAULT')}
                    className={`p-2 rounded-lg text-left border text-[11px] font-semibold transition-all ${
                      formHierarchyScope === 'DEFAULT' || formHierarchyScope === 'MARKETPLACE'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Level 1: Umum
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScopeChange('UNIT')}
                    className={`p-2 rounded-lg text-left border text-[11px] font-semibold transition-all ${
                      formHierarchyScope === 'UNIT'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Level 2: Unit Bisnis
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScopeChange('CATEGORY')}
                    className={`p-2 rounded-lg text-left border text-[11px] font-semibold transition-all ${
                      formHierarchyScope === 'CATEGORY'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Level 3: Kategori
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScopeChange('BRAND')}
                    className={`p-2 rounded-lg text-left border text-[11px] font-semibold transition-all ${
                      formHierarchyScope === 'BRAND'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Level 4: Brand
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScopeChange('SPU')}
                    className={`p-2 rounded-lg text-left border text-[11px] font-semibold transition-all ${
                      formHierarchyScope === 'SPU'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Level 5: SPU
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScopeChange('SKU')}
                    className={`p-2 rounded-lg text-left border text-[11px] font-semibold transition-all ${
                      formHierarchyScope === 'SKU'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Level 6: SKU (Override)
                  </button>
                </div>

                {/* Scope-dependent dropdown */}
                <div className="pt-1">
                  {formHierarchyScope === 'CATEGORY' && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Pilih Kategori Produk:
                      </label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                        required
                      >
                        {dbState.categories.map((c) => (
                          <option key={c.category_id} value={c.category_id}>
                            {c.category_id} - {c.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formHierarchyScope === 'BRAND' && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Pilih Merek / Brand:
                      </label>
                      <select
                        value={formBrandId}
                        onChange={(e) => setFormBrandId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                        required
                      >
                        {dbState.brands.map((b) => (
                          <option key={b.brand_id} value={b.brand_id}>
                            {b.brand_id} - {b.brand_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formHierarchyScope === 'SPU' && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Pilih Model / SPU:
                      </label>
                      <select
                        value={formSpuId}
                        onChange={(e) => setFormSpuId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                        required
                      >
                        {dbState.spus.map((s) => (
                          <option key={s.spu_id} value={s.spu_id}>
                            {s.spu_id} - {s.spu_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formHierarchyScope === 'SKU' && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Pilih SKU Spesifik (Override Tertinggi):
                      </label>
                      <select
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                        required
                      >
                        {dbState.skus.map((s) => (
                          <option key={s.sku} value={s.sku}>
                            {s.sku} - {s.sku_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formHierarchyScope === 'UNIT' && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Pilih Unit Bisnis:
                      </label>
                      <select
                        value={formUnitId}
                        onChange={(e) => setFormUnitId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                        required
                      >
                        <option value="">Semua Unit</option>
                        <option value="U001">Kanbai (Retail)</option>
                        <option value="U002">Nutribite (Direct)</option>
                      </select>
                    </div>
                  )}

                  {(formHierarchyScope === 'DEFAULT' || formHierarchyScope === 'MARKETPLACE') && (
                    <p className="text-[11px] text-slate-500 italic">
                      Aturan ini akan berlaku sebagai tarif default untuk semua produk di marketplace
                      yang dipilih jika tidak ada aturan Kategori, Brand, atau SKU yang lebih spesifik.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. Rule Information */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Marketplace</label>
                  <select
                    value={formMktId}
                    onChange={(e) => setFormMktId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="ALL">Semua Marketplace</option>
                    <option value="MKT-SHOPEE">Shopee</option>
                    <option value="MKT-TOKOPEDIA">Tokopedia</option>
                    <option value="MKT-TIKTOK">TikTok Shop</option>
                    <option value="MKT-LAZADA">Lazada</option>
                    <option value="MKT-BLIBLI">Blibli</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori Potongan</label>
                  <select
                    value={formCostGroup}
                    onChange={(e) => setFormCostGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="PLATFORM_FEE">Biaya Administrasi</option>
                    <option value="SERVICE_FEE">Biaya Layanan</option>
                    <option value="PAYMENT_FEE">Biaya Pembayaran / Transaksi</option>
                    <option value="SHIPPING_PROGRAM">Gratis Ongkir Xtra</option>
                    <option value="CAMPAIGN">Promo Campaign / Flash Sale</option>
                    <option value="TAX">Pajak (PPN/PPh)</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Potongan Biaya</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Biaya Admin Kategori Elektronik Audio"
                  value={formCostName}
                  onChange={(e) => setFormCostName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              {/* Program & Mandatory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Nama Program (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: FREE_SHIPPING, CASHBACK_XTRA"
                    value={formProgram}
                    onChange={(e) => setFormProgram(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formMandatory}
                      onChange={(e) => setFormMandatory(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-medium text-slate-700">Wajib Dipotong (Mandatory)</span>
                  </label>
                </div>
              </div>

              {/* 3. Rates & Calculation Method */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="font-bold text-slate-900">3. Formula & Tarif Potongan</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Metode Kalkulasi</label>
                    <select
                      value={formCalcType}
                      onChange={(e) => setFormCalcType(e.target.value as CalculationType)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="PERCENTAGE">Persentase Murni (%)</option>
                      <option value="FIXED">Biaya Tetap Nominal (Rp)</option>
                      <option value="PERCENTAGE_MAX">Persentase dgn Batas Maksimal</option>
                      <option value="PERCENTAGE_MIN">Persentase dgn Batas Minimal</option>
                      <option value="PERCENTAGE_MIN_MAX">Persentase Batas Min & Maks</option>
                      <option value="FIXED_PERCENTAGE">Biaya Tetap + Persentase</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Dasar Perhitungan</label>
                    <select
                      value={formCalcBase}
                      onChange={(e) => setFormCalcBase(e.target.value as CalculationBase)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="SELLING_PRICE">Nilai Harga Jual</option>
                      <option value="QTY">Jumlah Satuan (Qty)</option>
                      <option value="ORDER">Per Nomor Pesanan</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Tarif (%) (0 - 1)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max="1"
                      value={formRate}
                      onChange={(e) => setFormRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold"
                    />
                    <span className="text-[10px] text-blue-600 block mt-0.5">
                      = {formatPercent(formRate)}
                    </span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Nominal Tetap (Rp)</label>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={formFixedAmount}
                      onChange={(e) => setFormFixedAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Batas Maksimal (Cap Rp)</label>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={formMaxFee}
                      onChange={(e) => setFormMaxFee(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Batas Minimal (Floor Rp)</label>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={formMinFee}
                      onChange={(e) => setFormMinFee(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Dates & Priority */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Berlaku Mulai</label>
                  <input
                    type="date"
                    value={formEffectiveFrom}
                    onChange={(e) => setFormEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Berlaku Sampai (Opsional)</label>
                  <input
                    type="date"
                    value={formEffectiveTo}
                    onChange={(e) => setFormEffectiveTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Prioritas Resolusi</label>
                  <input
                    type="number"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800 text-xs">
                    Aturan ini aktif dan dapat diterapkan
                  </span>
                </label>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                  >
                    Simpan Aturan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
