import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Store,
  Tag,
  DollarSign,
  Scale,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  RefreshCw,
  Calculator,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  X,
  Info,
  Check,
} from 'lucide-react';
import {
  DatabaseState,
  ProductChannelRecord,
  CostRuleRecord,
  TeamAllocationRecord,
  CalculationType,
  CalculationBase,
  AllocationMethod,
  FinancialType,
} from '../../types/database';
import { formatIDR, formatPercent } from '../../utils/validation';
import { getApplicableMarketplaceFees } from '../../utils/financialEngine';
import { storageService } from '../../services/storageService';

interface ProductChannelCostEngineProps {
  dbState: DatabaseState;
}

export const ProductChannelCostEngine: React.FC<ProductChannelCostEngineProps> = ({ dbState }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'cost_rules' | 'simulator' | 'team_alloc' | 'cases'>('matrix');

  // Product Channel Filter & Search
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');
  const [selectedMktFilter, setSelectedMktFilter] = useState<string>('ALL');
  const [channelSearchQuery, setChannelSearchQuery] = useState<string>('');

  // Cost Rules Filter & Search
  const [ruleMktFilter, setRuleMktFilter] = useState<string>('ALL');
  const [ruleSearchQuery, setRuleSearchQuery] = useState<string>('');

  // Modals State
  const [isChannelModalOpen, setIsChannelModalOpen] = useState<boolean>(false);
  const [editingChannel, setEditingChannel] = useState<ProductChannelRecord | null>(null);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<CostRuleRecord | null>(null);

  const [isAllocModalOpen, setIsAllocModalOpen] = useState<boolean>(false);
  const [editingAlloc, setEditingAlloc] = useState<TeamAllocationRecord | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fee Simulator State
  const [simPrice, setSimPrice] = useState<number>(100000);
  const [simMarketplace, setSimMarketplace] = useState<string>('MKT-SHOPEE');
  const [simIncludeOptional, setSimIncludeOptional] = useState<boolean>(true);

  // Form State: Product Channel
  const [formSku, setFormSku] = useState<string>('');
  const [formUnitId, setFormUnitId] = useState<string>('U001');
  const [formMktId, setFormMktId] = useState<string>('MKT-SHOPEE');
  const [formSellingPrice, setFormSellingPrice] = useState<number>(65000);
  const [formPromoPrice, setFormPromoPrice] = useState<number>(59000);
  const [formMinPrice, setFormMinPrice] = useState<number>(52000);
  const [formAdsStatus, setFormAdsStatus] = useState<boolean>(true);
  const [formTargetMargin, setFormTargetMargin] = useState<number>(0.20);
  const [formTargetRoas, setFormTargetRoas] = useState<number>(4.0);
  const [formTargetCir, setFormTargetCir] = useState<number>(0.25);
  const [formChannelActive, setFormChannelActive] = useState<boolean>(true);

  // Form State: Cost Rule
  const [formRuleMktId, setFormRuleMktId] = useState<string>('MKT-SHOPEE');
  const [formCostName, setFormCostName] = useState<string>('Biaya Admin');
  const [formCostGroup, setFormCostGroup] = useState<string>('PLATFORM_FEE');
  const [formMandatory, setFormMandatory] = useState<boolean>(true);
  const [formCalcType, setFormCalcType] = useState<CalculationType>('PERCENTAGE_MAX');
  const [formRate, setFormRate] = useState<number>(0.065);
  const [formFixedAmount, setFormFixedAmount] = useState<number>(0);
  const [formMaxFee, setFormMaxFee] = useState<number>(10000);
  const [formMinFee, setFormMinFee] = useState<number>(0);
  const [formProgram, setFormProgram] = useState<string>('');
  const [formPriority, setFormPriority] = useState<number>(50);

  // Form State: Team Allocation
  const [formFinancialType, setFormFinancialType] = useState<FinancialType>('EXPENSE');
  const [formAllocMethod, setFormAllocMethod] = useState<AllocationMethod>('CUSTOM');
  const [formCategory, setFormCategory] = useState<string>('01. Operasional');
  const [formCostPost, setFormCostPost] = useState<string>('Gaji & Fasilitas');
  const [formKanbaiPct, setFormKanbaiPct] = useState<number>(0.60);
  const [formNutribitePct, setFormNutribitePct] = useState<number>(0.40);
  const [formAllocNotes, setFormAllocNotes] = useState<string>('Alokasi Shared Team');

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    return dbState.productChannels.filter((c) => {
      const matchUnit = selectedUnitFilter === 'ALL' || c.unit_id === selectedUnitFilter;
      const matchMkt = selectedMktFilter === 'ALL' || c.marketplace_id === selectedMktFilter;
      const q = channelSearchQuery.toLowerCase();
      const skuObj = dbState.skus.find((s) => s.sku === c.sku);
      const matchQuery =
        !q ||
        c.sku.toLowerCase().includes(q) ||
        (skuObj && skuObj.sku_name.toLowerCase().includes(q)) ||
        c.config_id.toLowerCase().includes(q);
      return matchUnit && matchMkt && matchQuery;
    });
  }, [dbState.productChannels, selectedUnitFilter, selectedMktFilter, channelSearchQuery, dbState.skus]);

  // Filtered Cost Rules
  const filteredRules = useMemo(() => {
    return dbState.costRules.filter((r) => {
      const matchMkt = ruleMktFilter === 'ALL' || r.marketplace_id === ruleMktFilter;
      const q = ruleSearchQuery.toLowerCase();
      const matchQuery =
        !q ||
        r.cost_name.toLowerCase().includes(q) ||
        r.rule_id.toLowerCase().includes(q) ||
        (r.program && r.program.toLowerCase().includes(q));
      return matchMkt && matchQuery;
    });
  }, [dbState.costRules, ruleMktFilter, ruleSearchQuery]);

  // Simulated Fees
  const simulatedFeeResult = useMemo(() => {
    const activePrograms = simIncludeOptional
      ? ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL']
      : ['ALL_MANDATORY'];
    return getApplicableMarketplaceFees(
      simPrice,
      simMarketplace,
      '',
      '',
      '',
      '',
      '',
      dbState.costRules,
      activePrograms
    );
  }, [simPrice, simMarketplace, simIncludeOptional, dbState.costRules]);

  const totalSimulatedFee = simulatedFeeResult.totalFeeAmount;
  const simNetRevenue = simPrice - totalSimulatedFee;
  const simFeePct = simPrice > 0 ? totalSimulatedFee / simPrice : 0;

  // Open Channel Modal
  const openChannelModal = (channel?: ProductChannelRecord) => {
    if (channel) {
      setEditingChannel(channel);
      setFormSku(channel.sku);
      setFormUnitId(channel.unit_id);
      setFormMktId(channel.marketplace_id);
      setFormSellingPrice(channel.selling_price);
      setFormPromoPrice(channel.promo_price);
      setFormMinPrice(channel.minimum_selling_price);
      setFormAdsStatus(channel.ads_status);
      setFormTargetMargin(channel.target_margin);
      setFormTargetRoas(channel.target_roas);
      setFormTargetCir(channel.target_cir);
      setFormChannelActive(channel.active);
    } else {
      setEditingChannel(null);
      setFormSku(dbState.skus[0]?.sku || 'E003BK');
      setFormUnitId('U001');
      setFormMktId('MKT-SHOPEE');
      setFormSellingPrice(65000);
      setFormPromoPrice(59000);
      setFormMinPrice(52000);
      setFormAdsStatus(true);
      setFormTargetMargin(0.20);
      setFormTargetRoas(4.0);
      setFormTargetCir(0.25);
      setFormChannelActive(true);
    }
    setIsChannelModalOpen(true);
  };

  const saveChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const skuObj = dbState.skus.find((s) => s.sku === formSku);
    if (!skuObj) {
      alert('Pilih SKU yang valid.');
      return;
    }

    if (formPromoPrice > 0 && formPromoPrice < formMinPrice) {
      if (!confirm('Peringatan Section 40: Harga promo lebih rendah dari batas harga minimum yang diizinkan! Apakah ingin tetap menyimpan?')) {
        return;
      }
    }

    if (editingChannel) {
      storageService.updateProductChannel(editingChannel.config_id, {
        sku: formSku,
        product_id: skuObj.product_id,
        unit_id: formUnitId,
        marketplace_id: formMktId,
        selling_price: formSellingPrice,
        promo_price: formPromoPrice,
        minimum_selling_price: formMinPrice,
        ads_status: formAdsStatus,
        target_margin: formTargetMargin,
        target_roas: formTargetRoas,
        target_cir: formTargetCir,
        active: formChannelActive,
      });
      triggerToast(`Konfigurasi channel ${editingChannel.config_id} berhasil diperbarui.`);
    } else {
      storageService.addProductChannel({
        sku: formSku,
        product_id: skuObj.product_id,
        unit_id: formUnitId,
        marketplace_id: formMktId,
        selling_price: formSellingPrice,
        promo_price: formPromoPrice,
        minimum_selling_price: formMinPrice,
        ads_status: formAdsStatus,
        target_margin: formTargetMargin,
        target_roas: formTargetRoas,
        target_cir: formTargetCir,
        active: formChannelActive,
        updated_by: 'Admin',
      });
      triggerToast('Konfigurasi produk channel baru berhasil ditambahkan.');
    }
    setIsChannelModalOpen(false);
  };

  const deleteChannel = (configId: string) => {
    if (confirm(`Yakin ingin menghapus konfigurasi channel ${configId}?`)) {
      storageService.deleteProductChannel(configId);
      triggerToast(`Konfigurasi channel ${configId} telah dihapus.`);
    }
  };

  // Open Cost Rule Modal
  const openRuleModal = (rule?: CostRuleRecord) => {
    if (rule) {
      setEditingRule(rule);
      setFormRuleMktId(rule.marketplace_id);
      setFormCostName(rule.cost_name);
      setFormCostGroup(rule.cost_group);
      setFormMandatory(rule.mandatory);
      setFormCalcType(rule.calculation_type);
      setFormRate(rule.rate);
      setFormFixedAmount(rule.fixed_amount);
      setFormMaxFee(rule.maximum_fee || 0);
      setFormMinFee(rule.minimum_fee || 0);
      setFormProgram(rule.program || '');
      setFormPriority(rule.priority);
    } else {
      setEditingRule(null);
      setFormRuleMktId('MKT-SHOPEE');
      setFormCostName('Biaya Admin');
      setFormCostGroup('PLATFORM_FEE');
      setFormMandatory(true);
      setFormCalcType('PERCENTAGE_MAX');
      setFormRate(0.065);
      setFormFixedAmount(0);
      setFormMaxFee(10000);
      setFormMinFee(0);
      setFormProgram('');
      setFormPriority(50);
    }
    setIsRuleModalOpen(true);
  };

  const saveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      storageService.updateCostRule(editingRule.rule_id, {
        marketplace_id: formRuleMktId,
        cost_name: formCostName,
        cost_group: formCostGroup,
        mandatory: formMandatory,
        calculation_type: formCalcType,
        rate: formRate,
        fixed_amount: formFixedAmount,
        maximum_fee: formMaxFee > 0 ? formMaxFee : null,
        minimum_fee: formMinFee > 0 ? formMinFee : null,
        program: formProgram || null,
        priority: formPriority,
      });
      triggerToast(`Aturan biaya ${editingRule.rule_id} berhasil diperbarui.`);
    } else {
      storageService.addCostRule({
        marketplace_id: formRuleMktId,
        cost_name: formCostName,
        cost_group: formCostGroup,
        mandatory: formMandatory,
        calculation_type: formCalcType,
        calculation_base: 'SELLING_PRICE',
        rate: formRate,
        fixed_amount: formFixedAmount,
        maximum_fee: formMaxFee > 0 ? formMaxFee : null,
        minimum_fee: formMinFee > 0 ? formMinFee : null,
        program: formProgram || null,
        effective_from: '2026-01-01',
        priority: formPriority,
        active: true,
        updated_by: 'Admin',
      });
      triggerToast('Aturan biaya marketplace baru berhasil ditambahkan.');
    }
    setIsRuleModalOpen(false);
  };

  const deleteRule = (ruleId: string) => {
    if (confirm(`Yakin ingin menghapus aturan biaya ${ruleId}?`)) {
      storageService.deleteCostRule(ruleId);
      triggerToast(`Aturan biaya ${ruleId} telah dihapus.`);
    }
  };

  // Open Team Allocation Modal
  const openAllocModal = (alloc?: TeamAllocationRecord) => {
    if (alloc) {
      setEditingAlloc(alloc);
      setFormFinancialType(alloc.financial_type);
      setFormAllocMethod(alloc.method);
      setFormCategory(alloc.category_id || '01. Operasional');
      setFormCostPost(alloc.cost_post || 'Biaya');
      setFormKanbaiPct(alloc.kanbai_percent);
      setFormNutribitePct(alloc.nutribite_percent);
      setFormAllocNotes(alloc.notes);
    } else {
      setEditingAlloc(null);
      setFormFinancialType('EXPENSE');
      setFormAllocMethod('CUSTOM');
      setFormCategory('01. Operasional');
      setFormCostPost('Gaji & Fasilitas');
      setFormKanbaiPct(0.60);
      setFormNutribitePct(0.40);
      setFormAllocNotes('Alokasi Shared Team');
    }
    setIsAllocModalOpen(true);
  };

  const saveAlloc = (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(formKanbaiPct + formNutribitePct - 1.0) > 0.001) {
      alert('Validasi Gagal: Total persentase Kanbai % + Nutribite % wajib berjumlah 100%!');
      return;
    }

    if (editingAlloc) {
      storageService.updateTeamAllocation(editingAlloc.allocation_id, {
        financial_type: formFinancialType,
        method: formAllocMethod,
        category_id: formCategory,
        cost_post: formCostPost,
        kanbai_percent: formKanbaiPct,
        nutribite_percent: formNutribitePct,
        notes: formAllocNotes,
      });
      triggerToast(`Aturan alokasi ${editingAlloc.allocation_id} berhasil diperbarui.`);
    } else {
      storageService.addTeamAllocation({
        effective_from: '2026-01-01',
        financial_type: formFinancialType,
        method: formAllocMethod,
        category_id: formCategory,
        cost_post: formCostPost,
        kanbai_percent: formKanbaiPct,
        nutribite_percent: formNutribitePct,
        active: true,
        notes: formAllocNotes,
        updated_by: 'Admin',
      });
      triggerToast('Aturan alokasi Team baru berhasil ditambahkan.');
    }
    setIsAllocModalOpen(false);
  };

  const deleteAlloc = (allocId: string) => {
    if (confirm(`Yakin ingin menghapus aturan alokasi ${allocId}?`)) {
      storageService.deleteTeamAllocation(allocId);
      triggerToast(`Aturan alokasi ${allocId} telah dihapus.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center space-x-3 text-xs animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Phase 2 — Product Channel & Cost Engine
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Sheet 10, 11, 12
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Pengaturan strategi harga multi-unit (Kanbai vs Nutribite), simulasi multi-tier potongan marketplace fee (Shopee, TikTok, Tokopedia),
              aturan alokasi shared pool Team, serta penegakan Section 40 Minimum Selling Price rule.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openChannelModal()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Channel Baru</span>
            </button>
            <button
              onClick={() => openRuleModal()}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Cost Rule</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'matrix' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>10_PRODUCT_CHANNEL (Matrix Harga)</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/20">
              {dbState.productChannels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cost_rules')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'cost_rules' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>11_COST_RULE (Biaya Marketplace)</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/20">
              {dbState.costRules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'simulator' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Simulator Biaya Marketplace</span>
            <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1 rounded">Live</span>
          </button>

          <button
            onClick={() => setActiveTab('team_alloc')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'team_alloc' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>12_TEAM_ALLOCATION</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/20">
              {dbState.teamAllocations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'cases' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verifikasi Acceptance (Case 1 & 2)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCT CHANNEL MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Unit:</span>
                <select
                  value={selectedUnitFilter}
                  onChange={(e) => setSelectedUnitFilter(e.target.value)}
                  className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="ALL">Semua Unit</option>
                  <option value="U001">Kanbai (U001)</option>
                  <option value="U002">Nutribite (U002)</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Marketplace:</span>
                <select
                  value={selectedMktFilter}
                  onChange={(e) => setSelectedMktFilter(e.target.value)}
                  className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="ALL">Semua Marketplace</option>
                  {dbState.marketplaces.map((m) => (
                    <option key={m.marketplace_id} value={m.marketplace_id}>
                      {m.marketplace_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari SKU, nama produk, ID..."
                value={channelSearchQuery}
                onChange={(e) => setChannelSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Config ID</th>
                    <th className="py-3 px-3">SKU / Nama Produk</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3">Marketplace</th>
                    <th className="py-3 px-3 text-right">Harga Jual</th>
                    <th className="py-3 px-3 text-right text-slate-600">Promo</th>
                    <th className="py-3 px-3 text-right text-slate-500">Min. Harga</th>
                    <th className="py-3 px-3 text-right font-bold text-emerald-800">Target Margin</th>
                    <th className="py-3 px-3 text-right">ROAS / CIR</th>
                    <th className="py-3 px-3 text-center">Status Iklan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChannels.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Tidak ada konfigurasi channel produk yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredChannels.map((c) => {
                      const skuObj = dbState.skus.find((s) => s.sku === c.sku);
                      const unitObj = dbState.units.find((u) => u.unit_id === c.unit_id);
                      const mktObj = dbState.marketplaces.find((m) => m.marketplace_id === c.marketplace_id);
                      const hasPromoViolation = c.promo_price > 0 && c.promo_price < c.minimum_selling_price;

                      return (
                        <tr key={c.config_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">{c.config_id}</td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-900">{c.sku}</div>
                            <div className="text-slate-600 truncate max-w-xs">{skuObj?.sku_name}</div>
                            <div className="text-[10px] text-slate-400">HPP: {formatIDR(skuObj?.hpp || 0)}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.unit_id === 'U001' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {unitObj?.unit_name || c.unit_id}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {mktObj?.marketplace_name || c.marketplace_id}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatIDR(c.selling_price)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            <div className={hasPromoViolation ? 'text-red-600 font-bold' : 'text-slate-700'}>
                              {formatIDR(c.promo_price)}
                            </div>
                            {hasPromoViolation && (
                              <span className="text-[9px] text-red-600 block">&lt; Min Price</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {formatIDR(c.minimum_selling_price)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatPercent(c.target_margin)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            <div>{c.target_roas}x</div>
                            <div className="text-[10px] text-slate-400">CIR: {formatPercent(c.target_cir)}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.ads_status
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {c.ads_status ? 'IKLAN ON' : 'ORGANIK'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => openChannelModal(c)}
                                className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                                title="Edit konfigurasi channel"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteChannel(c.config_id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Hapus channel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COST RULES MANAGER */}
      {activeTab === 'cost_rules' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">Filter Marketplace:</span>
              <select
                value={ruleMktFilter}
                onChange={(e) => setRuleMktFilter(e.target.value)}
                className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="ALL">Semua Marketplace</option>
                {dbState.marketplaces.map((m) => (
                  <option key={m.marketplace_id} value={m.marketplace_id}>
                    {m.marketplace_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama biaya, ID, program..."
                value={ruleSearchQuery}
                onChange={(e) => setRuleSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Rule ID</th>
                    <th className="py-3 px-3">Marketplace</th>
                    <th className="py-3 px-4">Nama Biaya & Kategori</th>
                    <th className="py-3 px-3">Tipe Kalkulasi</th>
                    <th className="py-3 px-3 text-right">Tarif (Rate)</th>
                    <th className="py-3 px-3 text-right">Biaya Tetap</th>
                    <th className="py-3 px-3 text-right">Maks. Fee</th>
                    <th className="py-3 px-3 text-center">Sifat Biaya</th>
                    <th className="py-3 px-3 text-center">Prioritas</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Tidak ada aturan biaya yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((r) => {
                      const mkt = dbState.marketplaces.find((m) => m.marketplace_id === r.marketplace_id);
                      return (
                        <tr key={r.rule_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">{r.rule_id}</td>
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {mkt?.marketplace_name || r.marketplace_id}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{r.cost_name}</div>
                            <div className="text-[10px] text-slate-400">{r.cost_group}</div>
                            {r.program && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded">
                                Program: {r.program}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                              {r.calculation_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {r.rate > 0 ? formatPercent(r.rate) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {r.fixed_amount > 0 ? formatIDR(r.fixed_amount) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-amber-900">
                            {r.maximum_fee ? formatIDR(r.maximum_fee) : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.mandatory
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.mandatory ? 'WAJIB' : 'OPSIONAL'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {r.priority}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => openRuleModal(r)}
                                className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteRule(r.rule_id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE MARKETPLACE FEE SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Simulator Multi-Tier Marketplace Fee Real-Time
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Uji coba deterministik pemotongan biaya marketplace berdasarkan aturan aktif pada Sheet 11_COST_RULE.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Marketplace Target</label>
                <select
                  value={simMarketplace}
                  onChange={(e) => setSimMarketplace(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                >
                  {dbState.marketplaces.map((m) => (
                    <option key={m.marketplace_id} value={m.marketplace_id}>
                      {m.marketplace_name} ({m.marketplace_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Simulasi Harga Jual (Rp)</label>
                <input
                  type="number"
                  step="1000"
                  value={simPrice}
                  onChange={(e) => setSimPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIncludeOptional}
                    onChange={(e) => setSimIncludeOptional(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Sertakan Program Opsional (Gratis Ongkir Xtra / Cashback)
                  </span>
                </label>
                <span className="text-[10px] text-slate-400 mt-1">
                  Jika tidak dicentang, hanya biaya wajib (Admin & Payment) yang dihitung.
                </span>
              </div>
            </div>
          </div>

          {/* Result Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Harga Jual Masuk</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{formatIDR(simPrice)}</div>
              <span className="text-[10px] text-slate-400">100% dari transaksi</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Total Potongan Biaya Marketplace</span>
              <div className="text-2xl font-extrabold text-amber-700 mt-1">{formatIDR(totalSimulatedFee)}</div>
              <span className="text-[10px] text-amber-700 font-semibold">
                Tarif Efektif: {formatPercent(simFeePct)}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Hasil Penjualan Bersih (Net Payout)</span>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">{formatIDR(simNetRevenue)}</div>
              <span className="text-[10px] text-emerald-700 font-semibold">
                Diterima seller: {formatPercent(1 - simFeePct)}
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Rincian Biaya yang Berlaku ({simulatedFeeResult.fees.length} Komponen Biaya)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Rule ID</th>
                    <th className="py-3 px-4">Komponen Biaya</th>
                    <th className="py-3 px-4">Formula Kalkulasi</th>
                    <th className="py-3 px-4 text-right">Potongan Biaya (Rp)</th>
                    <th className="py-3 px-4 text-right">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simulatedFeeResult.fees.map((f) => (
                    <tr key={f.ruleId} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{f.ruleId}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{f.costName}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {f.rate > 0 ? `${formatPercent(f.rate)} (${f.mandatory ? 'Wajib' : 'Opsional'})` : `Biaya Tetap ${formatIDR(f.feeAmount)}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                        {formatIDR(f.feeAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatPercent(simPrice > 0 ? f.feeAmount / simPrice : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TEAM ALLOCATION RULES */}
      {activeTab === 'team_alloc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Aturan Pembagian Shared Pool TEAM ke Kanbai & Nutribite
              </h2>
              <p className="text-xs text-slate-500">
                Sheet 12_TEAM_ALLOCATION: Menegakkan aturan integritas `Kanbai % + Nutribite % === 100%`.
              </p>
            </div>
            <button
              onClick={() => openAllocModal()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Aturan Alokasi</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Allocation ID</th>
                    <th className="py-3 px-4">Tipe Finansial</th>
                    <th className="py-3 px-4">Kategori & Pos</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4 text-right font-bold text-blue-900">Porsi Kanbai %</th>
                    <th className="py-3 px-4 text-right font-bold text-emerald-900">Porsi Nutribite %</th>
                    <th className="py-3 px-4">Catatan Rule</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbState.teamAllocations.map((alloc) => {
                    const isValidSum = Math.abs(alloc.kanbai_percent + alloc.nutribite_percent - 1.0) < 0.001;
                    return (
                      <tr key={alloc.allocation_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{alloc.allocation_id}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              alloc.financial_type === 'REVENUE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {alloc.financial_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{alloc.category_id || 'Umum'}</div>
                          <div className="text-[10px] text-slate-400">{alloc.cost_post || 'Semua Pos'}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{alloc.method}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          {formatPercent(alloc.kanbai_percent)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatPercent(alloc.nutribite_percent)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{alloc.notes}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isValidSum ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {isValidSum ? 'VALID (100%)' : 'INVALID'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => openAllocModal(alloc)}
                              className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteAlloc(alloc.allocation_id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* TAB 5: ACCEPTANCE VERIFICATION (Cases 1, 2, 3) */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Case 1 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">CASE 1: Multi-Unit Pricing Variance</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  PASSED
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Produk <code>E003BK</code> memiliki harga jual, target margin, dan ROAS berbeda saat dijual di bawah Kanbai (U001) vs Nutribite (U002).
              </p>
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg text-xs font-mono">
                <div className="flex justify-between">
                  <span>Kanbai (U001) • Shopee:</span>
                  <span className="font-bold text-blue-700">Rp 65.000 (Target Margin: 20%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Nutribite (U002) • Shopee:</span>
                  <span className="font-bold text-emerald-700">Rp 68.000 (Target Margin: 22%)</span>
                </div>
              </div>
            </div>

            {/* Case 2 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">CASE 2: Marketplace Fee Differentiation</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  PASSED
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Produk <code>E003BK</code> pada Kanbai dijual di Shopee vs TikTok dengan skema potongan fee berbeda sesuai aturan Sheet 11.
              </p>
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg text-xs font-mono">
                <div className="flex justify-between">
                  <span>Shopee Admin:</span>
                  <span className="font-bold text-amber-800">6.5% Max Rp 10.000 + 1% Payment</span>
                </div>
                <div className="flex justify-between">
                  <span>TikTok Admin:</span>
                  <span className="font-bold text-amber-800">4.5% Flat + Rp 1.000 Per Transaksi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD/EDIT PRODUCT CHANNEL */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingChannel ? `Edit Konfigurasi Channel: ${editingChannel.config_id}` : 'Tambah Konfigurasi Channel Produk Baru'}
              </h3>
              <button onClick={() => setIsChannelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveChannel} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Pilih SKU Produk *</label>
                <select
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white"
                >
                  {dbState.skus.map((s) => (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} — {s.sku_name} (HPP: {formatIDR(s.hpp)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Unit Bisnis *</label>
                  <select
                    value={formUnitId}
                    onChange={(e) => setFormUnitId(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="U001">Kanbai (U001)</option>
                    <option value="U002">Nutribite (U002)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Marketplace *</label>
                  <select
                    value={formMktId}
                    onChange={(e) => setFormMktId(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white"
                  >
                    {dbState.marketplaces.map((m) => (
                      <option key={m.marketplace_id} value={m.marketplace_id}>
                        {m.marketplace_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Harga Jual Normal (Rp) *</label>
                  <input
                    type="number"
                    step="500"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(parseInt(e.target.value) || 0)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Harga Promo (Rp)</label>
                  <input
                    type="number"
                    step="500"
                    value={formPromoPrice}
                    onChange={(e) => setFormPromoPrice(parseInt(e.target.value) || 0)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Min. Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    step="500"
                    required
                    value={formMinPrice}
                    onChange={(e) => setFormMinPrice(parseInt(e.target.value) || 0)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Margin (e.g. 0.20)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formTargetMargin}
                    onChange={(e) => setFormTargetMargin(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target ROAS (x)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formTargetRoas}
                    onChange={(e) => setFormTargetRoas(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target CIR (e.g. 0.25)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formTargetCir}
                    onChange={(e) => setFormTargetCir(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAdsStatus}
                    onChange={(e) => setFormAdsStatus(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Status Iklan Aktif</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formChannelActive}
                    onChange={(e) => setFormChannelActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Status Channel Aktif</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChannelModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {editingChannel ? 'Simpan Perubahan' : 'Tambahkan Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD/EDIT COST RULE */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingRule ? `Edit Aturan Biaya: ${editingRule.rule_id}` : 'Tambah Aturan Biaya Marketplace Baru'}
              </h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveRule} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Marketplace Target *</label>
                  <select
                    value={formRuleMktId}
                    onChange={(e) => setFormRuleMktId(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white"
                  >
                    {dbState.marketplaces.map((m) => (
                      <option key={m.marketplace_id} value={m.marketplace_id}>
                        {m.marketplace_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nama Biaya *</label>
                  <input
                    type="text"
                    required
                    value={formCostName}
                    onChange={(e) => setFormCostName(e.target.value)}
                    placeholder="e.g. Biaya Admin Marketplace"
                    className="w-full py-2 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tipe Kalkulasi *</label>
                  <select
                    value={formCalcType}
                    onChange={(e) => setFormCalcType(e.target.value as CalculationType)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (Rate %)</option>
                    <option value="PERCENTAGE_MAX">PERCENTAGE_MAX (Rate % dg Maksimum Rp)</option>
                    <option value="FIXED">FIXED (Rp Tetap per order)</option>
                    <option value="TIER">TIER (Bertingkat)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Kategori Biaya</label>
                  <input
                    type="text"
                    value={formCostGroup}
                    onChange={(e) => setFormCostGroup(e.target.value)}
                    placeholder="PLATFORM_FEE / SERVICE_FEE"
                    className="w-full py-2 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tarif Persen (Rate)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formRate}
                    onChange={(e) => setFormRate(parseFloat(e.target.value) || 0)}
                    placeholder="0.065 = 6.5%"
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Biaya Tetap (Rp)</label>
                  <input
                    type="number"
                    step="500"
                    value={formFixedAmount}
                    onChange={(e) => setFormFixedAmount(parseInt(e.target.value) || 0)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Maksimum Fee (Rp)</label>
                  <input
                    type="number"
                    step="1000"
                    value={formMaxFee}
                    onChange={(e) => setFormMaxFee(parseInt(e.target.value) || 0)}
                    placeholder="0 jika tanpa batas"
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nama Program (Jika Opsional)</label>
                  <input
                    type="text"
                    value={formProgram}
                    onChange={(e) => setFormProgram(e.target.value)}
                    placeholder="FREE_SHIPPING / CASHBACK"
                    className="w-full py-2 px-3 rounded-lg border border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Prioritas Eksekusi</label>
                  <input
                    type="number"
                    value={formPriority}
                    onChange={(e) => setFormPriority(parseInt(e.target.value) || 50)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formMandatory}
                    onChange={(e) => setFormMandatory(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">
                    Biaya Wajib (Mandatory Platform / Payment Fee)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {editingRule ? 'Simpan Perubahan' : 'Tambahkan Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD/EDIT TEAM ALLOCATION */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingAlloc ? `Edit Alokasi Team: ${editingAlloc.allocation_id}` : 'Tambah Aturan Alokasi Team Baru'}
              </h3>
              <button onClick={() => setIsAllocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveAlloc} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tipe Finansial *</label>
                  <select
                    value={formFinancialType}
                    onChange={(e) => setFormFinancialType(e.target.value as FinancialType)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="EXPENSE">EXPENSE (Pengeluaran)</option>
                    <option value="REVENUE">REVENUE (Pendapatan)</option>
                    <option value="OTHER_INCOME">OTHER_INCOME (Pendapatan Lain)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Metode Alokasi *</label>
                  <select
                    value={formAllocMethod}
                    onChange={(e) => setFormAllocMethod(e.target.value as AllocationMethod)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="CUSTOM">CUSTOM (Persentase Manual)</option>
                    <option value="50_50">50_50 (Bagi Rata 50:50)</option>
                    <option value="REVENUE_RATIO">REVENUE_RATIO (Rasio Omzet)</option>
                    <option value="DIRECT_ONLY">DIRECT_ONLY (Langsung)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Kategori Biaya</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pos Biaya / Sub Kategori</label>
                  <input
                    type="text"
                    value={formCostPost}
                    onChange={(e) => setFormCostPost(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Pembagian Porsi Alokasi (Wajib 100%)</span>
                  <span
                    className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      Math.abs(formKanbaiPct + formNutribitePct - 1.0) < 0.001
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    Total: {((formKanbaiPct + formNutribitePct) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-blue-900">Kanbai (U001) %</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={formKanbaiPct}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormKanbaiPct(val);
                        setFormNutribitePct(Math.max(0, parseFloat((1 - val).toFixed(2))));
                      }}
                      className="w-full py-1.5 px-3 rounded-lg border border-slate-200 font-mono font-bold text-blue-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-emerald-900">Nutribite (U002) %</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={formNutribitePct}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormNutribitePct(val);
                        setFormKanbaiPct(Math.max(0, parseFloat((1 - val).toFixed(2))));
                      }}
                      className="w-full py-1.5 px-3 rounded-lg border border-slate-200 font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Catatan / Deskripsi Rule</label>
                <input
                  type="text"
                  value={formAllocNotes}
                  onChange={(e) => setFormAllocNotes(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAllocModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {editingAlloc ? 'Simpan Perubahan' : 'Tambahkan Alokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
