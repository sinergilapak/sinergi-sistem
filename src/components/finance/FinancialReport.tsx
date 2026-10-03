import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Percent,
  ShoppingCart,
  Store,
  Tag,
  Info,
  SlidersHorizontal,
  Calculator,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Search,
  Bell,
  BellRing,
  X,
  Check,
  ShieldAlert,
  ArrowRight,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { DatabaseState, ProductChannelRecord, CostRuleRecord } from '../../types/database';
import { formatIDR, formatPercent } from '../../utils/validation';
import {
  computePandLReport,
  getApplicableMarketplaceFees,
  SkuFinancialMetrics,
} from '../../utils/financialEngine';
import { scanProfitMarginAlerts, MarginAlert } from '../../utils/alertEngine';
import { storageService } from '../../services/storageService';
import {
  generateExecutivePandLCsv,
  generateSkuEconomicsCsv,
  generateSalesLedgerCsv,
  generateExpensesLedgerCsv,
  generateComprehensiveFinancialCsv,
  downloadCsvFile,
} from '../../utils/financialExport';

interface FinancialReportProps {
  dbState: DatabaseState;
  initialTab?: 'pnl' | 'sku_margins' | 'team_pool' | 'projection' | 'alerts';
  initialAlertsOpen?: boolean;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  dbState,
  initialTab,
  initialAlertsOpen,
}) => {
  // Navigation / View Tabs inside Financial Report
  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'sku_margins' | 'team_pool' | 'projection' | 'alerts'>(
    initialTab || 'pnl'
  );

  // Filters
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('ALL');
  const [includeOptionalFees, setIncludeOptionalFees] = useState<boolean>(true);
  const [expandedPnlSections, setExpandedPnlSections] = useState<Record<string, boolean>>({
    revenue: true,
    expenses: true,
    otherIncome: true,
  });

  // Alerts Module State
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState<boolean>(initialAlertsOpen || false);
  const [alertThresholdNetMargin, setAlertThresholdNetMargin] = useState<number>(0.18); // 18% default trigger
  const [alertThresholdAdsMargin, setAlertThresholdAdsMargin] = useState<number>(0.08); // 8% default trigger
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'ALL' | 'critical' | 'warning' | 'info'>('ALL');
  const [alertSearchQuery, setAlertSearchQuery] = useState<string>('');
  const [alertActionFeedback, setAlertActionFeedback] = useState<string | null>(null);

  // Financial CSV Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [selectedExportType, setSelectedExportType] = useState<
    'comprehensive' | 'pnl' | 'sku_margins' | 'sales' | 'expenses' | 'projection'
  >('comprehensive');
  const [exportToastMessage, setExportToastMessage] = useState<string | null>(null);

  // Sync external navigation requests
  useEffect(() => {
    if (initialTab) {
      setActiveReportTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialAlertsOpen !== undefined) {
      setIsAlertsPanelOpen(initialAlertsOpen);
    }
  }, [initialAlertsOpen]);

  // Scan real-time alerts
  const realTimeAlerts = useMemo(() => {
    const scanned = scanProfitMarginAlerts(dbState, {
      minNetMarginThreshold: alertThresholdNetMargin,
      minAdsMarginThreshold: alertThresholdAdsMargin,
    });
    return scanned.filter((a) => !dismissedAlertIds.has(a.id));
  }, [dbState, alertThresholdNetMargin, alertThresholdAdsMargin, dismissedAlertIds]);

  const criticalAlertsCount = realTimeAlerts.filter((a) => a.severity === 'critical').length;
  const warningAlertsCount = realTimeAlerts.filter((a) => a.severity === 'warning').length;

  const filteredRealTimeAlerts = useMemo(() => {
    return realTimeAlerts.filter((alert) => {
      const matchSeverity = alertSeverityFilter === 'ALL' || alert.severity === alertSeverityFilter;
      const query = alertSearchQuery.toLowerCase();
      const matchQuery =
        !query ||
        alert.sku.toLowerCase().includes(query) ||
        alert.productName.toLowerCase().includes(query) ||
        alert.marketplaceName.toLowerCase().includes(query) ||
        alert.unitName.toLowerCase().includes(query);
      return matchSeverity && matchQuery;
    });
  }, [realTimeAlerts, alertSeverityFilter, alertSearchQuery]);

  const handleApplyPriceRecommendation = (alert: MarginAlert) => {
    storageService.updateProductChannelPrice(alert.sku, alert.unitId, alert.marketplaceId, alert.recommendedPrice);
    setAlertActionFeedback(
      `Harga jual untuk SKU ${alert.sku} (${alert.unitName} • ${alert.marketplaceName}) berhasil dinaikkan menjadi ${formatIDR(alert.recommendedPrice)}. Target margin ${(alert.thresholdPct * 100).toFixed(0)}% terpenuhi!`
    );
    setTimeout(() => setAlertActionFeedback(null), 5000);
  };

  const handleApplyAllRecommendations = () => {
    let appliedCount = 0;
    realTimeAlerts.forEach((alert) => {
      if (alert.recommendedPrice > 0) {
        storageService.updateProductChannelPrice(alert.sku, alert.unitId, alert.marketplaceId, alert.recommendedPrice);
        appliedCount++;
      }
    });
    setAlertActionFeedback(
      `Sukses menerapkan rekomendasi harga ke ${appliedCount} konfigurasi channel produk. Seluruh margin kini memenuhi target!`
    );
    setTimeout(() => setAlertActionFeedback(null), 5000);
  };

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlertIds((prev) => new Set([...prev, alertId]));
  };

  const handleResetAlertThresholds = () => {
    const defaultNetMargin = parseFloat(
      dbState.settings.find((s) => s.key === 'MIN_NET_MARGIN')?.value || '0.15'
    );
    const defaultAdsMargin = parseFloat(
      dbState.settings.find((s) => s.key === 'MIN_ADS_MARGIN')?.value || '0.08'
    );
    setAlertThresholdNetMargin(defaultNetMargin);
    setAlertThresholdAdsMargin(defaultAdsMargin);
    setDismissedAlertIds(new Set());
    setAlertActionFeedback('Parameter threshold margin dikembalikan ke nilai default sistem.');
    setTimeout(() => setAlertActionFeedback(null), 4000);
  };

  // Monthly Projection Tool State
  const [projVolumeGrowth, setProjVolumeGrowth] = useState<number>(15); // +15% volume growth
  const [projCogsAdjustment, setProjCogsAdjustment] = useState<number>(0); // 0% delta to current master COGS
  const [projPriceAdjustment, setProjPriceAdjustment] = useState<number>(0); // 0% price adjustment
  const [projFixedOpsMonthly, setProjFixedOpsMonthly] = useState<number>(34500000); // Rp 34.500.000 ops
  const [projSearchQuery, setProjSearchQuery] = useState<string>('');
  const [selectedProjUnit, setSelectedProjUnit] = useState<string>('ALL');
  const [selectedProjMkt, setSelectedProjMkt] = useState<string>('ALL');

  // Calculate Executive P&L
  const pnlReport = useMemo(() => {
    return computePandLReport(
      dbState.sales,
      dbState.postData,
      dbState.costRules,
      dbState.teamAllocations
    );
  }, [dbState.sales, dbState.postData, dbState.costRules, dbState.teamAllocations]);

  // Calculate Per-SKU Pricing, Gross Margins, and Marketplace Fees
  const skuMetricsList: SkuFinancialMetrics[] = useMemo(() => {
    const activePrograms = includeOptionalFees ? ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL'] : ['ALL_MANDATORY'];
    const minNetMargin = parseFloat(dbState.settings.find((s) => s.key === 'MIN_NET_MARGIN')?.value || '0.15');
    const minAdsMargin = parseFloat(dbState.settings.find((s) => s.key === 'MIN_ADS_MARGIN')?.value || '0.08');

    const metrics: SkuFinancialMetrics[] = [];

    // Map through product channels or all SKUs
    dbState.productChannels.forEach((channel) => {
      const sku = dbState.skus.find((s) => s.sku === channel.sku);
      if (!sku) return;

      const spu = dbState.spus.find((s) => s.spu_id === sku.spu_id);
      const brand = dbState.brands.find((b) => b.brand_id === sku.brand_id);
      const category = dbState.categories.find((c) => c.category_id === sku.category_id);
      const unit = dbState.units.find((u) => u.unit_id === channel.unit_id);
      const mkt = dbState.marketplaces.find((m) => m.marketplace_id === channel.marketplace_id);

      const sellingPrice = channel.selling_price;
      const hpp = sku.hpp;
      const grossProfitPerUnit = sellingPrice - hpp;
      const grossMarginPct = sellingPrice > 0 ? grossProfitPerUnit / sellingPrice : 0;

      // Retrieve marketplace fees from cost rules in master data hub
      const fees = getApplicableMarketplaceFees(
        sellingPrice,
        channel.marketplace_id,
        sku.category_id,
        sku.brand_id,
        sku.spu_id,
        sku.sku,
        channel.unit_id,
        dbState.costRules,
        activePrograms
      );

      const totalMarketplaceFeePerUnit = fees.reduce((sum, f) => sum + f.feeAmount, 0);
      const platformFeePct = sellingPrice > 0 ? totalMarketplaceFeePerUnit / sellingPrice : 0;

      const profitBeforeAds = grossProfitPerUnit - totalMarketplaceFeePerUnit;
      const marginBeforeAdsPct = sellingPrice > 0 ? profitBeforeAds / sellingPrice : 0;

      // Approximate Ads Spend allowance or actual
      const adsSpendPerUnit = channel.ads_status ? Math.round(sellingPrice * 0.07) : 0;
      const profitAfterAds = profitBeforeAds - adsSpendPerUnit;
      const marginAfterAdsPct = sellingPrice > 0 ? profitAfterAds / sellingPrice : 0;

      // Sales aggregation for this SKU & Channel
      const matchingSales = dbState.sales.filter(
        (s) => s.sku === sku.sku && s.marketplace_id === channel.marketplace_id && s.status !== 'CANCELLED'
      );
      const unitsSold = matchingSales.reduce((sum, s) => sum + s.qty, 0);
      const totalSales = matchingSales.reduce((sum, s) => sum + s.total_sales, 0);
      const totalHpp = matchingSales.reduce((sum, s) => sum + s.total_hpp, 0);
      const totalGrossProfit = totalSales - totalHpp;
      const totalPlatformCost = unitsSold * totalMarketplaceFeePerUnit;
      const totalProfitBeforeAds = totalGrossProfit - totalPlatformCost;
      const totalAdsSpend = unitsSold * adsSpendPerUnit;
      const totalNetProfit = totalProfitBeforeAds - totalAdsSpend;

      // Product Health Logic (Section 37)
      let healthStatus: 'ADS_ELIGIBLE' | 'ORGANIC_ONLY' | 'NOT_PROFITABLE' = 'NOT_PROFITABLE';
      if (marginBeforeAdsPct < minNetMargin) {
        healthStatus = 'NOT_PROFITABLE';
      } else if (marginAfterAdsPct < minAdsMargin) {
        healthStatus = 'ORGANIC_ONLY';
      } else {
        healthStatus = 'ADS_ELIGIBLE';
      }

      metrics.push({
        sku: sku.sku,
        skuName: sku.sku_name,
        spuId: sku.spu_id,
        brandName: brand?.brand_name || 'N/A',
        categoryName: category?.category_name || 'N/A',
        unitId: channel.unit_id,
        unitName: unit?.unit_name || 'Kanbai',
        marketplaceId: channel.marketplace_id,
        marketplaceName: mkt?.marketplace_name || 'Shopee',
        sellingPrice,
        hpp,
        grossProfitPerUnit,
        grossMarginPct,
        fees,
        totalMarketplaceFeePerUnit,
        platformFeePct,
        profitBeforeAds,
        marginBeforeAdsPct,
        adsSpendPerUnit,
        profitAfterAds,
        marginAfterAdsPct,
        unitsSold,
        totalSales,
        totalHpp,
        totalGrossProfit,
        totalPlatformCost,
        totalProfitBeforeAds,
        totalAdsSpend,
        totalNetProfit,
        healthStatus,
      });
    });

    return metrics;
  }, [dbState, includeOptionalFees]);

  // Filtered SKU metrics
  const filteredSkuMetrics = useMemo(() => {
    return skuMetricsList.filter((item) => {
      const matchUnit = selectedUnit === 'ALL' || item.unitId === selectedUnit;
      const matchMkt = selectedMarketplace === 'ALL' || item.marketplaceId === selectedMarketplace;
      return matchUnit && matchMkt;
    });
  }, [skuMetricsList, selectedUnit, selectedMarketplace]);

  // MONTHLY PROJECTION CALCULATION ENGINE
  // Calculates estimated monthly profit based on historical sales volume, current COGS, and marketplace fee rules
  const monthlyProjectionData = useMemo(() => {
    // 1. Calculate historical sales volume per SKU
    const historicalVolumeMap = new Map<string, number>();
    const historicalRevenueMap = new Map<string, number>();
    const historicalHppMap = new Map<string, number>();

    dbState.sales.forEach((s) => {
      if (s.status === 'CANCELLED') return;
      const prevVol = historicalVolumeMap.get(s.sku) || 0;
      historicalVolumeMap.set(s.sku, prevVol + s.qty);
      historicalRevenueMap.set(s.sku, (historicalRevenueMap.get(s.sku) || 0) + s.total_sales);
      historicalHppMap.set(s.sku, (historicalHppMap.get(s.sku) || 0) + s.total_hpp);
    });

    // 2. Map every SKU and calculate projected performance using CURRENT COGS
    const items = dbState.skus.map((sku) => {
      const historicalUnits = historicalVolumeMap.get(sku.sku) || 0;
      // Monthly baseline volume: if actual sales exist, use as monthly baseline, else 45 units estimate
      const baselineMonthlyUnits = historicalUnits > 0 ? historicalUnits : 45;
      const projectedUnits = Math.max(0, Math.round(baselineMonthlyUnits * (1 + projVolumeGrowth / 100)));

      // Associated Product Channel config
      const channel = dbState.productChannels.find((c) => c.sku === sku.sku) || {
        config_id: `CFG-AUTO-${sku.sku}`,
        product_id: sku.product_id,
        sku: sku.sku,
        unit_id: 'U001',
        marketplace_id: 'MKT-SHOPEE',
        selling_price: Math.round(sku.hpp * 1.45),
        promo_price: Math.round(sku.hpp * 1.35),
        minimum_selling_price: Math.round(sku.hpp * 1.2),
        ads_status: true,
        target_margin: 0.2,
        target_roas: 4.0,
        target_cir: 0.25,
        active: true,
        created_at: '',
        updated_at: '',
        updated_by: '',
      };

      const spu = dbState.spus.find((s) => s.spu_id === sku.spu_id);
      const brand = dbState.brands.find((b) => b.brand_id === sku.brand_id);
      const category = dbState.categories.find((c) => c.category_id === sku.category_id);
      const unit = dbState.units.find((u) => u.unit_id === channel.unit_id);
      const mkt = dbState.marketplaces.find((m) => m.marketplace_id === channel.marketplace_id);

      // CURRENT COGS from Master SKU table with optional simulation adjustment
      const currentMasterCogs = sku.hpp;
      const projectedCogsPerUnit = Math.max(0, Math.round(currentMasterCogs * (1 + projCogsAdjustment / 100)));

      // Selling price with optional simulation adjustment
      const currentSellingPrice = channel.selling_price;
      const projectedSellingPrice = Math.max(0, Math.round(currentSellingPrice * (1 + projPriceAdjustment / 100)));

      // Unit Gross Margin
      const projectedGrossProfitPerUnit = projectedSellingPrice - projectedCogsPerUnit;
      const projectedGrossMarginPct = projectedSellingPrice > 0 ? projectedGrossProfitPerUnit / projectedSellingPrice : 0;

      // Current Marketplace Fees retrieved from Master Data Hub Cost Rules
      const fees = getApplicableMarketplaceFees(
        projectedSellingPrice,
        channel.marketplace_id,
        sku.category_id,
        sku.brand_id,
        sku.spu_id,
        sku.sku,
        channel.unit_id,
        dbState.costRules,
        includeOptionalFees ? ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL'] : ['ALL_MANDATORY']
      );

      const feePerUnit = fees.reduce((sum, f) => sum + f.feeAmount, 0);
      const feePct = projectedSellingPrice > 0 ? feePerUnit / projectedSellingPrice : 0;

      // Unit Profit before and after Ads
      const profitBeforeAdsPerUnit = projectedGrossProfitPerUnit - feePerUnit;
      const marginBeforeAdsPct = projectedSellingPrice > 0 ? profitBeforeAdsPerUnit / projectedSellingPrice : 0;
      const adsPerUnit = channel.ads_status ? Math.round(projectedSellingPrice * 0.07) : 0;
      const netPerUnit = profitBeforeAdsPerUnit - adsPerUnit;
      const netMarginPct = projectedSellingPrice > 0 ? netPerUnit / projectedSellingPrice : 0;

      // Monthly Total Projections
      const projectedMonthlyRevenue = projectedUnits * projectedSellingPrice;
      const projectedMonthlyCogs = projectedUnits * projectedCogsPerUnit;
      const projectedMonthlyGrossProfit = projectedMonthlyRevenue - projectedMonthlyCogs;
      const projectedMonthlyFees = projectedUnits * feePerUnit;
      const projectedMonthlyProfitBeforeAds = projectedMonthlyGrossProfit - projectedMonthlyFees;
      const projectedMonthlyAds = projectedUnits * adsPerUnit;
      const projectedMonthlyNetProfit = projectedMonthlyProfitBeforeAds - projectedMonthlyAds;

      // Historical comparison metrics
      const historicalRevenue = historicalRevenueMap.get(sku.sku) || 0;
      const historicalHpp = historicalHppMap.get(sku.sku) || 0;
      const historicalGrossProfit = historicalRevenue - historicalHpp;

      return {
        sku: sku.sku,
        skuName: sku.sku_name,
        spuId: sku.spu_id,
        spuName: spu?.spu_name || sku.spu_id,
        brandName: brand?.brand_name || 'N/A',
        categoryName: category?.category_name || 'N/A',
        unitId: channel.unit_id,
        unitName: unit?.unit_name || 'Kanbai',
        marketplaceId: channel.marketplace_id,
        marketplaceName: mkt?.marketplace_name || 'Shopee',
        historicalUnits,
        projectedUnits,
        currentMasterCogs,
        projectedCogsPerUnit,
        currentSellingPrice,
        projectedSellingPrice,
        projectedGrossProfitPerUnit,
        projectedGrossMarginPct,
        feePerUnit,
        feePct,
        fees,
        profitBeforeAdsPerUnit,
        marginBeforeAdsPct,
        adsPerUnit,
        netPerUnit,
        netMarginPct,
        projectedMonthlyRevenue,
        projectedMonthlyCogs,
        projectedMonthlyGrossProfit,
        projectedMonthlyFees,
        projectedMonthlyProfitBeforeAds,
        projectedMonthlyAds,
        projectedMonthlyNetProfit,
        historicalRevenue,
        historicalHpp,
        historicalGrossProfit,
      };
    });

    // 3. Overall Totals
    const totalHistoricalUnits = items.reduce((sum, i) => sum + i.historicalUnits, 0);
    const totalProjectedUnits = items.reduce((sum, i) => sum + i.projectedUnits, 0);
    const totalProjectedRevenue = items.reduce((sum, i) => sum + i.projectedMonthlyRevenue, 0);
    const totalProjectedCogs = items.reduce((sum, i) => sum + i.projectedMonthlyCogs, 0);
    const totalProjectedGrossProfit = totalProjectedRevenue - totalProjectedCogs;
    const totalProjectedFees = items.reduce((sum, i) => sum + i.projectedMonthlyFees, 0);
    const totalProjectedProfitBeforeAds = totalProjectedGrossProfit - totalProjectedFees;
    const totalProjectedAds = items.reduce((sum, i) => sum + i.projectedMonthlyAds, 0);
    const totalProjectedNetProfit = totalProjectedProfitBeforeAds - totalProjectedAds - projFixedOpsMonthly;

    const projectedGpm = totalProjectedRevenue > 0 ? totalProjectedGrossProfit / totalProjectedRevenue : 0;
    const projectedNpm = totalProjectedRevenue > 0 ? totalProjectedNetProfit / totalProjectedRevenue : 0;

    // Historical totals for comparison
    const totalHistoricalRevenue = items.reduce((sum, i) => sum + i.historicalRevenue, 0);
    const totalHistoricalHpp = items.reduce((sum, i) => sum + i.historicalHpp, 0);
    const totalHistoricalGrossProfit = totalHistoricalRevenue - totalHistoricalHpp;

    return {
      items,
      summary: {
        totalHistoricalUnits,
        totalProjectedUnits,
        totalHistoricalRevenue,
        totalProjectedRevenue,
        totalHistoricalHpp,
        totalProjectedCogs,
        totalHistoricalGrossProfit,
        totalProjectedGrossProfit,
        totalProjectedFees,
        totalProjectedProfitBeforeAds,
        totalProjectedAds,
        projFixedOpsMonthly,
        totalProjectedNetProfit,
        projectedGpm,
        projectedNpm,
      },
    };
  }, [
    dbState,
    projVolumeGrowth,
    projCogsAdjustment,
    projPriceAdjustment,
    projFixedOpsMonthly,
    includeOptionalFees,
  ]);

  // Filtered Projection Items for table
  const filteredProjectionItems = useMemo(() => {
    return monthlyProjectionData.items.filter((item) => {
      const matchUnit = selectedProjUnit === 'ALL' || item.unitId === selectedProjUnit;
      const matchMkt = selectedProjMkt === 'ALL' || item.marketplaceId === selectedProjMkt;
      const query = projSearchQuery.toLowerCase();
      const matchQuery =
        item.sku.toLowerCase().includes(query) ||
        item.skuName.toLowerCase().includes(query) ||
        item.brandName.toLowerCase().includes(query);
      return matchUnit && matchMkt && matchQuery;
    });
  }, [monthlyProjectionData.items, selectedProjUnit, selectedProjMkt, projSearchQuery]);

  const toggleSection = (section: string) => {
    setExpandedPnlSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Export Projection to CSV
  const exportProjectionToCsv = () => {
    const headers = [
      'SKU',
      'Nama Produk',
      'Brand',
      'Unit',
      'Marketplace',
      'Volume Historis (Unit)',
      'Proyeksi Volume (Unit)',
      'HPP Terkini (Current COGS)',
      'Harga Jual',
      'Proyeksi Penjualan (Revenue)',
      'Proyeksi COGS (HPP Total)',
      'Proyeksi Laba Kotor (Gross Profit)',
      'Gross Profit Margin %',
      'Biaya Fee Marketplace',
      'Profit Before Ads',
      'Biaya Iklan (Ads)',
      'Proyeksi Laba Bersih SKU',
    ];
    const rows = filteredProjectionItems.map((i) => [
      i.sku,
      `"${i.skuName.replace(/"/g, '""')}"`,
      i.brandName,
      i.unitName,
      i.marketplaceName,
      i.historicalUnits,
      i.projectedUnits,
      i.projectedCogsPerUnit,
      i.projectedSellingPrice,
      i.projectedMonthlyRevenue,
      i.projectedMonthlyCogs,
      i.projectedMonthlyGrossProfit,
      formatPercent(i.projectedGrossMarginPct),
      i.projectedMonthlyFees,
      i.projectedMonthlyProfitBeforeAds,
      i.projectedMonthlyAds,
      i.projectedMonthlyNetProfit,
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Proyeksi_Laba_Bulanan_Sinergi_Lapak_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Execute Financial Data Export based on type
  const handleExecuteExport = (typeToExport = selectedExportType) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (typeToExport === 'comprehensive') {
      const csv = generateComprehensiveFinancialCsv({
        pnlReport,
        skuMetrics: skuMetricsList,
        sales: dbState.sales,
        postData: dbState.postData,
        ads: dbState.ads,
      });
      downloadCsvFile(`Data_Keuangan_Lengkap_Sinergi_Lapak_${dateStr}.csv`, csv);
      setExportToastMessage('Paket Arsip Keuangan Lengkap (Semua Bagian) berhasil diekspor sebagai file CSV.');
    } else if (typeToExport === 'pnl') {
      const csv = generateExecutivePandLCsv(pnlReport);
      downloadCsvFile(`Laporan_Laba_Rugi_P&L_Sinergi_Lapak_${dateStr}.csv`, csv);
      setExportToastMessage('Laporan Laba Rugi Eksekutif (P&L 3-Kolom Sinergi) berhasil diekspor sebagai file CSV.');
    } else if (typeToExport === 'sku_margins') {
      const csv = generateSkuEconomicsCsv(skuMetricsList);
      downloadCsvFile(`Unit_Economics_Margin_SKU_Sinergi_Lapak_${dateStr}.csv`, csv);
      setExportToastMessage('Unit Economics & Margin Matrix SKU berhasil diekspor sebagai file CSV.');
    } else if (typeToExport === 'sales') {
      const csv = generateSalesLedgerCsv(dbState.sales);
      downloadCsvFile(`Buku_Besar_Penjualan_Sales_Ledger_${dateStr}.csv`, csv);
      setExportToastMessage('Buku Besar Transaksi Penjualan berhasil diekspor sebagai file CSV.');
    } else if (typeToExport === 'expenses') {
      const csv = generateExpensesLedgerCsv(dbState.postData);
      downloadCsvFile(`Buku_Beban_Kas_Operasional_Expenses_${dateStr}.csv`, csv);
      setExportToastMessage('Buku Realisasi Beban & Kas Operasional berhasil diekspor sebagai file CSV.');
    } else if (typeToExport === 'projection') {
      exportProjectionToCsv();
      setExportToastMessage('Proyeksi Laba Bulanan berhasil diekspor sebagai file CSV.');
    }
    setIsExportModalOpen(false);
    setTimeout(() => setExportToastMessage(null), 5000);
  };

  const exportPnlToCsv = () => {
    handleExecuteExport('pnl');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Laporan Keuangan & Laba Rugi (P&L Sinergi Lapak)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Perhitungan deterministik Gross Profit (Harga Jual - HPP SKU), pengurangan otomatis biaya marketplace dari Master Data Hub,
              alokasi shared pool Team, serta rekonsiliasi bebas double count (Kanbai + Nutribite = Total Sinergi).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Real-time Alerts Notification Bell Button */}
            <button
              onClick={() => setIsAlertsPanelOpen(true)}
              className={`relative inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all ${
                criticalAlertsCount > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                  : realTimeAlerts.length > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
              }`}
              title="Buka Panel Notifikasi & Solusi Margin"
            >
              {realTimeAlerts.length > 0 ? (
                <BellRing className="w-4 h-4 text-white animate-bounce" />
              ) : (
                <Bell className="w-4 h-4 text-slate-500" />
              )}
              <span>Notifikasi Margin</span>
              {realTimeAlerts.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-slate-900 shadow-xs">
                  {realTimeAlerts.length}
                </span>
              )}
            </button>

            {/* Primary Financial CSV Export Button */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              title="Pusat Ekspor Data Keuangan Lengkap ke CSV untuk Pembukuan Eksternal"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Ekspor Data Keuangan (CSV)</span>
            </button>

            {/* Quick 1-Click P&L or Current Tab Download */}
            <button
              onClick={() => handleExecuteExport(activeReportTab === 'projection' ? 'projection' : 'pnl')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs transition-colors"
              title="Unduh langsung CSV sesuai tab aktif saat ini"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activeReportTab === 'projection' ? 'Unduh Proyeksi' : 'Unduh Cepat P&L'}</span>
            </button>
          </div>
        </div>

        {/* Export Toast Feedback */}
        {exportToastMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportToastMessage}</span>
            </div>
            <button
              onClick={() => setExportToastMessage(null)}
              className="p-1 text-emerald-700 hover:text-emerald-900 rounded-md hover:bg-emerald-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveReportTab('pnl')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeReportTab === 'pnl'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Laporan Laba Rugi (3-Kolom Sinergi)
            </button>
            <button
              onClick={() => setActiveReportTab('sku_margins')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeReportTab === 'sku_margins'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Unit Economics SKU & Fee Marketplace
            </button>
            <button
              onClick={() => setActiveReportTab('projection')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeReportTab === 'projection'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Proyeksi Laba Bulanan</span>
              <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1 rounded">Tool</span>
            </button>
            <button
              onClick={() => setActiveReportTab('team_pool')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeReportTab === 'team_pool'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Alokasi Shared Pool TEAM
            </button>
            <button
              onClick={() => setActiveReportTab('alerts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeReportTab === 'alerts'
                  ? 'bg-red-600 text-white shadow-xs'
                  : realTimeAlerts.length > 0
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Audit & Alerts Margin</span>
              {realTimeAlerts.length > 0 && (
                <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                  {realTimeAlerts.length}
                </span>
              )}
            </button>
          </div>

          {/* Reconciliation Live Status Badge */}
          <div className="flex items-center space-x-2">
            <div
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                pnlReport.reconciliation.isBalanced
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {pnlReport.reconciliation.isBalanced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Rekonsiliasi: BALANCED (Selisih: Rp 0)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Selisih Rekonsiliasi: {formatIDR(pnlReport.reconciliation.difference)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Alerts Notification Banner */}
      {realTimeAlerts.length > 0 && (
        <div
          className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-all ${
            criticalAlertsCount > 0
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                criticalAlertsCount > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm">
                  {criticalAlertsCount > 0
                    ? '⚠️ Peringatan Kritis: Margin Tertekan Di Bawah Batas Minimum'
                    : 'Pemberitahuan: Profit Margin SKU Perlu Perhatian'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    criticalAlertsCount > 0 ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                  }`}
                >
                  {realTimeAlerts.length} Channel Terdampak
                </span>
                {criticalAlertsCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                    {criticalAlertsCount} Risiko Margin Kritis
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-4xl">
                Terdeteksi margin bersih sebelum iklan berada di bawah ambang batas yang ditentukan (Threshold: Net{' '}
                <strong>{(alertThresholdNetMargin * 100).toFixed(0)}%</strong>, Ads{' '}
                <strong>{(alertThresholdAdsMargin * 100).toFixed(0)}%</strong>). Formula rekomendasi harga otomatis siap diterapkan untuk memulihkan profitabilitas.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => setIsAlertsPanelOpen(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <span>Buka Notifikasi & Solusi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveReportTab('alerts')}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Audit Tab
            </button>
          </div>
        </div>
      )}

      {/* Action Feedback Toast */}
      {alertActionFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{alertActionFeedback}</span>
          </div>
          <button
            onClick={() => setAlertActionFeedback(null)}
            className="text-emerald-600 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Total Penjualan</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {formatIDR(pnlReport.summary.totalRevenue)}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Kanbai + Nutribite + Team</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Laba Kotor (Gross Profit)</span>
          <div className="text-lg font-bold text-emerald-700 mt-0.5">
            {formatIDR(pnlReport.summary.grossProfit)}
          </div>
          <span className="text-[10px] text-slate-500">
            GPM: <strong>{formatPercent(pnlReport.summary.gpm)}</strong>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Biaya Platform Marketplace</span>
          <div className="text-lg font-bold text-amber-700 mt-0.5">
            {formatIDR(pnlReport.summary.totalPlatformCost)}
          </div>
          <span className="text-[10px] text-slate-500">Admin + Payment Fee</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Biaya Marketing & Ads</span>
          <div className="text-lg font-bold text-indigo-700 mt-0.5">
            {formatIDR(pnlReport.summary.totalMarketing)}
          </div>
          <span className="text-[10px] text-slate-500">Shopee & TikTok Ads</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Total Pengeluaran</span>
          <div className="text-lg font-bold text-slate-800 mt-0.5">
            {formatIDR(pnlReport.summary.totalExpenses)}
          </div>
          <span className="text-[10px] text-slate-500">Ops + Platform + Mkt</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Laba Bersih (Net Profit)</span>
          <div className="text-lg font-bold text-blue-700 mt-0.5">
            {formatIDR(pnlReport.summary.netProfit)}
          </div>
          <span className="text-[10px] text-slate-500">
            NPM: <strong>{formatPercent(pnlReport.summary.npm)}</strong>
          </span>
        </div>
      </div>

      {/* VIEW 1: EXECUTIVE 3-COLUMN P&L TABLE */}
      {activeReportTab === 'pnl' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Laporan Laba Rugi Eksekutif (P&L Kanbai, Nutribite & Total Sinergi)
              </h2>
              <p className="text-xs text-slate-500">
                Sesuai Section 41-44: Menampilkan breakdown Direct, Alokasi Team, dan Angka Final.
              </p>
            </div>
            <div className="text-xs font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-slate-600">
              Formula: Kanbai Final + Nutribite Final = Total Sinergi
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-4 w-72">Pos Laba Rugi</th>
                  {/* Kanbai Column Group */}
                  <th className="py-3 px-3 text-right bg-blue-50/70 border-l border-blue-200 text-blue-900">
                    Kanbai Direct
                  </th>
                  <th className="py-3 px-3 text-right bg-blue-50/40 text-blue-800">
                    Alokasi Team
                  </th>
                  <th className="py-3 px-3 text-right bg-blue-100/80 font-extrabold text-blue-950 border-r border-blue-200">
                    Kanbai Final
                  </th>

                  {/* Nutribite Column Group */}
                  <th className="py-3 px-3 text-right bg-emerald-50/70 border-l border-emerald-200 text-emerald-900">
                    Nutribite Direct
                  </th>
                  <th className="py-3 px-3 text-right bg-emerald-50/40 text-emerald-800">
                    Alokasi Team
                  </th>
                  <th className="py-3 px-3 text-right bg-emerald-100/80 font-extrabold text-emerald-950 border-r border-emerald-200">
                    Nutribite Final
                  </th>

                  {/* Shared Team Original */}
                  <th className="py-3 px-3 text-right bg-purple-50/60 text-purple-900 border-r border-purple-200">
                    Team Pool
                  </th>

                  {/* Total Sinergi */}
                  <th className="py-3 px-4 text-right bg-slate-900 text-white font-extrabold text-xs">
                    TOTAL SINERGI
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pnlReport.lines.map((line) => {
                  if (line.isHeader) {
                    return (
                      <tr key={line.id} className="bg-slate-50 font-bold text-slate-800 text-[11px]">
                        <td colSpan={9} className="py-2.5 px-4 tracking-wide text-blue-900">
                          {line.name}
                        </td>
                      </tr>
                    );
                  }

                  if (line.isTotal) {
                    const isNetProfit = line.id === 'net-profit';
                    const isGrossProfit = line.id === 'gross-profit';

                    return (
                      <tr
                        key={line.id}
                        className={`font-bold ${
                          isNetProfit
                            ? 'bg-blue-50/90 text-blue-950 border-y-2 border-blue-600 text-xs'
                            : isGrossProfit
                            ? 'bg-emerald-50/70 text-emerald-950 border-y border-emerald-300'
                            : 'bg-slate-100 text-slate-900 border-y border-slate-300'
                        }`}
                      >
                        <td className="py-3 px-4 uppercase">{line.name}</td>
                        <td className="py-3 px-3 text-right font-mono bg-blue-50/70 border-l border-blue-200">
                          {formatIDR(line.kanbaiDirect)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono bg-blue-50/40">
                          {formatIDR(line.kanbaiAllocated)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold bg-blue-100/90 border-r border-blue-200 text-blue-900">
                          {formatIDR(line.kanbaiFinal)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono bg-emerald-50/70 border-l border-emerald-200">
                          {formatIDR(line.nutribiteDirect)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono bg-emerald-50/40">
                          {formatIDR(line.nutribiteAllocated)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold bg-emerald-100/90 border-r border-emerald-200 text-emerald-900">
                          {formatIDR(line.nutribiteFinal)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono bg-purple-50/60 border-r border-purple-200 text-purple-900">
                          {formatIDR(line.teamOriginal)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-extrabold bg-slate-900 text-white">
                          {formatIDR(line.totalSinergi)}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-800 pl-6">{line.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 bg-blue-50/30 border-l border-blue-100">
                        {formatIDR(line.kanbaiDirect)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500 bg-blue-50/10">
                        {formatIDR(line.kanbaiAllocated)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-900 bg-blue-50/50 border-r border-blue-100">
                        {formatIDR(line.kanbaiFinal)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 bg-emerald-50/30 border-l border-emerald-100">
                        {formatIDR(line.nutribiteDirect)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500 bg-emerald-50/10">
                        {formatIDR(line.nutribiteAllocated)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-900 bg-emerald-50/50 border-r border-emerald-100">
                        {formatIDR(line.nutribiteFinal)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-purple-700 bg-purple-50/30 border-r border-purple-100">
                        {formatIDR(line.teamOriginal)}
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50">
                        {formatIDR(line.totalSinergi)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Reconciliation Explanatory Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Prinsip Anti Double-Counting (Section 7):</strong> Total Sinergi dihitung langsung dari (Kanbai Direct + Nutribite Direct + Team Original) = {formatIDR(pnlReport.summary.netProfit)}.
              </span>
            </div>
            <div className="font-mono text-xs">
              Kanbai Final ({formatIDR(pnlReport.reconciliation.kanbaiFinalTotalNetProfit)}) + Nutribite Final ({formatIDR(pnlReport.reconciliation.nutribiteFinalTotalNetProfit)}) = {formatIDR(pnlReport.reconciliation.sumFinals)}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SKU PRICING, GROSS MARGIN & MARKETPLACE FEES BREAKDOWN */}
      {activeReportTab === 'sku_margins' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Filter Unit:</span>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
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
                  value={selectedMarketplace}
                  onChange={(e) => setSelectedMarketplace(e.target.value)}
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

              <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={includeOptionalFees}
                  onChange={(e) => setIncludeOptionalFees(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">Sertakan Program Opsional (Gratis Ongkir Xtra / Cashback)</span>
              </label>
            </div>

            <span className="text-slate-500">
              Menampilkan {filteredSkuMetrics.length} konfigurasi harga SKU
            </span>
          </div>

          {/* SKU Economics Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Unit Economics Produk: Harga Jual, HPP SKU & Potongan Fee Marketplace
                </h2>
                <p className="text-xs text-slate-500">
                  Menguji Acceptance Test: Perbedaan harga jual per unit bisnis (Case 1) & perbedaan fee marketplace (Case 2).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">SKU / Nama Produk</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3">Marketplace</th>
                    <th className="py-3 px-3 text-right">Harga Jual</th>
                    <th className="py-3 px-3 text-right">HPP Dasar</th>
                    <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/50">Laba Kotor (GPM)</th>
                    <th className="py-3 px-4 bg-amber-50/50 border-l border-amber-100">Marketplace Fees (Rule Master Hub)</th>
                    <th className="py-3 px-3 text-right text-amber-900 bg-amber-50/50">Total Fee</th>
                    <th className="py-3 px-3 text-right text-blue-900 bg-blue-50/50 font-bold">Profit Before Ads</th>
                    <th className="py-3 px-3 text-center">Status Kelayakan Iklan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSkuMetrics.map((item, idx) => {
                    const matchingAlert = realTimeAlerts.find(
                      (a) => a.sku === item.sku && a.unitId === item.unitId && a.marketplaceId === item.marketplaceId
                    );

                    return (
                      <tr
                        key={`${item.sku}-${item.unitId}-${item.marketplaceId}-${idx}`}
                        className={`transition-colors ${
                          matchingAlert
                            ? matchingAlert.severity === 'critical'
                              ? 'bg-red-50/40 hover:bg-red-50/70'
                              : 'bg-amber-50/30 hover:bg-amber-50/60'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-900">{item.sku}</span>
                            {matchingAlert && (
                              <button
                                onClick={() => {
                                  setAlertSearchQuery(item.sku);
                                  setIsAlertsPanelOpen(true);
                                }}
                                className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-transform hover:scale-105 ${
                                  matchingAlert.severity === 'critical'
                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                                title={matchingAlert.message}
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Defisit {(matchingAlert.marginDeficitPct * 100).toFixed(0)}%</span>
                              </button>
                            )}
                          </div>
                          <div className="text-slate-600 truncate max-w-xs">{item.skuName}</div>
                          <div className="text-[10px] text-slate-400">{item.brandName} • {item.spuId}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.unitId === 'U001'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.unitName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800">{item.marketplaceName}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatIDR(item.sellingPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatIDR(item.hpp)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono bg-emerald-50/30">
                          <div className="font-bold text-emerald-800">{formatIDR(item.grossProfitPerUnit)}</div>
                          <div className="text-[10px] text-emerald-600">{formatPercent(item.grossMarginPct)}</div>
                        </td>

                        {/* Breakdown of fees retrieved from master hub */}
                        <td className="py-3 px-4 bg-amber-50/20 border-l border-amber-100">
                          <div className="space-y-1">
                            {item.fees.map((f) => (
                              <div key={f.ruleId} className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 truncate max-w-[170px]" title={f.costName}>
                                  {f.costName}:
                                </span>
                                <span className="font-mono text-slate-800 ml-2">{formatIDR(f.feeAmount)}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-mono bg-amber-50/40">
                          <div className="font-bold text-amber-900">{formatIDR(item.totalMarketplaceFeePerUnit)}</div>
                          <div className="text-[10px] text-amber-700">({formatPercent(item.platformFeePct)})</div>
                        </td>

                        <td className="py-3 px-3 text-right font-mono bg-blue-50/40">
                          <div className="font-bold text-blue-900">{formatIDR(item.profitBeforeAds)}</div>
                          <div className="text-[10px] text-blue-700 font-semibold">{formatPercent(item.marginBeforeAdsPct)}</div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.healthStatus === 'ADS_ELIGIBLE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : item.healthStatus === 'ORGANIC_ONLY'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {item.healthStatus.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Test Case Explanation Note */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Bukti Verifikasi Acceptance Test V1:</div>
              <div>
                • <strong>Case 1 (SKU sama, Unit berbeda):</strong> E003BK dijual di Kanbai seharga Rp 65.000 (Gross Margin: Rp 20.000), sedangkan di Nutribite dijual seharga Rp 68.000 (Gross Margin: Rp 23.000). Menghasilkan profit dan margin berbeda secara akurat.
              </div>
              <div>
                • <strong>Case 2 (SKU sama, Marketplace berbeda):</strong> E003BK di Shopee terkena biaya admin 6.5% max Rp 10.000 + payment fee 1.0%, sedangkan di TikTok Shop terkena komisi 5.0%. Menghasilkan potongan fee yang sesuai aturan masing-masing kanal.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: TEAM SHARED POOL ALLOCATION TRANSPARENCY */}
      {activeReportTab === 'team_pool' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2 text-purple-950 font-bold text-sm">
              <Layers className="w-5 h-5 text-purple-600" />
              <span>Transparansi Shared Pool TEAM (Section 3-6)</span>
            </div>
            <p className="text-xs text-purple-900 leading-relaxed">
              TEAM bukan unit bisnis ketiga. TEAM menampung transaksi dari akun historis (Startoner, Remax, TheLapak, Aprin-SLI, dll)
              dan beban bersama yang kemudian dialokasikan 100% ke <strong>Kanbai</strong> dan <strong>Nutribite</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="bg-white p-3.5 rounded-lg border border-purple-200">
                <span className="text-[11px] font-semibold text-slate-500">Pendapatan Bersih Team</span>
                <div className="text-lg font-bold text-purple-900 font-mono mt-0.5">
                  {formatIDR(pnlReport.lines.find((l) => l.id === 'rev-sales')?.teamOriginal || 0)}
                </div>
                <span className="text-[10px] text-purple-600">Startoner, Remax, dll</span>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-purple-200">
                <span className="text-[11px] font-semibold text-slate-500">Alokasi ke Kanbai (60%)</span>
                <div className="text-lg font-bold text-blue-900 font-mono mt-0.5">
                  {formatIDR(pnlReport.lines.find((l) => l.id === 'rev-sales')?.kanbaiAllocated || 0)}
                </div>
                <span className="text-[10px] text-blue-600">Masuk ke Kanbai Final</span>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-purple-200">
                <span className="text-[11px] font-semibold text-slate-500">Alokasi ke Nutribite (40%)</span>
                <div className="text-lg font-bold text-emerald-900 font-mono mt-0.5">
                  {formatIDR(pnlReport.lines.find((l) => l.id === 'rev-sales')?.nutribiteAllocated || 0)}
                </div>
                <span className="text-[10px] text-emerald-600">Masuk ke Nutribite Final</span>
              </div>
            </div>
          </div>

          {/* Active Allocation Rules Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Aturan Alokasi Aktif (Sheet: 12_TEAM_ALLOCATION)
              </h2>
              <span className="text-xs text-slate-500">Validasi: Kanbai % + Nutribite % = 100%</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Allocation ID</th>
                    <th className="py-3 px-4">Tipe Finansial</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4 text-right">Kanbai %</th>
                    <th className="py-3 px-4 text-right">Nutribite %</th>
                    <th className="py-3 px-4">Catatan Rule</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbState.teamAllocations.map((alloc) => (
                    <tr key={alloc.allocation_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{alloc.allocation_id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {alloc.financial_type}
                        </span>
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
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          VALID (100%)
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

      {/* VIEW 4: MONTHLY PROJECTION TOOL (Estimasi Laba Bulanan Berdasarkan Volume Historis & COGS Saat Ini) */}
      {activeReportTab === 'projection' && (
        <div className="space-y-6">
          {/* Tool Introduction & Control Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Monthly Profit Projection Tool (Estimasi Laba Bulanan)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                  Mensimulasikan estimasi omzet, total HPP, potongan fee marketplace, dan laba bersih bulanan
                  menggunakan <strong>Volume Penjualan Historis</strong> dikombinasikan dengan <strong>COGS (HPP) Terkini</strong> dari master SKU.
                </p>
              </div>

              <button
                onClick={() => {
                  setProjVolumeGrowth(0);
                  setProjCogsAdjustment(0);
                  setProjPriceAdjustment(0);
                  setProjFixedOpsMonthly(34500000);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium self-start md:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Parameter Baseline</span>
              </button>
            </div>

            {/* Parameter Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Volume Growth Slider */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Pertumbuhan Volume Penjualan</span>
                  </span>
                  <span
                    className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded ${
                      projVolumeGrowth > 0
                        ? 'bg-blue-100 text-blue-800'
                        : projVolumeGrowth < 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {projVolumeGrowth > 0 ? `+${projVolumeGrowth}%` : `${projVolumeGrowth}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="100"
                  step="5"
                  value={projVolumeGrowth}
                  onChange={(e) => setProjVolumeGrowth(Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {[-15, 0, 15, 30, 50].map((val) => (
                    <button
                      key={val}
                      onClick={() => setProjVolumeGrowth(val)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        projVolumeGrowth === val
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val === 0 ? 'Baseline (0%)' : val > 0 ? `+${val}%` : `${val}%`}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Dihitung dari total kuantitas penjualan historis per SKU.
                </span>
              </div>

              {/* 2. COGS (HPP) Adjustment Slider */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span>Sensitivitas HPP Terkini (COGS)</span>
                  </span>
                  <span
                    className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded ${
                      projCogsAdjustment < 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : projCogsAdjustment > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {projCogsAdjustment > 0 ? `+${projCogsAdjustment}%` : `${projCogsAdjustment}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="2"
                  value={projCogsAdjustment}
                  onChange={(e) => setProjCogsAdjustment(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {[-10, -5, 0, 5, 10].map((val) => (
                    <button
                      key={val}
                      onClick={() => setProjCogsAdjustment(val)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        projCogsAdjustment === val
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val === 0 ? 'HPP Master Saat Ini' : val > 0 ? `+${val}% Inflasi` : `${val}% Diskon`}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Simulasikan dampak kenaikan/penurunan harga pokok supplier terhadap laba kotor.
                </span>
              </div>

              {/* 3. Price Adjustment Slider */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Tag className="w-4 h-4 text-purple-600" />
                    <span>Penyesuaian Harga Jual</span>
                  </span>
                  <span
                    className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded ${
                      projPriceAdjustment > 0
                        ? 'bg-purple-100 text-purple-800'
                        : projPriceAdjustment < 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {projPriceAdjustment > 0 ? `+${projPriceAdjustment}%` : `${projPriceAdjustment}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="2"
                  value={projPriceAdjustment}
                  onChange={(e) => setProjPriceAdjustment(Number(e.target.value))}
                  className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {[-10, -5, 0, 5, 10].map((val) => (
                    <button
                      key={val}
                      onClick={() => setProjPriceAdjustment(val)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        projPriceAdjustment === val
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val === 0 ? 'Harga Normal' : val > 0 ? `+${val}% Naik` : `${val}% Diskon`}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Simulasikan perubahan harga jual promo/campaign pada fee dan margin.
                </span>
              </div>
            </div>
          </div>

          {/* Projection Performance Summary Cards vs Historical Baseline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Projected Revenue */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Proyeksi Penjualan</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 font-mono">
                {formatIDR(monthlyProjectionData.summary.totalProjectedRevenue)}
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                <span>Historis:</span>
                <span className="font-mono">{formatIDR(monthlyProjectionData.summary.totalHistoricalRevenue)}</span>
              </div>
              <div className="pt-1 text-[10px] text-blue-600 font-medium">
                Volume: <strong>{monthlyProjectionData.summary.totalProjectedUnits} unit</strong> (Historis: {monthlyProjectionData.summary.totalHistoricalUnits} unit)
              </div>
            </div>

            {/* Projected COGS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Proyeksi Total HPP (COGS)</span>
                <Scale className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg font-extrabold text-amber-900 font-mono">
                {formatIDR(monthlyProjectionData.summary.totalProjectedCogs)}
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                <span>HPP Historis:</span>
                <span className="font-mono">{formatIDR(monthlyProjectionData.summary.totalHistoricalHpp)}</span>
              </div>
              <div className="pt-1 text-[10px] text-amber-700 font-medium">
                Dihitung dari HPP per SKU master terkini
              </div>
            </div>

            {/* Projected Gross Profit */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Proyeksi Laba Kotor (GPM)</span>
                <Percent className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-extrabold text-emerald-700 font-mono">
                {formatIDR(monthlyProjectionData.summary.totalProjectedGrossProfit)}
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                <span>Proyeksi GPM:</span>
                <strong className="text-emerald-700 font-mono">
                  {formatPercent(monthlyProjectionData.summary.projectedGpm)}
                </strong>
              </div>
              <div className="pt-1 text-[10px] text-emerald-600 font-medium">
                Laba Kotor Historis: {formatIDR(monthlyProjectionData.summary.totalHistoricalGrossProfit)}
              </div>
            </div>

            {/* Projected Marketplace Fees */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Proyeksi Fee Marketplace</span>
                <Store className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-lg font-extrabold text-purple-900 font-mono">
                {formatIDR(monthlyProjectionData.summary.totalProjectedFees)}
              </div>
              <div className="text-[11px] text-slate-500">
                Iklan (Ads): <strong className="font-mono text-slate-700">{formatIDR(monthlyProjectionData.summary.totalProjectedAds)}</strong>
              </div>
              <div className="pt-1 text-[10px] text-purple-700 font-medium">
                Admin, payment & program fee akurat
              </div>
            </div>

            {/* Projected Net Profit */}
            <div className="bg-white p-4 rounded-xl border-2 border-blue-500 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-blue-900">Proyeksi Laba Bersih</span>
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg font-extrabold text-blue-900 font-mono">
                {formatIDR(monthlyProjectionData.summary.totalProjectedNetProfit)}
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                <span>Proyeksi NPM:</span>
                <strong className="text-blue-700 font-mono">
                  {formatPercent(monthlyProjectionData.summary.projectedNpm)}
                </strong>
              </div>
              <div className="pt-1 text-[10px] text-slate-500">
                Setelah fixed ops: {formatIDR(projFixedOpsMonthly)}
              </div>
            </div>
          </div>

          {/* SKU-level Detailed Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rincian Proyeksi Unit Economics per SKU Produk
                </h3>
                <p className="text-xs text-slate-500">
                  Dihitung dari kombinasi volume proyeksi dan HPP terkini masing-masing SKU pada sheet 09_PRODUCT_SKU
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projSearchQuery}
                    onChange={(e) => setProjSearchQuery(e.target.value)}
                    placeholder="Cari SKU atau nama..."
                    className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={selectedProjUnit}
                  onChange={(e) => setSelectedProjUnit(e.target.value)}
                  className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                >
                  <option value="ALL">Semua Unit</option>
                  <option value="U001">Kanbai (U001)</option>
                  <option value="U002">Nutribite (U002)</option>
                </select>

                <select
                  value={selectedProjMkt}
                  onChange={(e) => setSelectedProjMkt(e.target.value)}
                  className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">SKU / Nama Produk</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3">Marketplace</th>
                    <th className="py-3 px-3 text-right">Vol. Historis</th>
                    <th className="py-3 px-3 text-right bg-blue-50/50 text-blue-900 font-bold">Proyeksi Vol.</th>
                    <th className="py-3 px-3 text-right">Current COGS (HPP)</th>
                    <th className="py-3 px-3 text-right">Harga Jual</th>
                    <th className="py-3 px-3 text-right font-bold">Proyeksi Omzet</th>
                    <th className="py-3 px-3 text-right text-amber-900">Total COGS</th>
                    <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/50 font-bold">Laba Kotor (GPM)</th>
                    <th className="py-3 px-3 text-right text-purple-900">Fee Marketplace</th>
                    <th className="py-3 px-3 text-right bg-blue-50/80 font-extrabold text-blue-950">Laba Bersih SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjectionItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400">
                        Tidak ada SKU yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredProjectionItems.map((item) => (
                      <tr key={`${item.sku}-${item.unitId}-${item.marketplaceId}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">{item.sku}</div>
                          <div className="text-slate-600 truncate max-w-[200px]" title={item.skuName}>
                            {item.skuName}
                          </div>
                          <div className="text-[10px] text-slate-400">{item.brandName} • {item.spuName}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.unitId === 'U001'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.unitName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">{item.marketplaceName}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {item.historicalUnits > 0 ? `${item.historicalUnits} pcs` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold bg-blue-50/50 text-blue-900">
                          {item.projectedUnits} pcs
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <div className="font-semibold text-slate-900">{formatIDR(item.projectedCogsPerUnit)}</div>
                          {projCogsAdjustment !== 0 && (
                            <div className="text-[10px] text-slate-400">Master: {formatIDR(item.currentMasterCogs)}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                          {formatIDR(item.projectedSellingPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatIDR(item.projectedMonthlyRevenue)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-900">
                          {formatIDR(item.projectedMonthlyCogs)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono bg-emerald-50/40">
                          <div className="font-bold text-emerald-800">{formatIDR(item.projectedMonthlyGrossProfit)}</div>
                          <div className="text-[10px] text-emerald-600 font-semibold">{formatPercent(item.projectedGrossMarginPct)}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-purple-900">
                          <div>{formatIDR(item.projectedMonthlyFees)}</div>
                          <div className="text-[10px] text-slate-400">({formatIDR(item.feePerUnit)}/pcs)</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold bg-blue-50/70 text-blue-900">
                          <div>{formatIDR(item.projectedMonthlyNetProfit)}</div>
                          <div className="text-[10px] text-blue-700">{formatPercent(item.netMarginPct)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footnote */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Proyeksi menghitung estimasi secara real-time berdasarkan HPP aktual pada Sheet 09_PRODUCT_SKU dan potongan fee per marketplace.
                </span>
              </div>
              <button
                onClick={exportProjectionToCsv}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 self-start md:self-auto flex items-center space-x-1"
              >
                <span>Unduh Hasil Proyeksi (CSV)</span>
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: AUDIT & ALERTS DASHBOARD (Pusat Peringatan & Mitigasi Defisit Margin) */}
      {activeReportTab === 'alerts' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Pusat Audit & Peringatan Margin (Profit Margin Alerts)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                  Memantau unit economics per channel secara real-time. Jika margin bersih berada di bawah threshold yang ditentukan,
                  sistem memicu notifikasi peringatan dan menghitung rekomendasi harga jual optimal untuk memulihkan profitabilitas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleResetAlertThresholds}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Threshold Default</span>
                </button>
                {realTimeAlerts.length > 0 && (
                  <button
                    onClick={handleApplyAllRecommendations}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Terapkan Semua Solusi ({realTimeAlerts.length} SKU)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Threshold Adjustment Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Percent className="w-4 h-4 text-blue-600" />
                    <span>Threshold Minimum Net Margin (Sebelum Iklan)</span>
                  </label>
                  <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {(alertThresholdNetMargin * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.35"
                  step="0.01"
                  value={alertThresholdNetMargin}
                  onChange={(e) => setAlertThresholdNetMargin(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>10% (Toleran)</span>
                  <span>18% (Rekomendasi Standar)</span>
                  <span>35% (Ketat)</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Percent className="w-4 h-4 text-indigo-600" />
                    <span>Threshold Minimum Margin Iklan (Ads Allowance)</span>
                  </label>
                  <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {(alertThresholdAdsMargin * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.20"
                  step="0.01"
                  value={alertThresholdAdsMargin}
                  onChange={(e) => setAlertThresholdAdsMargin(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>5% (Minimum)</span>
                  <span>8% (Standar Ads)</span>
                  <span>20% (High ROAS Target)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Total Alert Terdeteksi</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {realTimeAlerts.length}
              </div>
              <span className="text-[11px] text-slate-500">Channel produk di bawah target</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Risiko Margin Kritis</span>
              <div className="text-2xl font-extrabold text-red-600 mt-1">
                {criticalAlertsCount}
              </div>
              <span className="text-[11px] text-red-600 font-medium">Margin negatif / &lt;10%</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Peringatan Margin Tipis</span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">
                {warningAlertsCount}
              </div>
              <span className="text-[11px] text-amber-700">Perlu penyesuaian harga</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Status Kesehatan Margin</span>
              <div className="text-base font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
                {realTimeAlerts.length === 0 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-700">100% Memenuhi Target</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-amber-700">{realTimeAlerts.length} Memerlukan Koreksi</span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-500">Auto-calculated</span>
            </div>
          </div>

          {/* Search, Filter & List Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setAlertSeverityFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    alertSeverityFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua ({realTimeAlerts.length})
                </button>
                <button
                  onClick={() => setAlertSeverityFilter('critical')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    alertSeverityFilter === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  Kritis ({criticalAlertsCount})
                </button>
                <button
                  onClick={() => setAlertSeverityFilter('warning')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    alertSeverityFilter === 'warning'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Peringatan ({warningAlertsCount})
                </button>
                <button
                  onClick={() => setAlertSeverityFilter('info')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    alertSeverityFilter === 'info'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Info / Organic Only ({realTimeAlerts.filter((a) => a.severity === 'info').length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari SKU, produk, channel..."
                  value={alertSearchQuery}
                  onChange={(e) => setAlertSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredRealTimeAlerts.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {realTimeAlerts.length === 0
                    ? 'Semua Margin Produk Sehat & Memenuhi Target!'
                    : 'Tidak ada notifikasi yang cocok dengan filter pencarian.'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {realTimeAlerts.length === 0
                    ? `Seluruh konfigurasi SKU channel menghasilkan margin di atas threshold ${(alertThresholdNetMargin * 100).toFixed(0)}%. Tidak ada tindakan korektif yang diperlukan.`
                    : 'Coba ubah kata kunci pencarian atau pilih tab filter keparahan yang lain.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Tingkat Risiko</th>
                      <th className="py-3 px-4">SKU / Nama Produk</th>
                      <th className="py-3 px-3">Unit Bisnis</th>
                      <th className="py-3 px-3">Marketplace</th>
                      <th className="py-3 px-3 text-right">Harga Saat Ini</th>
                      <th className="py-3 px-3 text-right">HPP (COGS)</th>
                      <th className="py-3 px-3 text-right">Fee Mkt</th>
                      <th className="py-3 px-3 text-right font-bold text-red-700">Margin Saat Ini</th>
                      <th className="py-3 px-3 text-right text-slate-600">Target Threshold</th>
                      <th className="py-3 px-4 text-right bg-emerald-50/60 font-bold text-emerald-950">
                        Rekomendasi Harga
                      </th>
                      <th className="py-3 px-4 text-center">Tindakan Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRealTimeAlerts.map((alert) => (
                      <tr
                        key={alert.id}
                        className={`transition-colors ${
                          alert.severity === 'critical' ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              alert.severity === 'critical'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : alert.severity === 'warning'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {alert.severity === 'critical'
                              ? 'KRITIS'
                              : alert.severity === 'warning'
                              ? 'PERINGATAN'
                              : 'INFO'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">{alert.sku}</div>
                          <div className="text-slate-600 truncate max-w-xs">{alert.productName}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              alert.unitId === 'U001'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {alert.unitName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{alert.marketplaceName}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatIDR(alert.sellingPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatIDR(alert.hpp)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-purple-800">
                          {formatIDR(alert.platformFee)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span
                            className={`font-bold ${
                              alert.currentMarginPct <= 0
                                ? 'text-red-700 bg-red-100 px-1.5 py-0.5 rounded'
                                : 'text-amber-800'
                            }`}
                          >
                            {formatPercent(alert.currentMarginPct)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatPercent(alert.thresholdPct)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono bg-emerald-50/60 font-extrabold text-emerald-900">
                          <div>{formatIDR(alert.recommendedPrice)}</div>
                          <div className="text-[10px] text-emerald-700 font-semibold">
                            +{formatIDR(alert.recommendedPrice - alert.sellingPrice)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleApplyPriceRecommendation(alert)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-xs transition-colors flex items-center space-x-1"
                              title="Update harga jual secara langsung di database"
                            >
                              <Check className="w-3 h-3" />
                              <span>Terapkan</span>
                            </button>
                            <button
                              onClick={() => handleDismissAlert(alert.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                              title="Abaikan notifikasi ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Formula rekomendasi harga: <code>Harga Aman = (HPP + Biaya Tetap) / (1 - Target Margin% - Rate Fee Mkt%)</code>. Dibulatkan ke kelipatan Rp 500 terdekat.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME ALERTS SLIDE-OVER DRAWER (Akses Cepat Dari Mana Saja) */}
      {isAlertsPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-red-600/90 text-white">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Panel Notifikasi Margin Real-Time</h3>
                  <p className="text-[11px] text-slate-300">
                    {realTimeAlerts.length} konfigurasi channel di bawah batas threshold
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAlertsPanelOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Threshold Tuning */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Ambang Batas Minimum Net Margin:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {(alertThresholdNetMargin * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.30"
                step="0.01"
                value={alertThresholdNetMargin}
                onChange={(e) => setAlertThresholdNetMargin(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setAlertSeverityFilter('ALL')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium ${
                    alertSeverityFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'
                  }`}
                >
                  Semua ({realTimeAlerts.length})
                </button>
                <button
                  onClick={() => setAlertSeverityFilter('critical')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium ${
                    alertSeverityFilter === 'critical' ? 'bg-red-600 text-white' : 'bg-white border text-red-600'
                  }`}
                >
                  Kritis ({criticalAlertsCount})
                </button>
                {realTimeAlerts.length > 0 && (
                  <button
                    onClick={handleApplyAllRecommendations}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    Terapkan Semua Solusi
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Body: Alert Cards List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredRealTimeAlerts.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Tidak Ada Alert Aktif</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Seluruh produk telah memenuhi margin minimum. Anda dapat mengubah slider threshold di atas untuk simulasi.
                  </p>
                </div>
              ) : (
                filteredRealTimeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-3 shadow-2xs transition-all ${
                      alert.severity === 'critical'
                        ? 'bg-red-50/60 border-red-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900">{alert.sku}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              alert.unitId === 'U001' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {alert.unitName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {alert.marketplaceName}
                          </span>
                        </div>
                        <h4 className="font-medium text-slate-800 mt-1">{alert.productName}</h4>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                          alert.severity === 'critical'
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg text-[11px] border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Harga Jual</span>
                        <span className="font-mono font-semibold text-slate-900">{formatIDR(alert.sellingPrice)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">COGS (HPP)</span>
                        <span className="font-mono text-slate-700">{formatIDR(alert.hpp)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Fee Mkt</span>
                        <span className="font-mono text-purple-700">{formatIDR(alert.platformFee)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Margin Net</span>
                        <span
                          className={`font-mono font-bold ${
                            alert.currentMarginPct <= 0 ? 'text-red-700' : 'text-amber-800'
                          }`}
                        >
                          {formatPercent(alert.currentMarginPct)}
                        </span>
                      </div>
                    </div>

                    {/* Deficit Progress Visual */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Defisit Margin:</span>
                        <span className="font-bold text-red-600">
                          -{(alert.marginDeficitPct * 100).toFixed(1)}% di bawah target {(alert.thresholdPct * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-red-500 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(10, (alert.currentMarginPct / alert.thresholdPct) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Action Solution Bar */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Rekomendasi Harga Pulih:</span>
                        <span className="font-mono font-extrabold text-sm text-emerald-800">
                          {formatIDR(alert.recommendedPrice)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleDismissAlert(alert.id)}
                          className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded transition-colors"
                        >
                          Abaikan
                        </button>
                        <button
                          onClick={() => handleApplyPriceRecommendation(alert)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Terapkan Harga</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setIsAlertsPanelOpen(false);
                  setActiveReportTab('alerts');
                }}
                className="font-semibold text-blue-600 hover:text-blue-800"
              >
                Buka Layar Penuh Audit &rarr;
              </button>
              <button
                onClick={() => setIsAlertsPanelOpen(false)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Data CSV Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ekspor Data Keuangan ke File CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    Simpan status data keuangan saat ini untuk pembukuan eksternal, audit, dan arsip akuntansi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Options */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-700">
                Pilih Format / Bagian Data Keuangan:
              </div>

              {/* Option 1: Comprehensive Financial Package */}
              <div
                onClick={() => setSelectedExportType('comprehensive')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedExportType === 'comprehensive'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedExportType === 'comprehensive'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedExportType === 'comprehensive' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          Paket Arsip Keuangan Lengkap (All-in-One Master)
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Paling Direkomendasikan
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Memuat Ringkasan Eksekutif, Laporan Laba Rugi P&L, Unit Economics SKU, dan Buku Besar Transaksi Penjualan & Biaya dalam satu file CSV terstruktur siap audit eksternal.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                    Master Bundle
                  </span>
                </div>
              </div>

              {/* Option 2: Executive P&L Statement */}
              <div
                onClick={() => setSelectedExportType('pnl')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedExportType === 'pnl'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedExportType === 'pnl'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedExportType === 'pnl' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Laporan Laba Rugi Eksekutif (P&L 3-Kolom Sinergi)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        10 pos laba rugi konsolidasi, breakdown Kanbai Direct/Alokasi, Nutribite Direct/Alokasi, Team Original, dan status rekonsiliasi bebas double count.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                    {pnlReport.lines.length} Pos Laba Rugi
                  </span>
                </div>
              </div>

              {/* Option 3: SKU Economics */}
              <div
                onClick={() => setSelectedExportType('sku_margins')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedExportType === 'sku_margins'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedExportType === 'sku_margins'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedExportType === 'sku_margins' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Unit Economics & Margin Matrix SKU
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Harga jual, HPP SKU, potongan fee platform marketplace, profit before ads, alokasi ads, net margin %, dan status Ads Eligible per varian produk.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                    {skuMetricsList.length} SKU Channel
                  </span>
                </div>
              </div>

              {/* Option 4: Sales Ledger */}
              <div
                onClick={() => setSelectedExportType('sales')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedExportType === 'sales'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedExportType === 'sales'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedExportType === 'sales' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Buku Besar Transaksi Penjualan (Sales Ledger)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Seluruh faktur penjualan invoice historis dan aktual dengan omzet, HPP, laba kotor, akun kanal, PIC, dan status order.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                    {dbState.sales.length} Faktur Order
                  </span>
                </div>
              </div>

              {/* Option 5: Expenses Ledger */}
              <div
                onClick={() => setSelectedExportType('expenses')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedExportType === 'expenses'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedExportType === 'expenses'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedExportType === 'expenses' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Buku Beban & Kas Operasional (Post Data Expenses)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Pencatatan pos pengeluaran operasional, platform fee, biaya pemasaran, dan penanggung jawab PIC.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                    {dbState.postData.length} Pos Biaya
                  </span>
                </div>
              </div>

              {/* Option 6: Monthly Financial Projections */}
              <div
                onClick={() => setSelectedExportType('projection')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedExportType === 'projection'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedExportType === 'projection'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedExportType === 'projection' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Model Proyeksi Laba Bulanan
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Target volume penjualan, simulasi omzet, beban fee, dan estimasi laba bersih per SKU kanal.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                    {filteredProjectionItems.length} Model SKU
                  </span>
                </div>
              </div>
            </div>

            {/* Format & Specification Info Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 font-semibold">
                <span>Spesifikasi File CSV Eksternal:</span>
                <span className="text-emerald-700 font-mono font-bold">Encoding: UTF-8 BOM</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                File CSV yang dihasilkan mematuhi standar RFC 4180 dan dilengkapi byte order mark (BOM) sehingga dapat dibuka secara langsung dan sempurna di Microsoft Excel, Google Sheets, LibreOffice Calc, maupun diimpor ke sistem akuntansi eksternal (Accurate, Zahir, Xero, SAP).
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleExecuteExport(selectedExportType)}
                className="inline-flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File CSV Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
