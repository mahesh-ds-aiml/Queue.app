import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { StatusBadge } from './StatusBadge';
import { 
  Printer, CheckCircle2, PackageCheck, Download, Plus, Settings as SettingsIcon, 
  BarChart3, Clock, Users, RefreshCw, XCircle, FileText, Check, DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'manual', 'slots', 'settings', 'summary'
  const [queue, setQueue] = useState([]);
  const [slots, setSlots] = useState([]);
  const [settings, setSettings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Manual Walk-In Order State
  const [manualForm, setManualForm] = useState({
    customer_name: '',
    customer_reg: 'Walk-in Student',
    slot_id: null,
    copies: 1,
    page_count: 1,
    is_color: false,
    is_double_sided: false,
    paper_size: 'A4',
    notes: 'Counter Walk-in'
  });

  // Settings Edit State
  const [settingsForm, setSettingsForm] = useState({});

  // Slot Create State
  const [newSlotTime, setNewSlotTime] = useState('');
  const [newSlotMax, setNewSlotMax] = useState(10);

  const fetchAllData = async () => {
    try {
      const [qRes, slotsRes, settingsRes, summaryRes] = await Promise.all([
        apiClient.get('/owner/queue'),
        apiClient.get('/slots'),
        apiClient.get('/settings'),
        apiClient.get('/owner/summary')
      ]);
      setQueue(qRes.data);
      setSlots(slotsRes.data);
      setSettings(settingsRes.data);
      setSettingsForm(settingsRes.data);
      setSummary(summaryRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load owner dashboard data", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000); // 5s polling
    return () => clearInterval(interval);
  }, []);

  // Update status transition
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await apiClient.patch(`/owner/orders/${orderId}/status`, { status: newStatus });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update order status');
    }
  };

  // Submit Walk-in Manual order
  const handleManualOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/owner/manual-order', manualForm);
      alert('Walk-in order created successfully!');
      setManualForm({
        customer_name: '',
        customer_reg: 'Walk-in Student',
        slot_id: null,
        copies: 1,
        page_count: 1,
        is_color: false,
        is_double_sided: false,
        paper_size: 'A4',
        notes: 'Counter Walk-in'
      });
      setActiveTab('queue');
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create manual order');
    }
  };

  // Update Settings
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put('/settings', settingsForm);
      alert('Shop print rates updated!');
      fetchAllData();
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  // Add new Slot
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/slots', { time_range: newSlotTime, max_orders: newSlotMax, is_active: true });
      setNewSlotTime('');
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add slot');
    }
  };

  // Download File
  const handleDownloadFile = (filename, originalName) => {
    window.open(`/api/v1/owner/files/${filename}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                Shop Manager Console
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Campus Print Shop Operations</h1>
          </div>

          <button
            onClick={fetchAllData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Queue</span>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {[
            { id: 'queue', label: 'Live Queue & Printing', icon: Printer, badge: queue.filter(q => q.status !== 'Collected' && q.status !== 'Cancelled').length },
            { id: 'manual', label: 'Walk-in Manual Order', icon: Plus },
            { id: 'slots', label: 'Slot Capacity', icon: Clock },
            { id: 'settings', label: 'Pricing Settings', icon: SettingsIcon },
            { id: 'summary', label: 'Today Summary', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-500 text-white font-extrabold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: LIVE QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Active Order Processing Queue</h2>
            <div className="text-xs text-slate-500">Sorted by pickup slot then time</div>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
              <p className="text-sm font-bold text-slate-600">No active orders in queue!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {queue.map(order => (
                <div key={order.id} className={`bg-white rounded-3xl p-6 border shadow-sm transition-all ${
                  order.status === 'Received' ? 'border-amber-300 ring-2 ring-amber-100' :
                  order.status === 'Printing' ? 'border-blue-400 ring-2 ring-blue-100' :
                  order.status === 'Ready' ? 'border-emerald-300 bg-emerald-50/10' :
                  'border-slate-200 opacity-75'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    
                    {/* Left: Token & Student info */}
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 bg-gradient-to-br from-slate-900 to-indigo-900 text-cyan-400 font-black text-2xl rounded-2xl shadow-sm tracking-tight">
                        {order.token_number}
                      </span>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">{order.user_name}</div>
                        <div className="text-xs text-slate-500">
                          Reg: <span className="font-semibold text-slate-700">{order.user_reg || 'Walk-in'}</span> • Slot: <span className="font-semibold text-indigo-600">{order.slot_time || 'Walk-in'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Price */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Total Price</div>
                        <div className="text-lg font-black text-emerald-600">₹{order.total_price.toFixed(2)}</div>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Files Breakdown & Download Button */}
                  <div className="my-4 space-y-2">
                    <div className="text-xs font-bold text-slate-700">Documents ({order.files.length}):</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {order.files.map(file => (
                        <div key={file.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <div className="font-bold text-slate-900 text-xs truncate">{file.original_name}</div>
                            <div className="text-[11px] text-slate-500">
                              {file.page_count}p × {file.copies} copies • {file.is_color ? 'Color' : 'B&W'} • {file.is_double_sided ? 'Double-sided' : 'Single-sided'} • {file.paper_size} • Range: {file.page_range}
                            </div>
                          </div>
                          {!order.is_manual && (
                            <button
                              onClick={() => handleDownloadFile(file.filename, file.original_name)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex-shrink-0 flex items-center gap-1 shadow-xs"
                              title="Download File for Printing"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Print File</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="text-xs p-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl mb-4 font-medium">
                      ⚠️ Instruction: {order.notes}
                    </div>
                  )}

                  {/* Status Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    {order.status === 'Received' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'Printing')}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Start Printing 🖨</span>
                      </button>
                    )}

                    {(order.status === 'Received' || order.status === 'Printing') && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'Ready')}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Ready for Pickup ✅</span>
                      </button>
                    )}

                    {order.status === 'Ready' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'Collected')}
                        className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Mark Collected 📦</span>
                      </button>
                    )}

                    {order.status !== 'Collected' && order.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'Cancelled')}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANUAL WALK-IN ORDER */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900">Add Manual Walk-In Order</h2>
            <p className="text-xs text-slate-500">For students who come directly to the shop counter</p>
          </div>

          <form onSubmit={handleManualOrderSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={manualForm.customer_name}
                  onChange={e => setManualForm({...manualForm, customer_name: e.target.value})}
                  placeholder="e.g. Walk-in Student"
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Roll / Reg No (Optional)</label>
                <input
                  type="text"
                  value={manualForm.customer_reg}
                  onChange={e => setManualForm({...manualForm, customer_reg: e.target.value})}
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Pages</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualForm.page_count}
                  onChange={e => setManualForm({...manualForm, page_count: parseInt(e.target.value) || 1})}
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Number of Copies</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualForm.copies}
                  onChange={e => setManualForm({...manualForm, copies: parseInt(e.target.value) || 1})}
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Print Color</label>
                <select
                  value={manualForm.is_color ? "color" : "bw"}
                  onChange={e => setManualForm({...manualForm, is_color: e.target.value === "color"})}
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="bw">Black & White</option>
                  <option value="color">Full Color</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sides</label>
                <select
                  value={manualForm.is_double_sided ? "double" : "single"}
                  onChange={e => setManualForm({...manualForm, is_double_sided: e.target.value === "double"})}
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="single">Single-Sided</option>
                  <option value="double">Double-Sided</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Paper Size</label>
                <select
                  value={manualForm.paper_size}
                  onChange={e => setManualForm({...manualForm, paper_size: e.target.value})}
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3 (2x)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Generate Manual Order & Token
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SLOT CAPACITY */}
      {activeTab === 'slots' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-slate-900">Manage Slot Capacity</h2>
          
          <form onSubmit={handleCreateSlot} className="flex gap-3 max-w-md">
            <input
              type="text"
              required
              placeholder="e.g. 05:00 - 06:00 PM"
              value={newSlotTime}
              onChange={e => setNewSlotTime(e.target.value)}
              className="flex-1 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <input
              type="number"
              min="1"
              value={newSlotMax}
              onChange={e => setNewSlotMax(parseInt(e.target.value))}
              className="w-20 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Add Slot
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {slots.map(s => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-extrabold text-slate-900 text-xs">{s.time_range}</div>
                <div className="text-xs text-slate-600">
                  Max Capacity: <span className="font-bold">{s.max_orders} orders</span>
                </div>
                <div className="text-xs text-slate-600">
                  Currently Booked: <span className="font-bold text-blue-600">{s.current_orders} orders</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PRICING SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-6">
          <h2 className="text-xl font-black text-slate-900">Shop Print Rates Configuration</h2>
          
          <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">B&W Single-Sided Rate (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settingsForm.bw_single_rate || ''}
                  onChange={e => setSettingsForm({...settingsForm, bw_single_rate: parseFloat(e.target.value)})}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">B&W Double-Sided Rate per side (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settingsForm.bw_double_rate || ''}
                  onChange={e => setSettingsForm({...settingsForm, bw_double_rate: parseFloat(e.target.value)})}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Color Single-Sided Rate (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settingsForm.color_single_rate || ''}
                  onChange={e => setSettingsForm({...settingsForm, color_single_rate: parseFloat(e.target.value)})}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Color Double-Sided Rate per side (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settingsForm.color_double_rate || ''}
                  onChange={e => setSettingsForm({...settingsForm, color_double_rate: parseFloat(e.target.value)})}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">A3 Multiplier (e.g. 2.0x)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settingsForm.a3_multiplier || ''}
                  onChange={e => setSettingsForm({...settingsForm, a3_multiplier: parseFloat(e.target.value)})}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Est. Print Seconds / Page</label>
                <input
                  type="number"
                  step="0.5"
                  value={settingsForm.seconds_per_page || ''}
                  onChange={e => setSettingsForm({...settingsForm, seconds_per_page: parseFloat(e.target.value)})}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
            >
              Save Pricing Settings
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: TODAY SUMMARY ANALYTICS */}
      {activeTab === 'summary' && summary && (
        <div className="space-y-6">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-6 rounded-3xl shadow-md">
              <div className="text-xs text-blue-300 font-bold uppercase tracking-wider">Today's Orders</div>
              <div className="text-4xl font-black text-white mt-2">{summary.today_orders}</div>
              <div className="text-xs text-blue-200 mt-1">Confirmed student & walk-in orders</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-6 rounded-3xl shadow-md">
              <div className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Today's Revenue</div>
              <div className="text-4xl font-black text-emerald-400 mt-2">₹{summary.today_revenue.toFixed(2)}</div>
              <div className="text-xs text-emerald-200 mt-1">Gross shop earnings today</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-md">
              <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Pages Printed</div>
              <div className="text-4xl font-black text-cyan-400 mt-2">{summary.today_pages}</div>
              <div className="text-xs text-indigo-200 mt-1">Total physical sheets output</div>
            </div>

          </div>

          {/* Hourly Distribution Bar Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900">Orders Distribution per Hour</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.hourly_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="orders" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
