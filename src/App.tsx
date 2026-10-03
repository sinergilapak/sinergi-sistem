import React, { useState, useEffect } from 'react';
import { DatabaseState } from './types/database';
import { storageService } from './services/storageService';
import { Navbar } from './components/layout/Navbar';
import {
  Sidebar,
  MainNavTab,
  ProductsSubTab,
  PricingSubTab,
  ReportsSubTab,
  MoreSubTab,
} from './components/layout/Sidebar';
import { RetailDashboard } from './components/dashboard/RetailDashboard';
import { ProductHub } from './components/products/ProductHub';
import { PricingAndProfitHub } from './components/pricing/PricingAndProfitHub';
import { ReportsHub } from './components/reports/ReportsHub';
import { MoreHub } from './components/more/MoreHub';
import { scanProfitMarginAlerts } from './utils/alertEngine';

export default function App() {
  const [dbState, setDbState] = useState<DatabaseState>(storageService.getState());
  const [currentTab, setCurrentTab] = useState<MainNavTab>('dashboard');

  // Sub-tabs state
  const [productsSubTab, setProductsSubTab] = useState<ProductsSubTab>('spu');
  const [pricingSubTab, setPricingSubTab] = useState<PricingSubTab>('calculator');
  const [reportsSubTab, setReportsSubTab] = useState<ReportsSubTab>('pnl');
  const [moreSubTab, setMoreSubTab] = useState<MoreSubTab>('transactions');

  const marginAlerts = scanProfitMarginAlerts(dbState);

  useEffect(() => {
    const unsubscribe = storageService.subscribe((newState) => {
      setDbState(newState);
    });
    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setDbState({ ...storageService.getState() });
  };

  const handleSelectTab = (tab: MainNavTab, subTab?: string) => {
    setCurrentTab(tab);
    if (subTab) {
      if (tab === 'products') setProductsSubTab(subTab as ProductsSubTab);
      if (tab === 'pricing') setPricingSubTab(subTab as PricingSubTab);
      if (tab === 'reports') setReportsSubTab(subTab as ReportsSubTab);
      if (tab === 'more') setMoreSubTab(subTab as MoreSubTab);
    }
  };

  const handleSelectSubTab = (subTab: string) => {
    if (currentTab === 'products') setProductsSubTab(subTab as ProductsSubTab);
    if (currentTab === 'pricing') setPricingSubTab(subTab as PricingSubTab);
    if (currentTab === 'reports') setReportsSubTab(subTab as ReportsSubTab);
    if (currentTab === 'more') setMoreSubTab(subTab as MoreSubTab);
  };

  // Quick navigation handlers from Navbar
  const handleNavToAlerts = () => {
    setPricingSubTab('calculator');
    setCurrentTab('pricing');
  };

  const handleNavToDataStatus = () => {
    setMoreSubTab('sync');
    setCurrentTab('more');
  };

  const handleNavToSync = () => {
    setMoreSubTab('sync');
    setCurrentTab('more');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-900">
      {/* Top Navbar */}
      <Navbar
        dbState={dbState}
        onRefresh={handleRefresh}
        onNavigateToDataStatus={handleNavToDataStatus}
        onNavigateToSync={handleNavToSync}
        onNavigateToAlerts={handleNavToAlerts}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar & Mobile Bottom Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          productsSubTab={productsSubTab}
          pricingSubTab={pricingSubTab}
          reportsSubTab={reportsSubTab}
          moreSubTab={moreSubTab}
          onSelectSubTab={handleSelectSubTab}
          skuCount={dbState.skus.length}
          alertCount={marginAlerts.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <RetailDashboard
              dbState={dbState}
              onNavigateToProducts={(sub) => {
                if (sub) setProductsSubTab(sub as ProductsSubTab);
                setCurrentTab('products');
              }}
              onNavigateToPricing={(sub) => {
                if (sub) setPricingSubTab(sub as PricingSubTab);
                setCurrentTab('pricing');
              }}
              onNavigateToReports={(sub) => {
                if (sub) setReportsSubTab(sub as ReportsSubTab);
                setCurrentTab('reports');
              }}
              onNavigateToMore={(sub) => {
                if (sub) setMoreSubTab(sub as MoreSubTab);
                setCurrentTab('more');
              }}
            />
          )}

          {currentTab === 'products' && (
            <ProductHub
              dbState={dbState}
              activeSubTab={productsSubTab}
              onSubTabChange={setProductsSubTab}
            />
          )}

          {currentTab === 'pricing' && (
            <PricingAndProfitHub
              dbState={dbState}
              activeSubTab={pricingSubTab}
              onSubTabChange={setPricingSubTab}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsHub
              dbState={dbState}
              activeSubTab={reportsSubTab}
              onSubTabChange={setReportsSubTab}
            />
          )}

          {currentTab === 'more' && (
            <MoreHub
              dbState={dbState}
              activeSubTab={moreSubTab}
              onSubTabChange={setMoreSubTab}
            />
          )}
        </main>
      </div>
    </div>
  );
}
