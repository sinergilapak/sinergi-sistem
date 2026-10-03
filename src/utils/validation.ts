/**
 * Sinergi Lapak - Business Logic Validation & Utility Engine
 */

import { DatabaseState, BucketType } from '../types/database';

/**
 * Account Mapping Rule (Section 2 & 16)
 * IF Account = "Kanbai" -> Bucket = KANBAI
 * ELSE IF Account = "Nutribite" -> Bucket = NUTRIBITE
 * ELSE -> Bucket = TEAM
 */
export function determineAccountBucket(accountName: string): BucketType {
  const normalized = accountName.trim().toLowerCase();
  if (normalized === 'kanbai') {
    return 'KANBAI';
  }
  if (normalized === 'nutribite') {
    return 'NUTRIBITE';
  }
  return 'TEAM';
}

/**
 * Format number to Indonesian Rupiah (Rp)
 */
export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(rate: number): string {
  if (isNaN(rate) || rate === null || rate === undefined) {
    return '0%';
  }
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Validate SKU uniqueness and required fields
 */
export function validateSkuInput(
  sku: string,
  skuName: string,
  spuId: string,
  hpp: number,
  existingSkus: { sku: string; product_id: string }[],
  currentProductId?: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const trimmedSku = sku.trim();
  if (!trimmedSku) {
    errors.push('SKU tidak boleh kosong');
  }

  // SKU Uniqueness check
  const duplicate = existingSkus.find(
    (item) => item.sku.toLowerCase() === trimmedSku.toLowerCase() && item.product_id !== currentProductId
  );
  if (duplicate) {
    errors.push(`SKU "${trimmedSku}" sudah terdaftar. SKU harus bersifat unik.`);
  }

  if (!skuName.trim()) {
    errors.push('Nama SKU tidak boleh kosong');
  }

  if (!spuId) {
    errors.push('SPU harus dipilih');
  }

  if (hpp === undefined || hpp === null || isNaN(hpp)) {
    errors.push('HPP harus diisi dengan angka');
  } else if (hpp < 0) {
    errors.push('HPP tidak boleh bernilai negatif');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize marketplace name
 */
export function normalizeMarketplaceName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface ValidationIssue {
  id: string;
  sheet: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

/**
 * Comprehensive Phase 1 Integrity Checker
 */
export function validateDatabaseIntegrity(data: DatabaseState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Check Unit Table: exactly 2 units (U001 = Kanbai, U002 = Nutribite)
  if (data.units.length !== 2) {
    issues.push({
      id: 'unit-count',
      sheet: '02_UNIT',
      severity: 'warning',
      message: `Jumlah Unit bisnis saat ini ${data.units.length}. V1 mensyaratkan 2 unit bisnis: Kanbai (U001) dan Nutribite (U002).`,
    });
  }

  // 2. Check Account mapping rule compliance
  data.accounts.forEach((acc) => {
    const expectedBucket = determineAccountBucket(acc.account_name);
    if (acc.bucket !== expectedBucket) {
      issues.push({
        id: `acc-bucket-${acc.account_id}`,
        sheet: '03_ACCOUNT',
        severity: 'error',
        message: `Ketidaksesuaian bucket pada akun "${acc.account_name}"`,
        details: `Tercatat sebagai ${acc.bucket}, seharusnya ${expectedBucket} berdasarkan aturan bisnis Sinergi Lapak.`,
      });
    }
  });

  // 3. Check SKU Uniqueness
  const skuMap = new Map<string, number>();
  data.skus.forEach((sku) => {
    const code = sku.sku.toUpperCase();
    skuMap.set(code, (skuMap.get(code) || 0) + 1);
  });
  skuMap.forEach((count, code) => {
    if (count > 1) {
      issues.push({
        id: `sku-dup-${code}`,
        sheet: '09_PRODUCT_SKU',
        severity: 'error',
        message: `Duplikasi SKU terdeteksi: "${code}" muncul ${count} kali. SKU wajib unik.`,
      });
    }
  });

  // 4. Check HPP non-negative & valid
  data.skus.forEach((sku) => {
    if (sku.hpp === undefined || sku.hpp === null || isNaN(sku.hpp) || sku.hpp < 0) {
      issues.push({
        id: `sku-hpp-${sku.sku}`,
        sheet: '09_PRODUCT_SKU',
        severity: 'error',
        message: `HPP tidak valid untuk SKU "${sku.sku}": ${sku.hpp}`,
      });
    }
  });

  // 5. Check SPU existence for each SKU (Foreign Key)
  const spuIds = new Set(data.spus.map((s) => s.spu_id));
  data.skus.forEach((sku) => {
    if (!spuIds.has(sku.spu_id)) {
      issues.push({
        id: `sku-spu-fk-${sku.sku}`,
        sheet: '09_PRODUCT_SKU',
        severity: 'error',
        message: `SKU "${sku.sku}" mereferensikan SPU "${sku.spu_id}" yang tidak ada di 08_PRODUCT_SPU.`,
      });
    }
  });

  // 6. Check Brand existence for SPUs & SKUs
  const brandIds = new Set(data.brands.map((b) => b.brand_id));
  data.spus.forEach((spu) => {
    if (!brandIds.has(spu.brand_id)) {
      issues.push({
        id: `spu-brand-fk-${spu.spu_id}`,
        sheet: '08_PRODUCT_SPU',
        severity: 'error',
        message: `SPU "${spu.spu_id}" mereferensikan Brand "${spu.brand_id}" yang tidak terdaftar.`,
      });
    }
  });

  // 7. Check Category existence for SPUs
  const catIds = new Set(data.categories.map((c) => c.category_id));
  data.spus.forEach((spu) => {
    if (!catIds.has(spu.category_id)) {
      issues.push({
        id: `spu-cat-fk-${spu.spu_id}`,
        sheet: '08_PRODUCT_SPU',
        severity: 'error',
        message: `SPU "${spu.spu_id}" mereferensikan Kategori "${spu.category_id}" yang tidak terdaftar.`,
      });
    }
  });

  // 8. Check Marketplace normalization
  const mktNormMap = new Map<string, number>();
  data.marketplaces.forEach((mkt) => {
    const norm = normalizeMarketplaceName(mkt.marketplace_name);
    mktNormMap.set(norm, (mktNormMap.get(norm) || 0) + 1);
  });
  mktNormMap.forEach((count, norm) => {
    if (count > 1) {
      issues.push({
        id: `mkt-norm-dup-${norm}`,
        sheet: '06_MARKETPLACE',
        severity: 'error',
        message: `Duplikasi kanal penjualan terdeteksi akibat normalisasi nama: "${norm}" muncul ${count} kali.`,
      });
    }
  });

  return issues;
}
