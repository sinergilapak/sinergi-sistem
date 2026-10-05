import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Trash2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  Layers,
  RotateCcw,
  Settings2,
  Copy,
  Check,
  Tag,
  Package,
  Truck,
  Gift,
  Video,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import {
  DatabaseState,
  CostRuleRecord,
  CalculationType,
} from '../../types/database';
import { formatIDR, formatPercent } from '../../utils/validation';
import {
  calculateDynamicCostRules,
  DynamicFeeCalculationResult,
  CalculatedFeeItem,
  PriorityTier,
} from '../../utils/costRules';
import { CostRuleHierarchySection } from './CostRuleHierarchySection';

export type PricingSubTab = 'calculator' | 'fees' | 'ads_sim';

export interface CustomExtraFeeItem {
  id: string;
  name: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  cap?: number;
}

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

  useEffect(() => {
    if (activeSubTab) {
      setCurrentSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleTabSwitch = (tab: PricingSubTab) => {
    setCurrentSubTab(tab);
    onSubTabChange?.(tab);
  };

  // --- TAB 1: KALKULATOR HARGA & BIAYA KUSTOM LENGKAP ---
  const [calcSku, setCalcSku] = useState<string>(dbState.skus[0]?.sku || '');
  const [calcMarketplace, setCalcMarketplace] = useState<string>('MKT-SHOPEE');
  const [calcUnit, setCalcUnit] = useState<string>('U001');

  // Active SKU object
  const activeSkuObj = useMemo(() => {
    return dbState.skus.find((s) => s.sku === calcSku);
  }, [dbState.skus, calcSku]);

  // Pricing Mode & Core Targets (Direct textboxes, NO slider bars)
  const [calcPriceMode, setCalcPriceMode] = useState<'AUTO' | 'CUSTOM'>('AUTO');
  const [calcCustomSellingPrice, setCalcCustomSellingPrice] = useState<number>(75000);
  const [calcTargetMarginPct, setCalcTargetMarginPct] = useState<number>(15); // 15%
  const [calcIncludeOptionalPrograms, setCalcIncludeOptionalPrograms] = useState<boolean>(true);
  const [isFeeCustomized, setIsFeeCustomized] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Biaya Produk & Fisik (Direct Textboxes)
  const [customHpp, setCustomHpp] = useState<number>(activeSkuObj?.hpp || 25000);
  const [customPackingFee, setCustomPackingFee] = useState<number>(1500); // Kardus, bubble wrap, lakban, label thermal
  const [customFulfillmentFee, setCustomFulfillmentFee] = useState<number>(500); // Handling gudang per paket
  const [customReturnBufferPct, setCustomReturnBufferPct] = useState<number>(1.0); // Cadangan retur & barang rusak (1%)

  // Sync HPP when SKU changes if not customized
  useEffect(() => {
    if (activeSkuObj?.hpp !== undefined) {
      setCustomHpp(activeSkuObj.hpp);
    }
  }, [activeSkuObj]);

  // 2. Potongan Pokok Marketplace (Direct Textboxes)
  const [customAdminRatePct, setCustomAdminRatePct] = useState<number>(6.5);
  const [customAdminFixed, setCustomAdminFixed] = useState<number>(0);
  const [customAdminCap, setCustomAdminCap] = useState<number>(10000);

  const [customServiceRatePct, setCustomServiceRatePct] = useState<number>(1.5);
  const [customServiceFixed, setCustomServiceFixed] = useState<number>(0);

  const [customPaymentRatePct, setCustomPaymentRatePct] = useState<number>(1.0);
  const [customPaymentFixed, setCustomPaymentFixed] = useState<number>(0);

  // 3. Program Promosi Marketplace (Direct Textboxes)
  const [customShippingRatePct, setCustomShippingRatePct] = useState<number>(4.0); // Gratis Ongkir XTRA
  const [customShippingCap, setCustomShippingCap] = useState<number>(10000);

  const [customCashbackRatePct, setCustomCashbackRatePct] = useState<number>(0); // Cashback XTRA
  const [customCashbackCap, setCustomCashbackCap] = useState<number>(10000);

  const [customCampaignRatePct, setCustomCampaignRatePct] = useState<number>(0); // Flash Sale & Mega Campaign
  const [customCampaignFixed, setCustomCampaignFixed] = useState<number>(0);

  const [customAffiliateRatePct, setCustomAffiliateRatePct] = useState<number>(0); // Komisi Afiliasi Kreator
  const [customAffiliateFixed, setCustomAffiliateFixed] = useState<number>(0);

  const [customVoucherPerUnit, setCustomVoucherPerUnit] = useState<number>(0); // Subsidi Voucher Diskon Toko
  const [customLiveStreamRatePct, setCustomLiveStreamRatePct] = useState<number>(0); // Komisi Live Streaming

  // 4. Iklan Digital (Direct Textboxes)
  const [calcAdsTargetRatePct, setCalcAdsTargetRatePct] = useState<number>(5.0); // 5% Target Ads Budget
  const [calcAdsFixed, setCalcAdsFixed] = useState<number>(0); // Budget iklan tetap per pcs

  // 5. Pajak & Overhead (Direct Textboxes)
  const [customTaxRatePct, setCustomTaxRatePct] = useState<number>(0); // PPN / PPh (%)
  const [customOverheadRatePct, setCustomOverheadRatePct] = useState<number>(2.0); // Overhead kantor & listrik (%)
  const [customOverheadFixed, setCustomOverheadFixed] = useState<number>(0); // Overhead tetap per pcs

  // 6. Biaya Kustom Tambahan Dinamis (User-defined Extra Fees)
  const [customExtraFees, setCustomExtraFees] = useState<CustomExtraFeeItem[]>([]);

  // Function to load default rule rates from the cost rule engine
  const loadRulesIntoCustomFees = useCallback(() => {
    const baseTestPrice = 100000;
    const res = calculateDynamicCostRules(
      {
        sellingPrice: baseTestPrice,
        marketplaceId: calcMarketplace,
        categoryId: activeSkuObj?.category_id || '',
        brandId: activeSkuObj?.brand_id || '',
        spuId: activeSkuObj?.spu_id || '',
        sku: calcSku,
        unitId: calcUnit,
        activePrograms: calcIncludeOptionalPrograms
          ? ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL']
          : ['ALL_MANDATORY'],
      },
      dbState.costRules
    );

    let adminRate = 0;
    let adminFixed = 0;
    let adminCap = 0;
    let serviceRate = 0;
    let serviceFixed = 0;
    let paymentRate = 0;
    let paymentFixed = 0;
    let shippingRate = 0;
    let shippingCap = 0;
    let cashbackRate = 0;
    let cashbackCap = 0;
    let campaignRate = 0;
    let campaignFixed = 0;
    let affiliateRate = 0;
    let affiliateFixed = 0;
    let taxRate = 0;

    res.fees.forEach((f) => {
      if (f.canonicalType === 'ADMIN_FEE') {
        adminRate += (f.rate || 0) * 100;
        adminFixed += f.fixedAmount || 0;
        if (f.matchedRule?.maximum_fee) adminCap = f.matchedRule.maximum_fee;
      } else if (f.canonicalType === 'SERVICE_FEE') {
        serviceRate += (f.rate || 0) * 100;
        serviceFixed += f.fixedAmount || 0;
      } else if (f.canonicalType === 'PAYMENT_FEE') {
        paymentRate += (f.rate || 0) * 100;
        paymentFixed += f.fixedAmount || 0;
      } else if (f.canonicalType === 'FREE_SHIPPING') {
        shippingRate += (f.rate || 0) * 100;
        if (f.matchedRule?.maximum_fee) shippingCap = f.matchedRule.maximum_fee;
      } else if (f.canonicalType === 'CASHBACK') {
        cashbackRate += (f.rate || 0) * 100;
        if (f.matchedRule?.maximum_fee) cashbackCap = f.matchedRule.maximum_fee;
      } else if (f.canonicalType === 'CAMPAIGN' || f.canonicalType === 'VOUCHER') {
        campaignRate += (f.rate || 0) * 100;
        campaignFixed += f.fixedAmount || 0;
      } else if (f.canonicalType === 'AFFILIATE') {
        affiliateRate += (f.rate || 0) * 100;
        affiliateFixed += f.fixedAmount || 0;
      } else if (f.canonicalType === 'TAX') {
        taxRate += (f.rate || 0) * 100;
      }
    });

    setCustomAdminRatePct(Number(adminRate.toFixed(2)) || 6.5);
    setCustomAdminFixed(adminFixed);
    setCustomAdminCap(adminCap || 10000);

    setCustomServiceRatePct(Number(serviceRate.toFixed(2)) || 1.5);
    setCustomServiceFixed(serviceFixed);

    setCustomPaymentRatePct(Number(paymentRate.toFixed(2)) || 1.0);
    setCustomPaymentFixed(paymentFixed);

    setCustomShippingRatePct(Number(shippingRate.toFixed(2)) || 4.0);
    setCustomShippingCap(shippingCap || 10000);

    setCustomCashbackRatePct(Number(cashbackRate.toFixed(2)));
    setCustomCashbackCap(cashbackCap || 10000);

    setCustomCampaignRatePct(Number(campaignRate.toFixed(2)));
    setCustomCampaignFixed(campaignFixed);

    setCustomAffiliateRatePct(Number(affiliateRate.toFixed(2)));
    setCustomAffiliateFixed(affiliateFixed);

    setCustomTaxRatePct(Number(taxRate.toFixed(2)));
    setIsFeeCustomized(false);
  }, [
    calcMarketplace,
    activeSkuObj,
    calcSku,
    calcUnit,
    calcIncludeOptionalPrograms,
    dbState.costRules,
  ]);

  // Auto-reload defaults when marketplace, sku, or unit changes IF not explicitly customized
  useEffect(() => {
    if (!isFeeCustomized) {
      loadRulesIntoCustomFees();
    }
  }, [
    calcMarketplace,
    calcSku,
    calcUnit,
    calcIncludeOptionalPrograms,
    isFeeCustomized,
    loadRulesIntoCustomFees,
  ]);

  // Quick Preset Handlers
  const handleApplyPreset = (presetType: 'xtra' | 'campaign' | 'minimal' | 'clear') => {
    setIsFeeCustomized(true);
    if (presetType === 'xtra') {
      setCustomAdminRatePct(6.5);
      setCustomServiceRatePct(1.5);
      setCustomPaymentRatePct(1.0);
      setCustomShippingRatePct(4.0);
      setCustomShippingCap(10000);
      setCustomCashbackRatePct(3.0);
      setCustomCashbackCap(10000);
      setCustomCampaignRatePct(0);
      setCustomAffiliateRatePct(2.0);
      setCustomVoucherPerUnit(0);
      setCalcAdsTargetRatePct(5.0);
      setCustomPackingFee(1500);
      setCustomFulfillmentFee(500);
      setCustomReturnBufferPct(1.0);
    } else if (presetType === 'campaign') {
      setCustomAdminRatePct(6.5);
      setCustomServiceRatePct(1.5);
      setCustomPaymentRatePct(1.0);
      setCustomShippingRatePct(4.0);
      setCustomShippingCap(10000);
      setCustomCashbackRatePct(3.0);
      setCustomCashbackCap(10000);
      setCustomCampaignRatePct(4.0);
      setCustomAffiliateRatePct(3.0);
      setCustomVoucherPerUnit(2500);
      setCalcAdsTargetRatePct(8.0);
      setCustomPackingFee(2000);
      setCustomFulfillmentFee(500);
      setCustomReturnBufferPct(1.5);
    } else if (presetType === 'minimal') {
      setCustomAdminRatePct(6.5);
      setCustomServiceRatePct(1.5);
      setCustomPaymentRatePct(1.0);
      setCustomShippingRatePct(0);
      setCustomCashbackRatePct(0);
      setCustomCampaignRatePct(0);
      setCustomAffiliateRatePct(0);
      setCustomVoucherPerUnit(0);
      setCalcAdsTargetRatePct(0);
      setCustomPackingFee(1000);
      setCustomFulfillmentFee(0);
      setCustomReturnBufferPct(0.5);
    } else if (presetType === 'clear') {
      setCustomShippingRatePct(0);
      setCustomCashbackRatePct(0);
      setCustomCampaignRatePct(0);
      setCustomCampaignFixed(0);
      setCustomAffiliateRatePct(0);
      setCustomAffiliateFixed(0);
      setCustomVoucherPerUnit(0);
      setCustomLiveStreamRatePct(0);
      setCalcAdsTargetRatePct(0);
      setCalcAdsFixed(0);
      setCustomTaxRatePct(0);
      setCustomOverheadRatePct(0);
      setCustomOverheadFixed(0);
      setCustomExtraFees([]);
    }
  };

  // Add / Edit / Remove Custom Extra Fees
  const handleAddExtraFee = () => {
    setIsFeeCustomized(true);
    const newFee: CustomExtraFeeItem = {
      id: 'fee_' + Date.now(),
      name: 'Biaya Tambahan Lainnya',
      type: 'PERCENT',
      value: 1.5,
      cap: 0,
    };
    setCustomExtraFees([...customExtraFees, newFee]);
  };

  const handleUpdateExtraFee = (id: string, updates: Partial<CustomExtraFeeItem>) => {
    setIsFeeCustomized(true);
    setCustomExtraFees(
      customExtraFees.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveExtraFee = (id: string) => {
    setIsFeeCustomized(true);
    setCustomExtraFees(customExtraFees.filter((item) => item.id !== id));
  };

  // Core Dynamic Financial Calculation Engine
  const calcResult = useMemo(() => {
    const hpp = Math.max(0, customHpp || 0);
    const targetMarginRate = Math.max(0, (calcTargetMarginPct || 0) / 100);

    const computeBreakdown = (p: number) => {
      // 1. Physical & Operational Costs
      const packingFee = Math.max(0, customPackingFee || 0);
      const fulfillmentFee = Math.max(0, customFulfillmentFee || 0);
      const returnBufferFee = Math.round(p * (Math.max(0, customReturnBufferPct || 0) / 100));
      const totalPhysicalCost = hpp + packingFee + fulfillmentFee + returnBufferFee;

      // 2. Core Marketplace Fees
      const adminRateAmt = p * (Math.max(0, customAdminRatePct || 0) / 100);
      const adminFee = Math.round(
        (customAdminCap > 0 ? Math.min(adminRateAmt, customAdminCap) : adminRateAmt) +
          (customAdminFixed || 0)
      );

      const serviceFee = Math.round(
        p * (Math.max(0, customServiceRatePct || 0) / 100) + (customServiceFixed || 0)
      );

      const paymentFee = Math.round(
        p * (Math.max(0, customPaymentRatePct || 0) / 100) + (customPaymentFixed || 0)
      );

      const totalMarketplaceCore = adminFee + serviceFee + paymentFee;

      // 3. Promotional & Marketplace Program Fees
      const shippingRateAmt = p * (Math.max(0, customShippingRatePct || 0) / 100);
      const shippingFee = Math.round(
        customShippingCap > 0 ? Math.min(shippingRateAmt, customShippingCap) : shippingRateAmt
      );

      const cashbackRateAmt = p * (Math.max(0, customCashbackRatePct || 0) / 100);
      const cashbackFee = Math.round(
        customCashbackCap > 0 ? Math.min(cashbackRateAmt, customCashbackCap) : cashbackRateAmt
      );

      const campaignFee = Math.round(
        p * (Math.max(0, customCampaignRatePct || 0) / 100) + (customCampaignFixed || 0)
      );

      const affiliateFee = Math.round(
        p * (Math.max(0, customAffiliateRatePct || 0) / 100) + (customAffiliateFixed || 0)
      );

      const voucherFee = Math.max(0, customVoucherPerUnit || 0);
      const liveStreamFee = Math.round(p * (Math.max(0, customLiveStreamRatePct || 0) / 100));

      const totalMarketplacePromo =
        shippingFee + cashbackFee + campaignFee + affiliateFee + voucherFee + liveStreamFee;
      const totalMarketplaceAll = totalMarketplaceCore + totalMarketplacePromo;

      // 4. Digital Ads Allocation
      const adsFee = Math.round(
        p * (Math.max(0, calcAdsTargetRatePct || 0) / 100) + (calcAdsFixed || 0)
      );

      // 5. Taxes & Overhead
      const taxFee = Math.round(p * (Math.max(0, customTaxRatePct || 0) / 100));
      const overheadFee = Math.round(
        p * (Math.max(0, customOverheadRatePct || 0) / 100) + (customOverheadFixed || 0)
      );

      // 6. User-defined Custom Extra Fees
      let customExtraTotal = 0;
      const customExtraBreakdown = customExtraFees.map((fee) => {
        let amt = 0;
        if (fee.type === 'PERCENT') {
          const calcVal = p * ((fee.value || 0) / 100);
          amt = fee.cap && fee.cap > 0 ? Math.min(calcVal, fee.cap) : calcVal;
        } else {
          amt = fee.value || 0;
        }
        amt = Math.round(amt);
        customExtraTotal += amt;
        return { ...fee, amount: amt };
      });

      const totalAllCosts =
        totalPhysicalCost +
        totalMarketplaceAll +
        adsFee +
        taxFee +
        overheadFee +
        customExtraTotal;

      const grossProfit = p - hpp;
      const profitBeforeAds = grossProfit - (totalAllCosts - hpp - adsFee);
      const netProfit = p - totalAllCosts;
      const netMargin = p > 0 ? netProfit / p : 0;
      const markupPct = hpp > 0 ? ((p - hpp) / hpp) * 100 : 0;
      const beRoas = profitBeforeAds > 0 ? p / profitBeforeAds : 0;
      const targetRoas = adsFee > 0 ? p / adsFee : 0;

      return {
        price: p,
        hpp,
        packingFee,
        fulfillmentFee,
        returnBufferFee,
        totalPhysicalCost,
        adminFee,
        serviceFee,
        paymentFee,
        totalMarketplaceCore,
        shippingFee,
        cashbackFee,
        campaignFee,
        affiliateFee,
        voucherFee,
        liveStreamFee,
        totalMarketplacePromo,
        totalMarketplaceAll,
        adsFee,
        taxFee,
        overheadFee,
        customExtraTotal,
        customExtraBreakdown,
        totalAllCosts,
        grossProfit,
        profitBeforeAds,
        netProfit,
        netMargin,
        markupPct,
        beRoas,
        targetRoas,
        effectiveMarketplaceRate: p > 0 ? totalMarketplaceAll / p : 0,
        effectiveTotalRate: p > 0 ? totalAllCosts / p : 0,
      };
    };

    let calculatedPrice = 0;
    if (calcPriceMode === 'CUSTOM') {
      calculatedPrice = Math.max(0, calcCustomSellingPrice || 0);
    } else {
      // Auto solve selling price based on all fee components and target margin
      let p = Math.max(1000, hpp * 1.35);
      for (let i = 0; i < 5; i++) {
        const b = computeBreakdown(p);
        const fixedFees =
          b.hpp +
          b.packingFee +
          b.fulfillmentFee +
          customAdminFixed +
          customServiceFixed +
          customPaymentFixed +
          customCampaignFixed +
          customAffiliateFixed +
          customVoucherPerUnit +
          calcAdsFixed +
          customOverheadFixed;

        const variableRatio = p > 0 ? (b.totalAllCosts - fixedFees) / p : 0;
        const divisor = 1 - variableRatio - targetMarginRate;
        if (divisor > 0.05) {
          p = fixedFees / divisor;
        } else {
          p = hpp * 1.8;
          break;
        }
      }
      calculatedPrice = Math.max(hpp, Math.round(p / 500) * 500);
    }

    return computeBreakdown(calculatedPrice);
  }, [
    customHpp,
    calcPriceMode,
    calcCustomSellingPrice,
    calcTargetMarginPct,
    customPackingFee,
    customFulfillmentFee,
    customReturnBufferPct,
    customAdminRatePct,
    customAdminFixed,
    customAdminCap,
    customServiceRatePct,
    customServiceFixed,
    customPaymentRatePct,
    customPaymentFixed,
    customShippingRatePct,
    customShippingCap,
    customCashbackRatePct,
    customCashbackCap,
    customCampaignRatePct,
    customCampaignFixed,
    customAffiliateRatePct,
    customAffiliateFixed,
    customVoucherPerUnit,
    customLiveStreamRatePct,
    calcAdsTargetRatePct,
    calcAdsFixed,
    customTaxRatePct,
    customOverheadRatePct,
    customOverheadFixed,
    customExtraFees,
  ]);

  // Sensitivity Table Generator (for 10%, 15%, 20%, 25%, 30% margin)
  const sensitivityList = useMemo(() => {
    const margins = [10, 15, 20, 25, 30];
    const hpp = Math.max(0, customHpp || 0);

    return margins.map((mPct) => {
      const targetM = mPct / 100;
      let p = Math.max(1000, hpp * 1.35);
      for (let i = 0; i < 5; i++) {
        const adminAmt =
          customAdminCap > 0
            ? Math.min(p * (customAdminRatePct / 100), customAdminCap)
            : p * (customAdminRatePct / 100);
        const shippingAmt =
          customShippingCap > 0
            ? Math.min(p * (customShippingRatePct / 100), customShippingCap)
            : p * (customShippingRatePct / 100);

        const varRate =
          (customServiceRatePct +
            customPaymentRatePct +
            customCashbackRatePct +
            customCampaignRatePct +
            customAffiliateRatePct +
            customLiveStreamRatePct +
            calcAdsTargetRatePct +
            customTaxRatePct +
            customOverheadRatePct +
            customReturnBufferPct) /
          100;

        const fixedTotal =
          hpp +
          customPackingFee +
          customFulfillmentFee +
          adminAmt +
          shippingAmt +
          customAdminFixed +
          customServiceFixed +
          customPaymentFixed +
          customCampaignFixed +
          customAffiliateFixed +
          customVoucherPerUnit +
          calcAdsFixed +
          customOverheadFixed;

        const divisor = 1 - varRate - targetM;
        if (divisor > 0.05) {
          p = fixedTotal / divisor;
        } else {
          p = hpp * 1.8;
          break;
        }
      }
      const roundedPrice = Math.round(p / 500) * 500;
      const netProfit = Math.round(roundedPrice * targetM);
      return {
        marginPct: mPct,
        price: roundedPrice,
        profit: netProfit,
      };
    });
  }, [
    customHpp,
    customPackingFee,
    customFulfillmentFee,
    customReturnBufferPct,
    customAdminRatePct,
    customAdminFixed,
    customAdminCap,
    customServiceRatePct,
    customServiceFixed,
    customPaymentRatePct,
    customPaymentFixed,
    customShippingRatePct,
    customShippingCap,
    customCashbackRatePct,
    customCampaignRatePct,
    customCampaignFixed,
    customAffiliateRatePct,
    customAffiliateFixed,
    customVoucherPerUnit,
    customLiveStreamRatePct,
    calcAdsTargetRatePct,
    calcAdsFixed,
    customTaxRatePct,
    customOverheadRatePct,
    customOverheadFixed,
  ]);

  // Copy Full Calculation Summary to Clipboard
  const handleCopySummary = () => {
    const mktObj = dbState.marketplaces.find((m) => m.marketplace_id === calcMarketplace);
    const unitObj = dbState.units.find((u) => u.unit_id === calcUnit);

    const summaryText = `
=== RINCIAN PENETAPAN HARGA JUAL RETAIL ===
Produk (SKU)   : ${calcSku} - ${activeSkuObj?.sku_name || 'Item'}
Marketplace    : ${mktObj?.marketplace_name || calcMarketplace}
Unit Bisnis    : ${unitObj?.unit_name || calcUnit}

HARGA JUAL     : ${formatIDR(calcResult.price)} (${calcPriceMode === 'CUSTOM' ? 'Kustom Manual' : 'Rekomendasi Auto'})
Margin Bersih  : ${formatPercent(calcResult.netMargin)} (${formatIDR(calcResult.netProfit)})
Markup dari HPP: ${calcResult.markupPct.toFixed(1)}%
Break-Even ROAS: ${calcResult.beRoas.toFixed(2)}x

--- RINCIAN BIAYA PER SATUAN ---
1. BIAYA MODAL & FISIK: ${formatIDR(calcResult.totalPhysicalCost)}
   - HPP Master       : ${formatIDR(calcResult.hpp)}
   - Kemasan/Packing  : ${formatIDR(calcResult.packingFee)}
   - Fulfillment      : ${formatIDR(calcResult.fulfillmentFee)}
   - Cadangan Retur   : ${formatIDR(calcResult.returnBufferFee)} (${customReturnBufferPct}%)

2. POTONGAN MARKETPLACE POKOK: ${formatIDR(calcResult.totalMarketplaceCore)}
   - Administrasi     : ${formatIDR(calcResult.adminFee)} (${customAdminRatePct}%)
   - Layanan Platform : ${formatIDR(calcResult.serviceFee)} (${customServiceRatePct}%)
   - Transaksi/Payment: ${formatIDR(calcResult.paymentFee)} (${customPaymentRatePct}%)

3. PROGRAM PROMOSI MARKETPLACE: ${formatIDR(calcResult.totalMarketplacePromo)}
   - Gratis Ongkir XTRA: ${formatIDR(calcResult.shippingFee)} (${customShippingRatePct}%)
   - Cashback XTRA    : ${formatIDR(calcResult.cashbackFee)} (${customCashbackRatePct}%)
   - Campaign/Flash   : ${formatIDR(calcResult.campaignFee)} (${customCampaignRatePct}%)
   - Afiliasi Kreator : ${formatIDR(calcResult.affiliateFee)} (${customAffiliateRatePct}%)
   - Voucher Toko     : ${formatIDR(calcResult.voucherFee)}
   - Live Streaming   : ${formatIDR(calcResult.liveStreamFee)} (${customLiveStreamRatePct}%)

4. BIAYA IKLAN DIGITAL: ${formatIDR(calcResult.adsFee)} (${calcAdsTargetRatePct}%)
5. PAJAK & OVERHEAD   : ${formatIDR(calcResult.taxFee + calcResult.overheadFee + calcResult.customExtraTotal)}
   - Pajak (PPN/PPh)  : ${formatIDR(calcResult.taxFee)} (${customTaxRatePct}%)
   - Overhead Kantor  : ${formatIDR(calcResult.overheadFee)} (${customOverheadRatePct}%)
   ${calcResult.customExtraBreakdown.map((e) => `- ${e.name}: ${formatIDR(e.amount)}`).join('\n   ')}

TOTAL SELURUH BIAYA   : ${formatIDR(calcResult.totalAllCosts)} (${formatPercent(calcResult.effectiveTotalRate)})
LABA BERSIH PER SATUAN: ${formatIDR(calcResult.netProfit)}
    `.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // --- TAB 3: SIMULASI IKLAN STATE (DENGAN KOMPONEN BIAYA MARKETPLACE BISA CUSTOM) ---
  const [simSku, setSimSku] = useState<string>(dbState.skus[0]?.sku || '');
  const [simMarketplace, setSimMarketplace] = useState<string>('MKT-SHOPEE');
  const [simUnit, setSimUnit] = useState<string>('U001');

  const [simSellingPrice, setSimSellingPrice] = useState<number>(75000);
  const [simHpp, setSimHpp] = useState<number>(25000);
  const [simTargetRoas, setSimTargetRoas] = useState<number>(4.0); // 4x

  // Mode: 'DETAILED' (Full custom components) or 'SIMPLE' (flat %)
  const [simFeeMode, setSimFeeMode] = useState<'DETAILED' | 'SIMPLE'>('DETAILED');
  const [simFlatFeeRate, setSimFlatFeeRate] = useState<number>(8.0); // 8%

  // Customizable Marketplace & Operational Cost Components for Ads Sim (Direct Textboxes)
  const [simAdminRatePct, setSimAdminRatePct] = useState<number>(6.5);
  const [simAdminFixed, setSimAdminFixed] = useState<number>(0);
  const [simAdminCap, setSimAdminCap] = useState<number>(10000);

  const [simServiceRatePct, setSimServiceRatePct] = useState<number>(1.5);
  const [simServiceFixed, setSimServiceFixed] = useState<number>(0);

  const [simPaymentRatePct, setSimPaymentRatePct] = useState<number>(1.0);
  const [simPaymentFixed, setSimPaymentFixed] = useState<number>(0);

  const [simShippingRatePct, setSimShippingRatePct] = useState<number>(4.0);
  const [simShippingCap, setSimShippingCap] = useState<number>(10000);

  const [simCashbackRatePct, setSimCashbackRatePct] = useState<number>(0);
  const [simCashbackCap, setSimCashbackCap] = useState<number>(10000);

  const [simCampaignRatePct, setSimCampaignRatePct] = useState<number>(0);
  const [simCampaignFixed, setSimCampaignFixed] = useState<number>(0);

  const [simAffiliateRatePct, setSimAffiliateRatePct] = useState<number>(0);
  const [simVoucherPerUnit, setSimVoucherPerUnit] = useState<number>(0);

  const [simPackingFee, setSimPackingFee] = useState<number>(1500);
  const [simFulfillmentFee, setSimFulfillmentFee] = useState<number>(500);
  const [simTaxRatePct, setSimTaxRatePct] = useState<number>(0);
  const [simOverheadRatePct, setSimOverheadRatePct] = useState<number>(0);

  // Sync from Tab 1 (Price Calculator) to Tab 3
  const handleSyncFromCalculator = () => {
    setSimSku(calcSku);
    setSimMarketplace(calcMarketplace);
    setSimUnit(calcUnit);
    setSimSellingPrice(calcResult.price);
    setSimHpp(customHpp);

    setSimAdminRatePct(customAdminRatePct);
    setSimAdminFixed(customAdminFixed);
    setSimAdminCap(customAdminCap);

    setSimServiceRatePct(customServiceRatePct);
    setSimServiceFixed(customServiceFixed);

    setSimPaymentRatePct(customPaymentRatePct);
    setSimPaymentFixed(customPaymentFixed);

    setSimShippingRatePct(customShippingRatePct);
    setSimShippingCap(customShippingCap);

    setSimCashbackRatePct(customCashbackRatePct);
    setSimCashbackCap(customCashbackCap);

    setSimCampaignRatePct(customCampaignRatePct);
    setSimCampaignFixed(customCampaignFixed);

    setSimAffiliateRatePct(customAffiliateRatePct);
    setSimVoucherPerUnit(customVoucherPerUnit);

    setSimPackingFee(customPackingFee);
    setSimFulfillmentFee(customFulfillmentFee);
    setSimTaxRatePct(customTaxRatePct);
    setSimOverheadRatePct(customOverheadRatePct);
    setSimFeeMode('DETAILED');
  };

  // Load Marketplace rules specifically for Simulation
  const handleLoadRulesForSim = useCallback(() => {
    const activeSku = dbState.skus.find((s) => s.sku === simSku);
    const res = calculateDynamicCostRules(
      {
        sellingPrice: simSellingPrice || 100000,
        marketplaceId: simMarketplace,
        categoryId: activeSku?.category_id || '',
        brandId: activeSku?.brand_id || '',
        spuId: activeSku?.spu_id || '',
        sku: simSku,
        unitId: simUnit,
        activePrograms: ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL'],
      },
      dbState.costRules
    );

    let adminRate = 0;
    let adminFixed = 0;
    let adminCap = 0;
    let serviceRate = 0;
    let serviceFixed = 0;
    let paymentRate = 0;
    let paymentFixed = 0;
    let shippingRate = 0;
    let shippingCap = 0;
    let cashbackRate = 0;
    let cashbackCap = 0;
    let campaignRate = 0;
    let campaignFixed = 0;
    let affiliateRate = 0;
    let taxRate = 0;

    res.fees.forEach((f) => {
      if (f.canonicalType === 'ADMIN_FEE') {
        adminRate += (f.rate || 0) * 100;
        adminFixed += f.fixedAmount || 0;
        if (f.matchedRule?.maximum_fee) adminCap = f.matchedRule.maximum_fee;
      } else if (f.canonicalType === 'SERVICE_FEE') {
        serviceRate += (f.rate || 0) * 100;
        serviceFixed += f.fixedAmount || 0;
      } else if (f.canonicalType === 'PAYMENT_FEE') {
        paymentRate += (f.rate || 0) * 100;
        paymentFixed += f.fixedAmount || 0;
      } else if (f.canonicalType === 'FREE_SHIPPING') {
        shippingRate += (f.rate || 0) * 100;
        if (f.matchedRule?.maximum_fee) shippingCap = f.matchedRule.maximum_fee;
      } else if (f.canonicalType === 'CASHBACK') {
        cashbackRate += (f.rate || 0) * 100;
        if (f.matchedRule?.maximum_fee) cashbackCap = f.matchedRule.maximum_fee;
      } else if (f.canonicalType === 'CAMPAIGN' || f.canonicalType === 'VOUCHER') {
        campaignRate += (f.rate || 0) * 100;
        campaignFixed += f.fixedAmount || 0;
      } else if (f.canonicalType === 'AFFILIATE') {
        affiliateRate += (f.rate || 0) * 100;
      } else if (f.canonicalType === 'TAX') {
        taxRate += (f.rate || 0) * 100;
      }
    });

    setSimAdminRatePct(Number(adminRate.toFixed(2)) || 6.5);
    setSimAdminFixed(adminFixed);
    setSimAdminCap(adminCap || 10000);

    setSimServiceRatePct(Number(serviceRate.toFixed(2)) || 1.5);
    setSimServiceFixed(serviceFixed);

    setSimPaymentRatePct(Number(paymentRate.toFixed(2)) || 1.0);
    setSimPaymentFixed(paymentFixed);

    setSimShippingRatePct(Number(shippingRate.toFixed(2)) || 4.0);
    setSimShippingCap(shippingCap || 10000);

    setSimCashbackRatePct(Number(cashbackRate.toFixed(2)));
    setSimCashbackCap(cashbackCap || 10000);

    setSimCampaignRatePct(Number(campaignRate.toFixed(2)));
    setSimCampaignFixed(campaignFixed);

    setSimAffiliateRatePct(Number(affiliateRate.toFixed(2)));
    setSimTaxRatePct(Number(taxRate.toFixed(2)));
  }, [simSku, simMarketplace, simUnit, simSellingPrice, dbState.skus, dbState.costRules]);

  // Quick Preset Handlers for Sim
  const handleSimPreset = (presetType: 'xtra' | 'campaign' | 'minimal') => {
    if (presetType === 'xtra') {
      setSimAdminRatePct(6.5);
      setSimServiceRatePct(1.5);
      setSimPaymentRatePct(1.0);
      setSimShippingRatePct(4.0);
      setSimShippingCap(10000);
      setSimCashbackRatePct(3.0);
      setSimCashbackCap(10000);
      setSimCampaignRatePct(0);
      setSimAffiliateRatePct(2.0);
      setSimVoucherPerUnit(0);
      setSimPackingFee(1500);
      setSimFulfillmentFee(500);
    } else if (presetType === 'campaign') {
      setSimAdminRatePct(6.5);
      setSimServiceRatePct(1.5);
      setSimPaymentRatePct(1.0);
      setSimShippingRatePct(4.0);
      setSimShippingCap(10000);
      setSimCashbackRatePct(3.0);
      setSimCashbackCap(10000);
      setSimCampaignRatePct(4.0);
      setSimAffiliateRatePct(3.0);
      setSimVoucherPerUnit(2500);
      setSimPackingFee(2000);
      setSimFulfillmentFee(500);
    } else if (presetType === 'minimal') {
      setSimAdminRatePct(6.5);
      setSimServiceRatePct(1.5);
      setSimPaymentRatePct(1.0);
      setSimShippingRatePct(0);
      setSimCashbackRatePct(0);
      setSimCampaignRatePct(0);
      setSimAffiliateRatePct(0);
      setSimVoucherPerUnit(0);
      setSimPackingFee(1000);
      setSimFulfillmentFee(0);
    }
  };

  // Comprehensive calculation for Ads Simulation
  const simResult = useMemo(() => {
    const p = Math.max(0, simSellingPrice || 0);
    const hpp = Math.max(0, simHpp || 0);

    let totalMarketplaceFees = 0;
    let totalOtherCosts = 0;

    let adminFee = 0;
    let serviceFee = 0;
    let paymentFee = 0;
    let shippingFee = 0;
    let cashbackFee = 0;
    let campaignFee = 0;
    let affiliateFee = 0;
    let voucherFee = 0;
    let packingFee = 0;
    let fulfillmentFee = 0;
    let taxFee = 0;
    let overheadFee = 0;

    if (simFeeMode === 'SIMPLE') {
      totalMarketplaceFees = Math.round(p * (Math.max(0, simFlatFeeRate || 0) / 100));
      adminFee = totalMarketplaceFees;
    } else {
      // Detailed custom calculation
      const adminAmt = p * (Math.max(0, simAdminRatePct || 0) / 100);
      adminFee = Math.round(
        (simAdminCap > 0 ? Math.min(adminAmt, simAdminCap) : adminAmt) + (simAdminFixed || 0)
      );

      serviceFee = Math.round(
        p * (Math.max(0, simServiceRatePct || 0) / 100) + (simServiceFixed || 0)
      );

      paymentFee = Math.round(
        p * (Math.max(0, simPaymentRatePct || 0) / 100) + (simPaymentFixed || 0)
      );

      const shippingAmt = p * (Math.max(0, simShippingRatePct || 0) / 100);
      shippingFee = Math.round(
        simShippingCap > 0 ? Math.min(shippingAmt, simShippingCap) : shippingAmt
      );

      const cashbackAmt = p * (Math.max(0, simCashbackRatePct || 0) / 100);
      cashbackFee = Math.round(
        simCashbackCap > 0 ? Math.min(cashbackAmt, simCashbackCap) : cashbackAmt
      );

      campaignFee = Math.round(
        p * (Math.max(0, simCampaignRatePct || 0) / 100) + (simCampaignFixed || 0)
      );

      affiliateFee = Math.round(p * (Math.max(0, simAffiliateRatePct || 0) / 100));
      voucherFee = Math.max(0, simVoucherPerUnit || 0);

      totalMarketplaceFees =
        adminFee +
        serviceFee +
        paymentFee +
        shippingFee +
        cashbackFee +
        campaignFee +
        affiliateFee +
        voucherFee;

      packingFee = Math.max(0, simPackingFee || 0);
      fulfillmentFee = Math.max(0, simFulfillmentFee || 0);
      taxFee = Math.round(p * (Math.max(0, simTaxRatePct || 0) / 100));
      overheadFee = Math.round(p * (Math.max(0, simOverheadRatePct || 0) / 100));

      totalOtherCosts = packingFee + fulfillmentFee + taxFee + overheadFee;
    }

    const totalNonAdCosts = hpp + totalMarketplaceFees + totalOtherCosts;
    const grossProfit = p - hpp;
    const profitBeforeAds = p - totalNonAdCosts;

    // Ads spend derived from Target ROAS: Ads = SellingPrice / ROAS
    const adsSpend = simTargetRoas > 0 ? Math.round(p / simTargetRoas) : 0;
    const cir = p > 0 ? adsSpend / p : 0;
    const netProfit = profitBeforeAds - adsSpend;
    const netMargin = p > 0 ? netProfit / p : 0;

    // Break Even ROAS: SellingPrice / ProfitBeforeAds
    const beRoas = profitBeforeAds > 0 ? p / profitBeforeAds : 0;
    const beCir = p > 0 && profitBeforeAds > 0 ? profitBeforeAds / p : 0;
    const maxCpa = Math.max(0, profitBeforeAds); // Max ad spend per unit before operating at loss

    let status: 'SAFE' | 'WARNING' | 'LOSS' = 'SAFE';
    if (netProfit < 0) {
      status = 'LOSS';
    } else if (netMargin < 0.08) {
      status = 'WARNING';
    }

    const effectiveFeeRate = p > 0 ? totalMarketplaceFees / p : 0;

    return {
      price: p,
      hpp,
      adminFee,
      serviceFee,
      paymentFee,
      shippingFee,
      cashbackFee,
      campaignFee,
      affiliateFee,
      voucherFee,
      packingFee,
      fulfillmentFee,
      taxFee,
      overheadFee,
      totalMarketplaceFees,
      totalOtherCosts,
      totalNonAdCosts,
      grossProfit,
      profitBeforeAds,
      adsSpend,
      cir,
      netProfit,
      netMargin,
      beRoas,
      beCir,
      maxCpa,
      status,
      effectiveFeeRate,
    };
  }, [
    simSellingPrice,
    simHpp,
    simTargetRoas,
    simFeeMode,
    simFlatFeeRate,
    simAdminRatePct,
    simAdminFixed,
    simAdminCap,
    simServiceRatePct,
    simServiceFixed,
    simPaymentRatePct,
    simPaymentFixed,
    simShippingRatePct,
    simShippingCap,
    simCashbackRatePct,
    simCashbackCap,
    simCampaignRatePct,
    simCampaignFixed,
    simAffiliateRatePct,
    simVoucherPerUnit,
    simPackingFee,
    simFulfillmentFee,
    simTaxRatePct,
    simOverheadRatePct,
  ]);

  // ROAS Scenario Matrix
  const simRoasScenarios = useMemo(() => {
    const steps = [2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0];
    const p = simResult.price;
    const profitBeforeAds = simResult.profitBeforeAds;

    return steps.map((roas) => {
      const ads = Math.round(p / roas);
      const profit = profitBeforeAds - ads;
      const margin = p > 0 ? profit / p : 0;
      const cir = p > 0 ? ads / p : 0;
      let st: 'SAFE' | 'WARNING' | 'LOSS' = 'SAFE';
      if (profit < 0) st = 'LOSS';
      else if (margin < 0.08) st = 'WARNING';

      return {
        roas,
        ads,
        cir,
        profit,
        margin,
        status: st,
      };
    });
  }, [simResult]);

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
              Kalkulator harga jual ideal, aturan biaya marketplace bertingkat, dan simulasi efisiensi iklan
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

      {/* --- SUBTAB 1: KALKULATOR HARGA (SEMUA CUSTOM, LANGSUNG TEXTBOX, TANPA BAR) --- */}
      {currentSubTab === 'calculator' && (
        <div className="space-y-5">
          {/* Top Control Bar & Quick Presets */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Kalkulator Penetapan Harga & Analisis Margin Retail
                  </h2>
                  <p className="text-xs text-slate-500">
                    Semua komponen biaya dan parameter diketik langsung di textbox tanpa slider/bar, lengkap dan bebas dikustomisasi.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    isFeeCustomized
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isFeeCustomized ? 'Biaya Kustom Manual' : 'Sesuai Aturan Marketplace'}
                </span>

                <button
                  type="button"
                  onClick={loadRulesIntoCustomFees}
                  title="Muat ulang nilai default dari aturan marketplace yang cocok"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset ke Aturan Marketplace</span>
                </button>
              </div>
            </div>

            {/* Quick Preset Buttons Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-medium text-[11px] mr-1">Preset Cepat:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('xtra')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Paket XTRA Lengkap (Ongkir + Cashback + Ads 5%)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('campaign')}
                className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 font-medium border border-orange-200 transition-colors"
              >
                Mega Campaign & Flash Sale (Diskon + Voucher + Ads 8%)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('minimal')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Organik Non-Program (Tarif Pokok Saja)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('clear')}
                className="px-2.5 py-1 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 font-medium transition-colors ml-auto"
              >
                Nol-kan Biaya Opsional
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Semua Parameter & Komponen Biaya (Span 7) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Parameter Produk, Marketplace & Target Margin */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>1. Produk, Marketplace & Target Keuntungan</span>
                  </h3>
                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setCalcPriceMode('AUTO')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        calcPriceMode === 'AUTO'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Hitung Harga Ideal (Auto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcPriceMode('CUSTOM')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        calcPriceMode === 'CUSTOM'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Kustom Harga Jual (Manual)
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* SKU Selector */}
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Pilih Produk (SKU Master)</label>
                    <select
                      value={calcSku}
                      onChange={(e) => setCalcSku(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                    >
                      {dbState.skus.map((s) => (
                        <option key={s.sku} value={s.sku}>
                          {s.sku} - {s.sku_name} (HPP Master: {formatIDR(s.hpp)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Marketplace & Unit Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Marketplace Saluran</label>
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
                      <label className="block font-medium text-slate-700 mb-1">Unit Bisnis / Gudang</label>
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

                  {/* Mode-specific Textbox: Target Margin vs Custom Price */}
                  {calcPriceMode === 'CUSTOM' ? (
                    <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                      <label className="block font-bold text-blue-900">
                        Ketik Harga Jual Kustom (Rp)
                      </label>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        value={calcCustomSellingPrice}
                        onChange={(e) => setCalcCustomSellingPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg border border-blue-300 font-extrabold text-blue-900 text-base font-mono bg-white"
                        placeholder="Contoh: 75000"
                      />
                      <span className="text-[10px] text-blue-700 block">
                        Ketik harga jual yang Anda rencanakan. Sistem langsung menghitung laba bersih, persentase margin, dan kecukupan biaya.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 space-y-1">
                      <label className="block font-medium text-slate-700">
                        Target Margin Bersih yang Diinginkan (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="80"
                          value={calcTargetMarginPct}
                          onChange={(e) => setCalcTargetMarginPct(Math.max(0, Number(e.target.value)))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-blue-700 text-sm font-mono bg-white"
                          placeholder="Contoh: 15"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                          %
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Ketik persentase untung bersih yang Anda targetkan setelah seluruh potongan biaya (misal: 15 untuk 15%).
                      </span>
                    </div>
                  )}

                  {/* Target Budget Iklan Textbox */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Budget Iklan (% dari Harga Jual)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="50"
                          value={calcAdsTargetRatePct}
                          onChange={(e) => setCalcAdsTargetRatePct(Math.max(0, Number(e.target.value)))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900 text-xs font-mono"
                          placeholder="5"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                          %
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Alokasi iklan (misal 5% setara target ROAS 20x).
                      </span>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Biaya Iklan Tetap per Pcs (Rp)
                      </label>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        value={calcAdsFixed}
                        onChange={(e) => setCalcAdsFixed(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
                        placeholder="0"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Opsional jika ada biaya iklan fixed per unit terjual.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Biaya Pokok Marketplace (Admin, Layanan, Pembayaran) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>2. Potongan Pokok Marketplace (Admin, Layanan & Pembayaran)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tarif resmi platform yang dipotong secara langsung dari saldo penjualan toko.
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* 1. Biaya Administrasi */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">A. Biaya Administrasi Marketplace</span>
                      <span className="text-[11px] font-mono text-emerald-700 font-bold">
                        Potongan: {formatIDR(calcResult.adminFee)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Tarif Persentase (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={customAdminRatePct}
                            onChange={(e) => {
                              setCustomAdminRatePct(Math.max(0, Number(e.target.value)));
                              setIsFeeCustomized(true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Biaya Tetap per Pcs (Rp)</label>
                        <input
                          type="number"
                          step="500"
                          min="0"
                          value={customAdminFixed}
                          onChange={(e) => {
                            setCustomAdminFixed(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Batas Maksimal / Cap (Rp)</label>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          placeholder="0 jika tanpa batas"
                          value={customAdminCap}
                          onChange={(e) => {
                            setCustomAdminCap(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Biaya Layanan */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">B. Biaya Layanan Platform</span>
                      <span className="text-[11px] font-mono text-emerald-700 font-bold">
                        Potongan: {formatIDR(calcResult.serviceFee)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Tarif Persentase (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={customServiceRatePct}
                            onChange={(e) => {
                              setCustomServiceRatePct(Math.max(0, Number(e.target.value)));
                              setIsFeeCustomized(true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Biaya Tetap per Transaksi (Rp)</label>
                        <input
                          type="number"
                          step="500"
                          min="0"
                          value={customServiceFixed}
                          onChange={(e) => {
                            setCustomServiceFixed(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Biaya Pembayaran / Transaksi */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">C. Biaya Pembayaran / Payment Processing</span>
                      <span className="text-[11px] font-mono text-emerald-700 font-bold">
                        Potongan: {formatIDR(calcResult.paymentFee)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Tarif Persentase (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={customPaymentRatePct}
                            onChange={(e) => {
                              setCustomPaymentRatePct(Math.max(0, Number(e.target.value)));
                              setIsFeeCustomized(true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Biaya Tetap per Transaksi (Rp)</label>
                        <input
                          type="number"
                          step="500"
                          min="0"
                          value={customPaymentFixed}
                          onChange={(e) => {
                            setCustomPaymentFixed(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Program Promosi & Fitur Marketplace (Ongkir, Cashback, Campaign, Afiliasi, Live) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>3. Program Promosi, Fitur & Komisi Marketplace</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Program opsional untuk meningkatkan traffic toko: Bebas Ongkir XTRA, Cashback, Flash Sale, Afiliasi, dan Voucher.
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* 1. Gratis Ongkir XTRA */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Program Bebas / Gratis Ongkir XTRA</span>
                      </span>
                      <span className="text-[11px] font-mono text-blue-700 font-bold">
                        Potongan: {formatIDR(calcResult.shippingFee)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Tarif Persentase (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={customShippingRatePct}
                            onChange={(e) => {
                              setCustomShippingRatePct(Math.max(0, Number(e.target.value)));
                              setIsFeeCustomized(true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Batas Maksimal / Cap (Rp)</label>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          placeholder="0 jika tanpa batas"
                          value={customShippingCap}
                          onChange={(e) => {
                            setCustomShippingCap(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Cashback XTRA */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <Gift className="w-3.5 h-3.5 text-amber-600" />
                        <span>Program Cashback XTRA</span>
                      </span>
                      <span className="text-[11px] font-mono text-amber-700 font-bold">
                        Potongan: {formatIDR(calcResult.cashbackFee)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Tarif Persentase (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={customCashbackRatePct}
                            onChange={(e) => {
                              setCustomCashbackRatePct(Math.max(0, Number(e.target.value)));
                              setIsFeeCustomized(true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Batas Maksimal / Cap (Rp)</label>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          placeholder="0 jika tanpa batas"
                          value={customCashbackCap}
                          onChange={(e) => {
                            setCustomCashbackCap(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Campaign Akbar & Flash Sale */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-600" />
                        <span>Biaya Campaign Akbar / Mega Sale / Flash Sale</span>
                      </span>
                      <span className="text-[11px] font-mono text-purple-700 font-bold">
                        Potongan: {formatIDR(calcResult.campaignFee)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Tarif Persentase (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={customCampaignRatePct}
                            onChange={(e) => {
                              setCustomCampaignRatePct(Math.max(0, Number(e.target.value)));
                              setIsFeeCustomized(true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Biaya Tetap per Pcs (Rp)</label>
                        <input
                          type="number"
                          step="500"
                          min="0"
                          value={customCampaignFixed}
                          onChange={(e) => {
                            setCustomCampaignFixed(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Afiliasi Kreator & Subsidi Voucher Toko */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Komisi Afiliasi Kreator</span>
                        <span className="text-[10px] font-mono text-slate-600 font-bold">
                          {formatIDR(calcResult.affiliateFee)}
                        </span>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Tarif Komisi (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="50"
                            value={customAffiliateRatePct}
                            onChange={(e) => {
                              setCustomAffiliateRatePct(Math.max(0, Number(e.target.value)));
                              setIsFeeCustomized(true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Voucher Diskon Toko</span>
                        <span className="text-[10px] font-mono text-slate-600 font-bold">
                          {formatIDR(calcResult.voucherFee)}
                        </span>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Subsidi per Satuan (Rp)</label>
                        <input
                          type="number"
                          step="500"
                          min="0"
                          value={customVoucherPerUnit}
                          onChange={(e) => {
                            setCustomVoucherPerUnit(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Live Streaming Shopping */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <Video className="w-3.5 h-3.5 text-rose-600" />
                        <span>Komisi Live Shopping / Host Streamer</span>
                      </span>
                      <span className="text-[11px] font-mono text-rose-700 font-bold">
                        Potongan: {formatIDR(calcResult.liveStreamFee)}
                      </span>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1">Tarif Komisi Host Live (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="50"
                          value={customLiveStreamRatePct}
                          onChange={(e) => {
                            setCustomLiveStreamRatePct(Math.max(0, Number(e.target.value)));
                            setIsFeeCustomized(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Biaya Produk Fisik, Kemasan & Gudang (COGS & Fulfillment) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>4. Biaya Fisik Produk, Pengemasan & Gudang (Fulfillment)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Komponen modal barang, kemasan pengiriman, dan biaya penanganan fisik sebelum dikirim ke kurir.
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* HPP Master Textbox */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                    <label className="block font-bold text-slate-800">
                      Biaya Modal / HPP Produk per Satuan (Rp)
                    </label>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={customHpp}
                      onChange={(e) => setCustomHpp(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-extrabold text-slate-900 text-sm font-mono bg-white"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Harga modal produk. Bebas diubah langsung di sini untuk simulasi jika terjadi kenaikan harga dari supplier.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Kemasan / Packing */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Biaya Kemasan / Packing (Rp)
                      </label>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={customPackingFee}
                        onChange={(e) => setCustomPackingFee(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Kardus, bubble wrap, lakban & label.
                      </span>
                    </div>

                    {/* Handling / Fulfillment Gudang */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Handling / Gudang per Pcs (Rp)
                      </label>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={customFulfillmentFee}
                        onChange={(e) => setCustomFulfillmentFee(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Tenaga kerja & picking order.
                      </span>
                    </div>

                    {/* Cadangan Retur & Kerusakan */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Cadangan Retur & Cacat (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={customReturnBufferPct}
                          onChange={(e) => setCustomReturnBufferPct(Math.max(0, Number(e.target.value)))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Cadangan risiko retur barang.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 5: Pajak, Overhead & Biaya Kustom Tambahan */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Receipt className="w-4 h-4 text-cyan-600" />
                    <span>5. Pajak, Overhead Kantor & Biaya Kustom Tambahan</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Biaya perpajakan perusahaan, utilitas kantor, serta komponen biaya kustom mandiri yang dapat Anda tambah sendiri.
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Pajak PPN / PPh */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800">Pajak (PPN 11% / PPh 0.5%)</label>
                        <span className="text-[10px] font-mono text-slate-600 font-bold">
                          {formatIDR(calcResult.taxFee)}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="30"
                          value={customTaxRatePct}
                          onChange={(e) => setCustomTaxRatePct(Math.max(0, Number(e.target.value)))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Isi 0 jika non-PKP atau harga sudah include PPN.
                      </span>
                    </div>

                    {/* Alokasi Overhead Kantor */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800">Overhead Kantor & Listrik</label>
                        <span className="text-[10px] font-mono text-slate-600 font-bold">
                          {formatIDR(calcResult.overheadFee)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="25"
                            value={customOverheadRatePct}
                            onChange={(e) => setCustomOverheadRatePct(Math.max(0, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                            placeholder="Tarif %"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                        </div>
                        <input
                          type="number"
                          step="500"
                          min="0"
                          value={customOverheadFixed}
                          onChange={(e) => setCustomOverheadFixed(Math.max(0, Number(e.target.value)))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                          placeholder="Rp Tetap"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Beban sewa kantor, listrik, internet & admin.
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Custom Extra Fees */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">
                        Biaya Tambahan Lainnya ({customExtraFees.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddExtraFee}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center space-x-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Biaya Kustom</span>
                      </button>
                    </div>

                    {customExtraFees.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-200 text-center">
                        Tidak ada biaya kustom tambahan. Klik tombol di atas jika ada beban khusus (misal: Royalti, Komisi Reseller, Asuransi).
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {customExtraFees.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-2"
                          >
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateExtraFee(item.id, { name: e.target.value })}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 flex-1 min-w-[140px]"
                              placeholder="Nama Biaya Kustom"
                            />

                            <select
                              value={item.type}
                              onChange={(e) =>
                                handleUpdateExtraFee(item.id, {
                                  type: e.target.value as 'PERCENT' | 'FIXED',
                                })
                              }
                              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium"
                            >
                              <option value="PERCENT">Persentase (%)</option>
                              <option value="FIXED">Nominal Tetap (Rp)</option>
                            </select>

                            <input
                              type="number"
                              step={item.type === 'PERCENT' ? '0.1' : '500'}
                              min="0"
                              value={item.value}
                              onChange={(e) =>
                                handleUpdateExtraFee(item.id, { value: Math.max(0, Number(e.target.value)) })
                              }
                              className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
                              placeholder={item.type === 'PERCENT' ? '%' : 'Rp'}
                            />

                            {item.type === 'PERCENT' && (
                              <input
                                type="number"
                                step="1000"
                                min="0"
                                value={item.cap || 0}
                                onChange={(e) =>
                                  handleUpdateExtraFee(item.id, {
                                    cap: Math.max(0, Number(e.target.value)),
                                  })
                                }
                                className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                                placeholder="Cap Rp (0=nol)"
                                title="Batas maksimal potongan dalam rupiah"
                              />
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveExtraFee(item.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              title="Hapus Biaya Kustom"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hasil Rekomendasi, Unit Economics & Detail Ledger (Span 5) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Highlight Card: Harga Rekomendasi / Kustom */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {calcPriceMode === 'CUSTOM' ? 'Harga Jual Kustom (Input Manual)' : 'Harga Jual Ideal Rekomendasi'}
                    </span>
                    <div className="text-3xl font-extrabold text-blue-600 mt-0.5 tracking-tight font-mono">
                      {formatIDR(calcResult.price)}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {calcPriceMode === 'CUSTOM'
                        ? 'Harga ditentukan sendiri di textbox'
                        : `Menjamin target margin ${calcTargetMarginPct}% tercapai bersih`}
                    </span>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                      title="Salin rincian penetapan harga ke clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin Rincian</span>
                        </>
                      )}
                    </button>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Margin Bersih</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">
                        {formatPercent(calcResult.netMargin)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Financial Metric Cards */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 block">Total Biaya Fisik</span>
                    <span className="font-bold text-slate-900 font-mono text-sm block mt-0.5">
                      {formatIDR(calcResult.totalPhysicalCost)}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      HPP + Packing + Gudang
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90">
                    <span className="text-[11px] text-amber-700 block font-medium">Potongan Marketplace</span>
                    <span className="font-bold text-amber-900 font-mono text-sm block mt-0.5">
                      {formatIDR(calcResult.totalMarketplaceAll)}
                    </span>
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                      Tarif {formatPercent(calcResult.effectiveMarketplaceRate)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/90">
                    <span className="text-[11px] text-indigo-700 block font-medium">Budget Iklan Target</span>
                    <span className="font-bold text-indigo-900 font-mono text-sm block mt-0.5">
                      {formatIDR(calcResult.adsFee)}
                    </span>
                    <span className="text-[10px] text-indigo-700 mt-0.5 block">
                      Alokasi {formatPercent(calcAdsTargetRatePct / 100)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90">
                    <span className="text-[11px] text-emerald-700 block font-medium">Laba Bersih Riil</span>
                    <span className="font-bold text-emerald-900 font-mono text-sm block mt-0.5">
                      {formatIDR(calcResult.netProfit)}
                    </span>
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">
                      Markup {calcResult.markupPct.toFixed(1)}% dari HPP
                    </span>
                  </div>
                </div>

                {/* Safety ROAS Banner */}
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/70 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-blue-900 font-bold block">
                        Break-Even ROAS: {calcResult.beRoas > 0 ? `${calcResult.beRoas.toFixed(2)}x` : '-'}
                      </span>
                      <span className="text-blue-700 text-[10px]">
                        Iklan tidak merugi selama ROAS kampanye berada di atas {calcResult.beRoas > 0 ? `${calcResult.beRoas.toFixed(2)}x` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Rincian Komponen Biaya (Itemized Ledger) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Rincian Beban Potongan per Satuan
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-slate-800">
                    Total Beban: {formatIDR(calcResult.totalAllCosts)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Grup A: Biaya Produk & Fisik */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      A. Biaya Modal & Fisik Barang
                    </span>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>1. HPP Master Produk</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatIDR(calcResult.hpp)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>2. Biaya Kemasan / Packing</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatIDR(calcResult.packingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>3. Handling & Gudang</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatIDR(calcResult.fulfillmentFee)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>4. Cadangan Retur ({customReturnBufferPct}%)</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatIDR(calcResult.returnBufferFee)}
                      </span>
                    </div>
                  </div>

                  {/* Grup B: Potongan Marketplace Pokok */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      B. Potongan Marketplace Pokok
                    </span>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>5. Biaya Administrasi</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-900 font-mono block">
                          {formatIDR(calcResult.adminFee)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {customAdminRatePct}% {customAdminCap > 0 ? `(Cap ${formatIDR(customAdminCap)})` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>6. Biaya Layanan Platform</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-900 font-mono block">
                          {formatIDR(calcResult.serviceFee)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {customServiceRatePct}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>7. Biaya Transaksi / Pembayaran</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-900 font-mono block">
                          {formatIDR(calcResult.paymentFee)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {customPaymentRatePct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grup C: Program Promosi & Afiliasi */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      C. Program Promosi Marketplace & Afiliasi
                    </span>
                    {calcResult.shippingFee > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>8. Bebas Ongkir XTRA</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(calcResult.shippingFee)}
                        </span>
                      </div>
                    )}
                    {calcResult.cashbackFee > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>9. Cashback XTRA</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(calcResult.cashbackFee)}
                        </span>
                      </div>
                    )}
                    {calcResult.campaignFee > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>10. Mega Campaign / Flash Sale</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(calcResult.campaignFee)}
                        </span>
                      </div>
                    )}
                    {calcResult.affiliateFee > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>11. Komisi Afiliasi</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(calcResult.affiliateFee)}
                        </span>
                      </div>
                    )}
                    {calcResult.voucherFee > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>12. Subsidi Voucher Toko</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(calcResult.voucherFee)}
                        </span>
                      </div>
                    )}
                    {calcResult.liveStreamFee > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>13. Komisi Live Shopping</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(calcResult.liveStreamFee)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Grup D: Iklan, Pajak & Overhead */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      D. Iklan, Pajak & Overhead
                    </span>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>14. Budget Iklan Digital ({calcAdsTargetRatePct}%)</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatIDR(calcResult.adsFee)}
                      </span>
                    </div>
                    {calcResult.taxFee > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>15. Pajak ({customTaxRatePct}%)</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(calcResult.taxFee)}
                        </span>
                      </div>
                    )}
                    {calcResult.overheadFee > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>16. Overhead Kantor & Utilitas</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(calcResult.overheadFee)}
                        </span>
                      </div>
                    )}
                    {calcResult.customExtraBreakdown.map((item, idx) => (
                      <div key={item.id} className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>{17 + idx}. {item.name}</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatIDR(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-2 text-xs font-bold text-slate-900 border-t border-slate-200">
                    <span>Total Seluruh Beban Biaya</span>
                    <span className="text-amber-800 font-mono text-sm">
                      {formatIDR(calcResult.totalAllCosts)} ({formatPercent(calcResult.effectiveTotalRate)})
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-700">
                    <span>Sisa Keuntungan Bersih</span>
                    <span className="font-mono text-sm">
                      {formatIDR(calcResult.netProfit)} ({formatPercent(calcResult.netMargin)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Sensitivitas Target Margin */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Simulasi Sensitivitas Target Margin</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Perbandingan harga jual dan rupiah keuntungan jika Anda mengubah target margin:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="pb-1.5">Target Margin</th>
                        <th className="pb-1.5 text-right">Harga Jual Ideal</th>
                        <th className="pb-1.5 text-right">Laba Bersih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {sensitivityList.map((row) => (
                        <tr
                          key={row.marginPct}
                          className={`hover:bg-slate-50 ${
                            row.marginPct === calcTargetMarginPct ? 'bg-blue-50/60 font-bold text-blue-900' : 'text-slate-700'
                          }`}
                        >
                          <td className="py-2">{row.marginPct}% Margin</td>
                          <td className="py-2 text-right">{formatIDR(row.price)}</td>
                          <td className="py-2 text-right text-emerald-600">{formatIDR(row.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: BIAYA MARKETPLACE (COST RULE HIERARCHY) --- */}
      {currentSubTab === 'fees' && (
        <CostRuleHierarchySection dbState={dbState} />
      )}

      {/* --- SUBTAB 3: SIMULASI IKLAN DENGAN BIAYA MARKETPLACE BISA CUSTOM --- */}
      {currentSubTab === 'ads_sim' && (
        <div className="space-y-5">
          {/* Top Control Bar & Quick Presets for Ads Sim */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Simulasi Efisiensi Iklan & Batas Break-Even ROAS
                  </h2>
                  <p className="text-xs text-slate-500">
                    Perhitungkan batas aman biaya iklan dengan detail komponen biaya marketplace yang dapat dikustomisasi lengkap.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncFromCalculator}
                  title="Salin seluruh tarif dan komponen biaya dari Kalkulator Harga"
                  className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin dari Kalkulator</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadRulesForSim}
                  title="Muat ulang nilai default dari aturan marketplace"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Aturan Marketplace</span>
                </button>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setSimFeeMode('DETAILED')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      simFeeMode === 'DETAILED'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rincian Kustom
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimFeeMode('SIMPLE')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      simFeeMode === 'SIMPLE'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tarif Flat %
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Preset Buttons Bar for Simulation */}
            {simFeeMode === 'DETAILED' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-medium text-[11px] mr-1">Preset Biaya:</span>
                <button
                  type="button"
                  onClick={() => handleSimPreset('xtra')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Paket XTRA (Admin 6.5% + Ongkir 4% + Cashback 3%)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimPreset('campaign')}
                  className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 font-medium border border-orange-200 transition-colors"
                >
                  Mega Campaign & Flash Sale (Admin + Ongkir + Campaign 4% + Voucher)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimPreset('minimal')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Tarif Pokok Minimal (Admin 6.5% + Layanan 1.5% + Payment 1%)
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Parameter & Rincian Biaya Marketplace Kustom (Span 7) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Parameter Produk, Harga & Target ROAS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>1. Parameter Produk, Harga Jual & Target ROAS</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tentukan produk, harga jual rencana, modal HPP, dan target efisiensi iklan yang diinginkan.
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* SKU Selector */}
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Pilih Produk (SKU Master)</label>
                    <select
                      value={simSku}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSimSku(val);
                        const found = dbState.skus.find((s) => s.sku === val);
                        if (found?.hpp !== undefined) {
                          setSimHpp(found.hpp);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                    >
                      {dbState.skus.map((s) => (
                        <option key={s.sku} value={s.sku}>
                          {s.sku} - {s.sku_name} (HPP: {formatIDR(s.hpp)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Marketplace & Unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Marketplace</label>
                      <select
                        value={simMarketplace}
                        onChange={(e) => setSimMarketplace(e.target.value)}
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
                        value={simUnit}
                        onChange={(e) => setSimUnit(e.target.value)}
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

                  {/* Harga Jual, HPP & Target ROAS (Direct Textboxes) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Harga Jual per Pcs (Rp)</label>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        value={simSellingPrice}
                        onChange={(e) => setSimSellingPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 font-extrabold text-blue-700 text-sm font-mono bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Biaya Modal (HPP) (Rp)</label>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        value={simHpp}
                        onChange={(e) => setSimHpp(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900 text-sm font-mono bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-900 mb-1">Target ROAS Iklan (x)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="50"
                          value={Number(simTargetRoas.toFixed(1))}
                          onChange={(e) => setSimTargetRoas(Math.max(0.1, Number(e.target.value)))}
                          className="w-full px-3 py-2 rounded-lg border border-indigo-300 font-extrabold text-indigo-700 text-sm font-mono bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">x</span>
                      </div>
                      <span className="text-[10px] text-indigo-600 block mt-0.5">
                        Setara alokasi CIR {formatPercent(simResult.cir)}
                      </span>
                    </div>
                  </div>

                  {/* Mode Simple Flat Fee Input */}
                  {simFeeMode === 'SIMPLE' && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <label className="block font-bold text-slate-800">
                        Potongan Marketplace Flat (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          value={simFlatFeeRate}
                          onChange={(e) => setSimFlatFeeRate(Math.max(0, Number(e.target.value)))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900 text-sm font-mono bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Gunakan mode Rincian Kustom di atas untuk membedah admin, layanan, gratis ongkir, dan campaign secara terpisah.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Komponen Biaya Marketplace Kustom (Hanya tampil jika Mode DETAILED) */}
              {simFeeMode === 'DETAILED' && (
                <>
                  {/* Card 2: Potongan Pokok Marketplace */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <Store className="w-4 h-4 text-emerald-600" />
                        <span>2. Potongan Pokok Marketplace (Bisa Dikustomisasi)</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tarif resmi platform: Biaya administrasi, biaya layanan, dan biaya pembayaran transaksi.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Administrasi */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Biaya Administrasi Marketplace</span>
                          <span className="text-[11px] font-mono text-emerald-700 font-bold">
                            Potongan: {formatIDR(simResult.adminFee)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[11px] text-slate-600 block mb-1">Tarif Persentase (%)</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="50"
                                value={simAdminRatePct}
                                onChange={(e) => setSimAdminRatePct(Math.max(0, Number(e.target.value)))}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-600 block mb-1">Biaya Tetap per Pcs (Rp)</label>
                            <input
                              type="number"
                              step="500"
                              min="0"
                              value={simAdminFixed}
                              onChange={(e) => setSimAdminFixed(Math.max(0, Number(e.target.value)))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-600 block mb-1">Batas Maksimal / Cap (Rp)</label>
                            <input
                              type="number"
                              step="1000"
                              min="0"
                              placeholder="0=tanpa cap"
                              value={simAdminCap}
                              onChange={(e) => setSimAdminCap(Math.max(0, Number(e.target.value)))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Layanan & Payment Fee */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Biaya Layanan Platform</span>
                            <span className="text-[10px] font-mono text-slate-600 font-bold">
                              {formatIDR(simResult.serviceFee)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Tarif (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={simServiceRatePct}
                                  onChange={(e) => setSimServiceRatePct(Math.max(0, Number(e.target.value)))}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Tetap (Rp)</label>
                              <input
                                type="number"
                                step="500"
                                min="0"
                                value={simServiceFixed}
                                onChange={(e) => setSimServiceFixed(Math.max(0, Number(e.target.value)))}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Biaya Pembayaran / Transaksi</span>
                            <span className="text-[10px] font-mono text-slate-600 font-bold">
                              {formatIDR(simResult.paymentFee)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Tarif (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={simPaymentRatePct}
                                  onChange={(e) => setSimPaymentRatePct(Math.max(0, Number(e.target.value)))}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Tetap (Rp)</label>
                              <input
                                type="number"
                                step="500"
                                min="0"
                                value={simPaymentFixed}
                                onChange={(e) => setSimPaymentFixed(Math.max(0, Number(e.target.value)))}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Program Promosi & Fitur Marketplace */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>3. Program Promosi, Ongkir XTRA & Campaign</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Program promosi yang diikuti toko yang memotong margin selain biaya iklan berbayar.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Gratis Ongkir XTRA & Cashback XTRA */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 flex items-center space-x-1">
                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Gratis Ongkir XTRA</span>
                            </span>
                            <span className="text-[10px] font-mono text-blue-700 font-bold">
                              {formatIDR(simResult.shippingFee)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Tarif (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={simShippingRatePct}
                                  onChange={(e) => setSimShippingRatePct(Math.max(0, Number(e.target.value)))}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Cap (Rp)</label>
                              <input
                                type="number"
                                step="1000"
                                min="0"
                                value={simShippingCap}
                                onChange={(e) => setSimShippingCap(Math.max(0, Number(e.target.value)))}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 flex items-center space-x-1">
                              <Gift className="w-3.5 h-3.5 text-amber-600" />
                              <span>Cashback XTRA</span>
                            </span>
                            <span className="text-[10px] font-mono text-amber-700 font-bold">
                              {formatIDR(simResult.cashbackFee)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Tarif (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={simCashbackRatePct}
                                  onChange={(e) => setSimCashbackRatePct(Math.max(0, Number(e.target.value)))}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Cap (Rp)</label>
                              <input
                                type="number"
                                step="1000"
                                min="0"
                                value={simCashbackCap}
                                onChange={(e) => setSimCashbackCap(Math.max(0, Number(e.target.value)))}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Campaign, Afiliasi & Voucher */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Campaign / Flash Sale (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={simCampaignRatePct}
                              onChange={(e) => setSimCampaignRatePct(Math.max(0, Number(e.target.value)))}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Komisi Afiliasi (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={simAffiliateRatePct}
                              onChange={(e) => setSimAffiliateRatePct(Math.max(0, Number(e.target.value)))}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Voucher Toko (Rp)
                          </label>
                          <input
                            type="number"
                            step="500"
                            min="0"
                            value={simVoucherPerUnit}
                            onChange={(e) => setSimVoucherPerUnit(Math.max(0, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Kemasan, Gudang & Overhead */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <Package className="w-4 h-4 text-cyan-600" />
                        <span>4. Biaya Kemasan, Gudang & Pajak</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">
                          Packing (Rp)
                        </label>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={simPackingFee}
                          onChange={(e) => setSimPackingFee(Math.max(0, Number(e.target.value)))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">
                          Gudang (Rp)
                        </label>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={simFulfillmentFee}
                          onChange={(e) => setSimFulfillmentFee(Math.max(0, Number(e.target.value)))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">
                          Pajak (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={simTaxRatePct}
                            onChange={(e) => setSimTaxRatePct(Math.max(0, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">
                          Overhead (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={simOverheadRatePct}
                            onChange={(e) => setSimOverheadRatePct(Math.max(0, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Hasil Simulasi, Status Kelayakan & Matriks ROAS (Span 5) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Highlight Card: Status Kelayakan Iklan & Break-Even ROAS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Status Kelayakan Iklan Berbayar
                    </span>
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
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Pada target ROAS {simTargetRoas.toFixed(1)}x (Beban iklan {formatIDR(simResult.adsSpend)} / pcs)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Break-Even ROAS</span>
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {simResult.beRoas > 0 ? `${simResult.beRoas.toFixed(2)}x` : 'Rugi'}
                    </span>
                  </div>
                </div>

                {/* 4 Financial Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 block">Batas Beban Iklan Max (CPA)</span>
                    <span className="font-bold text-slate-900 font-mono text-sm block mt-0.5">
                      {formatIDR(simResult.maxCpa)}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Maksimal iklan/pcs sebelum rugi
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/90">
                    <span className="text-[11px] text-indigo-700 block font-medium">Beban Iklan per Pcs</span>
                    <span className="font-bold text-indigo-900 font-mono text-sm block mt-0.5">
                      {formatIDR(simResult.adsSpend)}
                    </span>
                    <span className="text-[10px] text-indigo-700 mt-0.5 block">
                      CIR {formatPercent(simResult.cir)} dari harga
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90">
                    <span className="text-[11px] text-amber-700 block font-medium">Total Potongan Marketplace</span>
                    <span className="font-bold text-amber-900 font-mono text-sm block mt-0.5">
                      {formatIDR(simResult.totalMarketplaceFees)}
                    </span>
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                      Tarif {formatPercent(simResult.effectiveFeeRate)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90">
                    <span className="text-[11px] text-emerald-700 block font-medium">Laba Bersih Akhir</span>
                    <span
                      className={`font-bold font-mono text-sm block mt-0.5 ${
                        simResult.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatIDR(simResult.netProfit)}
                    </span>
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">
                      Margin {formatPercent(simResult.netMargin)}
                    </span>
                  </div>
                </div>

                {/* Guidance Banner */}
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    simResult.status === 'SAFE'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                      : simResult.status === 'WARNING'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                      : 'bg-red-50/70 border-red-200 text-red-800'
                  }`}
                >
                  <p>
                    <strong>Pedoman ROAS:</strong> Kampanye iklan Anda harus menghasilkan minimal{' '}
                    <strong>{simResult.beRoas.toFixed(2)}x</strong> agar tidak merugi. Jika ROAS harian iklan berada di bawah angka tersebut, setiap pesanan dari iklan akan menggerus keuntungan toko Anda.
                  </p>
                </div>
              </div>

              {/* Rincian Beban Potongan per Satuan (Ledger) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Rincian Beban & Unit Economics
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-slate-700">
                    Harga Jual: {formatIDR(simResult.price)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>1. Biaya Modal Produk (HPP)</span>
                    <span className="font-semibold text-slate-900 font-mono">{formatIDR(simResult.hpp)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>2. Potongan Pokok Marketplace (Admin, Layanan, Payment)</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {formatIDR(simResult.adminFee + simResult.serviceFee + simResult.paymentFee)}
                    </span>
                  </div>
                  {(simResult.shippingFee > 0 || simResult.cashbackFee > 0 || simResult.campaignFee > 0 || simResult.affiliateFee > 0 || simResult.voucherFee > 0) && (
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>3. Program Promosi (Ongkir, Cashback, Campaign, Afiliasi)</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatIDR(
                          simResult.shippingFee +
                            simResult.cashbackFee +
                            simResult.campaignFee +
                            simResult.affiliateFee +
                            simResult.voucherFee
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>4. Kemasan, Gudang, Pajak & Overhead</span>
                    <span className="font-semibold text-slate-900 font-mono">{formatIDR(simResult.totalOtherCosts)}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-t border-slate-200 font-bold text-slate-800">
                    <span>Margin Kotor Sebelum Iklan (Max CPA)</span>
                    <span className="font-mono text-indigo-700">{formatIDR(simResult.profitBeforeAds)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>5. Beban Iklan Digital (ROAS {simTargetRoas.toFixed(1)}x)</span>
                    <span className="font-semibold text-red-600 font-mono">-{formatIDR(simResult.adsSpend)}</span>
                  </div>

                  <div className="flex justify-between pt-1.5 text-xs font-bold text-emerald-700">
                    <span>Sisa Keuntungan Bersih</span>
                    <span className="font-mono text-sm">
                      {formatIDR(simResult.netProfit)} ({formatPercent(simResult.netMargin)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Matriks Sensitivitas Multi-ROAS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Matriks Sensitivitas ROAS Iklan</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Simulasi laba bersih dan kelayakan jika kampanye iklan berjalan di berbagai tingkat ROAS:
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="pb-1.5">ROAS</th>
                        <th className="pb-1.5 text-right">Beban Iklan</th>
                        <th className="pb-1.5 text-right">CIR</th>
                        <th className="pb-1.5 text-right">Laba Bersih</th>
                        <th className="pb-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {simRoasScenarios.map((sc) => (
                        <tr
                          key={sc.roas}
                          className={`hover:bg-slate-50 ${
                            Math.abs(sc.roas - simTargetRoas) < 0.2
                              ? 'bg-indigo-50/70 font-bold text-indigo-900'
                              : 'text-slate-700'
                          }`}
                        >
                          <td className="py-2">{sc.roas.toFixed(1)}x</td>
                          <td className="py-2 text-right">{formatIDR(sc.ads)}</td>
                          <td className="py-2 text-right">{formatPercent(sc.cir)}</td>
                          <td
                            className={`py-2 text-right font-bold ${
                              sc.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {formatIDR(sc.profit)}
                          </td>
                          <td className="py-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                sc.status === 'SAFE'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : sc.status === 'WARNING'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {sc.status === 'SAFE' ? 'Aman' : sc.status === 'WARNING' ? 'Tipis' : 'Rugi'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
