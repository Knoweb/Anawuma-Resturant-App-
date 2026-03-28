import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Bootstrap and Font Awesome imports
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { WebSocketProvider } from './hooks/useWebSocket';
import { NotificationProvider } from './components/common/NotificationToast';

// Configure React Query with caching for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
      cacheTime: 10 * 60 * 1000, // Cache duration 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      retry: 1, // Retry failed requests once
    },
  },
});

// Fix: SweetAlert2 sets aria-hidden="true" on #root when a dialog opens.
// If any element inside #root still has focus, the browser logs an accessibility
// warning. This observer blurs the active element before aria-hidden takes effect.
const rootEl = document.getElementById('root');
if (rootEl) {
  const ariaHiddenObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.attributeName === 'aria-hidden' &&
        rootEl.getAttribute('aria-hidden') === 'true' &&
        document.activeElement &&
        document.activeElement !== document.body &&
        rootEl.contains(document.activeElement)
      ) {
        document.activeElement.blur();
      }
    });
  });
  ariaHiddenObserver.observe(rootEl, { attributes: true, attributeFilter: ['aria-hidden'] });
}

const root = ReactDOM.createRoot(rootEl || document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
