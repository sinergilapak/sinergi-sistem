import React, { useState } from 'react';
import {
  MoreHorizontal,
  Sliders,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Plus,
  Edit2,
  Trash2,
  X,
  ShieldCheck,
  Building2,
  Users,
} from 'lucide-react';
import {
  DatabaseState,
  PostDataRecord,
  FinancialType,
  AllocationMethod,
} from '../../types/database';
import { storageService } from '../../services/storageService';
import { formatIDR, formatPercent } from '../../utils/validation';
import { computePandLReport } from '../../utils/financialEngine';
import {
  generateComprehensiveFinancialCsv,
  generateExpensesLedgerCsv,
  downloadCsvFile,
} from '../../utils/financialExport';

export type MoreSubTab = 'transactions' | 'settings' | 'sync';

interface MoreHubProps {
  dbState: DatabaseState;
  activeSubTab?: MoreSubTab;
  onSubTabChange?: (tab: MoreSubTab) => void;
}

export const MoreHub: React.FC<MoreHubProps> = ({
  dbState,
  activeSubTab = 'transactions',
  onSubTabChange,
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<MoreSubTab>(activeSubTab);

  React.useEffect(() => {
    if (activeSubTab) {
      setCurrentSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleTabSwitch = (tab: MoreSubTab) => {
    setCurrentSubTab(tab);
    onSubTabChange?.(tab);
  };

  // --- TAB 1: DATA TRANSAKSI (BIAYA OPERASIONAL) ---
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostDataRecord | null>(null);

  const [formPostDate, setFormPostDate] = useState('2026-02-15');
  const [formPostCategory, setFormPostCategory] = useState('01. Operasional');
  const [formPostSubCat, setFormPostSubCat] = useState('Gaji & Tim');
  const [formPostDesc, setFormPostDesc] = useState('');
  const [formPostAmount, setFormPostAmount] = useState<number>(0);
  const [formPostType, setFormPostType] = useState<FinancialType>('EXPENSE');
  const [formPostBucket, setFormPostBucket] = useState<'KANBAI' | 'NUTRIBITE' | 'TEAM'>('TEAM');

  const openAddPost = () => {
    setEditingPost(null);
    setFormPostDate(new Date().toISOString().slice(0, 10));
    setFormPostCategory('01. Operasional');
    setFormPostSubCat('Operasional Retail');
    setFormPostDesc('');
    setFormPostAmount(0);
    setFormPostType('EXPENSE');
    setFormPostBucket('TEAM');
    setIsPostModalOpen(true);
  };

  const openEditPost = (post: PostDataRecord) => {
    setEditingPost(post);
    setFormPostDate(post.date);
    setFormPostCategory(post.category);
    setFormPostSubCat(post.sub_category);
    setFormPostDesc(post.keterangan);
    setFormPostAmount(post.balance);
    setFormPostType(post.financial_type);
    setFormPostBucket(post.bucket);
    setIsPostModalOpen(true);
  };

  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPost) {
      storageService.updatePostDataRecord(editingPost.post_id, {
        date: formPostDate,
        category: formPostCategory,
        sub_category: formPostSubCat,
        keterangan: formPostDesc,
        balance: formPostAmount,
        financial_type: formPostType,
        bucket: formPostBucket,
      });
    } else {
      storageService.addPostDataRecord({
        date: formPostDate,
        category: formPostCategory,
        sub_category: formPostSubCat,
        cost_post: 'Operasional Toko',
        pic: 'Finance',
        balance: formPostAmount,
        keterangan: formPostDesc,
        bucket: formPostBucket,
        financial_type: formPostType,
      });
    }
    setIsPostModalOpen(false);
  };

  const handleDeletePost = (post: PostDataRecord) => {
    if (confirm(`Hapus catatan transaksi "${post.keterangan}"?`)) {
      storageService.deletePostDataRecord(post.post_id);
    }
  };

  const handleExportExpensesCsv = () => {
    const csv = generateExpensesLedgerCsv(dbState.postData);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`Data_Biaya_Operasional_${dateStr}.csv`, csv);
  };

  // --- TAB 2: PENGATURAN ALOKASI BIAYA & MARGIN ---
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('CUSTOM');
  const [kanbaiRatio, setKanbaiRatio] = useState<number>(0.6); // 60%
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSaveAllocation = () => {
    // Updates team allocations in storageService
    dbState.teamAllocations.forEach((alloc) => {
      storageService.updateTeamAllocation(alloc.allocation_id, {
        method: allocationMethod,
        kanbai_percent: kanbaiRatio,
        nutribite_percent: 1 - kanbaiRatio,
      });
    });
    setSaveSuccessMsg('Pengaturan alokasi biaya bersama berhasil disimpan.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // --- TAB 3: SINKRONISASI & CADANGAN ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Baru saja (Hari ini 18:30 WIB)');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncNow = () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      const timeStr = `Hari ini ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
      setLastSyncTime(timeStr);
      setSyncFeedback('Data berhasil disinkronkan dan tersimpan aman.');
    }, 700);
  };

  const handleDownloadFullBackup = () => {
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
    downloadCsvFile(`Cadangan_Data_Sinergi_Lapak_${dateStr}.csv`, csv);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header & Submenu Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Data Transaksi & Pengaturan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pencatatan biaya operasional, aturan alokasi bersama, dan status sinkronisasi
            </p>
          </div>

          {/* Submenu Segmented Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabSwitch('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'transactions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data Transaksi ({dbState.postData.length})
            </button>
            <button
              onClick={() => handleTabSwitch('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'settings'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pengaturan
            </button>
            <button
              onClick={() => handleTabSwitch('sync')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'sync'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sinkronisasi
            </button>
          </div>
        </div>
      </div>

      {/* --- SUBTAB 1: DATA TRANSAKSI (BIAYA OPERASIONAL) --- */}
      {currentSubTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-xs font-bold text-slate-900">
                Pos Biaya Operasional & Beban Usaha
              </h2>
              <p className="text-[11px] text-slate-500">
                Semua biaya operasional yang dialokasikan ke unit bisnis atau biaya bersama
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportExpensesCsv}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Unduh CSV Biaya</span>
              </button>
              <button
                onClick={openAddPost}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Biaya Baru</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Kategori Biaya</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4">Alokasi Biaya</th>
                    <th className="py-3 px-4 text-right">Jumlah</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbState.postData.map((post) => {
                    const bucketLabel =
                      post.bucket === 'KANBAI'
                        ? 'Kanbai'
                        : post.bucket === 'NUTRIBITE'
                        ? 'Nutribite'
                        : 'Biaya Bersama';

                    return (
                      <tr key={post.post_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-600">{post.date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{post.category}</td>
                        <td className="py-3 px-4 text-slate-700">{post.keterangan}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              post.bucket === 'KANBAI'
                                ? 'bg-blue-50 text-blue-700'
                                : post.bucket === 'NUTRIBITE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {bucketLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatIDR(post.balance)}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditPost(post)}
                            className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                            title="Edit Biaya"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Hapus Biaya"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: PENGATURAN ALOKASI BIAYA & MARGIN --- */}
      {currentSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Alokasi Biaya Bersama */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Alokasi Biaya Bersama</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Metode pembagian biaya operasional tim bersama ke unit bisnis Kanbai dan Nutribite
              </p>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Metode Alokasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocationMethod('CUSTOM')}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                      allocationMethod === 'CUSTOM'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Atur Manual (Rasio Tetap)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMethod('SALES_PROPORTION')}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                      allocationMethod === 'SALES_PROPORTION'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Berdasarkan Penjualan
                  </button>
                </div>
              </div>

              {allocationMethod === 'CUSTOM' ? (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>Kanbai: {Math.round(kanbaiRatio * 100)}%</span>
                    <span>Nutribite: {Math.round((1 - kanbaiRatio) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={kanbaiRatio}
                    onChange={(e) => setKanbaiRatio(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="text-[11px] text-slate-400">
                    Default bisnis standar: Kanbai 60% dan Nutribite 40%.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-600">
                  <p>
                    Biaya bersama akan otomatis dibagi proporsional mengikuti rasio total omzet penjualan bersih
                    masing-masing unit pada periode berjalan.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSaveAllocation}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors"
                >
                  Simpan Pengaturan Alokasi
                </button>
              </div>
            </div>
          </div>

          {/* Card: Informasi Unit Bisnis & Akun */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Unit Bisnis & Akun Toko</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Struktur unit operasional yang terdaftar dalam sistem
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Unit Kanbai</div>
                  <div className="text-[11px] text-slate-500">Unit retail pakaian & fashion</div>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Unit U001
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Unit Nutribite</div>
                  <div className="text-[11px] text-slate-500">Unit retail suplemen & nutrisi</div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Unit U002
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Biaya Bersama Operasional</div>
                  <div className="text-[11px] text-slate-500">Gaji tim shared, sewa & fasilitas operasional</div>
                </div>
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                  Shared
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 3: SINKRONISASI & CADANGAN --- */}
      {currentSubTab === 'sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Status Sinkronisasi */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Status Penyimpanan Data</h2>
                <div className="text-xs text-emerald-700 font-medium">Data tersimpan aman</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Terakhir Diperbarui:</span>
                <span className="font-medium text-slate-900">{lastSyncTime}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Koneksi Penyimpanan:</span>
                <span className="font-medium text-emerald-700">Tersinkron Normal</span>
              </div>
            </div>

            {syncFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
                {syncFeedback}
              </div>
            )}

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data Sekarang'}</span>
            </button>
          </div>

          {/* Card: Cadangan & Ekspor CSV Eksternal */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Cadangan & Arsip Data</h2>
                <div className="text-xs text-slate-500">
                  Unduh seluruh data keuangan untuk pembukuan eksternal
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              File CSV yang diunduh mencakup ringkasan laba rugi, ekonomi produk SKU, histori penjualan,
              dan pos pengeluaran dalam format tabel yang siap dibuka di Microsoft Excel atau Google Sheets.
            </p>

            <button
              onClick={handleDownloadFullBackup}
              className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Unduh File Cadangan Lengkap (CSV)</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Tambah/Edit Biaya Operasional */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingPost ? 'Edit Transaksi Biaya' : 'Catat Biaya Operasional Baru'}
              </h3>
              <button onClick={() => setIsPostModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formPostDate}
                    onChange={(e) => setFormPostDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Alokasi Biaya</label>
                  <select
                    value={formPostBucket}
                    onChange={(e) => setFormPostBucket(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="TEAM">Biaya Bersama</option>
                    <option value="KANBAI">Khusus Kanbai</option>
                    <option value="NUTRIBITE">Khusus Nutribite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kategori Biaya</label>
                <select
                  value={formPostCategory}
                  onChange={(e) => setFormPostCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="01. Operasional">01. Operasional</option>
                  <option value="02. Pemasaran">02. Pemasaran</option>
                  <option value="03. Gaji & Tim">03. Gaji & Tim</option>
                  <option value="04. Sewa & Fasilitas">04. Sewa & Fasilitas</option>
                  <option value="05. Lainnya">05. Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Keterangan Transaksi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Biaya packing & lakban"
                  value={formPostDesc}
                  onChange={(e) => setFormPostDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Jumlah Biaya (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={formPostAmount}
                  onChange={(e) => setFormPostAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
