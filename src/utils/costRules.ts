/**
 * Sinergi Lapak - Dynamic Cost Rule Engine (Patch V2)
 *
 * Implements priority-based rule lookup:
 * Priority: SKU > SPU > Brand > Category > Marketplace/Unit > Default
 *
 * Features:
 * - Dynamic marketplace fee calculation based on SKU, SPU, Brand, Category, Unit, Marketplace, Program, and Effective Period.
 * - Granular override: Within the SAME cost group/canonical component, the more specific rule overrides the general rule.
 * - Distinct fee components (Admin, Layanan, Pembayaran, Gratis Ongkir, Voucher, Affiliate, Campaign, Cashback, Pajak)
 *   are properly aggregated.
 * - Warning flag ("Biaya belum diatur") when no valid cost rule is configured for the category/marketplace.
 */

import { CostRuleRecord } from '../types/database';

export type PriorityTier = 'SKU' | 'SPU' | 'BRAND' | 'CATEGORY' | 'UNIT' | 'MARKETPLACE' | 'DEFAULT';

export const PRIORITY_WEIGHTS: Record<PriorityTier, number> = {
  SKU: 600,
  SPU: 500,
  BRAND: 400,
  CATEGORY: 300,
  UNIT: 200,
  MARKETPLACE: 100,
  DEFAULT: 10,
};

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

export interface CostRuleLookupContext {
  sellingPrice: number;
  marketplaceId: string;
  categoryId?: string | null;
  brandId?: string | null;
  spuId?: string | null;
  sku?: string | null;
  unitId?: string | null;
  date?: string | Date;
  activePrograms?: string[];
  qty?: number;
}

export interface CalculatedFeeItem {
  ruleId: string;
  costName: string;
  costGroup: string;
  canonicalType: CanonicalFeeType;
  feeAmount: number;
  rate: number;
  fixedAmount: number;
  mandatory: boolean;
  program?: string | null;
  priorityTier: PriorityTier;
  specificityScore: number;
  isCategorySpecific: boolean;
  isSkuSpecific: boolean;
  isSpuSpecific: boolean;
  isBrandSpecific: boolean;
  matchedRule: CostRuleRecord;
}

export interface FeeBreakdown {
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

export interface DynamicFeeCalculationResult {
  fees: CalculatedFeeItem[];
  totalFeeAmount: number;
  effectiveFeeRate: number;
  hasConfiguredFees: boolean;
  warning?: string;
  breakdown: FeeBreakdown;
  appliedTiers: PriorityTier[];
}

/**
 * Categorize any cost rule name and group into canonical fee types
 */
export function getCanonicalCostType(
  costName: string,
  costGroup: string
): CanonicalFeeType {
  const normName = costName.toLowerCase().trim();
  const normGroup = costGroup.toUpperCase().trim();

  if (
    normName.includes('admin') ||
    normGroup === 'ADMIN_FEE' ||
    (normGroup === 'PLATFORM_FEE' && normName.includes('admin'))
  ) {
    return 'ADMIN_FEE';
  }
  if (
    normName.includes('pembayaran') ||
    normName.includes('transaksi') ||
    normName.includes('payment') ||
    normGroup === 'PAYMENT_FEE'
  ) {
    return 'PAYMENT_FEE';
  }
  if (
    normName.includes('gratis ongkir') ||
    normName.includes('ongkir') ||
    normName.includes('shipping') ||
    normGroup === 'SHIPPING_PROGRAM' ||
    normGroup === 'SHIPPING_FEE'
  ) {
    return 'FREE_SHIPPING';
  }
  if (normName.includes('voucher') || normGroup === 'VOUCHER') {
    return 'VOUCHER';
  }
  if (normName.includes('affiliate') || normName.includes('afiliasi') || normGroup === 'AFFILIATE') {
    return 'AFFILIATE';
  }
  if (
    normName.includes('campaign') ||
    normName.includes('flash sale') ||
    normName.includes('promo') ||
    normGroup === 'CAMPAIGN'
  ) {
    return 'CAMPAIGN';
  }
  if (normName.includes('cashback') || normGroup === 'CASHBACK') {
    return 'CASHBACK';
  }
  if (
    normName.includes('pajak') ||
    normName.includes('ppn') ||
    normName.includes('pph') ||
    normName.includes('tax') ||
    normGroup === 'TAX'
  ) {
    return 'TAX';
  }
  if (
    normName.includes('layanan') ||
    normName.includes('service') ||
    normGroup === 'SERVICE_FEE' ||
    normGroup === 'PLATFORM_FEE'
  ) {
    return 'SERVICE_FEE';
  }
  return 'OTHER';
}

/**
 * Check if a cost rule is active and within effective dates
 */
export function isCostRuleEffective(rule: CostRuleRecord, targetDate: string | Date = new Date()): boolean {
  if (!rule.active) return false;

  const checkTime = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
  if (isNaN(checkTime)) return rule.active;

  if (rule.effective_from) {
    const fromTime = new Date(rule.effective_from).getTime();
    if (!isNaN(fromTime) && checkTime < fromTime) {
      return false;
    }
  }

  if (rule.effective_to) {
    const toTime = new Date(rule.effective_to).getTime();
    if (!isNaN(toTime) && checkTime > toTime) {
      return false;
    }
  }

  return true;
}

/**
 * Determine rule priority tier and specificity score.
 * Hierarchy:
 * SKU (Priority 6) > SPU (Priority 5) > Brand (Priority 4) > Category (Priority 3) > Unit (Priority 2) > Marketplace/Default (Priority 1)
 */
export function evaluateRulePriority(rule: CostRuleRecord): {
  tier: PriorityTier;
  score: number;
  isSku: boolean;
  isSpu: boolean;
  isBrand: boolean;
  isCategory: boolean;
  isUnit: boolean;
} {
  let score = rule.priority || 50;
  let tier: PriorityTier = 'DEFAULT';

  const isSku = Boolean(rule.sku && rule.sku.trim() !== '');
  const isSpu = Boolean(rule.spu_id && rule.spu_id.trim() !== '');
  const isBrand = Boolean(rule.brand_id && rule.brand_id.trim() !== '');
  const isCategory = Boolean(rule.category_id && rule.category_id.trim() !== '');
  const isUnit = Boolean(rule.unit_id && rule.unit_id.trim() !== '');

  if (isSku) {
    tier = 'SKU';
    score += PRIORITY_WEIGHTS.SKU;
  } else if (isSpu) {
    tier = 'SPU';
    score += PRIORITY_WEIGHTS.SPU;
  } else if (isBrand) {
    tier = 'BRAND';
    score += PRIORITY_WEIGHTS.BRAND;
  } else if (isCategory) {
    tier = 'CATEGORY';
    score += PRIORITY_WEIGHTS.CATEGORY;
  } else if (isUnit) {
    tier = 'UNIT';
    score += PRIORITY_WEIGHTS.UNIT;
  } else if (rule.marketplace_id && rule.marketplace_id !== 'ALL') {
    tier = 'MARKETPLACE';
    score += PRIORITY_WEIGHTS.MARKETPLACE;
  } else {
    tier = 'DEFAULT';
    score += PRIORITY_WEIGHTS.DEFAULT;
  }

  return { tier, score, isSku, isSpu, isBrand, isCategory, isUnit };
}

/**
 * Calculate amount for a specific rule based on its calculation type
 */
export function calculateSingleRuleAmount(
  basePrice: number,
  rule: CostRuleRecord,
  qty: number = 1
): number {
  let base = basePrice;
  if (rule.calculation_base === 'QTY') {
    base = qty;
  }

  let calculated = 0;

  switch (rule.calculation_type) {
    case 'PERCENTAGE':
      calculated = base * (rule.rate || 0);
      break;

    case 'FIXED':
      calculated = rule.fixed_amount || 0;
      break;

    case 'PERCENTAGE_MAX':
      calculated = base * (rule.rate || 0);
      if (rule.maximum_fee !== null && rule.maximum_fee !== undefined && rule.maximum_fee > 0) {
        calculated = Math.min(calculated, rule.maximum_fee);
      }
      break;

    case 'PERCENTAGE_MIN':
      calculated = base * (rule.rate || 0);
      if (rule.minimum_fee !== null && rule.minimum_fee !== undefined && rule.minimum_fee > 0) {
        calculated = Math.max(calculated, rule.minimum_fee);
      }
      break;

    case 'PERCENTAGE_MIN_MAX':
      calculated = base * (rule.rate || 0);
      if (rule.minimum_fee !== null && rule.minimum_fee !== undefined && rule.minimum_fee > 0) {
        calculated = Math.max(calculated, rule.minimum_fee);
      }
      if (rule.maximum_fee !== null && rule.maximum_fee !== undefined && rule.maximum_fee > 0) {
        calculated = Math.min(calculated, rule.maximum_fee);
      }
      break;

    case 'FIXED_PERCENTAGE':
      calculated = (rule.fixed_amount || 0) + base * (rule.rate || 0);
      break;

    case 'TIER':
      if (rule.range_to && base > rule.range_to) {
        calculated = base * ((rule.rate || 0) * 0.8);
      } else {
        calculated = base * (rule.rate || 0);
      }
      break;

    default:
      calculated = base * (rule.rate || 0);
      break;
  }

  return Math.round(calculated);
}

/**
 * Main Cost Rule Engine Lookup Function
 *
 * Implements strict priority-based matching:
 * 1. Filter active & date-effective rules for target marketplace.
 * 2. Match filters: SKU > SPU > Brand > Category > Unit.
 * 3. Group rules by Canonical Fee Component and specific cost name.
 * 4. In each group, the rule with the highest specificity score wins (override).
 * 5. Distinct fee components are summed together.
 * 6. If no rules exist or none matched, flag warning "Biaya belum diatur" (do not silently assume 0%).
 */
export function calculateDynamicCostRules(
  context: CostRuleLookupContext,
  allRules: CostRuleRecord[]
): DynamicFeeCalculationResult {
  const {
    sellingPrice,
    marketplaceId,
    categoryId = '',
    brandId = '',
    spuId = '',
    sku = '',
    unitId = '',
    date = new Date(),
    activePrograms = ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL'],
    qty = 1,
  } = context;

  // Direct cash or offline channels have intentionally 0 fee
  if (marketplaceId === 'MKT-CASH' || marketplaceId === 'DIRECT') {
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
      appliedTiers: ['DEFAULT'],
    };
  }

  // 1. Filter active and date-effective rules for marketplace
  const candidateRules = allRules.filter((r) => {
    if (!r.active) return false;
    if (r.marketplace_id !== 'ALL' && r.marketplace_id !== marketplaceId) return false;
    return isCostRuleEffective(r, date);
  });

  // If absolutely no rules exist for this marketplace
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
      appliedTiers: [],
    };
  }

  // 2. Evaluate matches and resolve overrides per component
  // Key format: canonicalType_costName
  interface WinningRuleEntry {
    rule: CostRuleRecord;
    tier: PriorityTier;
    score: number;
    isSku: boolean;
    isSpu: boolean;
    isBrand: boolean;
    isCategory: boolean;
  }

  const winningRules = new Map<string, WinningRuleEntry>();

  for (const rule of candidateRules) {
    // Check match criteria
    const matchesSku = !rule.sku || (sku && rule.sku.toUpperCase().trim() === sku.toUpperCase().trim());
    const matchesSpu = !rule.spu_id || (spuId && rule.spu_id === spuId);
    const matchesBrand = !rule.brand_id || (brandId && rule.brand_id === brandId);
    const matchesCategory = !rule.category_id || (categoryId && rule.category_id === categoryId);
    const matchesUnit = !rule.unit_id || (unitId && rule.unit_id === unitId);

    if (matchesSku && matchesSpu && matchesBrand && matchesCategory && matchesUnit) {
      // Check program inclusion
      if (!rule.mandatory && rule.program) {
        if (!activePrograms.includes(rule.program) && !activePrograms.includes('ALL')) {
          continue;
        }
      }

      const priorityInfo = evaluateRulePriority(rule);
      const canonicalType = getCanonicalCostType(rule.cost_name, rule.cost_group);

      // Grouping key: we group by canonicalType + normalized costName
      // so specific category admin fee overrides general admin fee,
      // but admin fee and service fee are separate and cumulative.
      const groupKey = `${canonicalType}_${rule.cost_name.toLowerCase().trim()}`;

      const existing = winningRules.get(groupKey);
      if (!existing || priorityInfo.score > existing.score) {
        winningRules.set(groupKey, {
          rule,
          tier: priorityInfo.tier,
          score: priorityInfo.score,
          isSku: priorityInfo.isSku,
          isSpu: priorityInfo.isSpu,
          isBrand: priorityInfo.isBrand,
          isCategory: priorityInfo.isCategory,
        });
      }
    }
  }

  // 3. Assemble results and breakdown
  const items: CalculatedFeeItem[] = [];
  const breakdown: FeeBreakdown = {
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

  const appliedTiersSet = new Set<PriorityTier>();

  winningRules.forEach(({ rule, tier, score, isSku, isSpu, isBrand, isCategory }) => {
    const feeAmount = calculateSingleRuleAmount(sellingPrice, rule, qty);
    const canonicalType = getCanonicalCostType(rule.cost_name, rule.cost_group);

    appliedTiersSet.add(tier);

    items.push({
      ruleId: rule.rule_id,
      costName: rule.cost_name,
      costGroup: rule.cost_group,
      canonicalType,
      feeAmount,
      rate: rule.rate,
      fixedAmount: rule.fixed_amount,
      mandatory: rule.mandatory,
      program: rule.program,
      priorityTier: tier,
      specificityScore: score,
      isCategorySpecific: isCategory,
      isSkuSpecific: isSku,
      isSpuSpecific: isSpu,
      isBrandSpecific: isBrand,
      matchedRule: rule,
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

  const totalFeeAmount = items.reduce((acc, it) => acc + it.feeAmount, 0);
  const effectiveFeeRate = sellingPrice > 0 ? totalFeeAmount / sellingPrice : 0;
  const hasConfiguredFees = items.length > 0;

  return {
    fees: items,
    totalFeeAmount,
    effectiveFeeRate,
    hasConfiguredFees,
    warning: hasConfiguredFees ? undefined : 'Biaya belum diatur untuk kategori/produk ini',
    breakdown,
    appliedTiers: Array.from(appliedTiersSet),
  };
}

/**
 * Backward compatibility wrapper matching existing getApplicableMarketplaceFees signature
 */
export function getApplicableMarketplaceFeesFromRules(
  sellingPrice: number,
  marketplaceId: string,
  categoryId: string,
  brandId: string,
  spuId: string,
  skuCode: string,
  unitId: string,
  allRules: CostRuleRecord[],
  activePrograms: string[] = ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL']
): DynamicFeeCalculationResult {
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
