import React from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, BellRing, Download, Store } from 'lucide-react';
import { DatabaseState } from '../../types/database';
import { validateDatabaseIntegrity } from '../../utils/validation';
import { scanProfitMarginAlerts } from '../../utils/alertEngine';
import { computePandLReport } from '../../utils/financialEngine';
import { generateComprehensiveFinancialCsv, downloadCsvFile } from '../../utils/financialExport';

interface NavbarProps {
  dbState: DatabaseState;
  onRefresh?: () => void;
  onNavigateToDataStatus?: () => void;
  onNavigateToSync?: () => void;
  onNavigateToAlerts?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  dbState,
  onRefresh,
  onNavigateToDataStatus,
  onNavigateToSync,
  onNavigateToAlerts,
}) => {
  const issues = validateDatabaseIntegrity(dbState);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const marginAlerts = scanProfitMarginAlerts(dbState);
  const criticalMarginAlertsCount = marginAlerts.filter((a) => a.severity === 'critical').length;

  const handleNavbarExportCsv = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const pnlReport = computePandLReport(dbState.sales, dbState.postData, dbState.costRules, dbState.teamAllocations);
    const skuMetrics = dbState.productChannels.map((pc) => {
      const sku = dbState.skus.find((s) => s.sku === pc.sku);
      const hpp = sku?.hpp || 0;
      const gp = pc.selling_price - hpp;
      const gpm = pc.selling_price > 0 ? gp / pc.selling_price : 0;
      const fee = pc.selling_price * 0.08;
      const profitBeforeAds = gp - fee;
      const adsSpend = pc.selling_price * 0.05;
      const profitAfterAds = profitBeforeAds - adsSpend;
      const npm = pc.selling_price > 0 ? profitAfterAds / pc.selling_price : 0;
      return {
        sku: pc.sku,
        skuName: sku?.sku_name || pc.sku,
        spuId: sku?.spu_id || '',
        brandName: dbState.brands.find((b) => b.brand_id === sku?.brand_id)?.brand_name || 'Sinergi',
        categoryName: dbState.categories.find((c) => c.category_id === sku?.category_id)?.category_name || 'General',
        unitId: pc.unit_id,
        unitName: dbState.units.find((u) => u.unit_id === pc.unit_id)?.unit_name || pc.unit_id,
        marketplaceId: pc.marketplace_id,
        marketplaceName: dbState.marketplaces.find((m) => m.marketplace_id === pc.marketplace_id)?.marketplace_name || pc.marketplace_id,
        sellingPrice: pc.selling_price,
        hpp,
        grossProfitPerUnit: gp,
        grossMarginPct: gpm,
        fees: [],
        totalMarketplaceFeePerUnit: fee,
        platformFeePct: 0.08,
        profitBeforeAds,
        marginBeforeAdsPct: pc.selling_price > 0 ? profitBeforeAds / pc.selling_price : 0,
        adsSpendPerUnit: adsSpend,
        profitAfterAds,
        marginAfterAdsPct: npm,
        unitsSold: 0,
        totalSales: 0,
        totalHpp: 0,
        totalGrossProfit: 0,
        totalPlatformCost: 0,
        totalProfitBeforeAds: 0,
        totalAdsSpend: 0,
        totalNetProfit: 0,
        healthStatus: (npm >= 0.08 ? 'ADS_ELIGIBLE' : 'ORGANIC_ONLY') as any,
      };
    });

    const csv = generateComprehensiveFinancialCsv({
      pnlReport,
      skuMetrics,
      sales: dbState.sales,
      postData: dbState.postData,
      ads: dbState.ads,
    });
    downloadCsvFile(`Laporan_Keuangan_Retail_${dateStr}.csv`, csv);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">SINERGI LAPAK</span>
                <span className="text-[11px] font-medium text-slate-500">Retail Multi-Channel</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Sistem Operasional Retail, Penetapan Harga & Laba Rugi
              </p>
            </div>
          </div>

          {/* Right Status Indicators & Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Financial CSV Export Button */}
            <button
              onClick={handleNavbarExportCsv}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
              title="Unduh laporan keuangan saat ini dalam format CSV untuk pembukuan"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Ekspor CSV</span>
            </button>

            {/* Sync Status Button */}
            <button
              onClick={onNavigateToSync}
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              title="Status sinkronisasi data"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Data Tersimpan</span>
            </button>

            {/* Data Health Status */}
            <button
              onClick={onNavigateToDataStatus}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                errorCount > 0
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : warningCount > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {errorCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>Perlu Cek Data</span>
                </>
              ) : warningCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Perhatian Data</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Status Data:</span>
                  <span className="font-semibold text-emerald-700">Sehat</span>
                </>
              )}
            </button>

            {/* Margin Alerts Pill */}
            {marginAlerts.length > 0 && (
              <button
                onClick={onNavigateToAlerts}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  criticalMarginAlertsCount > 0
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
                title="Peringatan margin produk"
              >
                <BellRing className={`w-3.5 h-3.5 ${criticalMarginAlertsCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
                <span>{marginAlerts.length}</span>
              </button>
            )}

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Muat ulang data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
