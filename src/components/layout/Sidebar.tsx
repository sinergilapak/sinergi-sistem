import React from 'react';
import {
  LayoutDashboard,
  Package,
  Calculator,
  TrendingUp,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';

export type MainNavTab = 'dashboard' | 'products' | 'pricing' | 'reports' | 'more';

export type ProductsSubTab = 'spu' | 'sku' | 'channel_prices';
export type PricingSubTab = 'calculator' | 'fees' | 'ads_sim';
export type ReportsSubTab = 'sales' | 'pnl' | 'marketplace_perf';
export type MoreSubTab = 'transactions' | 'settings' | 'sync';

// For backward compatibility with any components expecting NavTab
export type NavTab = MainNavTab | 'finance' | 'channels' | 'team' | 'master' | 'sheets' | 'integrity' | 'settings';

interface SidebarProps {
  currentTab: MainNavTab;
  onSelectTab: (tab: MainNavTab, subTab?: string) => void;
  productsSubTab?: ProductsSubTab;
  pricingSubTab?: PricingSubTab;
  reportsSubTab?: ReportsSubTab;
  moreSubTab?: MoreSubTab;
  onSelectSubTab?: (subTab: string) => void;
  skuCount?: number;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  productsSubTab = 'spu',
  pricingSubTab = 'calculator',
  reportsSubTab = 'pnl',
  moreSubTab = 'transactions',
  onSelectSubTab,
  alertCount = 0,
}) => {
  const navItems: {
    id: MainNavTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: 'red' | 'default';
    submenus: { id: string; label: string }[];
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      sublabel: 'Ringkasan Performa Retail',
      icon: <LayoutDashboard className="w-5 h-5" />,
      submenus: [],
    },
    {
      id: 'products',
      label: 'Produk',
      sublabel: 'Katalog & SKU',
      icon: <Package className="w-5 h-5" />,
      submenus: [
        { id: 'spu', label: 'Daftar Produk' },
        { id: 'sku', label: 'SKU & HPP' },
        { id: 'channel_prices', label: 'Harga Marketplace' },
      ],
    },
    {
      id: 'pricing',
      label: 'Harga & Profit',
      sublabel: 'Kalkulator & Biaya',
      icon: <Calculator className="w-5 h-5" />,
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: 'red',
      submenus: [
        { id: 'calculator', label: 'Kalkulator Harga' },
        { id: 'fees', label: 'Biaya Marketplace' },
        { id: 'ads_sim', label: 'Simulasi Iklan' },
      ],
    },
    {
      id: 'reports',
      label: 'Laporan',
      sublabel: 'Laba Rugi & Penjualan',
      icon: <TrendingUp className="w-5 h-5" />,
      submenus: [
        { id: 'sales', label: 'Penjualan' },
        { id: 'pnl', label: 'Laba Rugi' },
        { id: 'marketplace_perf', label: 'Performa Marketplace' },
      ],
    },
    {
      id: 'more',
      label: 'Lainnya',
      sublabel: 'Data & Pengaturan',
      icon: <MoreHorizontal className="w-5 h-5" />,
      submenus: [
        { id: 'transactions', label: 'Data Transaksi' },
        { id: 'settings', label: 'Pengaturan' },
        { id: 'sync', label: 'Sinkronisasi' },
      ],
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Menu Utama
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const currentSubTab =
              item.id === 'products'
                ? productsSubTab
                : item.id === 'pricing'
                ? pricingSubTab
                : item.id === 'reports'
                ? reportsSubTab
                : item.id === 'more'
                ? moreSubTab
                : '';

            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <div>
                      <div className="leading-tight">{item.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {item.sublabel}
                      </div>
                    </div>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-700">
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Submenu on Desktop for Active Tab */}
                {isActive && item.submenus.length > 0 && (
                  <div className="pl-11 pr-2 py-1 space-y-1 border-l-2 border-blue-100 ml-5 my-1">
                    {item.submenus.map((sub) => {
                      const isSubActive = currentSubTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            if (onSelectSubTab) onSelectSubTab(sub.id);
                            else onSelectTab(item.id, sub.id);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            isSubActive
                              ? 'text-blue-700 font-semibold bg-blue-50/60'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span>{sub.label}</span>
                          {isSubActive && <ChevronRight className="w-3 h-3 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Quiet Business Units Footer */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="px-3 py-2 text-xs text-slate-500 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Unit Retail Aktif
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Kanbai</span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Nutribite</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation: Home | Produk | Harga | Laporan | Lainnya */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-1 py-1 flex items-center justify-around shadow-sm">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-3 py-1 text-xs transition-colors ${
            currentTab === 'dashboard' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => onSelectTab('products')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-3 py-1 text-xs transition-colors ${
            currentTab === 'products' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span>Produk</span>
        </button>
        <button
          onClick={() => onSelectTab('pricing')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-3 py-1 text-xs transition-colors relative ${
            currentTab === 'pricing' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <Calculator className="w-5 h-5 mb-0.5" />
          <span>Harga</span>
          {alertCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500"></span>
          )}
        </button>
        <button
          onClick={() => onSelectTab('reports')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-3 py-1 text-xs transition-colors ${
            currentTab === 'reports' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span>Laporan</span>
        </button>
        <button
          onClick={() => onSelectTab('more')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-3 py-1 text-xs transition-colors ${
            currentTab === 'more' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>Lainnya</span>
        </button>
      </nav>
    </>
  );
};
