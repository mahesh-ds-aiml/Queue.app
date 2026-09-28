import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { StatusBadge } from './StatusBadge';
import { OrderProgressSteps } from './OrderProgressSteps';
import { QRCodeModal } from './QRCodeModal';
import { Clock, QrCode, FileText, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

export const MyOrders = ({ activeOrderFromCreated }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderForQR, setSelectedOrderForQR] = useState(activeOrderFromCreated || null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/orders/my');
      setOrders(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching my orders", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // 5s polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeOrderFromCreated) {
      setSelectedOrderForQR(activeOrderFromCreated);
    }
  }, [activeOrderFromCreated]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      await apiClient.post(`/orders/${orderId}/cancel`);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Print Queue Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Realtime order tracking with automatic 5s status updates
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-xs text-slate-500 mt-3 font-semibold">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't placed any print orders yet. Click "New Order" to submit your documents!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
              
              {/* Top Bar: Token & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 bg-gradient-to-br from-blue-900 to-slate-900 text-cyan-400 font-black text-lg rounded-xl shadow-xs tracking-tight">
                    {order.token_number}
                  </span>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">
                      Slot: {order.slot_time || 'General Queue'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Placed: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  
                  {order.status !== 'Cancelled' && (
                    <button
                      onClick={() => setSelectedOrderForQR(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Pass</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Order Status Timeline Bar */}
              <OrderProgressSteps status={order.status} />

              {/* Document Summary Matrix */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Files ({order.files.length}):</span>
                </div>
                <div className="divide-y divide-slate-200/60">
                  {order.files.map((file) => (
                    <div key={file.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="font-bold text-slate-900">{file.original_name}</span>
                        <span className="text-slate-500 text-[11px] ml-2">
                          ({file.page_count} pages × {file.copies} copies • {file.is_color ? 'Color' : 'B&W'} • {file.is_double_sided ? 'Double-sided' : 'Single-sided'} • {file.paper_size})
                        </span>
                      </div>
                      <span className="font-semibold text-slate-800">₹{file.file_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer: Price & Actions */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div>
                  <span className="text-slate-500">Total Price: </span>
                  <span className="text-base font-black text-emerald-600">₹{order.total_price.toFixed(2)}</span>
                </div>

                {order.status === 'Received' && (
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={cancellingId === order.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* QR Code Pass Modal */}
      <QRCodeModal
        isOpen={!!selectedOrderForQR}
        onClose={() => setSelectedOrderForQR(null)}
        order={selectedOrderForQR}
      />

    </div>
  );
};
