/**
 * Sinergi Lapak - Financial Engine & P&L Calculation Engine (Patch V2)
 * Production-grade retail financial calculations, granular marketplace cost rules,
 * multi-tier allocation engine, ads simulation, and reconciled 3-column P&L.
 */

import {
  CostRuleRecord,
  ProductSkuRecord,
  ProductChannelRecord,
  SalesRecord,
  PostDataRecord,
  TeamAllocationRecord,
  BucketType,
  FinancialType,
  AllocationMethod,
} from '../types/database';
import { calculateDynamicCostRules } from './costRules';
export * from './costRules';

export interface MarketplaceFeeItem {
  ruleId: string;
  costName: string;
  costGroup: string;
  canonicalType:
    | 'ADMIN_FEE'
    | 'SERVICE_FEE'
    | 'PAYMENT_FEE'
    | 'FREE_SHIPPING'
    | 'VOUCHER'
    | 'AFFILIATE'
    | 'CAMPAIGN'
    | 'CASHBACK'
    | 'TAX'
    | 'OTHER';
  feeAmount: number;
  rate: number;
  fixedAmount: number;
  mandatory: boolean;
  program?: string | null;
  specificityScore: number;
  isCategorySpecific: boolean;
  isSkuSpecific: boolean;
}

export interface MarketplaceFeeCalculationResult {
  fees: MarketplaceFeeItem[];
  totalFeeAmount: number;
  effectiveFeeRate: number;
  hasConfiguredFees: boolean;
  warning?: string;
  breakdown: {
    adminFee: number;
    serviceFee: number;
    paymentFee: number;
    freeShippingFee: number;
    voucherFee: number;
    affiliateFee: number;
    campaignFee: number;
    cashbackFee: number;
    taxFee: number;
    otherFee: number;
  };
}

export interface ProductUnitEconomics {
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
  promoPrice: number;
  hpp: number;
  // Margins before marketplace
  grossProfit: number;
  grossMarginPct: number;
  // Fees
  feeResult: MarketplaceFeeCalculationResult;
  totalMarketplaceFee: number;
  // After marketplace
  profitAfterMarketplace: number;
  netMarginPct: number;
  // Ads Simulation
  adsSpendPerUnit: number;
  profitAfterAds: number;
  marginAfterAdsPct: number;
  beRoas: number | null; // null when max ad spend <= 0
  cir: number;
  roas: number;
  // Status
  healthStatus: 'ADS_ELIGIBLE' | 'ORGANIC_ONLY' | 'NOT_PROFITABLE';
  hasConfiguredFees: boolean;
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
  fees: MarketplaceFeeItem[];
  totalMarketplaceFeePerUnit: number;
  platformFeePct: number;
  profitBeforeAds: number;
  marginBeforeAdsPct: number;
  adsSpendPerUnit: number;
  profitAfterAds: number;
  marginAfterAdsPct: number;
  unitsSold: number;
  totalSales: number;
  totalHpp: number;
  totalGrossProfit: number;
  totalPlatformCost: number;
  totalProfitBeforeAds: number;
  totalAdsSpend: number;
  totalNetProfit: number;
  healthStatus: 'ADS_ELIGIBLE' | 'ORGANIC_ONLY' | 'NOT_PROFITABLE';
}

/**
 * Maps any account to strictly one of the 3 buckets:
 * - KANBAI -> Kanbai direct
 * - NUTRIBITE -> Nutribite direct
 * - All other accounts -> TEAM (shared pool, NOT a 3rd unit)
 */
export function resolveAccountBucket(accountNameOrId: string | null | undefined): BucketType {
  if (!accountNameOrId) return 'TEAM';
  const norm = accountNameOrId.toUpperCase().trim();
  if (norm === 'U001' || norm === 'ACC-KANBAI' || norm.includes('KANBAI')) {
    return 'KANBAI';
  }
  if (norm === 'U002' || norm === 'ACC-NUTRIBITE' || norm.includes('NUTRIBITE')) {
    return 'NUTRIBITE';
  }
  return 'TEAM';
}

/**
 * Categorize a cost rule into its canonical fee group
 */
export function getCanonicalCostType(
  costName: string,
  costGroup: string
): MarketplaceFeeItem['canonicalType'] {
  const normName = costName.toLowerCase();
  const normGroup = costGroup.toUpperCase();

  if (normName.includes('admin') || normGroup === 'ADMIN_FEE' || (normGroup === 'PLATFORM_FEE' && normName.includes('admin'))) {
    return 'ADMIN_FEE';
  }
  if (normName.includes('pembayaran') || normName.includes('transaksi') || normGroup === 'PAYMENT_FEE') {
    return 'PAYMENT_FEE';
  }
  if (normName.includes('gratis ongkir') || normName.includes('ongkir') || normGroup === 'SHIPPING_PROGRAM' || normGroup === 'SHIPPING_FEE') {
    return 'FREE_SHIPPING';
  }
  if (normName.includes('voucher') || normGroup === 'VOUCHER') {
    return 'VOUCHER';
  }
  if (normName.includes('affiliate') || normName.includes('afiliasi') || normGroup === 'AFFILIATE') {
    return 'AFFILIATE';
  }
  if (normName.includes('campaign') || normName.includes('flash sale') || normName.includes('promo') || normGroup === 'CAMPAIGN') {
    return 'CAMPAIGN';
  }
  if (normName.includes('cashback') || normGroup === 'CASHBACK') {
    return 'CASHBACK';
  }
  if (normName.includes('pajak') || normName.includes('ppn') || normName.includes('pph') || normGroup === 'TAX') {
    return 'TAX';
  }
  if (normName.includes('layanan') || normGroup === 'SERVICE_FEE' || normGroup === 'PLATFORM_FEE') {
    return 'SERVICE_FEE';
  }
  return 'OTHER';
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
 * Find all applicable marketplace cost rules evaluating priority:
 * SKU (500) > SPU (400) > Brand (300) > Category (200) > Marketplace/Unit (100) > General (10)
 * Multiple cost types (Admin, Layanan, Pembayaran, Gratis Ongkir, dll) are aggregated.
 * Within the SAME cost type, more specific rules override general rules.
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
  activePrograms: string[] = ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL']
): MarketplaceFeeCalculationResult {
  return calculateDynamicCostRules(
    {
      sellingPrice,
      marketplaceId,
      categoryId,
      brandId,
      spuId,
      sku: skuCode,
      unitId,
      activePrograms,
    },
    allRules
  );
}

/**
 * Calculates complete unit economics for a product channel entry
 */
export function calculateProductUnitEconomics(
  channel: ProductChannelRecord,
  skuRecord: ProductSkuRecord | undefined,
  costRules: CostRuleRecord[],
  targetNetMarginPct: number = 0.08
): ProductUnitEconomics {
  const sellingPrice = channel.selling_price || 0;
  const promoPrice = channel.promo_price || sellingPrice;
  const hpp = skuRecord?.hpp || 0;

  const grossProfit = sellingPrice - hpp;
  const grossMarginPct = sellingPrice > 0 ? grossProfit / sellingPrice : 0;

  const feeResult = getApplicableMarketplaceFees(
    sellingPrice,
    channel.marketplace_id,
    skuRecord?.category_id || '',
    skuRecord?.brand_id || '',
    skuRecord?.spu_id || '',
    channel.sku,
    channel.unit_id,
    costRules
  );

  const totalMarketplaceFee = feeResult.totalFeeAmount;
  const profitAfterMarketplace = grossProfit - totalMarketplaceFee;
  const netMarginPct = sellingPrice > 0 ? profitAfterMarketplace / sellingPrice : 0;

  // Ads budget derived from target CIR or channel target
  const cir = channel.target_cir > 0 ? channel.target_cir : 0.05;
  const adsSpendPerUnit = channel.ads_status ? Math.round(sellingPrice * cir) : 0;
  const profitAfterAds = profitAfterMarketplace - adsSpendPerUnit;
  const marginAfterAdsPct = sellingPrice > 0 ? profitAfterAds / sellingPrice : 0;
  const roas = adsSpendPerUnit > 0 ? sellingPrice / adsSpendPerUnit : 0;

  // BE ROAS calculation:
  // Break-even occurs when profit after ads >= required target margin.
  // Max allowable ad spend = profitAfterMarketplace - (sellingPrice * targetNetMarginPct)
  const maxAdSpend = profitAfterMarketplace - Math.round(sellingPrice * targetNetMarginPct);
  let beRoas: number | null = null;
  if (maxAdSpend > 0) {
    beRoas = Number((sellingPrice / maxAdSpend).toFixed(2));
  }

  let healthStatus: 'ADS_ELIGIBLE' | 'ORGANIC_ONLY' | 'NOT_PROFITABLE' = 'ADS_ELIGIBLE';
  if (profitAfterMarketplace <= 0) {
    healthStatus = 'NOT_PROFITABLE';
  } else if (!channel.ads_status || maxAdSpend <= 0 || netMarginPct < targetNetMarginPct) {
    healthStatus = 'ORGANIC_ONLY';
  }

  return {
    sku: channel.sku,
    skuName: skuRecord?.sku_name || channel.sku,
    spuId: skuRecord?.spu_id || '',
    brandName: skuRecord?.brand_id || '',
    categoryName: skuRecord?.category_id || '',
    unitId: channel.unit_id,
    unitName: channel.unit_id === 'U001' ? 'Kanbai' : 'Nutribite',
    marketplaceId: channel.marketplace_id,
    marketplaceName: channel.marketplace_id,
    sellingPrice,
    promoPrice,
    hpp,
    grossProfit,
    grossMarginPct,
    feeResult,
    totalMarketplaceFee,
    profitAfterMarketplace,
    netMarginPct,
    adsSpendPerUnit,
    profitAfterAds,
    marginAfterAdsPct,
    beRoas,
    cir,
    roas,
    healthStatus,
    hasConfiguredFees: feeResult.hasConfiguredFees,
  };
}

/**
 * Resolved Team Allocation rule result
 */
export interface ResolvedTeamAllocation {
  kanbaiRate: number;
  nutribiteRate: number;
  matchedRuleId?: string;
  matchedLevel: 'COST_POST' | 'SUB_CATEGORY' | 'CATEGORY' | 'FINANCIAL_TYPE' | 'DEFAULT' | 'NONE';
  method: AllocationMethod;
  hasWarning: boolean;
}

/**
 * Resolve the most specific team allocation rule:
 * Cost Post > Sub Category > Category > Financial Type > Default
 */
export function resolveTeamAllocationRule(
  financialType: FinancialType,
  category: string | null | undefined,
  subCategory: string | null | undefined,
  costPost: string | null | undefined,
  rules: TeamAllocationRecord[],
  salesProportion: { kanbai: number; nutribite: number }
): ResolvedTeamAllocation {
  const activeRules = rules.filter((r) => r.active);

  // 1. Cost Post (Highest priority)
  if (costPost) {
    const postRule = activeRules.find(
      (r) => r.cost_post && r.cost_post.toLowerCase().trim() === costPost.toLowerCase().trim()
    );
    if (postRule) {
      return buildAllocationResult(postRule, 'COST_POST', salesProportion);
    }
  }

  // 2. Sub Category
  if (subCategory) {
    const subRule = activeRules.find(
      (r) => r.sub_category && r.sub_category.toLowerCase().trim() === subCategory.toLowerCase().trim()
    );
    if (subRule) {
      return buildAllocationResult(subRule, 'SUB_CATEGORY', salesProportion);
    }
  }

  // 3. Category
  if (category) {
    const catRule = activeRules.find((r) => {
      if (!r.category_id) return false;
      const c = category.toLowerCase();
      const rc = r.category_id.toLowerCase();
      return c.includes(rc) || rc.includes(c);
    });
    if (catRule) {
      return buildAllocationResult(catRule, 'CATEGORY', salesProportion);
    }
  }

  // 4. Financial Type (Revenue vs Expense)
  const finRule = activeRules.find(
    (r) => r.financial_type === financialType && !r.cost_post && !r.sub_category && !r.category_id
  );
  if (finRule) {
    return buildAllocationResult(finRule, 'FINANCIAL_TYPE', salesProportion);
  }

  // 5. Default
  const defaultRule = activeRules.find((r) => !r.cost_post && !r.sub_category && !r.category_id);
  if (defaultRule) {
    return buildAllocationResult(defaultRule, 'DEFAULT', salesProportion);
  }

  // No rule found -> warning flag!
  return {
    kanbaiRate: salesProportion.kanbai,
    nutribiteRate: salesProportion.nutribite,
    matchedLevel: 'NONE',
    method: 'SALES_PROPORTION',
    hasWarning: true,
  };
}

function buildAllocationResult(
  rule: TeamAllocationRecord,
  level: ResolvedTeamAllocation['matchedLevel'],
  salesProp: { kanbai: number; nutribite: number }
): ResolvedTeamAllocation {
  if (rule.method === 'SALES_PROPORTION') {
    return {
      kanbaiRate: salesProp.kanbai,
      nutribiteRate: salesProp.nutribite,
      matchedRuleId: rule.allocation_id,
      matchedLevel: level,
      method: 'SALES_PROPORTION',
      hasWarning: false,
    };
  }

  // Custom ratio
  const k = rule.kanbai_percent;
  const n = rule.nutribite_percent;
  const sum = k + n > 0 ? k + n : 1;

  return {
    kanbaiRate: k / sum,
    nutribiteRate: n / sum,
    matchedRuleId: rule.allocation_id,
    matchedLevel: level,
    method: 'CUSTOM',
    hasWarning: false,
  };
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
  allocationWarning?: boolean;
}

export interface PandLReportResult {
  periodLabel: string;
  lines: PandLLineItem[];
  salesProportion: {
    kanbai: number;
    nutribite: number;
  };
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
 * Strictly 2 business units. TEAM is the shared pool (not a 3rd unit).
 * Anti-double counting mathematically enforced: Kanbai Final + Nutribite Final = Total Sinergi.
 */
export function computePandLReport(
  sales: SalesRecord[],
  postData: PostDataRecord[],
  costRules: CostRuleRecord[],
  teamAllocations: TeamAllocationRecord[]
): PandLReportResult {
  // 1. Direct Sales & HPP by Bucket
  let kanbaiDirectSales = 0;
  let nutribiteDirectSales = 0;
  let teamOriginalSales = 0;

  let kanbaiDirectHpp = 0;
  let nutribiteDirectHpp = 0;
  let teamOriginalHpp = 0;

  sales.forEach((s) => {
    if (s.status === 'CANCELLED') return;
    const bucket = resolveAccountBucket(s.bucket || s.account_id);
    const saleAmt = s.total_sales || s.selling_price * s.qty;
    const hppAmt = s.total_hpp || s.hpp * s.qty;

    if (bucket === 'KANBAI') {
      kanbaiDirectSales += saleAmt;
      kanbaiDirectHpp += hppAmt;
    } else if (bucket === 'NUTRIBITE') {
      nutribiteDirectSales += saleAmt;
      nutribiteDirectHpp += hppAmt;
    } else {
      teamOriginalSales += saleAmt;
      teamOriginalHpp += hppAmt;
    }
  });

  // Calculate dynamic sales proportion
  const totalDirectSales = kanbaiDirectSales + nutribiteDirectSales;
  const salesProportion = {
    kanbai: totalDirectSales > 0 ? kanbaiDirectSales / totalDirectSales : 0.6,
    nutribite: totalDirectSales > 0 ? nutribiteDirectSales / totalDirectSales : 0.4,
  };

  // Resolve Team Revenue allocation
  const teamRevAllocation = resolveTeamAllocationRule(
    'REVENUE',
    'Penjualan Bersih',
    null,
    null,
    teamAllocations,
    salesProportion
  );

  const kanbaiAllocatedSales = Math.round(teamOriginalSales * teamRevAllocation.kanbaiRate);
  const nutribiteAllocatedSales = teamOriginalSales - kanbaiAllocatedSales;

  const kanbaiAllocatedHpp = Math.round(teamOriginalHpp * teamRevAllocation.kanbaiRate);
  const nutribiteAllocatedHpp = teamOriginalHpp - kanbaiAllocatedHpp;

  // 2. Post Data Expenses & Other Income
  // Group post data by line items and apply specific allocation rules
  interface ExpenseCategoryGroup {
    kanbai: number;
    nutribite: number;
    team: number;
    subCategory?: string;
  }

  const expenseBuckets: Record<string, ExpenseCategoryGroup> = {
    operasional: { kanbai: 0, nutribite: 0, team: 0 },
    platform: { kanbai: 0, nutribite: 0, team: 0 },
    marketing: { kanbai: 0, nutribite: 0, team: 0 },
    otherExpense: { kanbai: 0, nutribite: 0, team: 0 },
    otherIncome: { kanbai: 0, nutribite: 0, team: 0 },
  };

  // Group team expenses by post for granular allocation
  const teamExpenseLineAllocations: Array<{
    categoryKey: string;
    description: string;
    subCategory: string;
    costPost: string;
    teamAmount: number;
    resolved: ResolvedTeamAllocation;
  }> = [];

  postData.forEach((post) => {
    const bucket = resolveAccountBucket(post.bucket || post.account);
    const cat = post.category.toLowerCase();
    const bal = post.balance;

    let targetKey = 'otherExpense';
    if (cat.includes('01') || cat.includes('operasional')) targetKey = 'operasional';
    else if (cat.includes('02') || cat.includes('platform')) targetKey = 'platform';
    else if (cat.includes('03') || cat.includes('marketing')) targetKey = 'marketing';
    else if (cat.includes('04') || cat.includes('biaya lain')) targetKey = 'otherExpense';
    else if (cat.includes('05') || cat.includes('pendapatan lain') || post.financial_type === 'OTHER_INCOME') {
      targetKey = 'otherIncome';
    }

    if (bucket === 'KANBAI') {
      expenseBuckets[targetKey].kanbai += bal;
    } else if (bucket === 'NUTRIBITE') {
      expenseBuckets[targetKey].nutribite += bal;
    } else {
      expenseBuckets[targetKey].team += bal;
      const resolved = resolveTeamAllocationRule(
        post.financial_type,
        post.category,
        post.sub_category,
        post.cost_post,
        teamAllocations,
        salesProportion
      );
      teamExpenseLineAllocations.push({
        categoryKey: targetKey,
        description: post.keterangan || post.cost_post,
        subCategory: post.sub_category,
        costPost: post.cost_post,
        teamAmount: bal,
        resolved,
      });
    }
  });

  // Calculate actual marketplace fees from sales transactions if postData platform cost is absent
  let simulatedPlatformFees = { KANBAI: 0, NUTRIBITE: 0, TEAM: 0 };
  sales.forEach((s) => {
    if (s.status === 'CANCELLED') return;
    const bucket = resolveAccountBucket(s.bucket || s.account_id);
    const saleAmt = s.total_sales || s.selling_price * s.qty;
    const feeItem = getApplicableMarketplaceFees(
      s.selling_price,
      s.marketplace_id,
      '',
      s.brand,
      s.spu,
      s.sku,
      bucket === 'KANBAI' ? 'U001' : 'U002',
      costRules
    );
    const feeAmt = feeItem.hasConfiguredFees
      ? Math.round((feeItem.totalFeeAmount / (s.selling_price || 1)) * saleAmt)
      : Math.round(saleAmt * 0.08);

    simulatedPlatformFees[bucket] += feeAmt;
  });

  const platformCostKanbai = expenseBuckets.platform.kanbai || simulatedPlatformFees.KANBAI;
  const platformCostNutri = expenseBuckets.platform.nutribite || simulatedPlatformFees.NUTRIBITE;
  const platformCostTeam = expenseBuckets.platform.team || simulatedPlatformFees.TEAM;

  // Build P&L line with specific allocation
  const buildLine = (
    id: string,
    name: string,
    directKanbai: number,
    directNutri: number,
    originalTeam: number,
    resolvedAlloc: ResolvedTeamAllocation
  ): PandLLineItem => {
    const kAlloc = Math.round(originalTeam * resolvedAlloc.kanbaiRate);
    const nAlloc = originalTeam - kAlloc; // Guarantees kAlloc + nAlloc = originalTeam
    const kFinal = directKanbai + kAlloc;
    const nFinal = directNutri + nAlloc;
    const totSinergi = directKanbai + directNutri + originalTeam; // Anti double-counting

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
      allocationWarning: resolvedAlloc.hasWarning,
    };
  };

  const lines: PandLLineItem[] = [];

  // PENDAPATAN
  lines.push({
    id: 'header-revenue',
    name: '01. PENDAPATAN USAHA',
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

  const lineSales = buildLine(
    'sales-net',
    'Penjualan Bersih Retail',
    kanbaiDirectSales,
    nutribiteDirectSales,
    teamOriginalSales,
    teamRevAllocation
  );
  lines.push(lineSales);

  // HPP
  lines.push({
    id: 'header-hpp',
    name: '02. HARGA POKOK PENJUALAN (HPP)',
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

  const lineHpp = buildLine(
    'hpp-total',
    'Biaya Pokok Barang Terjual',
    kanbaiDirectHpp,
    nutribiteDirectHpp,
    teamOriginalHpp,
    teamRevAllocation
  );
  lines.push(lineHpp);

  // LABA KOTOR
  const lineGrossProfit: PandLLineItem = {
    id: 'gross-profit',
    name: 'LABA KOTOR (GROSS PROFIT)',
    kanbaiDirect: lineSales.kanbaiDirect - lineHpp.kanbaiDirect,
    kanbaiAllocated: lineSales.kanbaiAllocated - lineHpp.kanbaiAllocated,
    kanbaiFinal: lineSales.kanbaiFinal - lineHpp.kanbaiFinal,
    nutribiteDirect: lineSales.nutribiteDirect - lineHpp.nutribiteDirect,
    nutribiteAllocated: lineSales.nutribiteAllocated - lineHpp.nutribiteAllocated,
    nutribiteFinal: lineSales.nutribiteFinal - lineHpp.nutribiteFinal,
    teamOriginal: lineSales.teamOriginal - lineHpp.teamOriginal,
    totalSinergi: lineSales.totalSinergi - lineHpp.totalSinergi,
    isTotal: true,
  };
  lines.push(lineGrossProfit);

  // BEBAN OPERASIONAL
  lines.push({
    id: 'header-expenses',
    name: '03. BEBAN OPERASIONAL & PENJUALAN',
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

  // Platform cost line
  const platformAlloc = resolveTeamAllocationRule(
    'EXPENSE',
    '02. Platform Cost',
    'Marketplace Fee',
    null,
    teamAllocations,
    salesProportion
  );
  const linePlatform = buildLine(
    'exp-platform',
    'Potongan & Biaya Layanan Marketplace',
    platformCostKanbai,
    platformCostNutri,
    platformCostTeam,
    platformAlloc
  );
  lines.push(linePlatform);

  // Marketing line
  const marketingAlloc = resolveTeamAllocationRule(
    'EXPENSE',
    '03. Marketing',
    'Iklan & Promo',
    null,
    teamAllocations,
    salesProportion
  );
  const lineMarketing = buildLine(
    'exp-marketing',
    'Biaya Pemasaran & Iklan Berbayar',
    expenseBuckets.marketing.kanbai,
    expenseBuckets.marketing.nutribite,
    expenseBuckets.marketing.team,
    marketingAlloc
  );
  lines.push(lineMarketing);

  // General operations line
  const opsAlloc = resolveTeamAllocationRule(
    'EXPENSE',
    '01. Operasional',
    'Operasional Retail',
    null,
    teamAllocations,
    salesProportion
  );
  const lineOps = buildLine(
    'exp-ops',
    'Beban Operasional Toko & Fasilitas',
    expenseBuckets.operasional.kanbai,
    expenseBuckets.operasional.nutribite,
    expenseBuckets.operasional.team,
    opsAlloc
  );
  lines.push(lineOps);

  // Other expense line
  const otherAlloc = resolveTeamAllocationRule(
    'EXPENSE',
    '04. Biaya Lain-lain',
    null,
    null,
    teamAllocations,
    salesProportion
  );
  const lineOtherExp = buildLine(
    'exp-other',
    'Beban Usaha Lain-lain',
    expenseBuckets.otherExpense.kanbai,
    expenseBuckets.otherExpense.nutribite,
    expenseBuckets.otherExpense.team,
    otherAlloc
  );
  lines.push(lineOtherExp);

  // TOTAL BEBAN OPERASIONAL
  const lineTotalExpenses: PandLLineItem = {
    id: 'total-expenses',
    name: 'TOTAL BEBAN OPERASIONAL',
    kanbaiDirect: linePlatform.kanbaiDirect + lineMarketing.kanbaiDirect + lineOps.kanbaiDirect + lineOtherExp.kanbaiDirect,
    kanbaiAllocated: linePlatform.kanbaiAllocated + lineMarketing.kanbaiAllocated + lineOps.kanbaiAllocated + lineOtherExp.kanbaiAllocated,
    kanbaiFinal: linePlatform.kanbaiFinal + lineMarketing.kanbaiFinal + lineOps.kanbaiFinal + lineOtherExp.kanbaiFinal,
    nutribiteDirect: linePlatform.nutribiteDirect + lineMarketing.nutribiteDirect + lineOps.nutribiteDirect + lineOtherExp.nutribiteDirect,
    nutribiteAllocated: linePlatform.nutribiteAllocated + lineMarketing.nutribiteAllocated + lineOps.nutribiteAllocated + lineOtherExp.nutribiteAllocated,
    nutribiteFinal: linePlatform.nutribiteFinal + lineMarketing.nutribiteFinal + lineOps.nutribiteFinal + lineOtherExp.nutribiteFinal,
    teamOriginal: linePlatform.teamOriginal + lineMarketing.teamOriginal + lineOps.teamOriginal + lineOtherExp.teamOriginal,
    totalSinergi: linePlatform.totalSinergi + lineMarketing.totalSinergi + lineOps.totalSinergi + lineOtherExp.totalSinergi,
    isTotal: true,
  };
  lines.push(lineTotalExpenses);

  // PENDAPATAN LAIN-LAIN
  const incAlloc = resolveTeamAllocationRule(
    'OTHER_INCOME',
    '05. Pendapatan Lain-lain',
    null,
    null,
    teamAllocations,
    salesProportion
  );
  const lineOtherIncome = buildLine(
    'inc-other',
    'Pendapatan Lain-lain / Subsidi',
    expenseBuckets.otherIncome.kanbai,
    expenseBuckets.otherIncome.nutribite,
    expenseBuckets.otherIncome.team,
    incAlloc
  );
  lines.push(lineOtherIncome);

  // LABA BERSIH OPERASIONAL
  const lineNetProfit: PandLLineItem = {
    id: 'net-profit',
    name: 'LABA BERSIH (NET PROFIT)',
    kanbaiDirect: lineGrossProfit.kanbaiDirect - lineTotalExpenses.kanbaiDirect + lineOtherIncome.kanbaiDirect,
    kanbaiAllocated: lineGrossProfit.kanbaiAllocated - lineTotalExpenses.kanbaiAllocated + lineOtherIncome.kanbaiAllocated,
    kanbaiFinal: lineGrossProfit.kanbaiFinal - lineTotalExpenses.kanbaiFinal + lineOtherIncome.kanbaiFinal,
    nutribiteDirect: lineGrossProfit.nutribiteDirect - lineTotalExpenses.nutribiteDirect + lineOtherIncome.nutribiteDirect,
    nutribiteAllocated: lineGrossProfit.nutribiteAllocated - lineTotalExpenses.nutribiteAllocated + lineOtherIncome.nutribiteAllocated,
    nutribiteFinal: lineGrossProfit.nutribiteFinal - lineTotalExpenses.nutribiteFinal + lineOtherIncome.nutribiteFinal,
    teamOriginal: lineGrossProfit.teamOriginal - lineTotalExpenses.teamOriginal + lineOtherIncome.teamOriginal,
    totalSinergi: lineGrossProfit.totalSinergi - lineTotalExpenses.totalSinergi + lineOtherIncome.totalSinergi,
    isTotal: true,
  };
  lines.push(lineNetProfit);

  // Reconciliation check
  const sumFinals = lineNetProfit.kanbaiFinal + lineNetProfit.nutribiteFinal;
  const totalSinergiNet = lineNetProfit.totalSinergi;
  const difference = Math.abs(totalSinergiNet - sumFinals);
  const isBalanced = difference <= 1;

  const totalRev = lineSales.totalSinergi;
  const gp = lineGrossProfit.totalSinergi;
  const net = lineNetProfit.totalSinergi;
  const totalExp = lineTotalExpenses.totalSinergi;

  return {
    periodLabel: 'Februari 2026',
    lines,
    salesProportion,
    reconciliation: {
      kanbaiFinalTotalNetProfit: lineNetProfit.kanbaiFinal,
      nutribiteFinalTotalNetProfit: lineNetProfit.nutribiteFinal,
      sumFinals,
      totalSinergiNetProfit: totalSinergiNet,
      difference,
      isBalanced,
    },
    summary: {
      totalRevenue: totalRev,
      grossProfit: gp,
      gpm: totalRev > 0 ? gp / totalRev : 0,
      totalExpenses: totalExp,
      netProfit: net,
      npm: totalRev > 0 ? net / totalRev : 0,
      totalPlatformCost: linePlatform.totalSinergi,
      totalMarketing: lineMarketing.totalSinergi,
    },
  };
}
