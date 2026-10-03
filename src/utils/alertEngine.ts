/**
 * Sinergi Lapak - Margin Alerts & Real-Time Notification Engine
 * Monitors profit margins against predefined thresholds (from 01_SETTINGS or custom user triggers)
 * and generates actionable recommendations to restore profitability.
 */

import { DatabaseState, ProductChannelRecord } from '../types/database';
import { getApplicableMarketplaceFees } from './financialEngine';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface MarginAlert {
  id: string;
  severity: AlertSeverity;
  type: 'CRITICAL_MARGIN' | 'THIN_MARGIN' | 'BELOW_MIN_PRICE' | 'FEE_SPIKE';
  title: string;
  message: string;
  sku: string;
  productName: string;
  unitId: string;
  unitName: string;
  marketplaceId: string;
  marketplaceName: string;
  sellingPrice: number;
  hpp: number;
  currentMarginPct: number;
  thresholdPct: number;
  marginDeficitPct: number;
  recommendedPrice: number;
  platformFee: number;
  timestamp: string;
}

export interface AlertThresholdSettings {
  minNetMarginThreshold: number; // e.g. 0.15 (15%)
  minAdsMarginThreshold: number; // e.g. 0.08 (8%)
  maxPlatformFeeRatio: number; // e.g. 0.12 (12%)
}

/**
 * Calculate recommended safe selling price to achieve the desired minimum margin
 * Price = (HPP + Fixed Fees) / (1 - TargetMargin% - PercentageFeeRate%)
 */
export function calculateRecommendedPrice(
  hpp: number,
  targetMarginPct: number,
  estimatedFeeRate: number = 0.075,
  fixedFees: number = 1000
): number {
  const divisor = 1 - targetMarginPct - estimatedFeeRate;
  if (divisor <= 0.1) return Math.round(hpp * 1.5);
  const rawPrice = (hpp + fixedFees) / divisor;
  // Round to nearest 500 IDR
  return Math.ceil(rawPrice / 500) * 500;
}

/**
 * Scan database state and trigger real-time margin alerts
 */
export function scanProfitMarginAlerts(
  dbState: DatabaseState,
  customThresholds?: Partial<AlertThresholdSettings>
): MarginAlert[] {
  // Read baseline settings from 01_SETTINGS
  const defaultNetMargin = parseFloat(
    dbState.settings.find((s) => s.key === 'MIN_NET_MARGIN')?.value || '0.15'
  );
  const defaultAdsMargin = parseFloat(
    dbState.settings.find((s) => s.key === 'MIN_ADS_MARGIN')?.value || '0.08'
  );

  const thresholds: AlertThresholdSettings = {
    minNetMarginThreshold: customThresholds?.minNetMarginThreshold ?? defaultNetMargin,
    minAdsMarginThreshold: customThresholds?.minAdsMarginThreshold ?? defaultAdsMargin,
    maxPlatformFeeRatio: customThresholds?.maxPlatformFeeRatio ?? 0.12,
  };

  const alerts: MarginAlert[] = [];
  const now = new Date().toISOString();

  // Evaluate each Product Channel configuration
  dbState.productChannels.forEach((channel) => {
    if (!channel.active) return;

    const sku = dbState.skus.find((s) => s.sku === channel.sku);
    if (!sku) return;

    const spu = dbState.spus.find((s) => s.spu_id === sku.spu_id);
    const unit = dbState.units.find((u) => u.unit_id === channel.unit_id);
    const mkt = dbState.marketplaces.find((m) => m.marketplace_id === channel.marketplace_id);

    const unitName = unit?.unit_name || channel.unit_id;
    const mktName = mkt?.marketplace_name || channel.marketplace_id;
    const sellingPrice = channel.selling_price;
    const hpp = sku.hpp;

    // Calculate marketplace fees
    const fees = getApplicableMarketplaceFees(
      sellingPrice,
      channel.marketplace_id,
      sku.category_id,
      sku.brand_id,
      sku.spu_id,
      sku.sku,
      channel.unit_id,
      dbState.costRules,
      ['ALL_MANDATORY', 'FREE_SHIPPING', 'CASHBACK', 'ALL']
    );

    const platformFee = fees.totalFeeAmount;
    const profitBeforeAds = sellingPrice - hpp - platformFee;
    const marginBeforeAdsPct = sellingPrice > 0 ? profitBeforeAds / sellingPrice : 0;

    const adsAllowance = channel.ads_status ? Math.round(sellingPrice * 0.07) : 0;
    const profitAfterAds = profitBeforeAds - adsAllowance;
    const marginAfterAdsPct = sellingPrice > 0 ? profitAfterAds / sellingPrice : 0;

    // 1. Critical Margin Alert: Margin Before Ads is strictly below minNetMarginThreshold
    if (marginBeforeAdsPct < thresholds.minNetMarginThreshold) {
      const deficit = thresholds.minNetMarginThreshold - marginBeforeAdsPct;
      const recPrice = calculateRecommendedPrice(hpp, thresholds.minNetMarginThreshold);

      alerts.push({
        id: `ALT-CRIT-${channel.config_id}`,
        severity: marginBeforeAdsPct <= 0 ? 'critical' : 'warning',
        type: 'CRITICAL_MARGIN',
        title: marginBeforeAdsPct <= 0 ? `Margin Negatif (Rugi Operasional): ${sku.sku}` : `Margin Rendah Di Bawah Threshold: ${sku.sku}`,
        message: `Margin bersih sebelum iklan ${(marginBeforeAdsPct * 100).toFixed(1)}% berada di bawah batas minimum ${(thresholds.minNetMarginThreshold * 100).toFixed(1)}% (Defisit: ${(deficit * 100).toFixed(1)}%).`,
        sku: sku.sku,
        productName: sku.sku_name,
        unitId: channel.unit_id,
        unitName,
        marketplaceId: channel.marketplace_id,
        marketplaceName: mktName,
        sellingPrice,
        hpp,
        currentMarginPct: marginBeforeAdsPct,
        thresholdPct: thresholds.minNetMarginThreshold,
        marginDeficitPct: deficit,
        recommendedPrice: recPrice,
        platformFee,
        timestamp: now,
      });
    }

    // 2. Below Minimum Selling Price Alert (Section 40)
    if (channel.promo_price > 0 && channel.promo_price < channel.minimum_selling_price) {
      alerts.push({
        id: `ALT-MINP-${channel.config_id}`,
        severity: 'warning',
        type: 'BELOW_MIN_PRICE',
        title: `Harga Promo Di Bawah Batas Minimum: ${sku.sku}`,
        message: `Harga promo ${channel.promo_price.toLocaleString('id-ID')} melanggar batas harga minimum yang diizinkan (${channel.minimum_selling_price.toLocaleString('id-ID')}).`,
        sku: sku.sku,
        productName: sku.sku_name,
        unitId: channel.unit_id,
        unitName,
        marketplaceId: channel.marketplace_id,
        marketplaceName: mktName,
        sellingPrice,
        hpp,
        currentMarginPct: marginBeforeAdsPct,
        thresholdPct: thresholds.minNetMarginThreshold,
        marginDeficitPct: 0,
        recommendedPrice: channel.minimum_selling_price,
        platformFee,
        timestamp: now,
      });
    }

    // 3. Thin Margin / Organic Only Alert
    if (channel.ads_status && marginAfterAdsPct < thresholds.minAdsMarginThreshold && marginBeforeAdsPct >= thresholds.minNetMarginThreshold) {
      alerts.push({
        id: `ALT-ADS-${channel.config_id}`,
        severity: 'info',
        type: 'THIN_MARGIN',
        title: `Margin Iklan Terlalu Tipis (Organic Only): ${sku.sku}`,
        message: `Produk menguntungkan secara organik (${(marginBeforeAdsPct * 100).toFixed(1)}%), namun setelah biaya iklan margin tersisa ${(marginAfterAdsPct * 100).toFixed(1)}% (kurang dari ${(thresholds.minAdsMarginThreshold * 100).toFixed(1)}%). Disarankan status iklan dimatikan.`,
        sku: sku.sku,
        productName: sku.sku_name,
        unitId: channel.unit_id,
        unitName,
        marketplaceId: channel.marketplace_id,
        marketplaceName: mktName,
        sellingPrice,
        hpp,
        currentMarginPct: marginAfterAdsPct,
        thresholdPct: thresholds.minAdsMarginThreshold,
        marginDeficitPct: thresholds.minAdsMarginThreshold - marginAfterAdsPct,
        recommendedPrice: calculateRecommendedPrice(hpp, thresholds.minNetMarginThreshold + 0.07),
        platformFee,
        timestamp: now,
      });
    }

    // 4. Marketplace Fee Spike
    const feeRatio = sellingPrice > 0 ? platformFee / sellingPrice : 0;
    if (feeRatio > thresholds.maxPlatformFeeRatio) {
      alerts.push({
        id: `ALT-FEE-${channel.config_id}`,
        severity: 'warning',
        type: 'FEE_SPIKE',
        title: `Potongan Fee Marketplace Tinggi (${(feeRatio * 100).toFixed(1)}%): ${sku.sku}`,
        message: `Total potongan biaya platform di ${mktName} mencapai Rp ${platformFee.toLocaleString('id-ID')} (${(feeRatio * 100).toFixed(1)}% dari harga jual), melebihi batas toleransi ${(thresholds.maxPlatformFeeRatio * 100).toFixed(1)}%.`,
        sku: sku.sku,
        productName: sku.sku_name,
        unitId: channel.unit_id,
        unitName,
        marketplaceId: channel.marketplace_id,
        marketplaceName: mktName,
        sellingPrice,
        hpp,
        currentMarginPct: marginBeforeAdsPct,
        thresholdPct: thresholds.minNetMarginThreshold,
        marginDeficitPct: feeRatio - thresholds.maxPlatformFeeRatio,
        recommendedPrice: calculateRecommendedPrice(hpp, thresholds.minNetMarginThreshold, feeRatio),
        platformFee,
        timestamp: now,
      });
    }
  });

  return alerts;
}
