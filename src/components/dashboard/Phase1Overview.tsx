import React from 'react';
import { DatabaseState } from '../../types/database';
import { RetailDashboard } from './RetailDashboard';

interface Phase1OverviewProps {
  dbState: DatabaseState;
  onNavigate?: (tab: any, subTab?: string) => void;
}

export const Phase1Overview: React.FC<Phase1OverviewProps> = ({ dbState, onNavigate }) => {
  return (
    <RetailDashboard
      dbState={dbState}
      onNavigateToProducts={(sub) => onNavigate?.('products', sub)}
      onNavigateToPricing={(sub) => onNavigate?.('pricing', sub)}
      onNavigateToReports={(sub) => onNavigate?.('reports', sub)}
      onNavigateToMore={(sub) => onNavigate?.('more', sub)}
    />
  );
};
