import React, { useState } from 'react';
import {
  Layers,
  Building2,
  Tag,
  FolderTree,
  Store,
  UserCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { DatabaseState, AccountRecord } from '../../types/database';
import { storageService } from '../../services/storageService';
import { determineAccountBucket, normalizeMarketplaceName } from '../../utils/validation';

interface MasterDataHubProps {
  dbState: DatabaseState;
}

export const MasterDataHub: React.FC<MasterDataHubProps> = ({ dbState }) => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'units' | 'brands' | 'categories' | 'marketplaces' | 'pics'>('accounts');

  // Interactive Account Simulator
  const [testAccountInput, setTestAccountInput] = useState('');

  // Add Account Modal
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newIsHistorical, setNewIsHistorical] = useState(false);

  // Add Brand Modal
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Add Category Modal
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState<string | null>(null);

  // Add Marketplace Modal
  const [isAddMktOpen, setIsAddMktOpen] = useState(false);
  const [newMktName, setNewMktName] = useState('');

  // Add PIC Modal
  const [isAddPicOpen, setIsAddPicOpen] = useState(false);
  const [newPicName, setNewPicName] = useState('');
  const [newPicType, setNewPicType] = useState('Operasional');
  const [newPicUnit, setNewPicUnit] = useState<string | null>(null);

  const simulatedBucket = testAccountInput.trim() ? determineAccountBucket(testAccountInput) : null;

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    storageService.addAccount(newAccountName, newIsHistorical);
    setNewAccountName('');
    setNewIsHistorical(false);
    setIsAddAccountOpen(false);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    storageService.addBrand(newBrandName);
    setNewBrandName('');
    setIsAddBrandOpen(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    storageService.addCategory(newCatName, newCatParent);
    setNewCatName('');
    setNewCatParent(null);
    setIsAddCatOpen(false);
  };

  const handleSaveMarketplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMktName.trim()) return;
    storageService.addMarketplace(newMktName);
    setNewMktName('');
    setIsAddMktOpen(false);
  };

  const handleSavePic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPicName.trim()) return;
    storageService.addPic(newPicName, newPicType, newPicUnit);
    setNewPicName('');
    setIsAddPicOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Subtabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Master Data Hub (Sheet 02 - 07)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Konfigurasi master referensi entitas bisnis, pemetaan bucket akun otomatis, dan standardisasi kanal penjualan.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'accounts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>03_ACCOUNT ({dbState.accounts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('units')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'units'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>02_UNIT (2 Unit V1)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('brands')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'brands'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>04_BRAND ({dbState.brands.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('categories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'categories'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>05_CATEGORY ({dbState.categories.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('marketplaces')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'marketplaces'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>06_MARKETPLACE ({dbState.marketplaces.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'pics'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>07_PIC ({dbState.pics.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: 03_ACCOUNT */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          {/* Interactive Account Mapping Tester */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Live Simulator: Account to Bucket Mapping (Section 2 & 16)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Ketik nama akun apa saja untuk melihat deterministik bucket assignment:
                  <span className="font-semibold text-blue-800"> Kanbai → KANBAI</span>,
                  <span className="font-semibold text-emerald-800"> Nutribite → NUTRIBITE</span>,
                  <span className="font-semibold text-purple-800"> Selainnya → TEAM</span>.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={testAccountInput}
                  onChange={(e) => setTestAccountInput(e.target.value)}
                  placeholder="Ketik nama akun (misal: Startoner, Kanbai)..."
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
                {simulatedBucket && (
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      simulatedBucket === 'KANBAI'
                        ? 'bg-blue-600 text-white'
                        : simulatedBucket === 'NUTRIBITE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    → {simulatedBucket}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Accounts List Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Sheet: 03_ACCOUNT (Master Akun & Channel Mapping)
                </h2>
                <span className="text-xs text-slate-500">
                  Historical accounts tidak boleh dihapus dan otomatis menjadi shared pool TEAM.
                </span>
              </div>
              <button
                onClick={() => setIsAddAccountOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Akun</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Account ID</th>
                    <th className="py-3 px-4">Nama Akun Penjualan</th>
                    <th className="py-3 px-4">Bucket Keuangan</th>
                    <th className="py-3 px-4 text-center">Tipe Akun</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbState.accounts.map((acc) => (
                    <tr key={acc.account_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">{acc.account_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{acc.account_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                            acc.bucket === 'KANBAI'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : acc.bucket === 'NUTRIBITE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-purple-100 text-purple-800 border border-purple-300'
                          }`}
                        >
                          {acc.bucket}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {acc.is_historical ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            HISTORICAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            STANDARD
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            acc.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {acc.active ? 'AKTIF' : 'NON-AKTIF'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => storageService.toggleAccountStatus(acc.account_id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {acc.active ? 'Non-aktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: 02_UNIT */}
      {activeSubTab === 'units' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
            <div className="font-bold flex items-center space-x-1.5 text-amber-900 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Aturan Ketat Master Unit (Section 15):</span>
            </div>
            Hanya ada 2 unit bisnis resmi pada V1: <strong>U001 = Kanbai</strong> dan <strong>U002 = Nutribite</strong>.
            TEAM tidak dianggap unit bisnis mandiri, melainkan shared pool alokasi.
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Sheet: 02_UNIT (Resmi V1)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Unit ID</th>
                    <th className="py-3 px-4">Nama Unit Bisnis</th>
                    <th className="py-3 px-4">Peran Dalam Pelaporan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbState.units.map((unit) => (
                    <tr key={unit.unit_id}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{unit.unit_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 text-sm">{unit.unit_name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {unit.unit_id === 'U001'
                          ? 'Unit Bisnis Kanbai (Memiliki P&L Direct + Alokasi Team)'
                          : 'Unit Bisnis Nutribite (Memiliki P&L Direct + Alokasi Team)'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          AKTIF
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: 04_BRAND */}
      {activeSubTab === 'brands' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sheet: 04_BRAND</h2>
              <span className="text-xs text-slate-500">Merek dagang terkelola secara dinamis</span>
            </div>
            <button
              onClick={() => setIsAddBrandOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Brand</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Brand ID</th>
                  <th className="py-3 px-4">Nama Brand</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dbState.brands.map((b) => (
                  <tr key={b.brand_id}>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{b.brand_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{b.brand_name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: 05_CATEGORY */}
      {activeSubTab === 'categories' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sheet: 05_CATEGORY (Hierarki Kategori)</h2>
              <span className="text-xs text-slate-500">Mendukung struktur bertingkat (Parent & Sub Kategori)</span>
            </div>
            <button
              onClick={() => setIsAddCatOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Category ID</th>
                  <th className="py-3 px-4">Nama Kategori</th>
                  <th className="py-3 px-4">Parent Category</th>
                  <th className="py-3 px-4 text-center">Level</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dbState.categories.map((c) => {
                  const parent = dbState.categories.find((p) => p.category_id === c.parent_category_id);
                  return (
                    <tr key={c.category_id}>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">{c.category_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {c.parent_category_id ? `↳ ${c.category_name}` : c.category_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{parent?.category_name || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.parent_category_id
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.parent_category_id ? 'SUB-CATEGORY' : 'PARENT'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          AKTIF
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: 06_MARKETPLACE */}
      {activeSubTab === 'marketplaces' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sheet: 06_MARKETPLACE (Normalisasi Nama)</h2>
              <span className="text-xs text-slate-500">
                Deduplikasi otomatis (misal TikTok & Tiktok disatukan menjadi TikTok) dan Cash channel
              </span>
            </div>
            <button
              onClick={() => setIsAddMktOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kanal</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Marketplace ID</th>
                  <th className="py-3 px-4">Nama Resmi Kanal</th>
                  <th className="py-3 px-4">Normalized Key (Deduplication)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dbState.marketplaces.map((m) => (
                  <tr key={m.marketplace_id}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.marketplace_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{m.marketplace_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 bg-slate-50/50">{m.normalized_name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 6: 07_PIC */}
      {activeSubTab === 'pics' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sheet: 07_PIC (Person In Charge)</h2>
              <span className="text-xs text-slate-500">
                Dimensi pelaporan & posting biaya (bukan penentu Unit/Bucket)
              </span>
            </div>
            <button
              onClick={() => setIsAddPicOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah PIC</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">PIC ID</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Divisi / Tipe</th>
                  <th className="py-3 px-4">Default Unit Terkait</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dbState.pics.map((p) => {
                  const defaultUnit = dbState.units.find((u) => u.unit_id === p.default_unit_id);
                  return (
                    <tr key={p.pic_id}>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">{p.pic_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{p.pic_name}</td>
                      <td className="py-3 px-4 text-slate-600">{p.pic_type}</td>
                      <td className="py-3 px-4">
                        {defaultUnit ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {defaultUnit.unit_name}
                          </span>
                        ) : (
                          <span className="text-slate-400">Umum / Semua Unit</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          AKTIF
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD ACCOUNT */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Tambah Akun Penjualan (03_ACCOUNT)</h2>
              <button onClick={() => setIsAddAccountOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Akun Penjualan *</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="Contoh: Kanbai Official, Toko Startoner, dll"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {newAccountName.trim() && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                  <span className="text-slate-600">Bucket Keuangan Terhitung: </span>
                  <strong className="text-blue-900">{determineAccountBucket(newAccountName)}</strong>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isHistorical"
                  checked={newIsHistorical}
                  onChange={(e) => setNewIsHistorical(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isHistorical" className="text-xs text-slate-700">
                  Akun ini adalah akun lama / Historical (tidak boleh dihapus)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BRAND */}
      {isAddBrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Tambah Brand Baru (04_BRAND)</h2>
              <button onClick={() => setIsAddBrandOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Brand *</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Contoh: LogiTech, Orico, dll"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddBrandOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Simpan Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {isAddCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Tambah Kategori (05_CATEGORY)</h2>
              <button onClick={() => setIsAddCatOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kategori *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: Peralatan Rumah Tangga"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Kategori (Opsional)</label>
                <select
                  value={newCatParent || ''}
                  onChange={(e) => setNewCatParent(e.target.value || null)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Tanpa Parent (Kategori Utama) --</option>
                  {dbState.categories
                    .filter((c) => !c.parent_category_id)
                    .map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MARKETPLACE */}
      {isAddMktOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Tambah Kanal Marketplace (06_MARKETPLACE)</h2>
              <button onClick={() => setIsAddMktOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMarketplace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kanal Marketplace *</label>
                <input
                  type="text"
                  value={newMktName}
                  onChange={(e) => setNewMktName(e.target.value)}
                  placeholder="Contoh: Bukalapak, Zalora, dll"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {newMktName.trim() && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-600">Kunci Normalisasi Otomatis: </span>
                  <strong className="font-mono text-blue-700">{normalizeMarketplaceName(newMktName)}</strong>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddMktOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Simpan Marketplace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PIC */}
      {isAddPicOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Tambah PIC Baru (07_PIC)</h2>
              <button onClick={() => setIsAddPicOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap PIC *</label>
                <input
                  type="text"
                  value={newPicName}
                  onChange={(e) => setNewPicName(e.target.value)}
                  placeholder="Contoh: Rahmat Hidayat"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe / Divisi PIC</label>
                <select
                  value={newPicType}
                  onChange={(e) => setNewPicType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Operasional">Operasional</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Logistik">Logistik</option>
                  <option value="Manajemen">Manajemen</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Unit Asosiasi</label>
                <select
                  value={newPicUnit || ''}
                  onChange={(e) => setNewPicUnit(e.target.value || null)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Umum / Tanpa Unit Khusus --</option>
                  {dbState.units.map((u) => (
                    <option key={u.unit_id} value={u.unit_id}>
                      {u.unit_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddPicOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Simpan PIC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
