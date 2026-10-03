import React, { useState } from 'react';
import {
  Package,
  Layers,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { DatabaseState, ProductSkuRecord, ProductSpuRecord } from '../../types/database';
import { storageService } from '../../services/storageService';
import { formatIDR, validateSkuInput } from '../../utils/validation';

interface SpuSkuManagerProps {
  dbState: DatabaseState;
}

export const SpuSkuManager: React.FC<SpuSkuManagerProps> = ({ dbState }) => {
  const [activeTab, setActiveTab] = useState<'sku' | 'spu'>('sku');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal States
  const [isSkuModalOpen, setIsSkuModalOpen] = useState(false);
  const [isSpuModalOpen, setIsSpuModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<ProductSkuRecord | null>(null);
  const [editingSpu, setEditingSpu] = useState<ProductSpuRecord | null>(null);

  // Form states for SKU
  const [formSkuCode, setFormSkuCode] = useState('');
  const [formSkuName, setFormSkuName] = useState('');
  const [formSpuId, setFormSpuId] = useState('');
  const [formBrandId, setFormBrandId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formHpp, setFormHpp] = useState<number>(0);
  const [formUnitHpp, setFormUnitHpp] = useState('PCS');
  const [skuErrors, setSkuErrors] = useState<string[]>([]);

  // Form states for SPU
  const [formSpuCode, setFormSpuCode] = useState('');
  const [formSpuName, setFormSpuName] = useState('');
  const [formSpuBrandId, setFormSpuBrandId] = useState('');
  const [formSpuCatId, setFormSpuCatId] = useState('');
  const [formSpuDesc, setFormSpuDesc] = useState('');
  const [spuError, setSpuError] = useState<string | null>(null);

  // SPU change cascades default brand & category
  const handleSpuSelectionChange = (spuId: string) => {
    setFormSpuId(spuId);
    const foundSpu = dbState.spus.find((s) => s.spu_id === spuId);
    if (foundSpu) {
      setFormBrandId(foundSpu.brand_id);
      setFormCategoryId(foundSpu.category_id);
    }
  };

  const openAddSkuModal = () => {
    setEditingSku(null);
    setFormSkuCode('');
    setFormSkuName('');
    const defaultSpu = dbState.spus[0]?.spu_id || '';
    setFormSpuId(defaultSpu);
    const foundSpu = dbState.spus.find((s) => s.spu_id === defaultSpu);
    setFormBrandId(foundSpu?.brand_id || dbState.brands[0]?.brand_id || '');
    setFormCategoryId(foundSpu?.category_id || dbState.categories[0]?.category_id || '');
    setFormHpp(0);
    setFormUnitHpp('PCS');
    setSkuErrors([]);
    setIsSkuModalOpen(true);
  };

  const openEditSkuModal = (sku: ProductSkuRecord) => {
    setEditingSku(sku);
    setFormSkuCode(sku.sku);
    setFormSkuName(sku.sku_name);
    setFormSpuId(sku.spu_id);
    setFormBrandId(sku.brand_id);
    setFormCategoryId(sku.category_id);
    setFormHpp(sku.hpp);
    setFormUnitHpp(sku.unit_hpp || 'PCS');
    setSkuErrors([]);
    setIsSkuModalOpen(true);
  };

  const handleSaveSku = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSkuInput(
      formSkuCode,
      formSkuName,
      formSpuId,
      formHpp,
      dbState.skus.map((s) => ({ sku: s.sku, product_id: s.product_id })),
      editingSku?.product_id
    );

    if (!validation.isValid) {
      setSkuErrors(validation.errors);
      return;
    }

    if (editingSku) {
      const res = storageService.updateSku(editingSku.product_id, {
        sku: formSkuCode,
        sku_name: formSkuName,
        spu_id: formSpuId,
        brand_id: formBrandId,
        category_id: formCategoryId,
        hpp: Number(formHpp),
        unit_hpp: formUnitHpp,
        updated_by: 'Admin',
      });
      if (!res.success) {
        setSkuErrors([res.error || 'Gagal mengubah SKU']);
        return;
      }
    } else {
      const res = storageService.addSku({
        sku: formSkuCode,
        sku_name: formSkuName,
        spu_id: formSpuId,
        brand_id: formBrandId,
        category_id: formCategoryId,
        hpp: Number(formHpp),
        unit_hpp: formUnitHpp,
        active: true,
        updated_by: 'Admin',
      });
      if (!res.success) {
        setSkuErrors([res.error || 'Gagal menambah SKU']);
        return;
      }
    }

    setIsSkuModalOpen(false);
  };

  const openAddSpuModal = () => {
    setEditingSpu(null);
    const nextNum = dbState.spus.length + 1;
    setFormSpuCode(`SPU-MOD-${String(nextNum).padStart(3, '0')}`);
    setFormSpuName('');
    setFormSpuBrandId(dbState.brands[0]?.brand_id || '');
    setFormSpuCatId(dbState.categories[0]?.category_id || '');
    setFormSpuDesc('');
    setSpuError(null);
    setIsSpuModalOpen(true);
  };

  const openEditSpuModal = (spu: ProductSpuRecord) => {
    setEditingSpu(spu);
    setFormSpuCode(spu.spu_id);
    setFormSpuName(spu.spu_name);
    setFormSpuBrandId(spu.brand_id);
    setFormSpuCatId(spu.category_id);
    setFormSpuDesc(spu.description);
    setSpuError(null);
    setIsSpuModalOpen(true);
  };

  const handleSaveSpu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSpuName.trim()) {
      setSpuError('Nama SPU harus diisi');
      return;
    }

    if (editingSpu) {
      storageService.updateSpu(editingSpu.spu_id, {
        spu_name: formSpuName.trim(),
        brand_id: formSpuBrandId,
        category_id: formSpuCatId,
        description: formSpuDesc.trim(),
        updated_by: 'Admin',
      });
    } else {
      storageService.addSpu({
        spu_id: formSpuCode.trim().toUpperCase(),
        spu_name: formSpuName.trim(),
        brand_id: formSpuBrandId,
        category_id: formSpuCatId,
        description: formSpuDesc.trim(),
        active: true,
        updated_by: 'Admin',
      });
    }

    setIsSpuModalOpen(false);
  };

  const handleDeleteSpu = (spuId: string) => {
    if (confirm(`Yakin ingin menghapus SPU ${spuId}?`)) {
      const res = storageService.deleteSpu(spuId);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  const handleDeleteSku = (productId: string, skuCode: string) => {
    if (confirm(`Hapus SKU "${skuCode}"? Tindakan ini tidak dapat dibatalkan.`)) {
      storageService.deleteSku(productId);
    }
  };

  // Filtered SKUs
  const filteredSkus = dbState.skus.filter((sku) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      sku.sku.toLowerCase().includes(query) ||
      sku.sku_name.toLowerCase().includes(query) ||
      sku.spu_id.toLowerCase().includes(query);
    const matchesBrand = selectedBrand === 'ALL' || sku.brand_id === selectedBrand;
    const matchesCategory = selectedCategory === 'ALL' || sku.category_id === selectedCategory;
    return matchesQuery && matchesBrand && matchesCategory;
  });

  // Filtered SPUs
  const filteredSpus = dbState.spus.filter((spu) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      spu.spu_id.toLowerCase().includes(query) ||
      spu.spu_name.toLowerCase().includes(query) ||
      spu.description.toLowerCase().includes(query);
    const matchesBrand = selectedBrand === 'ALL' || spu.brand_id === selectedBrand;
    const matchesCategory = selectedCategory === 'ALL' || spu.category_id === selectedCategory;
    return matchesQuery && matchesBrand && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Master SPU & SKU Produk (Section 11-13)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hierarki model produk: SPU (Product Family) memayungi beberapa SKU (Sellable Variant). HPP dikelola pada level SKU.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('sku')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'sku'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Daftar SKU ({dbState.skus.length})
            </button>
            <button
              onClick={() => setActiveTab('spu')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'spu'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Model SPU ({dbState.spus.length})
            </button>
          </div>
        </div>

        {/* Search & Action Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'sku' ? 'Cari kode SKU atau nama...' : 'Cari kode SPU atau model...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Brand</option>
                {dbState.brands.map((b) => (
                  <option key={b.brand_id} value={b.brand_id}>
                    {b.brand_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Kategori</option>
                {dbState.categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'sku' ? (
              <button
                onClick={openAddSkuModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah SKU Baru</span>
              </button>
            ) : (
              <button
                onClick={openAddSpuModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Model SPU</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: SKU Table or SPU Table */}
      {activeTab === 'sku' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Sheet: 09_PRODUCT_SKU (Sellable Variants & HPP)
            </h2>
            <span className="text-xs text-slate-500">
              Menampilkan {filteredSkus.length} dari {dbState.skus.length} SKU
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Nama Produk SKU</th>
                  <th className="py-3 px-4">Model SPU</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">HPP Dasar</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSkus.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada data SKU yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredSkus.map((sku) => {
                    const spu = dbState.spus.find((s) => s.spu_id === sku.spu_id);
                    const brand = dbState.brands.find((b) => b.brand_id === sku.brand_id);
                    const category = dbState.categories.find((c) => c.category_id === sku.category_id);

                    return (
                      <tr key={sku.product_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{sku.sku}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          <div>{sku.sku_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {sku.product_id}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-medium">{spu?.spu_name || sku.spu_id}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{sku.spu_id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                            {brand?.brand_name || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{category?.category_name || 'N/A'}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatIDR(sku.hpp)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">/{sku.unit_hpp}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            AKTIF
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => openEditSkuModal(sku)}
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit SKU & HPP"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSku(sku.product_id, sku.sku)}
                              className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus SKU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SPU Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Sheet: 08_PRODUCT_SPU (Standard Product Unit / Family)
            </h2>
            <span className="text-xs text-slate-500">
              Menampilkan {filteredSpus.length} dari {dbState.spus.length} SPU
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">SPU Code</th>
                  <th className="py-3 px-4">Nama Model SPU</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Kategori Induk</th>
                  <th className="py-3 px-4">Deskripsi Model</th>
                  <th className="py-3 px-4 text-center">Jumlah SKU</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpus.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada data SPU yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredSpus.map((spu) => {
                    const brand = dbState.brands.find((b) => b.brand_id === spu.brand_id);
                    const category = dbState.categories.find((c) => c.category_id === spu.category_id);
                    const childSkus = dbState.skus.filter((s) => s.spu_id === spu.spu_id);

                    return (
                      <tr key={spu.spu_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{spu.spu_id}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{spu.spu_name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                            {brand?.brand_name || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{category?.category_name || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{spu.description || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {childSkus.length} SKU Varian
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => openEditSpuModal(spu)}
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit SPU"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSpu(spu.spu_id)}
                              className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus SPU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SPU to SKU Family Relationship Demonstration Card */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Verifikasi Relasi SPU vs SKU (Contoh Master Data)</span>
        </div>
        <p className="text-xs text-slate-600">
          Sesuai aturan bisnis Section 12-13: 1 SPU dapat memayungi $N$ SKU. HPP disimpan eksklusif pada SKU varian.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {dbState.spus.slice(0, 2).map((spu) => {
            const children = dbState.skus.filter((s) => s.spu_id === spu.spu_id);
            return (
              <div key={spu.spu_id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-mono font-bold text-blue-700">{spu.spu_id}</span>
                    <h3 className="text-xs font-bold text-slate-900">{spu.spu_name}</h3>
                  </div>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">
                    {children.length} Varian SKU
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {children.map((child) => (
                    <div
                      key={child.product_id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50 border border-slate-100"
                    >
                      <span className="font-mono font-medium text-slate-800">{child.sku}</span>
                      <span className="text-slate-500 truncate max-w-[120px]">{child.sku_name}</span>
                      <span className="font-semibold text-slate-900">{formatIDR(child.hpp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: ADD / EDIT SKU */}
      {isSkuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingSku ? 'Edit Data SKU & HPP' : 'Tambah SKU Baru (09_PRODUCT_SKU)'}
              </h2>
              <button
                onClick={() => setIsSkuModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {skuErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                <div className="font-semibold flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Validasi Gagal:</span>
                </div>
                <ul className="list-disc list-inside pl-1 space-y-0.5">
                  {skuErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSaveSku} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode SKU (Wajib Unik) *
                  </label>
                  <input
                    type="text"
                    value={formSkuCode}
                    onChange={(e) => setFormSkuCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: E003BK"
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model SPU Induk *
                  </label>
                  <select
                    value={formSpuId}
                    onChange={(e) => handleSpuSelectionChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {dbState.spus.map((s) => (
                      <option key={s.spu_id} value={s.spu_id}>
                        {s.spu_id} - {s.spu_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Item SKU *
                </label>
                <input
                  type="text"
                  value={formSkuName}
                  onChange={(e) => setFormSkuName(e.target.value)}
                  placeholder="Contoh: Toner Cartridge E003 Black"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                  <select
                    value={formBrandId}
                    onChange={(e) => setFormBrandId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dbState.brands.map((b) => (
                      <option key={b.brand_id} value={b.brand_id}>
                        {b.brand_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dbState.categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HPP Dasar (IDR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formHpp}
                    onChange={(e) => setFormHpp(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{formatIDR(formHpp)}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan HPP</label>
                  <select
                    value={formUnitHpp}
                    onChange={(e) => setFormUnitHpp(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="BTL">BTL (Botol)</option>
                    <option value="BOX">BOX</option>
                    <option value="SET">SET</option>
                    <option value="PACK">PACK</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSkuModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  Simpan SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SPU */}
      {isSpuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingSpu ? 'Edit Model SPU' : 'Tambah Model SPU Baru (08_PRODUCT_SPU)'}
              </h2>
              <button
                onClick={() => setIsSpuModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {spuError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{spuError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSpu} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode SPU (Family ID) *
                </label>
                <input
                  type="text"
                  value={formSpuCode}
                  disabled={!!editingSpu}
                  onChange={(e) => setFormSpuCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: SPU-STT-E003"
                  className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Model / Seri SPU *
                </label>
                <input
                  type="text"
                  value={formSpuName}
                  onChange={(e) => setFormSpuName(e.target.value)}
                  placeholder="Contoh: Toner Cartridge E003 Series"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                  <select
                    value={formSpuBrandId}
                    onChange={(e) => setFormSpuBrandId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dbState.brands.map((b) => (
                      <option key={b.brand_id} value={b.brand_id}>
                        {b.brand_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Induk</label>
                  <select
                    value={formSpuCatId}
                    onChange={(e) => setFormSpuCatId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dbState.categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi SPU</label>
                <textarea
                  rows={2}
                  value={formSpuDesc}
                  onChange={(e) => setFormSpuDesc(e.target.value)}
                  placeholder="Catatan model atau spesifikasi..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSpuModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  Simpan SPU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
