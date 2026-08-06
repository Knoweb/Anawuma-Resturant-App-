import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

function LiveOrdersQueue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await apiClient.get('/orders', {
        params: { status: '' } // Fetch all, we'll filter in JS or backend
      });
      const activeStatuses = ['NEW', 'ACCEPTED', 'COOKING', 'READY'];
      const activeOrders = response.data.filter(o => activeStatuses.includes(o.status));
      setOrders(activeOrders);
    } catch (error) {
      console.error('Error fetching live orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // In a real app we might want WebSocket integration here for live updates
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, currentStatus) => {
    let newStatus = '';
    if (currentStatus === 'NEW') newStatus = 'ACCEPTED';
    else if (currentStatus === 'ACCEPTED' || currentStatus === 'COOKING') newStatus = 'READY';
    else return;

    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
      Swal.fire({
        icon: 'success',
        title: 'Updated',
        text: `Order status changed to ${newStatus}`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status' });
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'NEW': 'bg-primary',
      'ACCEPTED': 'bg-info',
      'COOKING': 'bg-warning text-dark',
      'READY': 'bg-success'
    };
    return map[status] || 'bg-secondary';
  };

  return (
    <div className="live-orders-queue">
      {loading && <div className="text-center my-4"><div className="spinner-border text-primary"></div></div>}
      {!loading && orders.length === 0 && (
        <div className="alert alert-info text-center">No live orders at the moment.</div>
      )}
      <div className="row g-4 mt-2">
        {orders.map(order => {
          // Check if order only has non-kitchen items
          const hasKitchenItems = order.orderItems?.some(item => {
            const reqCat = item.foodItem?.category?.requiresKitchen;
            const reqMenu = item.foodItem?.menu?.requiresKitchen;
            
            const isCatNoKds = reqCat === false || reqCat === 0 || reqCat === '0' || reqCat === 'false';
            const isMenuNoKds = reqMenu === false || reqMenu === 0 || reqMenu === '0' || reqMenu === 'false';
            
            return !(isCatNoKds || isMenuNoKds);
          });
          
          return (
            <div className="col-md-6 col-lg-4" key={order.orderId}>
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center bg-light">
                  <span className="fw-bold">{order.roomNo ? `Room ${order.roomNo}` : `Table ${order.tableNo}`}</span>
                  <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
                </div>
                <div className="card-body d-flex flex-column">
                  <div className="mb-2 text-muted small">Order #{order.orderNo || order.orderId}</div>
                  <ul className="list-unstyled mb-3">
                    {order.orderItems?.map((item, idx) => (
                      <li key={idx} className="d-flex justify-content-between border-bottom py-1">
                        <span>
                          {item.qty}x {item.itemName} 
                          {(() => {
                            const reqCat = item.foodItem?.category?.requiresKitchen;
                            const reqMenu = item.foodItem?.menu?.requiresKitchen;
                            
                            const isCatNoKds = reqCat === false || reqCat === 0 || reqCat === '0' || reqCat === 'false';
                            const isMenuNoKds = reqMenu === false || reqMenu === 0 || reqMenu === '0' || reqMenu === 'false';
                            
                            return (isCatNoKds || isMenuNoKds) ? (
                              <span className="badge bg-secondary ms-1" style={{fontSize: '0.6rem'}}>Bar</span>
                            ) : null;
                          })()}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!hasKitchenItems && order.status !== 'READY' && (
                    <button 
                      className="btn btn-primary btn-sm w-100 mt-auto"
                      onClick={() => handleUpdateStatus(order.orderId, order.status)}
                    >
                      Mark {order.status === 'NEW' ? 'Accepted' : 'Ready'}
                    </button>
                  )}
                  {hasKitchenItems && order.status !== 'READY' && (
                    <div className="text-muted small text-center mt-auto">
                      <i className="fas fa-fire me-1"></i> Waiting for Kitchen
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LiveOrdersQueue;
