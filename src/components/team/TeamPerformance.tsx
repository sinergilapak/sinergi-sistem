import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  TrendingUp,
  Award,
  BarChart3,
  Store,
  DollarSign,
  Scale,
  ShoppingBag,
  Filter,
  Download,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Layers,
  PieChart,
} from 'lucide-react';
import { DatabaseState, PicRecord, SalesRecord, PostDataRecord } from '../../types/database';
import { formatIDR, formatPercent } from '../../utils/validation';

interface TeamPerformanceProps {
  dbState: DatabaseState;
}

export interface PicPerformanceMetric {
  picId: string;
  picName: string;
  picType: string;
  defaultUnitName: string;
  // Sales & Revenue
  ordersCount: number;
  unitsSold: number;
  grossSales: number;
  totalHpp: number;
  grossProfit: number;
  gpm: number;
  aov: number;
  // Channels Operated
  operatedChannels: {
    marketplaceId: string;
    marketplaceName: string;
    orders: number;
    units: number;
    revenue: number;
    grossProfit: number;
    platformFee: number;
    efficiencyMultiple: number;
  }[];
  // Expenses & Operational Footprint
  managedExpenses: number;
  managedIncome: number;
  netContribution: number;
  overallEfficiencyScore: number;
  // Top selling SKU
  topSku: string;
}

export interface ChannelPerformanceMetric {
  marketplaceId: string;
  marketplaceName: string;
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  totalGrossProfit: number;
  gpm: number;
  assignedPics: {
    picName: string;
    picType: string;
    revenue: number;
    orders: number;
    grossProfit: number;
    shareOfChannelRevenue: number;
    efficiencyScore: number;
  }[];
}

export const TeamPerformance: React.FC<TeamPerformanceProps> = ({ dbState }) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'channel_mapping' | 'department'>('individual');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'efficiency' | 'orders'>('revenue');

  // Compute PIC-Level Individual Metrics
  const picMetricsList: PicPerformanceMetric[] = useMemo(() => {
    // Collect all unique PIC names from master table, sales, and postData
    const picMap = new Map<string, PicRecord>();
    dbState.pics.forEach((p) => picMap.set(p.pic_name.toLowerCase(), p));

    // Also detect any PIC names in sales that might not be in master
    const allPicNames = new Set<string>();
    dbState.pics.forEach((p) => allPicNames.add(p.pic_name));
    dbState.sales.forEach((s) => {
      if (s.pic && s.pic.trim()) allPicNames.add(s.pic.trim());
    });
    dbState.postData.forEach((p) => {
      if (p.pic && p.pic.trim()) allPicNames.add(p.pic.trim());
    });

    const metrics: PicPerformanceMetric[] = [];

    allPicNames.forEach((picName) => {
      const lower = picName.toLowerCase();
      const masterPic = picMap.get(lower);
      const picId = masterPic?.pic_id || `PIC-GEN-${picName.slice(0, 3).toUpperCase()}`;
      const picType = masterPic?.pic_type || 'Operasional';
      const defaultUnit = dbState.units.find((u) => u.unit_id === masterPic?.default_unit_id);
      const defaultUnitName = defaultUnit?.unit_name || 'Umum / Semua Unit';

      // 1. Sales records attributed to this PIC
      const picSales = dbState.sales.filter((s) => s.pic.toLowerCase() === lower && s.status !== 'CANCELLED');
      const ordersCount = picSales.length;
      const unitsSold = picSales.reduce((sum, s) => sum + s.qty, 0);
      const grossSales = picSales.reduce((sum, s) => sum + s.total_sales, 0);
      const totalHpp = picSales.reduce((sum, s) => sum + s.total_hpp, 0);
      const grossProfit = grossSales - totalHpp;
      const gpm = grossSales > 0 ? grossProfit / grossSales : 0;
      const aov = ordersCount > 0 ? Math.round(grossSales / ordersCount) : 0;

      // Find top selling SKU for this PIC
      const skuQtyMap = new Map<string, number>();
      picSales.forEach((s) => {
        skuQtyMap.set(s.sku, (skuQtyMap.get(s.sku) || 0) + s.qty);
      });
      let topSku = '-';
      let maxQty = 0;
      skuQtyMap.forEach((qty, sku) => {
        if (qty > maxQty) {
          maxQty = qty;
          topSku = `${sku} (${qty} pcs)`;
        }
      });

      // 2. Breakdown per channel (Marketplace mapping)
      const channelGroup = new Map<string, { orders: number; units: number; revenue: number; grossProfit: number }>();
      picSales.forEach((s) => {
        const prev = channelGroup.get(s.marketplace_id) || { orders: 0, units: 0, revenue: 0, grossProfit: 0 };
        channelGroup.set(s.marketplace_id, {
          orders: prev.orders + 1,
          units: prev.units + s.qty,
          revenue: prev.revenue + s.total_sales,
          grossProfit: prev.grossProfit + s.gross_profit,
        });
      });

      const operatedChannels = Array.from(channelGroup.entries()).map(([mktId, stats]) => {
        const mkt = dbState.marketplaces.find((m) => m.marketplace_id === mktId);
        // Estimated platform fee for channel
        const estFee = Math.round(stats.revenue * 0.065);
        const efficiencyMultiple = estFee > 0 ? stats.grossProfit / estFee : stats.grossProfit > 0 ? 10 : 0;

        return {
          marketplaceId: mktId,
          marketplaceName: mkt?.marketplace_name || mktId,
          orders: stats.orders,
          units: stats.units,
          revenue: stats.revenue,
          grossProfit: stats.grossProfit,
          platformFee: estFee,
          efficiencyMultiple: Number(efficiencyMultiple.toFixed(2)),
        };
      });

      // 3. Post data expenses & income managed by this PIC
      const picPostData = dbState.postData.filter((p) => p.pic.toLowerCase() === lower);
      const managedExpenses = picPostData
        .filter((p) => p.financial_type === 'EXPENSE')
        .reduce((sum, p) => sum + p.balance, 0);
      const managedIncome = picPostData
        .filter((p) => p.financial_type === 'OTHER_INCOME')
        .reduce((sum, p) => sum + p.balance, 0);

      const netContribution = grossProfit - managedExpenses + managedIncome;

      // Overall Efficiency Score:
      // If PIC generates revenue: (Gross Profit / (Estimated platform fee + managed expense))
      // If PIC is purely cost center: managed income vs managed expenses ratio
      let overallEfficiencyScore = 0;
      const totalCostBase = managedExpenses + Math.round(grossSales * 0.065);
      if (totalCostBase > 0) {
        overallEfficiencyScore = Number((grossProfit / totalCostBase).toFixed(2));
      } else if (grossProfit > 0) {
        overallEfficiencyScore = 5.0;
      }

      metrics.push({
        picId,
        picName,
        picType,
        defaultUnitName,
        ordersCount,
        unitsSold,
        grossSales,
        totalHpp,
        grossProfit,
        gpm,
        aov,
        operatedChannels,
        managedExpenses,
        managedIncome,
        netContribution,
        overallEfficiencyScore,
        topSku,
      });
    });

    return metrics;
  }, [dbState]);

  // Channel-centric Metrics: Mapping PICs to Sales Channels
  const channelMetricsList: ChannelPerformanceMetric[] = useMemo(() => {
    return dbState.marketplaces.map((mkt) => {
      const channelSales = dbState.sales.filter(
        (s) => s.marketplace_id === mkt.marketplace_id && s.status !== 'CANCELLED'
      );
      const totalRevenue = channelSales.reduce((sum, s) => sum + s.total_sales, 0);
      const totalOrders = channelSales.length;
      const totalUnits = channelSales.reduce((sum, s) => sum + s.qty, 0);
      const totalGrossProfit = channelSales.reduce((sum, s) => sum + s.gross_profit, 0);
      const gpm = totalRevenue > 0 ? totalGrossProfit / totalRevenue : 0;

      // Group by PIC on this channel
      const picMap = new Map<string, { orders: number; revenue: number; grossProfit: number }>();
      channelSales.forEach((s) => {
        const p = s.pic.trim();
        const prev = picMap.get(p) || { orders: 0, revenue: 0, grossProfit: 0 };
        picMap.set(p, {
          orders: prev.orders + 1,
          revenue: prev.revenue + s.total_sales,
          grossProfit: prev.grossProfit + s.gross_profit,
        });
      });

      const assignedPics = Array.from(picMap.entries()).map(([name, stat]) => {
        const foundPic = dbState.pics.find((p) => p.pic_name.toLowerCase() === name.toLowerCase());
        const share = totalRevenue > 0 ? stat.revenue / totalRevenue : 0;
        const estFee = Math.round(stat.revenue * 0.065);
        const efficiencyScore = estFee > 0 ? Number((stat.grossProfit / estFee).toFixed(2)) : 0;

        return {
          picName: name,
          picType: foundPic?.pic_type || 'Sales/Operasional',
          revenue: stat.revenue,
          orders: stat.orders,
          grossProfit: stat.grossProfit,
          shareOfChannelRevenue: share,
          efficiencyScore,
        };
      });

      return {
        marketplaceId: mkt.marketplace_id,
        marketplaceName: mkt.marketplace_name,
        totalRevenue,
        totalOrders,
        totalUnits,
        totalGrossProfit,
        gpm,
        assignedPics,
      };
    });
  }, [dbState]);

  // Department Aggregation
  const departmentMetrics = useMemo(() => {
    const deptMap = new Map<
      string,
      { memberCount: number; revenue: number; grossProfit: number; expenses: number; orders: number }
    >();

    picMetricsList.forEach((m) => {
      const prev = deptMap.get(m.picType) || {
        memberCount: 0,
        revenue: 0,
        grossProfit: 0,
        expenses: 0,
        orders: 0,
      };
      deptMap.set(m.picType, {
        memberCount: prev.memberCount + 1,
        revenue: prev.revenue + m.grossSales,
        grossProfit: prev.grossProfit + m.grossProfit,
        expenses: prev.expenses + m.managedExpenses,
        orders: prev.orders + m.ordersCount,
      });
    });

    const totalCompanyRevenue = picMetricsList.reduce((sum, m) => sum + m.grossSales, 0);

    return Array.from(deptMap.entries()).map(([deptName, stat]) => {
      const gpm = stat.revenue > 0 ? stat.grossProfit / stat.revenue : 0;
      const revShare = totalCompanyRevenue > 0 ? stat.revenue / totalCompanyRevenue : 0;
      const netVal = stat.grossProfit - stat.expenses;

      return {
        deptName,
        ...stat,
        gpm,
        revShare,
        netVal,
      };
    });
  }, [picMetricsList]);

  // Filtered & Sorted PIC metrics
  const filteredPics = useMemo(() => {
    let list = picMetricsList.filter((m) => {
      const matchDept = selectedDepartment === 'ALL' || m.picType === selectedDepartment;
      const query = searchQuery.toLowerCase();
      const matchQuery =
        m.picName.toLowerCase().includes(query) ||
        m.picType.toLowerCase().includes(query) ||
        m.topSku.toLowerCase().includes(query);
      return matchDept && matchQuery;
    });

    list.sort((a, b) => {
      if (sortBy === 'revenue') return b.grossSales - a.grossSales;
      if (sortBy === 'profit') return b.grossProfit - a.grossProfit;
      if (sortBy === 'efficiency') return b.overallEfficiencyScore - a.overallEfficiencyScore;
      if (sortBy === 'orders') return b.ordersCount - a.ordersCount;
      return 0;
    });

    return list;
  }, [picMetricsList, selectedDepartment, searchQuery, sortBy]);

  // Totals for Scorecards
  const totalTeamRevenue = picMetricsList.reduce((sum, m) => sum + m.grossSales, 0);
  const totalTeamGrossProfit = picMetricsList.reduce((sum, m) => sum + m.grossProfit, 0);
  const totalTeamOrders = picMetricsList.reduce((sum, m) => sum + m.ordersCount, 0);
  const totalTeamExpensesManaged = picMetricsList.reduce((sum, m) => sum + m.managedExpenses, 0);

  // Export Team Performance to CSV
  const exportTeamToCsv = () => {
    const headers = [
      'PIC ID',
      'Nama PIC',
      'Divisi / Tipe',
      'Default Unit',
      'Total Pesanan',
      'Kuantitas Terjual',
      'Total Penjualan (Revenue)',
      'Total HPP',
      'Laba Kotor (Gross Profit)',
      'GPM %',
      'Rata-rata Pesanan (AOV)',
      'Biaya Dikelola (Expenses)',
      'Kontribusi Bersih (Net Value)',
      'Skor Efisiensi Multiplier',
      'Kanal Penjualan Dioperasikan',
    ];
    const rows = filteredPics.map((p) => [
      p.picId,
      `"${p.picName}"`,
      p.picType,
      p.defaultUnitName,
      p.ordersCount,
      p.unitsSold,
      p.grossSales,
      p.totalHpp,
      p.grossProfit,
      formatPercent(p.gpm),
      p.aov,
      p.managedExpenses,
      p.netContribution,
      p.overallEfficiencyScore,
      `"${p.operatedChannels.map((c) => c.marketplaceName).join(', ')}"`,
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Kinerja_Tim_Sinergi_Lapak_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Kinerja Tim & Pemetaan Kanal Penjualan (Team Performance)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Memetakan kontribusi person in charge (PIC) terhadap omzet, margin kotor, dan operasional.
              Menganalisis efisiensi per kanal penjualan (Shopee, TikTok, Tokopedia) berdasarkan pendapatan aktual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportTeamToCsv}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor Kinerja Tim (CSV)</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeTab === 'individual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Kinerja Individu PIC ({picMetricsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('channel_mapping')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeTab === 'channel_mapping'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Pemetaan & Efisiensi Kanal</span>
            </button>

            <button
              onClick={() => setActiveTab('department')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeTab === 'department'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Kontribusi Divisi / Grup</span>
            </button>
          </div>

          <span className="text-xs text-slate-500">
            Dimensi PIC sesuai Section 20 & 45 Master Spec
          </span>
        </div>
      </div>

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Pendapatan Terkelola</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {formatIDR(totalTeamRevenue)}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Dari {totalTeamOrders} transaksi penjualan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Laba Kotor yang Dihasilkan</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700 font-mono">
            {formatIDR(totalTeamGrossProfit)}
          </div>
          <span className="text-[11px] text-slate-500">
            GPM Rata-rata: <strong>{formatPercent(totalTeamRevenue > 0 ? totalTeamGrossProfit / totalTeamRevenue : 0)}</strong>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Biaya Operasional Dikelola</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-800 font-mono">
            {formatIDR(totalTeamExpensesManaged)}
          </div>
          <span className="text-[11px] text-slate-500">Post data operasional & marketing</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Person In Charge Aktif</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-extrabold text-purple-900 font-mono">
            {picMetricsList.length} Anggota
          </div>
          <span className="text-[11px] text-purple-600 font-medium">Lintas 4 divisi kerja</span>
        </div>
      </div>

      {/* VIEW 1: INDIVIDUAL PIC PERFORMANCE SCORECARD */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama PIC atau divisi..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Divisi:</span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="ALL">Semua Divisi</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Logistik">Logistik</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-700">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="revenue">Penjualan Terbanyak</option>
                  <option value="profit">Laba Kotor Tertinggi</option>
                  <option value="efficiency">Skor Efisiensi Terbesar</option>
                  <option value="orders">Jumlah Order Terbanyak</option>
                </select>
              </div>
            </div>

            <span className="text-slate-500">
              Menampilkan {filteredPics.length} anggota tim
            </span>
          </div>

          {/* PIC Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Tabel Kontribusi Individu Person In Charge (07_PIC)
                </h2>
                <p className="text-xs text-slate-500">
                  Mengukur hasil penjualan, efisiensi alokasi biaya, dan kanal marketplace yang dikelola
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Nama PIC</th>
                    <th className="py-3 px-3">Divisi</th>
                    <th className="py-3 px-3">Kanal Dioperasikan</th>
                    <th className="py-3 px-3 text-right">Order / Qty</th>
                    <th className="py-3 px-3 text-right font-bold">Total Penjualan</th>
                    <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/50 font-bold">Laba Kotor (GPM)</th>
                    <th className="py-3 px-3 text-right text-amber-900">Biaya Dikelola</th>
                    <th className="py-3 px-3 text-right font-bold text-blue-900 bg-blue-50/50">Kontribusi Bersih</th>
                    <th className="py-3 px-3 text-center">Efisiensi Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPics.map((pic) => (
                    <tr key={pic.picId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{pic.picName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{pic.picId} • {pic.defaultUnitName}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pic.picType === 'Marketing'
                              ? 'bg-purple-100 text-purple-800'
                              : pic.picType === 'Operasional'
                              ? 'bg-blue-100 text-blue-800'
                              : pic.picType === 'Finance'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pic.picType}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {pic.operatedChannels.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {pic.operatedChannels.map((c) => (
                              <span
                                key={c.marketplaceId}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                              >
                                {c.marketplaceName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Back-Office / Non-Kanal</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono">
                        <div className="font-semibold text-slate-800">{pic.ordersCount} order</div>
                        <div className="text-[10px] text-slate-400">{pic.unitsSold} pcs</div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatIDR(pic.grossSales)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono bg-emerald-50/30">
                        <div className="font-bold text-emerald-800">{formatIDR(pic.grossProfit)}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">{formatPercent(pic.gpm)}</div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-900">
                        {formatIDR(pic.managedExpenses)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono bg-blue-50/40">
                        <div className={`font-bold ${pic.netContribution >= 0 ? 'text-blue-900' : 'text-red-700'}`}>
                          {formatIDR(pic.netContribution)}
                        </div>
                        <div className="text-[10px] text-slate-500">Gross - Beban</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold font-mono ${
                            pic.overallEfficiencyScore >= 2.0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : pic.overallEfficiencyScore > 0
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {pic.overallEfficiencyScore > 0 ? `${pic.overallEfficiencyScore}x` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MAPPING TIM KE KANAL PENJUALAN & EFISIENSI PER KANAL */}
      {activeTab === 'channel_mapping' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Store className="w-4 h-4 text-blue-600" />
              <span>Matriks Pemetaan Anggota Tim Terhadap Kanal Penjualan Marketplace</span>
            </h2>
            <p className="text-xs text-slate-500">
              Menunjukkan efisiensi masing-masing PIC per saluran: omzet yang dihasilkan, laba kotor, dan rasio efisiensi terhadap biaya platform.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {channelMetricsList.map((mkt) => (
              <div key={mkt.marketplaceId} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Store className="w-4 h-4 text-blue-700" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{mkt.marketplaceName}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">{mkt.marketplaceId}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-slate-900 text-sm">{formatIDR(mkt.totalRevenue)}</div>
                    <div className="text-[10px] text-slate-500">{mkt.totalOrders} pesanan • GPM {formatPercent(mkt.gpm)}</div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <span className="text-xs font-semibold text-slate-600 block">
                    PIC yang Mengoperasikan Kanal Ini:
                  </span>

                  {mkt.assignedPics.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg">
                      Belum ada transaksi dengan PIC pada kanal ini.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mkt.assignedPics.map((p) => (
                        <div
                          key={p.picName}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center space-x-2">
                              <span>{p.picName}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-normal">
                                {p.picType}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Kontribusi: <strong>{formatPercent(p.shareOfChannelRevenue)}</strong> dari kanal ini
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="font-bold text-slate-900">{formatIDR(p.revenue)}</div>
                            <div className="text-[10px] text-emerald-700">Laba: {formatIDR(p.grossProfit)}</div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Efisiensi: {p.efficiencyScore}x
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: DEPARTMENT & GROUP LEVEL CONTRIBUTION */}
      {activeTab === 'department' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>Analisis Kontribusi Antar Divisi & Grup Kerja</span>
            </h2>
            <p className="text-xs text-slate-500">
              Membandingkan pendapatan yang dihasilkan vs beban biaya operasional yang dihabiskan per divisi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departmentMetrics.map((dept) => (
              <div key={dept.deptName} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Divisi {dept.deptName}</h3>
                    <span className="text-[10px] text-slate-500">{dept.memberCount} Anggota Tim</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {formatPercent(dept.revShare)} Omzet
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Penjualan:</span>
                    <strong className="font-mono text-slate-900">{formatIDR(dept.revenue)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Laba Kotor:</span>
                    <strong className="font-mono text-emerald-700">{formatIDR(dept.grossProfit)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Beban Biaya:</span>
                    <strong className="font-mono text-amber-800">{formatIDR(dept.expenses)}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Kontribusi Bersih:</span>
                    <strong className={`font-mono ${dept.netVal >= 0 ? 'text-blue-900' : 'text-red-700'}`}>
                      {formatIDR(dept.netVal)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Department Principles Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Prinsip Keuangan Master Specification (Section 20):</span>
            </div>
            <div>
              PIC bukan sumber utama penentuan Unit/Bucket. Bucket finansial ditentukan secara deterministik dari <strong>Account</strong>.
              PIC berfungsi sebagai dimensi pelaporan kinerja individu, alokasi posting beban kerja, dan evaluasi efisiensi kanal pemasaran.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
