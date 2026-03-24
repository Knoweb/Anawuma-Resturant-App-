import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ServiceBillingDashboard from './ServiceBillingDashboard';

const TAB_CONFIG = {
  queue: {
    pageTitle: 'Cashier Queue',
    pageIcon: 'fas fa-cash-register',
  },
  transfers: {
    pageTitle: 'Cashier to Accountant Transfers',
    pageIcon: 'fas fa-share-square',
  },
  history: {
    pageTitle: 'Cashier Invoice History',
    pageIcon: 'fas fa-history',
  },
};

function CashierDashboard() {
  const { tab } = useParams();

  const resolvedTab = useMemo(() => {
    const normalizedTab = (tab || 'queue').toLowerCase();
    return TAB_CONFIG[normalizedTab] ? normalizedTab : 'queue';
  }, [tab]);

  const tabConfig = TAB_CONFIG[resolvedTab];

  return (
    <ServiceBillingDashboard
      pageTitle={tabConfig.pageTitle}
      pageIcon={tabConfig.pageIcon}
      cashierTab={resolvedTab}
    />
  );
}

export default CashierDashboard;
