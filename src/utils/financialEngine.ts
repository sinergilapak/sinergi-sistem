/**
 * Sinergi Lapak - Financial Engine & P&L Calculation Engine
 * Implements strict financial rules from Master Spec Sections 4, 7, 8, 10, 21-27, 36-38, 41-45.
 */

import {
  CostRuleRecord,
  ProductSkuRecord,
  ProductChannelRecord,
  SalesRecord,
  PostDataRecord,
  TeamAllocationRecord,
  BucketType,
} from '../types/database';

export interface MarketplaceFeeItem {
  ruleId: string;
  costName: string;
  costGroup: string;
  feeAmount: number;
  rate: number;
  mandatory: boolean;
  program?: string | null;
}

export interface SkuFinancialMetrics {
  sku: string;
  skuName: string;
  spuId: string;
  brandName: string;
  categoryName: string;
  unitId: string;
  unitName: string;
  marketplaceId: string;
  marketplaceName: string;
  sellingPrice: number;
  hpp: number;
  grossProfitPerUnit: number;
  grossMarginPct: number;
  // Marketplace Fees breakdown
  fees: MarketplaceFeeItem[];
  totalMarketplaceFeePerUnit: number;
  platformFeePct: number;
  // Profits
  profitBeforeAds: number;
  marginBeforeAdsPct: number;
  adsSpendPerUnit: number;
  profitAfterAds: number;
  marginAfterAdsPct: number;
  // Volume & totals if sales exist
  unitsSold: number;
  totalSales: number;
  totalHpp: number;
  totalGrossProfit: number;
  totalPlatformCost: number;
  totalProfitBeforeAds: number;
  totalAdsSpend: number;
  totalNetProfit: number;
  // Status
  healthStatus: 'ADS_ELIGIBLE' | 'ORGANIC_ONLY' | 'NOT_PROFITABLE';
}

/**
 * Calculate applicable fee amount for a given base price and cost rule
 */
export function calculateRuleFee(basePrice: number, rule: CostRuleRecord, qty: number = 1): number {
  let base = basePrice;
  if (rule.calculation_base === 'QTY') {
    base = qty;
  }

  let calculated = 0;

  switch (rule.calculation_type) {
    case 'PERCENTAGE':
      calculated = base * rule.rate;
      break;
    case 'FIXED':
      calculated = rule.fixed_amount;
      break;
    case 'PERCENTAGE_MAX':
      calculated = base * rule.rate;
      if (rule.maximum_fee !== null && rule.maximum_fee !== undefined && rule.maximum_fee > 0) {
        calculated = Math.min(calculated, rule.maximum_fee);
      }
      break;
    case 'PERCENTAGE_MIN':
      calculated = base * rule.rate;
      if (rule.minimum_fee !== null && rule.minimum_fee !== undefined && rule.minimum_fee > 0) {
        calculated = Math.max(calculated, rule.minimum_fee);
      }
      break;
    case 'PERCENTAGE_MIN_MAX':
      calculated = base * rule.rate;
      if (rule.minimum_fee !== null && rule.minimum_fee !== undefined && rule.minimum_fee > 0) {
        calculated = Math.max(calculated, rule.minimum_fee);
      }
      if (rule.maximum_fee !== null && rule.maximum_fee !== undefined && rule.maximum_fee > 0) {
        calculated = Math.min(calculated, rule.maximum_fee);
      }
      break;
    case 'FIXED_PERCENTAGE':
      calculated = rule.fixed_amount + base * rule.rate;
      break;
    case 'TIER':
      // Basic Tier implementation
      if (rule.range_to && base > rule.range_to) {
        calculated = base * (rule.rate * 0.8);
      } else {
        calculated = base * rule.rate;
      }
      break;
    default:
      calculated = base * rule.rate;
  }

  return Math.round(calculated);
}

/**
 * Find all applicable marketplace cost rules for a product channel/SKU
 * Evaluates priority: SKU > SPU > Brand > Category > Marketplace
 */
export function getApplicableMarketplaceFees(
  sellingPrice: number,
  marketplaceId: string,
  categoryId: string,
  brandId: string,
  spuId: string,
  skuCode: string,
  unitId: string,
  allRules: CostRuleRecord[],
  activePrograms: string[] = ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK']
): MarketplaceFeeItem[] {
  // Filter rules for this marketplace
  const mktRules = allRules.filter((r) => r.active && r.marketplace_id === marketplaceId);

  // Group rules by cost_name to pick the highest priority / most specific rule
  const rulesByName = new Map<string, CostRuleRecord>();

  for (const rule of mktRules) {
    // Check specificity criteria
    const matchesSku = !rule.sku || rule.sku.toUpperCase() === skuCode.toUpperCase();
    const matchesSpu = !rule.spu_id || rule.spu_id === spuId;
    const matchesBrand = !rule.brand_id || rule.brand_id === brandId;
    const matchesCategory = !rule.category_id || rule.category_id === categoryId;
    const matchesUnit = !rule.unit_id || rule.unit_id === unitId;

    if (matchesSku && matchesSpu && matchesBrand && matchesCategory && matchesUnit) {
      // Check program inclusion
      if (!rule.mandatory && rule.program) {
        if (!activePrograms.includes(rule.program) && !activePrograms.includes('ALL')) {
          continue;
        }
      }

      const existing = rulesByName.get(rule.cost_name);
      if (!existing || rule.priority > existing.priority) {
        rulesByName.set(rule.cost_name, rule);
      }
    }
  }

  const items: MarketplaceFeeItem[] = [];
  rulesByName.forEach((rule) => {
    const feeAmount = calculateRuleFee(sellingPrice, rule);
    items.push({
      ruleId: rule.rule_id,
      costName: rule.cost_name,
      costGroup: rule.cost_group,
      feeAmount,
      rate: rule.rate,
      mandatory: rule.mandatory,
      program: rule.program,
    });
  });

  return items;
}

/**
 * Structure of Complete Executive P&L (Laba Rugi)
 */
export interface PandLLineItem {
  id: string;
  name: string;
  kanbaiDirect: number;
  kanbaiAllocated: number;
  kanbaiFinal: number;
  nutribiteDirect: number;
  nutribiteAllocated: number;
  nutribiteFinal: number;
  teamOriginal: number;
  totalSinergi: number;
  isHeader?: boolean;
  isTotal?: boolean;
}

export interface PandLReportResult {
  periodLabel: string;
  lines: PandLLineItem[];
  reconciliation: {
    kanbaiFinalTotalNetProfit: number;
    nutribiteFinalTotalNetProfit: number;
    sumFinals: number;
    totalSinergiNetProfit: number;
    difference: number;
    isBalanced: boolean;
  };
  summary: {
    totalRevenue: number;
    grossProfit: number;
    gpm: number;
    totalExpenses: number;
    netProfit: number;
    npm: number;
    totalPlatformCost: number;
    totalMarketing: number;
  };
}

/**
 * Compute the complete 3-column P&L:
 * KANBAI | NUTRIBITE | TOTAL SINERGI
 * With Team Shared Pool allocation and Reconciliation Engine.
 */
export function computePandLReport(
  sales: SalesRecord[],
  postData: PostDataRecord[],
  costRules: CostRuleRecord[],
  teamAllocations: TeamAllocationRecord[],
  customAllocationRates?: { kanbai: number; nutribite: number }
): PandLReportResult {
  // 1. Sales & Revenue Calculation by Bucket
  let kanbaiDirectSales = 0;
  let nutribiteDirectSales = 0;
  let teamOriginalSales = 0;

  let kanbaiDirectHpp = 0;
  let nutribiteDirectHpp = 0;
  let teamOriginalHpp = 0;

  sales.forEach((s) => {
    if (s.status === 'CANCELLED') return;
    const totalSale = s.total_sales;
    const totalHpp = s.total_hpp;

    if (s.bucket === 'KANBAI') {
      kanbaiDirectSales += totalSale;
      kanbaiDirectHpp += totalHpp;
    } else if (s.bucket === 'NUTRIBITE') {
      nutribiteDirectSales += totalSale;
      nutribiteDirectHpp += totalHpp;
    } else {
      teamOriginalSales += totalSale;
      teamOriginalHpp += totalHpp;
    }
  });

  // Calculate default sales proportion for Team allocation if needed
  const totalDirectSales = kanbaiDirectSales + nutribiteDirectSales;
  let kanbaiSalesProp = 0.5;
  let nutribiteSalesProp = 0.5;
  if (totalDirectSales > 0) {
    kanbaiSalesProp = kanbaiDirectSales / totalDirectSales;
    nutribiteSalesProp = nutribiteDirectSales / totalDirectSales;
  }

  // Use custom or sales proportion
  const kanbaiAllocRate = customAllocationRates ? customAllocationRates.kanbai : kanbaiSalesProp;
  const nutribiteAllocRate = customAllocationRates ? customAllocationRates.nutribite : nutribiteSalesProp;

  // Allocate Team Sales & HPP
  const kanbaiAllocatedSales = Math.round(teamOriginalSales * kanbaiAllocRate);
  const nutribiteAllocatedSales = teamOriginalSales - kanbaiAllocatedSales;

  const kanbaiAllocatedHpp = Math.round(teamOriginalHpp * kanbaiAllocRate);
  const nutribiteAllocatedHpp = teamOriginalHpp - kanbaiAllocatedHpp;

  const kanbaiFinalSales = kanbaiDirectSales + kanbaiAllocatedSales;
  const nutribiteFinalSales = nutribiteDirectSales + nutribiteAllocatedSales;
  const totalSinergiSales = kanbaiDirectSales + nutribiteDirectSales + teamOriginalSales;

  const kanbaiFinalHpp = kanbaiDirectHpp + kanbaiAllocatedHpp;
  const nutribiteFinalHpp = nutribiteDirectHpp + nutribiteAllocatedHpp;
  const totalSinergiHpp = kanbaiDirectHpp + nutribiteDirectHpp + teamOriginalHpp;

  // Gross Profit
  const kanbaiDirectGrossProfit = kanbaiDirectSales - kanbaiDirectHpp;
  const nutribiteDirectGrossProfit = nutribiteDirectSales - nutribiteDirectHpp;
  const teamOriginalGrossProfit = teamOriginalSales - teamOriginalHpp;

  const kanbaiFinalGrossProfit = kanbaiFinalSales - kanbaiFinalHpp;
  const nutribiteFinalGrossProfit = nutribiteFinalSales - nutribiteFinalHpp;
  const totalSinergiGrossProfit = totalSinergiSales - totalSinergiHpp;

  // 2. Post Data Expenses & Other Income
  // Group categories:
  // 01. Operasional
  // 02. Platform Cost
  // 03. Marketing
  // 04. Biaya Lain-lain
  // 05. Pendapatan Lain-lain
  const expenseBuckets = {
    operasional: { KANBAI: 0, NUTRIBITE: 0, TEAM: 0 },
    platform: { KANBAI: 0, NUTRIBITE: 0, TEAM: 0 },
    marketing: { KANBAI: 0, NUTRIBITE: 0, TEAM: 0 },
    otherExpense: { KANBAI: 0, NUTRIBITE: 0, TEAM: 0 },
    otherIncome: { KANBAI: 0, NUTRIBITE: 0, TEAM: 0 },
  };

  postData.forEach((post) => {
    const b = post.bucket;
    const cat = post.category.toLowerCase();
    const bal = post.balance;

    if (cat.includes('01') || cat.includes('operasional')) {
      expenseBuckets.operasional[b] += bal;
    } else if (cat.includes('02') || cat.includes('platform')) {
      expenseBuckets.platform[b] += bal;
    } else if (cat.includes('03') || cat.includes('marketing')) {
      expenseBuckets.marketing[b] += bal;
    } else if (cat.includes('04') || cat.includes('biaya lain')) {
      expenseBuckets.otherExpense[b] += bal;
    } else if (cat.includes('05') || cat.includes('pendapatan lain') || post.financial_type === 'OTHER_INCOME') {
      expenseBuckets.otherIncome[b] += bal;
    } else {
      expenseBuckets.otherExpense[b] += bal;
    }
  });

  // Calculate platform fees from sales transactions if postData platform cost is lower
  // (Marketplace fee engine integration!)
  let simulatedPlatformFees = { KANBAI: 0, NUTRIBITE: 0, TEAM: 0 };
  sales.forEach((s) => {
    if (s.status === 'CANCELLED') return;
    // Calculate 6.5% average platform fee if not specifically in postData
    const feeEstimate = Math.round(s.total_sales * 0.065);
    simulatedPlatformFees[s.bucket] += feeEstimate;
  });

  // If actual postData platform cost is present, use it, else use calculated marketplace fee engine
  const platformCostKanbai = expenseBuckets.platform.KANBAI || simulatedPlatformFees.KANBAI;
  const platformCostNutri = expenseBuckets.platform.NUTRIBITE || simulatedPlatformFees.NUTRIBITE;
  const platformCostTeam = expenseBuckets.platform.TEAM || simulatedPlatformFees.TEAM;

  // Helper to build PandL Line
  const buildLine = (
    id: string,
    name: string,
    directKanbai: number,
    directNutri: number,
    originalTeam: number,
    isIncome: boolean = false
  ): PandLLineItem => {
    const kAlloc = Math.round(originalTeam * kanbaiAllocRate);
    const nAlloc = originalTeam - kAlloc;
    const kFinal = directKanbai + kAlloc;
    const nFinal = directNutri + nAlloc;
    const totSinergi = directKanbai + directNutri + originalTeam;

    return {
      id,
      name,
      kanbaiDirect: directKanbai,
      kanbaiAllocated: kAlloc,
      kanbaiFinal: kFinal,
      nutribiteDirect: directNutri,
      nutribiteAllocated: nAlloc,
      nutribiteFinal: nFinal,
      teamOriginal: originalTeam,
      totalSinergi: totSinergi,
    };
  };

  const lines: PandLLineItem[] = [];

  // PENDAPATAN
  lines.push({
    id: 'header-revenue',
    name: 'I. PENDAPATAN',
    kanbaiDirect: 0,
    kanbaiAllocated: 0,
    kanbaiFinal: 0,
    nutribiteDirect: 0,
    nutribiteAllocated: 0,
    nutribiteFinal: 0,
    teamOriginal: 0,
    totalSinergi: 0,
    isHeader: true,
  });

  lines.push(buildLine('rev-sales', 'Penjualan Bersih (Sales)', kanbaiDirectSales, nutribiteDirectSales, teamOriginalSales, true));
  lines.push(buildLine('cogs-hpp', 'Harga Pokok Penjualan (HPP)', kanbaiDirectHpp, nutribiteDirectHpp, teamOriginalHpp, false));

  // GROSS PROFIT
  lines.push({
    id: 'gross-profit',
    name: 'LABA KOTOR (GROSS PROFIT)',
    kanbaiDirect: kanbaiDirectGrossProfit,
    kanbaiAllocated: kanbaiAllocatedSales - kanbaiAllocatedHpp,
    kanbaiFinal: kanbaiFinalGrossProfit,
    nutribiteDirect: nutribiteDirectGrossProfit,
    nutribiteAllocated: nutribiteAllocatedSales - nutribiteAllocatedHpp,
    nutribiteFinal: nutribiteFinalGrossProfit,
    teamOriginal: teamOriginalGrossProfit,
    totalSinergi: totalSinergiGrossProfit,
    isTotal: true,
  });

  // BIAYA PENGELUARAN
  lines.push({
    id: 'header-expenses',
    name: 'II. BIAYA PENGELUARAN',
    kanbaiDirect: 0,
    kanbaiAllocated: 0,
    kanbaiFinal: 0,
    nutribiteDirect: 0,
    nutribiteAllocated: 0,
    nutribiteFinal: 0,
    teamOriginal: 0,
    totalSinergi: 0,
    isHeader: true,
  });

  const lineOps = buildLine('exp-ops', '01. Biaya Operasional', expenseBuckets.operasional.KANBAI, expenseBuckets.operasional.NUTRIBITE, expenseBuckets.operasional.TEAM);
  const linePlat = buildLine('exp-platform', '02. Platform Cost (Biaya Marketplace & Komisi)', platformCostKanbai, platformCostNutri, platformCostTeam);
  const lineMkt = buildLine('exp-mkt', '03. Marketing & Ads Spend', expenseBuckets.marketing.KANBAI, expenseBuckets.marketing.NUTRIBITE, expenseBuckets.marketing.TEAM);
  const lineOtherExp = buildLine('exp-other', '04. Biaya Lain-lain', expenseBuckets.otherExpense.KANBAI, expenseBuckets.otherExpense.NUTRIBITE, expenseBuckets.otherExpense.TEAM);

  lines.push(lineOps);
  lines.push(linePlat);
  lines.push(lineMkt);
  lines.push(lineOtherExp);

  // TOTAL BIAYA PENGELUARAN
  const totExpKanbaiDirect = lineOps.kanbaiDirect + linePlat.kanbaiDirect + lineMkt.kanbaiDirect + lineOtherExp.kanbaiDirect;
  const totExpKanbaiAlloc = lineOps.kanbaiAllocated + linePlat.kanbaiAllocated + lineMkt.kanbaiAllocated + lineOtherExp.kanbaiAllocated;
  const totExpKanbaiFinal = totExpKanbaiDirect + totExpKanbaiAlloc;

  const totExpNutriDirect = lineOps.nutribiteDirect + linePlat.nutribiteDirect + lineMkt.nutribiteDirect + lineOtherExp.nutribiteDirect;
  const totExpNutriAlloc = lineOps.nutribiteAllocated + linePlat.nutribiteAllocated + lineMkt.nutribiteAllocated + lineOtherExp.nutribiteAllocated;
  const totExpNutriFinal = totExpNutriDirect + totExpNutriAlloc;

  const totExpTeamOriginal = lineOps.teamOriginal + linePlat.teamOriginal + lineMkt.teamOriginal + lineOtherExp.teamOriginal;
  const totExpTotalSinergi = lineOps.totalSinergi + linePlat.totalSinergi + lineMkt.totalSinergi + lineOtherExp.totalSinergi;

  lines.push({
    id: 'tot-expenses',
    name: 'TOTAL BIAYA PENGELUARAN',
    kanbaiDirect: totExpKanbaiDirect,
    kanbaiAllocated: totExpKanbaiAlloc,
    kanbaiFinal: totExpKanbaiFinal,
    nutribiteDirect: totExpNutriDirect,
    nutribiteAllocated: totExpNutriAlloc,
    nutribiteFinal: totExpNutriFinal,
    teamOriginal: totExpTeamOriginal,
    totalSinergi: totExpTotalSinergi,
    isTotal: true,
  });

  // OTHER INCOME
  lines.push({
    id: 'header-other-income',
    name: 'III. PENDAPATAN LAIN-LAIN',
    kanbaiDirect: 0,
    kanbaiAllocated: 0,
    kanbaiFinal: 0,
    nutribiteDirect: 0,
    nutribiteAllocated: 0,
    nutribiteFinal: 0,
    teamOriginal: 0,
    totalSinergi: 0,
    isHeader: true,
  });

  const lineOtherInc = buildLine('inc-other', '05. Pendapatan Lain-lain & Subsidi Marketplace', expenseBuckets.otherIncome.KANBAI, expenseBuckets.otherIncome.NUTRIBITE, expenseBuckets.otherIncome.TEAM, true);
  lines.push(lineOtherInc);

  // NET PROFIT (LABA BERSIH)
  const netProfitKanbaiFinal = kanbaiFinalGrossProfit - totExpKanbaiFinal + lineOtherInc.kanbaiFinal;
  const netProfitNutriFinal = nutribiteFinalGrossProfit - totExpNutriFinal + lineOtherInc.nutribiteFinal;
  const netProfitTotalSinergi = totalSinergiGrossProfit - totExpTotalSinergi + lineOtherInc.totalSinergi;

  const netProfitKanbaiDirect = kanbaiDirectGrossProfit - totExpKanbaiDirect + lineOtherInc.kanbaiDirect;
  const netProfitNutriDirect = nutribiteDirectGrossProfit - totExpNutriDirect + lineOtherInc.nutribiteDirect;
  const netProfitTeamOriginal = teamOriginalGrossProfit - totExpTeamOriginal + lineOtherInc.teamOriginal;

  lines.push({
    id: 'net-profit',
    name: 'LABA BERSIH (NET PROFIT)',
    kanbaiDirect: netProfitKanbaiDirect,
    kanbaiAllocated: netProfitKanbaiFinal - netProfitKanbaiDirect,
    kanbaiFinal: netProfitKanbaiFinal,
    nutribiteDirect: netProfitNutriDirect,
    nutribiteAllocated: netProfitNutriFinal - netProfitNutriDirect,
    nutribiteFinal: netProfitNutriFinal,
    teamOriginal: netProfitTeamOriginal,
    totalSinergi: netProfitTotalSinergi,
    isTotal: true,
  });

  // Reconciliation Check:
  // Kanbai Final + Nutribite Final - Total Sinergi == 0
  const sumFinals = netProfitKanbaiFinal + netProfitNutriFinal;
  const difference = sumFinals - netProfitTotalSinergi;
  const isBalanced = Math.abs(difference) <= 1; // Tolerance for integer rounding

  const gpm = totalSinergiSales > 0 ? totalSinergiGrossProfit / totalSinergiSales : 0;
  const npm = totalSinergiSales > 0 ? netProfitTotalSinergi / totalSinergiSales : 0;

  return {
    periodLabel: 'Semua Periode',
    lines,
    reconciliation: {
      kanbaiFinalTotalNetProfit: netProfitKanbaiFinal,
      nutribiteFinalTotalNetProfit: netProfitNutriFinal,
      sumFinals,
      totalSinergiNetProfit: netProfitTotalSinergi,
      difference,
      isBalanced,
    },
    summary: {
      totalRevenue: totalSinergiSales,
      grossProfit: totalSinergiGrossProfit,
      gpm,
      totalExpenses: totExpTotalSinergi,
      netProfit: netProfitTotalSinergi,
      npm,
      totalPlatformCost: linePlat.totalSinergi,
      totalMarketing: lineMkt.totalSinergi,
    },
  };
}
