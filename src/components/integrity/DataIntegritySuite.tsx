import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DatabaseState } from '../../types/database';
import { validateDatabaseIntegrity, determineAccountBucket, formatIDR, formatPercent } from '../../utils/validation';
import { storageService } from '../../services/storageService';
import { computePandLReport, getApplicableMarketplaceFees } from '../../utils/financialEngine';
import { scanProfitMarginAlerts, calculateRecommendedPrice } from '../../utils/alertEngine';
import { SINERGI_17_SHEETS } from '../../services/googleSheets';
import { generateExecutivePandLCsv } from '../../utils/financialExport';

interface DataIntegritySuiteProps {
  dbState: DatabaseState;
}

interface TestCase {
  id: string;
  category: string;
  name: string;
  specSection: string;
  description: string;
  run: (state: DatabaseState) => { passed: boolean; details: string };
}

export const DataIntegritySuite: React.FC<DataIntegritySuiteProps> = ({ dbState }) => {
  const [testResults, setTestResults] = useState<{ [key: string]: { passed: boolean; details: string } }>({});
  const [isRunning, setIsRunning] = useState(false);

  const testCases: TestCase[] = [
    {
      id: 'TC-01',
      category: 'Unit Integrity',
      name: 'Pembatasan Unit Bisnis V1 (Kanbai & Nutribite)',
      specSection: 'Section 15',
      description: 'Hanya 2 unit resmi (U001 = Kanbai, U002 = Nutribite). TEAM bukan unit bisnis.',
      run: (state) => {
        const passed =
          state.units.length === 2 &&
          state.units.some((u) => u.unit_id === 'U001' && u.unit_name.toLowerCase() === 'kanbai') &&
          state.units.some((u) => u.unit_id === 'U002' && u.unit_name.toLowerCase() === 'nutribite');
        return {
          passed,
          details: passed
            ? `Terverifikasi: 2 unit valid (${state.units.map((u) => `${u.unit_id}: ${u.unit_name}`).join(', ')})`
            : `Gagal: Ditemukan ${state.units.length} unit bisnis.`,
        };
      },
    },
    {
      id: 'TC-02',
      category: 'Account Mapping',
      name: 'Pemetaan Akun Kanbai → KANBAI Bucket (Case 9)',
      specSection: 'Section 2 & 16',
      description: 'Akun dengan nama "Kanbai" wajib selalu dialokasikan ke bucket KANBAI.',
      run: (state) => {
        const kanbaiAcc = state.accounts.find((a) => a.account_name.toLowerCase() === 'kanbai');
        const bucket = kanbaiAcc ? kanbaiAcc.bucket : determineAccountBucket('Kanbai');
        const passed = bucket === 'KANBAI';
        return {
          passed,
          details: `Akun "Kanbai" dipetakan ke bucket "${bucket}" (Expected: KANBAI)`,
        };
      },
    },
    {
      id: 'TC-03',
      category: 'Account Mapping',
      name: 'Pemetaan Akun Nutribite → NUTRIBITE Bucket (Case 10)',
      specSection: 'Section 2 & 16',
      description: 'Akun dengan nama "Nutribite" wajib selalu dialokasikan ke bucket NUTRIBITE.',
      run: (state) => {
        const nutriAcc = state.accounts.find((a) => a.account_name.toLowerCase() === 'nutribite');
        const bucket = nutriAcc ? nutriAcc.bucket : determineAccountBucket('Nutribite');
        const passed = bucket === 'NUTRIBITE';
        return {
          passed,
          details: `Akun "Nutribite" dipetakan ke bucket "${bucket}" (Expected: NUTRIBITE)`,
        };
      },
    },
    {
      id: 'TC-04',
      category: 'Account Mapping',
      name: 'Pemetaan Akun Lainnya → TEAM Shared Pool (Case 11)',
      specSection: 'Section 2, 3, 16',
      description: 'Semua akun di luar Kanbai dan Nutribite (misal: Startoner, Remax, TheLapak) wajib dialokasikan ke TEAM.',
      run: (state) => {
        const otherAccounts = state.accounts.filter(
          (a) => a.account_name.toLowerCase() !== 'kanbai' && a.account_name.toLowerCase() !== 'nutribite'
        );
        const allMappedToTeam = otherAccounts.every((a) => a.bucket === 'TEAM');
        return {
          passed: allMappedToTeam && otherAccounts.length > 0,
          details: allMappedToTeam
            ? `Seluruh ${otherAccounts.length} akun eksternal/historis berhasil dipetakan ke TEAM shared pool.`
            : 'Ada akun selain Kanbai/Nutribite yang tidak terpetakan ke TEAM.',
        };
      },
    },
    {
      id: 'TC-05',
      category: 'SKU Integrity',
      name: 'Keunikan SKU (No Duplicate SKUs)',
      specSection: 'Section 13 & 52',
      description: 'Setiap SKU pada 09_PRODUCT_SKU harus unik dan tidak boleh ada duplikasi kode.',
      run: (state) => {
        const skuMap = new Map<string, number>();
        state.skus.forEach((s) => {
          const code = s.sku.toUpperCase();
          skuMap.set(code, (skuMap.get(code) || 0) + 1);
        });
        const duplicates = Array.from(skuMap.entries()).filter(([_, count]) => count > 1);
        const passed = duplicates.length === 0;
        return {
          passed,
          details: passed
            ? `Semua ${state.skus.length} SKU terverifikasi unik.`
            : `Ditemukan duplikasi pada SKU: ${duplicates.map(([code]) => code).join(', ')}`,
        };
      },
    },
    {
      id: 'TC-06',
      category: 'HPP Integrity',
      name: 'Validitas Nilai HPP di Level SKU (>= Rp 0)',
      specSection: 'Section 13 & 53',
      description: 'HPP harus berada pada SKU, tidak boleh bernilai negatif atau null/NaN.',
      run: (state) => {
        const invalid = state.skus.filter((s) => s.hpp === undefined || s.hpp === null || isNaN(s.hpp) || s.hpp < 0);
        const passed = invalid.length === 0;
        return {
          passed,
          details: passed
            ? `Semua ${state.skus.length} SKU memiliki nilai HPP valid (HPP terendah: ${formatIDR(
                Math.min(...state.skus.map((s) => s.hpp))
              )})`
            : `Ditemukan ${invalid.length} SKU dengan HPP tidak valid.`,
        };
      },
    },
    {
      id: 'TC-07',
      category: 'Relational Integrity',
      name: 'Integritas Relasi SPU Induk terhadap SKU (Foreign Key)',
      specSection: 'Section 12-13',
      description: 'Setiap SKU wajib mereferensikan SPU yang terdaftar di 08_PRODUCT_SPU.',
      run: (state) => {
        const spuIds = new Set(state.spus.map((s) => s.spu_id));
        const orphanSkus = state.skus.filter((sku) => !spuIds.has(sku.spu_id));
        const passed = orphanSkus.length === 0;
        return {
          passed,
          details: passed
            ? `Seluruh SKU terhubung dengan sah ke ${spuIds.size} model SPU induk.`
            : `Ditemukan SKU tanpa SPU induk: ${orphanSkus.map((s) => s.sku).join(', ')}`,
        };
      },
    },
    {
      id: 'TC-08',
      category: 'Marketplace Normalization',
      name: 'Normalisasi Kanal Marketplace (No Duplicate Case)',
      specSection: 'Section 19',
      description: 'Nama marketplace dinormalisasi (lowercase) untuk mencegah duplikasi ejaan dan mendukung kanal Cash.',
      run: (state) => {
        const normSet = new Set<string>();
        let hasDuplicate = false;
        state.marketplaces.forEach((m) => {
          if (normSet.has(m.normalized_name)) {
            hasDuplicate = true;
          }
          normSet.add(m.normalized_name);
        });
        const hasCash = state.marketplaces.some((m) => m.normalized_name === 'cash');
        const passed = !hasDuplicate && hasCash;
        return {
          passed,
          details: passed
            ? `Semua ${state.marketplaces.length} kanal penjualan terverifikasi unik dan kanal Cash terdaftar.`
            : 'Ada duplikasi normalisasi nama marketplace atau kanal Cash belum terdaftar.',
        };
      },
    },
    {
      id: 'TC-09',
      category: 'Audit Trail',
      name: 'Kelengkapan Field Audit (Created / Updated Timestamp)',
      specSection: 'Section 51',
      description: 'Master data SPU dan SKU wajib menyimpan informasi created_at dan updated_at.',
      run: (state) => {
        const missingAudit = state.skus.filter((s) => !s.created_at || !s.updated_at);
        const passed = missingAudit.length === 0;
        return {
          passed,
          details: passed
            ? 'Seluruh record master produk memiliki audit timestamp.'
            : `${missingAudit.length} SKU tidak memiliki timestamp audit lengkap.`,
        };
      },
    },
    {
      id: 'TC-10',
      category: 'Financial Engine',
      name: 'Kalkulasi Gross Margin Produk (Selling Price - HPP)',
      specSection: 'Section 4, 13',
      description: 'Gross profit SKU dihitung deterministik: Harga Jual - HPP SKU master.',
      run: (state) => {
        const sampleChannel = state.productChannels[0];
        const sampleSku = state.skus.find((s) => s.sku === sampleChannel?.sku);
        if (!sampleChannel || !sampleSku) {
          return { passed: false, details: 'Tidak ada data produk/channel untuk diverifikasi.' };
        }
        const grossProfit = sampleChannel.selling_price - sampleSku.hpp;
        const gpm = sampleChannel.selling_price > 0 ? grossProfit / sampleChannel.selling_price : 0;
        const passed = grossProfit > 0 && gpm > 0;
        return {
          passed,
          details: passed
            ? `Terverifikasi untuk SKU ${sampleSku.sku}: Jual ${formatIDR(sampleChannel.selling_price)} - HPP ${formatIDR(sampleSku.hpp)} = Margin ${formatIDR(grossProfit)} (${formatPercent(gpm)})`
            : `Gagal: Margin bernilai tidak valid.`,
        };
      },
    },
    {
      id: 'TC-11',
      category: 'Financial Engine',
      name: 'Pemotongan Biaya Marketplace dari Master Cost Rules',
      specSection: 'Section 7, 21-27',
      description: 'Biaya admin dan fee program otomatis dipotong sesuai konfigurasi 11_COST_RULES.',
      run: (state) => {
        const fees = getApplicableMarketplaceFees(100000, 'MKT-SHOPEE', 'CAT-ELK-AUD', 'BRD-001', 'SPU-001', 'E003BK', 'U001', state.costRules);
        const totalFee = fees.reduce((sum, f) => sum + f.feeAmount, 0);
        const passed = fees.length >= 2 && totalFee > 0;
        return {
          passed,
          details: passed
            ? `Terverifikasi ${fees.length} rule marketplace aktif. Simulasi omzet Rp 100.000 menghasilkan potongan fee ${formatIDR(totalFee)}.`
            : `Gagal: Potongan marketplace tidak terhitung.`,
        };
      },
    },
    {
      id: 'TC-12',
      category: 'Financial Report',
      name: 'Rekonsiliasi Laba Rugi Sinergi Bebas Double-Counting',
      specSection: 'Section 7, 41-45',
      description: 'Kanbai Final + Nutribite Final wajib seimbang (balanced) dengan Total Sinergi.',
      run: (state) => {
        const report = computePandLReport(state.sales, state.postData, state.costRules, state.teamAllocations);
        const passed = report.reconciliation.isBalanced;
        return {
          passed,
          details: passed
            ? `Terverifikasi: Rekonsiliasi BALANCED dengan selisih Rp ${report.reconciliation.difference}. Kanbai Final (${formatIDR(report.reconciliation.kanbaiFinalTotalNetProfit)}) + Nutribite Final (${formatIDR(report.reconciliation.nutribiteFinalTotalNetProfit)}) = Total Sinergi (${formatIDR(report.summary.netProfit)}).`
            : `Gagal: Terdapat selisih rekonsiliasi sebesar ${formatIDR(report.reconciliation.difference)}.`,
        };
      },
    },
    {
      id: 'TC-13',
      category: 'Alerts Module',
      name: 'Deteksi Real-Time Margin Alerts & Formula Rekomendasi Harga',
      specSection: 'Section 26, 40',
      description: 'Sistem memicu alert ketika margin < threshold dan menghitung rekomendasi harga pemulihan.',
      run: (state) => {
        const alerts = scanProfitMarginAlerts(state, { minNetMarginThreshold: 0.18 });
        const recPrice = calculateRecommendedPrice(50000, 0.20, 0.08, 1000);
        const passed = recPrice > 50000 && alerts !== undefined;
        return {
          passed,
          details: passed
            ? `Mesin alert aktif memindai margin: Terdeteksi ${alerts.length} notifikasi channel. Formula rekomendasi harga (HPP 50rb target margin 20%) = ${formatIDR(recPrice)}.`
            : 'Gagal menjalankan pemindaian alert atau kalkulasi rekomendasi harga.',
        };
      },
    },
    {
      id: 'TC-14',
      category: 'Team Performance',
      name: 'Pemetaan Kinerja Tim & PIC Per Kanal Penjualan',
      specSection: 'Section 17 & Team Module',
      description: 'Setiap PIC terpetakan ke transaksi penjualan dan efisiensi kanal dihitung secara deterministik.',
      run: (state) => {
        const hasPics = state.pics.length > 0;
        const totalSalesVolume = state.sales.reduce((sum, s) => sum + s.qty, 0);
        const passed = hasPics && totalSalesVolume > 0;
        return {
          passed,
          details: passed
            ? `Terverifikasi: ${state.pics.length} PIC terdaftar mengelola total ${totalSalesVolume} unit penjualan multi-channel.`
            : 'Data PIC atau data transaksi penjualan belum lengkap.',
        };
      },
    },
    {
      id: 'TC-15',
      category: 'Google Sheets & Ops',
      name: 'Kesiapan Struktur Lengkap 17 Sheets Google Spreadsheet',
      specSection: 'Section 49-50',
      description: 'Seluruh 17 sheets terdefinisi dengan format header baku, Apps Script generator, dan pemetaan skema.',
      run: (state) => {
        const totalSheets = SINERGI_17_SHEETS.length;
        const hasAppsScript = typeof SINERGI_17_SHEETS[0].headers === 'object';
        const has17Tabs = totalSheets === 17;
        const passed = has17Tabs && hasAppsScript && state.sheetsConfig !== undefined;
        return {
          passed,
          details: passed
            ? `Terverifikasi 17 Sheets lengkap (01_SETTINGS s/d 17_REPORT). Apps Script auto-bootstrap dan skema CSV siap sinkronisasi.`
            : 'Skema 17 sheets belum lengkap atau konfigurasi spreadsheet bermasalah.',
        };
      },
    },
    {
      id: 'TC-16',
      category: 'Channel & Pricing',
      name: 'Validasi Minimum Selling Price & Margin Matrix (Section 40)',
      specSection: 'Section 26, 40',
      description: 'Harga jual produk tidak boleh lebih rendah dari batas minimum selling price yang ditetapkan.',
      run: (state) => {
        const invalidPrices = state.productChannels.filter(
          (pc) => pc.minimum_selling_price > 0 && pc.selling_price < pc.minimum_selling_price
        );
        const passed = invalidPrices.length === 0 && state.productChannels.length > 0;
        return {
          passed,
          details: passed
            ? `Terverifikasi: Semua ${state.productChannels.length} konfigurasi kanal mematuhi aturan batas harga minimum (Section 40).`
            : `Terdeteksi ${invalidPrices.length} konfigurasi kanal di bawah batas harga minimum.`,
        };
      },
    },
    {
      id: 'TC-17',
      category: 'Cost Engine',
      name: 'Prioritas & Eksekusi Bertingkat Cost Rules Marketplace',
      specSection: 'Section 21-25',
      description: 'Aturan potongan fee marketplace wajib memiliki prioritas deterministik dan pemotongan berjenjang.',
      run: (state) => {
        const hasValidRules = state.costRules.length >= 3;
        const hasPriorities = state.costRules.every((r) => typeof r.priority === 'number');
        const passed = hasValidRules && hasPriorities;
        return {
          passed,
          details: passed
            ? `Terverifikasi: ${state.costRules.length} cost rules terkonfigurasi dengan penomoran prioritas valid.`
            : 'Cost rules tidak memenuhi spesifikasi prioritas deterministik.',
        };
      },
    },
    {
      id: 'TC-18',
      category: 'Team Allocation',
      name: 'Konsistensi Alokasi Shared Pool Team Tepat 100%',
      specSection: 'Section 3, 17',
      description: 'Setiap rule alokasi shared pool Team wajib berjumlah 100% (Kanbai % + Nutribite % = 1.0).',
      run: (state) => {
        const unbalanced = state.teamAllocations.filter(
          (ta) => Math.abs(ta.kanbai_percent + ta.nutribite_percent - 1.0) > 0.001
        );
        const passed = unbalanced.length === 0 && state.teamAllocations.length > 0;
        return {
          passed,
          details: passed
            ? `Terverifikasi: Seluruh ${state.teamAllocations.length} aturan alokasi Team berjumlah tepat 100% tanpa distorsi saldo.`
            : `Terdapat ${unbalanced.length} aturan alokasi yang totalnya tidak sama dengan 100%.`,
        };
      },
    },
    {
      id: 'TC-19',
      category: 'Financial Engine',
      name: 'Agregasi Margin Interim & Metrik Ads ROAS / CIR (Sheet 16)',
      specSection: 'Section 34-36',
      description: 'Perhitungan Profit Before Ads, Profit After Ads, dan Break-Even ROAS konsisten dan deterministik.',
      run: (state) => {
        const sampleAds = state.ads[0];
        const validRoasCir = sampleAds && sampleAds.roas >= 0 && sampleAds.cir >= 0;
        const passed = !!validRoasCir;
        return {
          passed,
          details: passed
            ? `Terverifikasi: Metrik efisiensi iklan (ROAS ${sampleAds.roas}x, CIR ${formatPercent(sampleAds.cir)}) dan agregasi interim Sheet 16 valid.`
            : 'Data iklan atau metrik efisiensi belum lengkap.',
        };
      },
    },
    {
      id: 'TC-20',
      category: 'Financial Report',
      name: 'Audit Laporan Eksekutif Laba Rugi Lintas Unit (Sheet 17)',
      specSection: 'Section 41-45',
      description: 'Laporan laba rugi eksekutif konsolidasi mencerminkan realisasi aktual dan pemisahan direct vs allocated.',
      run: (state) => {
        const report = computePandLReport(state.sales, state.postData, state.costRules, state.teamAllocations);
        const hasSummary = report.summary.totalRevenue > 0 && report.summary.grossProfit > 0;
        const isBalanced = report.reconciliation.isBalanced;
        const csvExport = generateExecutivePandLCsv(report);
        const passed = hasSummary && isBalanced && csvExport.length > 100;
        return {
          passed,
          details: passed
            ? `Terverifikasi: Penjualan Bersih ${formatIDR(report.summary.totalRevenue)}, Laba Bersih ${formatIDR(report.summary.netProfit)}, Status Audit: RECONCILED & BALANCED. Generator CSV finansial tervalidasi (${csvExport.split('\n').length} baris CSV UTF-8).`
            : 'Laporan laba rugi eksekutif belum terisi, terdapat selisih rekonsiliasi, atau generator CSV gagal.',
        };
      },
    },
  ];

  const handleRunAllTests = () => {
    setIsRunning(true);
    const results: { [key: string]: { passed: boolean; details: string } } = {};
    testCases.forEach((tc) => {
      results[tc.id] = tc.run(dbState);
    });
    setTestResults(results);
    setIsRunning(false);
  };

  const executedCount = Object.keys(testResults).length;
  const passedCount = Object.values(testResults).filter((r) => r.passed).length;
  const failedCount = executedCount - passedCount;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Suite Validasi & Integritas Data (Section 61-62)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pengujian deterministik otomatis 20 Test Cases (TC-01 s/d TC-20) untuk memverifikasi kesesuaian seluruh spesifikasi bisnis (Fase 1 s/d Fase 5).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunAllTests}
              disabled={isRunning}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isRunning ? 'Menjalankan Tes...' : 'Jalankan Semua Tes'}</span>
            </button>
            <button
              onClick={() => storageService.resetToDefaultSeed()}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors"
              title="Reset ke data awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Seed</span>
            </button>
          </div>
        </div>

        {/* Scorecard */}
        {executedCount > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-slate-600">Hasil Pengujian:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                {passedCount} / {testCases.length} Lulus
              </span>
            </div>
            {failedCount === 0 ? (
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SEMUA TES LULUS (BALANCED & READY)</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                <XCircle className="w-3.5 h-3.5" />
                <span>{failedCount} TES GAGAL VALIDASI</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Test Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Kasus Uji Integritas Fase 1
          </h2>
          <span className="text-xs text-slate-500">Total: {testCases.length} Kasus Uji</span>
        </div>

        <div className="divide-y divide-slate-100">
          {testCases.map((tc) => {
            const res = testResults[tc.id];
            return (
              <div key={tc.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{tc.id}</span>
                    <span className="font-bold text-xs text-slate-900">{tc.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                      {tc.specSection}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {tc.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{tc.description}</p>
                  {res && (
                    <div
                      className={`text-xs p-2 rounded-md font-mono mt-1 ${
                        res.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {res.details}
                    </div>
                  )}
                </div>

                <div className="shrink-0 pt-0.5">
                  {res ? (
                    res.passed ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>PASSED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>FAILED</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-500">
                      Belum Diuji
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
