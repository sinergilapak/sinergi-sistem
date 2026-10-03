/**
 * Sinergi Lapak - Cost Rule Engine (src/utils/costRules.ts)
 * 
 * Implements dynamic marketplace fee calculations governed by:
 * - Requirements 5: Dynamic fees per category/subcategory/brand/SPU/SKU/unit/program/date
 *                   Warning "Biaya belum diatur" when no rules exist (do not silently default to 0%)
 * - Requirements 6: Strict Priority Hierarchy lookup:
 *                   SKU (Level 6) -> SPU (Level 5) -> Brand (Level 4) -> Category (Level 3) -> 
 *                   Marketplace/Unit (Level 2) -> Default (Level 1)
 *                   Within the same cost group/type, the most specific rule overrides general rules.
 *                   Distinct cost types (Admin, Layanan, Pembayaran, Gratis Ongkir, dll) are aggregated.
 */

import { CostRuleRecord } from '../types/database';

export type CanonicalFeeType =
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

export enum SpecificityTier {
  SKU = 6,
  SPU = 5,
  BRAND = 4,
  CATEGORY = 3,
  UNIT = 2,
  DEFAULT = 1,
}

export interface CostRuleLookupContext {
  sellingPrice: number;
  marketplaceId: string;
  categoryId?: string | null;
  brandId?: string | null;
  spuId?: string | null;
  sku?: string | null;
  unitId?: string | null;
  effectiveDate?: string | Date;
  activePrograms?: string[];
  qty?: number;
}

export interface MarketplaceFeeItem {
  ruleId: string;
  costName: string;
  costGroup: string;
  canonicalType: CanonicalFeeType;
  feeAmount: number;
  rate: number;
  fixedAmount: number;
  mandatory: boolean;
  program?: string | null;
  specificityScore: number;
  specificityLevel: 'SKU' | 'SPU' | 'BRAND' | 'CATEGORY' | 'UNIT' | 'DEFAULT';
  isCategorySpecific: boolean;
  isSkuSpecific: boolean;
  matchedBy: string;
}

export interface MarketplaceFeeBreakdown {
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
}

export interface MarketplaceFeeCalculationResult {
  fees: MarketplaceFeeItem[];
  totalFeeAmount: number;
  effectiveFeeRate: number;
  hasConfiguredFees: boolean;
  warning?: string;
  breakdown: MarketplaceFeeBreakdown;
  lookupDetails?: {
    marketplaceId: string;
    rulesEvaluated: number;
    rulesMatched: number;
    resolvedTier: string;
  };
}

/**
 * Normalizes and categorizes a cost rule name or group into its canonical fee type.
 */
export function getCanonicalCostType(costName: string, costGroup: string): CanonicalFeeType {
  const normName = costName.toLowerCase().trim();
  const normGroup = costGroup.toUpperCase().trim();

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
 * Checks if a rule is valid for a given target date.
 */
export function isCostRuleEffective(rule: CostRuleRecord, targetDate: Date | string = new Date()): boolean {
  if (!rule.active) return false;

  const dateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const targetTime = dateObj.getTime();

  if (rule.effective_from) {
    const fromTime = new Date(rule.effective_from).getTime();
    if (!isNaN(fromTime) && targetTime < fromTime) {
      return false;
    }
  }

  if (rule.effective_to) {
    const toTime = new Date(rule.effective_to).getTime();
    if (!isNaN(toTime) && targetTime > toTime) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates specificity score based on priority hierarchy:
 * SKU (Score 500,000) > SPU (400,000) > Brand (300,000) > Category (200,000) > Unit (100,000) > Default (10,000)
 * Plus rule priority (0-999) for fine-grained ties.
 */
export function calculateRuleSpecificity(
  rule: CostRuleRecord,
  context: CostRuleLookupContext
): { score: number; tier: SpecificityTier; tierLabel: 'SKU' | 'SPU' | 'BRAND' | 'CATEGORY' | 'UNIT' | 'DEFAULT'; matchedBy: string } {
  let score = rule.priority || 50;
  let tier = SpecificityTier.DEFAULT;
  let tierLabel: 'SKU' | 'SPU' | 'BRAND' | 'CATEGORY' | 'UNIT' | 'DEFAULT' = 'DEFAULT';
  let matchedBy = 'Marketplace Default';

  if (rule.sku && context.sku && rule.sku.toUpperCase() === context.sku.toUpperCase()) {
    score += 500000;
    tier = SpecificityTier.SKU;
    tierLabel = 'SKU';
    matchedBy = `SKU: ${rule.sku}`;
  } else if (rule.spu_id && context.spuId && rule.spu_id === context.spuId) {
    score += 400000;
    tier = SpecificityTier.SPU;
    tierLabel = 'SPU';
    matchedBy = `SPU: ${rule.spu_id}`;
  } else if (rule.brand_id && context.brandId && rule.brand_id === context.brandId) {
    score += 300000;
    tier = SpecificityTier.BRAND;
    tierLabel = 'BRAND';
    matchedBy = `Brand: ${rule.brand_id}`;
  } else if (rule.category_id && context.categoryId && rule.category_id === context.categoryId) {
    score += 200000;
    tier = SpecificityTier.CATEGORY;
    tierLabel = 'CATEGORY';
    matchedBy = `Category: ${rule.category_id}`;
  } else if (rule.unit_id && context.unitId && rule.unit_id === context.unitId) {
    score += 100000;
    tier = SpecificityTier.UNIT;
    tierLabel = 'UNIT';
    matchedBy = `Unit: ${rule.unit_id}`;
  } else {
    score += 10000;
    tier = SpecificityTier.DEFAULT;
    tierLabel = 'DEFAULT';
    matchedBy = 'Marketplace Standard';
  }

  return { score, tier, tierLabel, matchedBy };
}

/**
 * Computes fee for a single cost rule based on calculation type and price/qty.
 */
export function calculateSingleRuleFee(basePrice: number, rule: CostRuleRecord, qty: number = 1): number {
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
 * Main Cost Rule Engine:
 * Resolves priority-based marketplace cost rules (SKU > SPU > Brand > Category > Unit > Default)
 * Aggregates distinct cost groups (Admin, Payment, Shipping, Tax, etc.) while overriding duplicates
 * within the same group.
 */
export function calculateDynamicMarketplaceFees(
  context: CostRuleLookupContext,
  allRules: CostRuleRecord[]
): MarketplaceFeeCalculationResult {
  const {
    sellingPrice,
    marketplaceId,
    categoryId,
    brandId,
    spuId,
    sku,
    unitId,
    effectiveDate = new Date(),
    activePrograms = ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL'],
    qty = 1,
  } = context;

  // Direct offline / cash sales have 0% marketplace fees
  if (marketplaceId === 'MKT-CASH' || marketplaceId === 'CASH') {
    return {
      fees: [],
      totalFeeAmount: 0,
      effectiveFeeRate: 0,
      hasConfiguredFees: true,
      breakdown: {
        adminFee: 0,
        serviceFee: 0,
        paymentFee: 0,
        freeShippingFee: 0,
        voucherFee: 0,
        affiliateFee: 0,
        campaignFee: 0,
        cashbackFee: 0,
        taxFee: 0,
        otherFee: 0,
      },
      lookupDetails: {
        marketplaceId,
        rulesEvaluated: 0,
        rulesMatched: 0,
        resolvedTier: 'DIRECT_OFFLINE',
      },
    };
  }

  // 1. Filter rules matching marketplace and validity period
  const candidateRules = allRules.filter(
    (r) => r.marketplace_id === marketplaceId && isCostRuleEffective(r, effectiveDate)
  );

  if (candidateRules.length === 0) {
    return {
      fees: [],
      totalFeeAmount: 0,
      effectiveFeeRate: 0,
      hasConfiguredFees: false,
      warning: 'Biaya belum diatur untuk marketplace ini',
      breakdown: {
        adminFee: 0,
        serviceFee: 0,
        paymentFee: 0,
        freeShippingFee: 0,
        voucherFee: 0,
        affiliateFee: 0,
        campaignFee: 0,
        cashbackFee: 0,
        taxFee: 0,
        otherFee: 0,
      },
      lookupDetails: {
        marketplaceId,
        rulesEvaluated: allRules.length,
        rulesMatched: 0,
        resolvedTier: 'NONE',
      },
    };
  }

  // 2. Evaluate match criteria for each candidate rule
  interface WinningEntry {
    rule: CostRuleRecord;
    score: number;
    tier: SpecificityTier;
    tierLabel: 'SKU' | 'SPU' | 'BRAND' | 'CATEGORY' | 'UNIT' | 'DEFAULT';
    matchedBy: string;
    isSku: boolean;
    isCategory: boolean;
  }

  const winningRules = new Map<string, WinningEntry>();
  let rulesMatchedCount = 0;

  for (const rule of candidateRules) {
    // Exact hierarchy match:
    // If rule specifies a filter, it MUST match the context.
    const ruleSkuNorm = rule.sku?.trim().toUpperCase();
    const contextSkuNorm = sku?.trim().toUpperCase();
    const matchesSku = !ruleSkuNorm || (Boolean(contextSkuNorm) && ruleSkuNorm === contextSkuNorm);

    const matchesSpu = !rule.spu_id || (Boolean(spuId) && rule.spu_id === spuId);
    const matchesBrand = !rule.brand_id || (Boolean(brandId) && rule.brand_id === brandId);
    const matchesCategory = !rule.category_id || (Boolean(categoryId) && rule.category_id === categoryId);
    const matchesUnit = !rule.unit_id || (Boolean(unitId) && rule.unit_id === unitId);

    if (matchesSku && matchesSpu && matchesBrand && matchesCategory && matchesUnit) {
      // Program inclusion check for non-mandatory optional fees
      if (!rule.mandatory && rule.program) {
        const isProgramActive =
          activePrograms.includes(rule.program) || activePrograms.includes('ALL');
        if (!isProgramActive) {
          continue;
        }
      }

      rulesMatchedCount++;

      // Compute specificity
      const { score, tier, tierLabel, matchedBy } = calculateRuleSpecificity(rule, context);
      const canonicalType = getCanonicalCostType(rule.cost_name, rule.cost_group);

      // Overriding key: Combine canonicalType with cost name to allow distinct fees of same group,
      // but override exact same component (e.g. general Admin Fee vs Electronics Category Admin Fee)
      const costNameKey = rule.cost_name.toLowerCase().replace(/kategori.*$/i, '').trim();
      const groupKey = `${canonicalType}__${costNameKey}`;

      const existing = winningRules.get(groupKey);
      if (!existing || score > existing.score) {
        winningRules.set(groupKey, {
          rule,
          score,
          tier,
          tierLabel,
          matchedBy,
          isSku: tier === SpecificityTier.SKU,
          isCategory: tier === SpecificityTier.CATEGORY,
        });
      }
    }
  }

  // 3. Compute amounts from winning rules
  const feeItems: MarketplaceFeeItem[] = [];
  const breakdown: MarketplaceFeeBreakdown = {
    adminFee: 0,
    serviceFee: 0,
    paymentFee: 0,
    freeShippingFee: 0,
    voucherFee: 0,
    affiliateFee: 0,
    campaignFee: 0,
    cashbackFee: 0,
    taxFee: 0,
    otherFee: 0,
  };

  let maxTierLabel: string = 'DEFAULT';
  let maxTierValue = SpecificityTier.DEFAULT;

  winningRules.forEach(({ rule, score, tier, tierLabel, matchedBy, isSku, isCategory }) => {
    const feeAmount = calculateSingleRuleFee(sellingPrice, rule, qty);
    const canonicalType = getCanonicalCostType(rule.cost_name, rule.cost_group);

    if (tier > maxTierValue) {
      maxTierValue = tier;
      maxTierLabel = tierLabel;
    }

    feeItems.push({
      ruleId: rule.rule_id,
      costName: rule.cost_name,
      costGroup: rule.cost_group,
      canonicalType,
      feeAmount,
      rate: rule.rate,
      fixedAmount: rule.fixed_amount,
      mandatory: rule.mandatory,
      program: rule.program,
      specificityScore: score,
      specificityLevel: tierLabel,
      isCategorySpecific: isCategory,
      isSkuSpecific: isSku,
      matchedBy,
    });

    switch (canonicalType) {
      case 'ADMIN_FEE':
        breakdown.adminFee += feeAmount;
        break;
      case 'SERVICE_FEE':
        breakdown.serviceFee += feeAmount;
        break;
      case 'PAYMENT_FEE':
        breakdown.paymentFee += feeAmount;
        break;
      case 'FREE_SHIPPING':
        breakdown.freeShippingFee += feeAmount;
        break;
      case 'VOUCHER':
        breakdown.voucherFee += feeAmount;
        break;
      case 'AFFILIATE':
        breakdown.affiliateFee += feeAmount;
        break;
      case 'CAMPAIGN':
        breakdown.campaignFee += feeAmount;
        break;
      case 'CASHBACK':
        breakdown.cashbackFee += feeAmount;
        break;
      case 'TAX':
        breakdown.taxFee += feeAmount;
        break;
      default:
        breakdown.otherFee += feeAmount;
        break;
    }
  });

  const totalFeeAmount = feeItems.reduce((acc, it) => acc + it.feeAmount, 0);
  const effectiveFeeRate = sellingPrice > 0 ? totalFeeAmount / sellingPrice : 0;
  const hasConfiguredFees = feeItems.length > 0;

  return {
    fees: feeItems,
    totalFeeAmount,
    effectiveFeeRate,
    hasConfiguredFees,
    warning: !hasConfiguredFees
      ? 'Biaya belum diatur untuk produk/kategori ini'
      : undefined,
    breakdown,
    lookupDetails: {
      marketplaceId,
      rulesEvaluated: candidateRules.length,
      rulesMatched: rulesMatchedCount,
      resolvedTier: maxTierLabel,
    },
  };
}

/**
 * Backward-compatible helper matching legacy function signature:
 * getApplicableMarketplaceFees(sellingPrice, marketplaceId, categoryId, brandId, spuId, skuCode, unitId, allRules, activePrograms)
 */
export function getApplicableMarketplaceFees(
  sellingPrice: number,
  marketplaceId: string,
  categoryId: string = '',
  brandId: string = '',
  spuId: string = '',
  skuCode: string = '',
  unitId: string = '',
  allRules: CostRuleRecord[] = [],
  activePrograms: string[] = ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL']
): MarketplaceFeeCalculationResult {
  return calculateDynamicMarketplaceFees(
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
