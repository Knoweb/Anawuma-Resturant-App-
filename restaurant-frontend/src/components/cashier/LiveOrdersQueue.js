import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

function LiveOrdersQueue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get('/orders', {
        params: { from: today, to: today }
      });
      const activeStatuses = ['NEW', 'ACCEPTED', 'COOKING', 'READY', 'SERVED'];
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
    else if (currentStatus === 'READY') newStatus = 'SERVED';
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
      <div className="d-flex flex-column mt-3 gap-2">
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
            <div className="card shadow-sm" key={order.orderId}>
              <div className="card-body p-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                
                {/* Left Side: Order Info */}
                <div className="d-flex flex-column gap-1" style={{ minWidth: '150px' }}>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold">
                      {String(order.roomNo || order.tableNo).toUpperCase().match(/^(ROOM|TABLE)/) 
                        ? (order.roomNo || order.tableNo) 
                        : (order.roomNo ? `Room ${order.roomNo}` : `Table ${order.tableNo}`)}
                    </span>
                    <span className={`badge ${order.orderType === 'MANUAL_CASHIER' ? 'bg-secondary' : 'bg-primary'}`} style={{fontSize: '0.65rem'}}>
                      {order.orderType === 'MANUAL_CASHIER' ? 'Manual' : 'QR Order'}
                    </span>
                  </div>
                  <div className="text-muted small">Order {order.orderNo || order.orderId}</div>
                </div>

                {/* Middle: Items List */}
                <div className="flex-grow-1 border-start border-end px-md-3">
                  <ul className="list-unstyled mb-0 m-0">
                    {order.orderItems?.map((item, idx) => (
                      <li key={idx} className="d-flex align-items-center py-1 small">
                        <span className="fw-medium me-2">{item.qty}x</span>
                        <span>{item.itemName}</span>
                        {(() => {
                          const reqCat = item.foodItem?.category?.requiresKitchen;
                          const reqMenu = item.foodItem?.menu?.requiresKitchen;
                          const isCatNoKds = reqCat === false || reqCat === 0 || reqCat === '0' || reqCat === 'false';
                          const isMenuNoKds = reqMenu === false || reqMenu === 0 || reqMenu === '0' || reqMenu === 'false';
                          return (isCatNoKds || isMenuNoKds) ? (
                            <span className="badge bg-secondary ms-2" style={{fontSize: '0.6rem'}}>Bar</span>
                          ) : null;
                        })()}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Side: Status & Actions */}
                <div className="d-flex flex-column align-items-end justify-content-center gap-2" style={{ minWidth: '180px' }}>
                  <span className={`badge ${getStatusBadge(order.status)} fs-6 px-3 py-2 w-100`}>{order.status}</span>
                  
                  {!hasKitchenItems && order.status !== 'READY' && order.status !== 'SERVED' && (
                    <div className="text-muted small text-center w-100 border rounded py-1 bg-light">
                      <i className="fas fa-clock me-1 text-info"></i> Waiting Cashier
                    </div>
                  )}
                  
                  {hasKitchenItems && order.status !== 'READY' && order.status !== 'SERVED' && (
                    <div className="text-muted small text-center w-100 border rounded py-1 bg-light">
                      <i className="fas fa-fire me-1 text-warning"></i> Waiting Kitchen
                    </div>
                  )}
                  
                  {order.status === 'SERVED' && (
                    <div className="text-success small fw-bold text-center w-100 border border-success rounded py-1 bg-light">
                      <i className="fas fa-check-circle me-1"></i> Delivered
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
