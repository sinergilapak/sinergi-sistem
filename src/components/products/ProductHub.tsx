import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  Store,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  DatabaseState,
  ProductSkuRecord,
  ProductSpuRecord,
  ProductChannelRecord,
} from '../../types/database';
import { storageService } from '../../services/storageService';
import { formatIDR, formatPercent, validateSkuInput } from '../../utils/validation';

export type ProductsSubTab = 'spu' | 'sku' | 'channel_prices';

interface ProductHubProps {
  dbState: DatabaseState;
  activeSubTab?: ProductsSubTab;
  onSubTabChange?: (tab: ProductsSubTab) => void;
}

export const ProductHub: React.FC<ProductHubProps> = ({
  dbState,
  activeSubTab = 'spu',
  onSubTabChange,
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<ProductsSubTab>(activeSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>('ALL');
  const [mktFilter, setMktFilter] = useState<string>('ALL');

  // Sync prop changes
  React.useEffect(() => {
    if (activeSubTab) {
      setCurrentSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleTabSwitch = (tab: ProductsSubTab) => {
    setCurrentSubTab(tab);
    onSubTabChange?.(tab);
  };

  // Modals state
  const [isSkuModalOpen, setIsSkuModalOpen] = useState(false);
  const [isSpuModalOpen, setIsSpuModalOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  // Edit references
  const [editingSku, setEditingSku] = useState<ProductSkuRecord | null>(null);
  const [editingSpu, setEditingSpu] = useState<ProductSpuRecord | null>(null);
  const [editingChannel, setEditingChannel] = useState<ProductChannelRecord | null>(null);

  // SKU Form States
  const [skuCode, setSkuCode] = useState('');
  const [skuName, setSkuName] = useState('');
  const [skuSpuId, setSkuSpuId] = useState('');
  const [skuBrandId, setSkuBrandId] = useState('');
  const [skuCategoryId, setSkuCategoryId] = useState('');
  const [skuHpp, setSkuHpp] = useState<number>(0);
  const [skuUnitHpp, setSkuUnitHpp] = useState('PCS');
  const [skuErrors, setSkuErrors] = useState<string[]>([]);

  // SPU Form States
  const [spuCode, setSpuCode] = useState('');
  const [spuName, setSpuName] = useState('');
  const [spuBrandId, setSpuBrandId] = useState('');
  const [spuCatId, setSpuCatId] = useState('');
  const [spuDesc, setSpuDesc] = useState('');

  // Channel Price Form States
  const [chanSku, setChanSku] = useState('');
  const [chanUnitId, setChanUnitId] = useState('U001');
  const [chanMktId, setChanMktId] = useState('MKT-SHOPEE');
  const [chanSellingPrice, setChanSellingPrice] = useState<number>(65000);
  const [chanPromoPrice, setChanPromoPrice] = useState<number>(59000);
  const [chanMinPrice, setChanMinPrice] = useState<number>(52000);
  const [chanAdsStatus, setChanAdsStatus] = useState<boolean>(true);

  // SKU Handlers
  const openAddSku = () => {
    setEditingSku(null);
    setSkuCode('');
    setSkuName('');
    const defaultSpu = dbState.spus[0]?.spu_id || '';
    setSkuSpuId(defaultSpu);
    const foundSpu = dbState.spus.find((s) => s.spu_id === defaultSpu);
    setSkuBrandId(foundSpu?.brand_id || dbState.brands[0]?.brand_id || '');
    setSkuCategoryId(foundSpu?.category_id || dbState.categories[0]?.category_id || '');
    setSkuHpp(0);
    setSkuUnitHpp('PCS');
    setSkuErrors([]);
    setIsSkuModalOpen(true);
  };

  const openEditSku = (sku: ProductSkuRecord) => {
    setEditingSku(sku);
    setSkuCode(sku.sku);
    setSkuName(sku.sku_name);
    setSkuSpuId(sku.spu_id);
    setSkuBrandId(sku.brand_id);
    setSkuCategoryId(sku.category_id);
    setSkuHpp(sku.hpp);
    setSkuUnitHpp(sku.unit_hpp || 'PCS');
    setSkuErrors([]);
    setIsSkuModalOpen(true);
  };

  const handleSaveSku = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSkuInput(
      skuCode,
      skuName,
      skuSpuId,
      skuHpp,
      dbState.skus.map((s) => ({ sku: s.sku, product_id: s.product_id })),
      editingSku?.product_id
    );

    if (!validation.isValid) {
      setSkuErrors(validation.errors);
      return;
    }

    if (editingSku) {
      storageService.updateSku(editingSku.product_id, {
        sku: skuCode.trim().toUpperCase(),
        sku_name: skuName.trim(),
        spu_id: skuSpuId,
        brand_id: skuBrandId,
        category_id: skuCategoryId,
        hpp: skuHpp,
        unit_hpp: skuUnitHpp,
      });
    } else {
      storageService.addSku({
        sku: skuCode.trim().toUpperCase(),
        sku_name: skuName.trim(),
        spu_id: skuSpuId,
        brand_id: skuBrandId,
        category_id: skuCategoryId,
        hpp: skuHpp,
        unit_hpp: skuUnitHpp,
        active: true,
        updated_by: 'Admin',
      });
    }
    setIsSkuModalOpen(false);
  };

  const handleDeleteSku = (sku: ProductSkuRecord) => {
    if (confirm(`Hapus SKU ${sku.sku} (${sku.sku_name})?`)) {
      storageService.deleteSku(sku.product_id);
    }
  };

  // SPU Handlers
  const openAddSpu = () => {
    setEditingSpu(null);
    setSpuCode(`SPU-${Date.now().toString().slice(-4)}`);
    setSpuName('');
    setSpuBrandId(dbState.brands[0]?.brand_id || '');
    setSpuCatId(dbState.categories[0]?.category_id || '');
    setSpuDesc('');
    setIsSpuModalOpen(true);
  };

  const openEditSpu = (spu: ProductSpuRecord) => {
    setEditingSpu(spu);
    setSpuCode(spu.spu_id);
    setSpuName(spu.spu_name);
    setSpuBrandId(spu.brand_id);
    setSpuCatId(spu.category_id);
    setSpuDesc(spu.description || '');
    setIsSpuModalOpen(true);
  };

  const handleSaveSpu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spuName.trim()) return;

    if (editingSpu) {
      storageService.updateSpu(editingSpu.spu_id, {
        spu_name: spuName.trim(),
        brand_id: spuBrandId,
        category_id: spuCatId,
        description: spuDesc.trim(),
      });
    } else {
      storageService.addSpu({
        spu_id: spuCode.trim() || `SPU-${Date.now().toString().slice(-4)}`,
        spu_name: spuName.trim(),
        brand_id: spuBrandId,
        category_id: spuCatId,
        description: spuDesc.trim(),
        active: true,
        updated_by: 'Admin',
      });
    }
    setIsSpuModalOpen(false);
  };

  const handleDeleteSpu = (spu: ProductSpuRecord) => {
    const hasSkus = dbState.skus.some((s) => s.spu_id === spu.spu_id);
    if (hasSkus) {
      alert(`Produk ${spu.spu_name} memiliki SKU terhubung. Hapus SKU terlebih dahulu.`);
      return;
    }
    if (confirm(`Hapus produk ${spu.spu_name}?`)) {
      storageService.deleteSpu(spu.spu_id);
    }
  };

  // Channel Price Handlers
  const openAddChannel = () => {
    setEditingChannel(null);
    setChanSku(dbState.skus[0]?.sku || '');
    setChanUnitId('U001');
    setChanMktId('MKT-SHOPEE');
    setChanSellingPrice(65000);
    setChanPromoPrice(59000);
    setChanMinPrice(52000);
    setChanAdsStatus(true);
    setIsChannelModalOpen(true);
  };

  const openEditChannel = (ch: ProductChannelRecord) => {
    setEditingChannel(ch);
    setChanSku(ch.sku);
    setChanUnitId(ch.unit_id);
    setChanMktId(ch.marketplace_id);
    setChanSellingPrice(ch.selling_price);
    setChanPromoPrice(ch.promo_price || ch.selling_price);
    setChanMinPrice(ch.minimum_selling_price || Math.round(ch.selling_price * 0.8));
    setChanAdsStatus(ch.ads_status);
    setIsChannelModalOpen(true);
  };

  const handleSaveChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const skuObj = dbState.skus.find((s) => s.sku === chanSku);
    if (!skuObj) return;

    if (editingChannel) {
      storageService.updateProductChannel(editingChannel.config_id, {
        selling_price: chanSellingPrice,
        promo_price: chanPromoPrice,
        minimum_selling_price: chanMinPrice,
        ads_status: chanAdsStatus,
      });
    } else {
      storageService.addProductChannel({
        sku: chanSku,
        product_id: skuObj.product_id,
        unit_id: chanUnitId,
        marketplace_id: chanMktId,
        selling_price: chanSellingPrice,
        promo_price: chanPromoPrice,
        minimum_selling_price: chanMinPrice,
        ads_status: chanAdsStatus,
        target_margin: 0.2,
        target_roas: 4.0,
        target_cir: 0.25,
        active: true,
        updated_by: 'Admin',
      });
    }
    setIsChannelModalOpen(false);
  };

  const handleDeleteChannel = (ch: ProductChannelRecord) => {
    if (confirm(`Hapus harga marketplace untuk ${ch.sku} di ${ch.marketplace_id}?`)) {
      storageService.deleteProductChannel(ch.config_id);
    }
  };

  // Filtered SKUs
  const filteredSkus = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dbState.skus.filter((s) => {
      const matchQuery =
        !q ||
        s.sku.toLowerCase().includes(q) ||
        s.sku_name.toLowerCase().includes(q) ||
        s.spu_id.toLowerCase().includes(q);
      return matchQuery;
    });
  }, [dbState.skus, searchQuery]);

  // Filtered SPUs
  const filteredSpus = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dbState.spus.filter((s) => {
      const matchQuery =
        !q ||
        s.spu_id.toLowerCase().includes(q) ||
        s.spu_name.toLowerCase().includes(q);
      return matchQuery;
    });
  }, [dbState.spus, searchQuery]);

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dbState.productChannels.filter((c) => {
      const matchUnit = unitFilter === 'ALL' || c.unit_id === unitFilter;
      const matchMkt = mktFilter === 'ALL' || c.marketplace_id === mktFilter;
      const skuObj = dbState.skus.find((s) => s.sku === c.sku);
      const matchQuery =
        !q ||
        c.sku.toLowerCase().includes(q) ||
        (skuObj && skuObj.sku_name.toLowerCase().includes(q));
      return matchUnit && matchMkt && matchQuery;
    });
  }, [dbState.productChannels, unitFilter, mktFilter, searchQuery, dbState.skus]);

  return (
    <div className="space-y-6 pb-6">
      {/* Header & Submenu Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Produk & Katalog Retail
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Daftar produk, varian SKU, biaya modal HPP, dan harga jual marketplace
            </p>
          </div>

          {/* Submenu Segmented Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabSwitch('spu')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'spu'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Produk ({dbState.spus.length})
            </button>
            <button
              onClick={() => handleTabSwitch('sku')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'sku'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SKU & HPP ({dbState.skus.length})
            </button>
            <button
              onClick={() => handleTabSwitch('channel_prices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentSubTab === 'channel_prices'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harga Marketplace ({dbState.productChannels.length})
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {currentSubTab === 'channel_prices' && (
            <div className="flex items-center space-x-2">
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
              >
                <option value="ALL">Semua Unit</option>
                <option value="U001">Kanbai</option>
                <option value="U002">Nutribite</option>
              </select>
              <select
                value={mktFilter}
                onChange={(e) => setMktFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
              >
                <option value="ALL">Semua Kanal</option>
                <option value="MKT-SHOPEE">Shopee</option>
                <option value="MKT-TOKOPEDIA">Tokopedia</option>
                <option value="MKT-TIKTOK">TikTok Shop</option>
                <option value="MKT-LAZADA">Lazada</option>
              </select>
            </div>
          )}

          <div>
            {currentSubTab === 'spu' && (
              <button
                onClick={openAddSpu}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk</span>
              </button>
            )}
            {currentSubTab === 'sku' && (
              <button
                onClick={openAddSku}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah SKU</span>
              </button>
            )}
            {currentSubTab === 'channel_prices' && (
              <button
                onClick={openAddChannel}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Atur Harga Kanal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content for TAB 1: SPU (Daftar Produk) */}
      {currentSubTab === 'spu' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Kode Produk</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Jumlah SKU</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpus.map((spu) => {
                  const skuCount = dbState.skus.filter((s) => s.spu_id === spu.spu_id).length;
                  const brand = dbState.brands.find((b) => b.brand_id === spu.brand_id)?.brand_name || '-';
                  const category = dbState.categories.find((c) => c.category_id === spu.category_id)?.category_name || '-';

                  return (
                    <tr key={spu.spu_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{spu.spu_id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{spu.spu_name}</div>
                        {spu.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{spu.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{brand}</td>
                      <td className="py-3 px-4 text-slate-700">{category}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">{skuCount}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditSpu(spu)}
                          className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Edit Produk"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSpu(spu)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Hapus Produk"
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
      )}

      {/* Content for TAB 2: SKU & HPP */}
      {currentSubTab === 'sku' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Kode SKU</th>
                  <th className="py-3 px-4">Nama Varian SKU</th>
                  <th className="py-3 px-4">Induk Produk</th>
                  <th className="py-3 px-4 text-right">Biaya Modal (HPP)</th>
                  <th className="py-3 px-4 text-center">Satuan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSkus.map((sku) => {
                  const spu = dbState.spus.find((s) => s.spu_id === sku.spu_id);

                  return (
                    <tr key={sku.sku} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{sku.sku}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{sku.sku_name}</td>
                      <td className="py-3 px-4 text-slate-600">{spu?.spu_name || sku.spu_id}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatIDR(sku.hpp)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        {sku.unit_hpp || 'PCS'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditSku(sku)}
                          className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Edit SKU"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSku(sku)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Hapus SKU"
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
      )}

      {/* Content for TAB 3: Harga Marketplace */}
      {currentSubTab === 'channel_prices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">SKU Produk</th>
                  <th className="py-3 px-4">Marketplace</th>
                  <th className="py-3 px-4">Unit Bisnis</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-right">Harga Promo</th>
                  <th className="py-3 px-4 text-right">Margin Kotor</th>
                  <th className="py-3 px-4 text-center">Status Iklan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChannels.map((ch) => {
                  const sku = dbState.skus.find((s) => s.sku === ch.sku);
                  const hpp = sku?.hpp || 0;
                  const grossProfit = ch.selling_price - hpp;
                  const grossMargin = ch.selling_price > 0 ? grossProfit / ch.selling_price : 0;
                  const marketplace = dbState.marketplaces.find((m) => m.marketplace_id === ch.marketplace_id)?.marketplace_name || ch.marketplace_id;
                  const unitName = ch.unit_id === 'U001' ? 'Kanbai' : 'Nutribite';

                  return (
                    <tr key={ch.config_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{ch.sku}</div>
                        <div className="text-[11px] text-slate-500">{sku?.sku_name}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{marketplace}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            ch.unit_id === 'U001'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {unitName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatIDR(ch.selling_price)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatIDR(ch.promo_price || ch.selling_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {formatPercent(grossMargin)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ch.ads_status
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {ch.ads_status ? 'Aktif' : 'Organik'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditChannel(ch)}
                          className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Ubah Harga"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteChannel(ch)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Hapus"
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
      )}

      {/* Modal: Tambah/Edit SKU */}
      {isSkuModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingSku ? 'Edit Varian SKU' : 'Tambah SKU Baru'}
              </h3>
              <button onClick={() => setIsSkuModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {skuErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                {skuErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveSku} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Kode SKU</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: KAN-SKU-001"
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Varian Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kanbai Kemeja Putih L"
                  value={skuName}
                  onChange={(e) => setSkuName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Produk Induk</label>
                <select
                  value={skuSpuId}
                  onChange={(e) => setSkuSpuId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  {dbState.spus.map((spu) => (
                    <option key={spu.spu_id} value={spu.spu_id}>
                      {spu.spu_name} ({spu.spu_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Biaya Modal (HPP)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={skuHpp}
                    onChange={(e) => setSkuHpp(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={skuUnitHpp}
                    onChange={(e) => setSkuUnitHpp(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSkuModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah/Edit SPU */}
      {isSpuModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingSpu ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button onClick={() => setIsSpuModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpu} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kemeja Oxford Pria"
                  value={spuName}
                  onChange={(e) => setSpuName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Brand</label>
                  <select
                    value={spuBrandId}
                    onChange={(e) => setSpuBrandId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    {dbState.brands.map((b) => (
                      <option key={b.brand_id} value={b.brand_id}>
                        {b.brand_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori</label>
                  <select
                    value={spuCatId}
                    onChange={(e) => setSpuCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
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
                <label className="block font-medium text-slate-700 mb-1">Deskripsi Ringkas</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan produk..."
                  value={spuDesc}
                  onChange={(e) => setSpuDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSpuModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah/Edit Harga Marketplace */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingChannel ? 'Edit Harga Marketplace' : 'Atur Harga Marketplace Baru'}
              </h3>
              <button onClick={() => setIsChannelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChannel} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih SKU</label>
                <select
                  disabled={!!editingChannel}
                  value={chanSku}
                  onChange={(e) => setChanSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                >
                  {dbState.skus.map((s) => (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} - {s.sku_name} (HPP: {formatIDR(s.hpp)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit Bisnis</label>
                  <select
                    disabled={!!editingChannel}
                    value={chanUnitId}
                    onChange={(e) => setChanUnitId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                  >
                    <option value="U001">Kanbai</option>
                    <option value="U002">Nutribite</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Marketplace</label>
                  <select
                    disabled={!!editingChannel}
                    value={chanMktId}
                    onChange={(e) => setChanMktId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                  >
                    <option value="MKT-SHOPEE">Shopee</option>
                    <option value="MKT-TOKOPEDIA">Tokopedia</option>
                    <option value="MKT-TIKTOK">TikTok Shop</option>
                    <option value="MKT-LAZADA">Lazada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Harga Jual Normal</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={chanSellingPrice}
                    onChange={(e) => setChanSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Harga Promo</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={chanPromoPrice}
                    onChange={(e) => setChanPromoPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Batas Minimal Harga Promo</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={chanMinPrice}
                  onChange={(e) => setChanMinPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Peringatan otomatis muncul bila harga promo lebih rendah dari batas ini.
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chanAds"
                  checked={chanAdsStatus}
                  onChange={(e) => setChanAdsStatus(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="chanAds" className="text-slate-700">
                  Aktifkan kampanye iklan untuk produk ini
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsChannelModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan Harga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
