import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, FileText, CheckCircle, Trash2, Plus, Minus, Settings, Clock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export const NewOrderForm = ({ onOrderCreated, onOpenAuthModal }) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [filesList, setFilesList] = useState([]); // [{ file, options, estimatedPages, estimatedPrice }]
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch Slots and Pricing Settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [slotsRes, settingsRes] = await Promise.all([
          apiClient.get('/slots'),
          apiClient.get('/settings')
        ]);
        const activeSlots = slotsRes.data.filter(s => s.is_active);
        setSlots(activeSlots);
        setShopSettings(settingsRes.data);

        // Auto select first available slot
        const available = activeSlots.find(s => s.current_orders < s.max_orders);
        if (available) {
          setSelectedSlotId(available.id);
        }
      } catch (err) {
        console.error("Failed to load setup options", err);
      }
    };
    fetchData();
  }, []);

  // Calculate price for a single file configuration
  const calculateEstimatedPrice = (fileObj) => {
    if (!shopSettings) return 0;
    const { options, estimatedPages } = fileObj;
    
    // Parse range
    let pagesToPrint = estimatedPages;
    if (options.page_range && options.page_range.toLowerCase() !== 'all') {
      const parts = options.page_range.split(',');
      let count = 0;
      parts.forEach(p => {
        if (p.includes('-')) {
          const [s, e] = p.split('-').map(Number);
          if (s && e && e >= s) count += (e - s + 1);
        } else if (Number(p)) {
          count += 1;
        }
      });
      if (count > 0 && count <= estimatedPages) pagesToPrint = count;
    }

    let rate = 0;
    if (options.is_color) {
      rate = options.is_double_sided ? shopSettings.color_double_rate : shopSettings.color_single_rate;
    } else {
      rate = options.is_double_sided ? shopSettings.bw_double_rate : shopSettings.bw_single_rate;
    }

    if (options.paper_size === 'A3') {
      rate *= shopSettings.a3_multiplier;
    }

    return roundTo2(pagesToPrint * options.copies * rate);
  };

  const roundTo2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  // File Upload Selection Handler
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    const validExtensions = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
    const newItems = [];

    selectedFiles.forEach((file) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(ext)) {
        setError(`File format ${ext} is not supported. Please upload PDF, DOCX, JPG, or PNG.`);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`File ${file.name} exceeds maximum 20MB limit.`);
        return;
      }

      // Default page count estimate (for PDFs browser cannot read binary directly, fallback 1; backend will count exact)
      let defaultPages = 1;
      const initialOptions = {
        copies: 1,
        is_color: false,
        is_double_sided: false,
        paper_size: 'A4',
        page_range: 'all',
        orientation: 'portrait'
      };

      const newItem = {
        file,
        options: initialOptions,
        estimatedPages: defaultPages,
      };
      newItem.estimatedPrice = calculateEstimatedPrice(newItem);
      newItems.push(newItem);
    });

    setFilesList(prev => [...prev, ...newItems]);
    setError('');
  };

  const updateFileOption = (index, key, value) => {
    setFilesList(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        options: {
          ...updated[index].options,
          [key]: value
        }
      };
      updated[index].estimatedPrice = calculateEstimatedPrice(updated[index]);
      return updated;
    });
  };

  const removeFile = (index) => {
    setFilesList(prev => prev.filter((_, i) => i !== index));
  };

  const calculateGrandTotal = () => {
    return roundTo2(filesList.reduce((sum, item) => sum + item.estimatedPrice, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }
    if (!filesList.length) {
      setError('Please attach at least one document to print.');
      return;
    }
    if (!selectedSlotId) {
      setError('Please select an available pickup time slot.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('slot_id', selectedSlotId);
      if (notes) formData.append('notes', notes);

      const optionsArray = filesList.map(item => item.options);
      formData.append('options', JSON.stringify(optionsArray));

      filesList.forEach(item => {
        formData.append('files', item.file);
      });

      const res = await apiClient.post('/orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setLoading(false);
      setFilesList([]);
      setNotes('');
      if (onOrderCreated) {
        onOrderCreated(res.data);
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.detail || 'Failed to submit order. Please check slot availability.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Mobile Print Station</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Upload Documents & Select Print Options</h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-xl">
            Choose print sides, color preference, and pickup slot. Collect directly at the counter when your token status shows <span className="text-cyan-400 font-bold">Ready</span>.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. File Upload Dropzone */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            <span>1. Upload Files (PDF, DOCX, JPG, PNG - Max 20MB)</span>
          </h2>

          <div className="relative border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl p-6 sm:p-8 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer group">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                Click to browse or drag & drop files here
              </div>
              <div className="text-[11px] text-slate-500">
                Supports PDF (auto-detected pages), DOCX, JPG & PNG images up to 20 MB each
              </div>
            </div>
          </div>

          {/* Uploaded Files Options Breakdown */}
          {filesList.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Configured Files ({filesList.length})
              </div>

              {filesList.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 relative">
                  
                  {/* File Info Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.file.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Options Matrix Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                    
                    {/* Copies */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Copies</label>
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden w-24">
                        <button
                          type="button"
                          onClick={() => updateFileOption(idx, 'copies', Math.max(1, item.options.copies - 1))}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="flex-1 text-center font-bold">{item.options.copies}</span>
                        <button
                          type="button"
                          onClick={() => updateFileOption(idx, 'copies', item.options.copies + 1)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Color / B&W */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Print Mode</label>
                      <button
                        type="button"
                        onClick={() => updateFileOption(idx, 'is_color', !item.options.is_color)}
                        className={`w-full py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                          item.options.is_color 
                            ? 'bg-purple-50 text-purple-700 border-purple-300' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.options.is_color ? '🌈 Color' : '⬛ Black & White'}
                      </button>
                    </div>

                    {/* Single vs Double Sided */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Print Sides</label>
                      <button
                        type="button"
                        onClick={() => updateFileOption(idx, 'is_double_sided', !item.options.is_double_sided)}
                        className={`w-full py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                          item.options.is_double_sided 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.options.is_double_sided ? '📄 Double-Sided' : '📑 Single-Sided'}
                      </button>
                    </div>

                    {/* Paper Size */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Paper Size</label>
                      <select
                        value={item.options.paper_size}
                        onChange={(e) => updateFileOption(idx, 'paper_size', e.target.value)}
                        className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                      >
                        <option value="A4">A4 Paper</option>
                        <option value="A3">A3 Paper (2x)</option>
                      </select>
                    </div>

                    {/* Page Range */}
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Page Range (e.g. 'all' or '1-5, 8')</label>
                      <input
                        type="text"
                        value={item.options.page_range}
                        onChange={(e) => updateFileOption(idx, 'page_range', e.target.value)}
                        placeholder="all"
                        className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                      />
                    </div>

                    {/* Orientation */}
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Orientation</label>
                      <div className="flex gap-2">
                        {['portrait', 'landscape'].map((ori) => (
                          <button
                            key={ori}
                            type="button"
                            onClick={() => updateFileOption(idx, 'orientation', ori)}
                            className={`flex-1 py-1 px-2 rounded-lg font-semibold capitalize border ${
                              item.options.orientation === ori 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {ori}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Time Slot Picker */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>2. Select Pickup Time Slot</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {slots.map((s) => {
              const isFull = s.current_orders >= s.max_orders;
              const isSelected = selectedSlotId === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={isFull}
                  onClick={() => setSelectedSlotId(s.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isFull
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 text-xs">{s.time_range}</span>
                    {isFull ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">FULL</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">AVAILABLE</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                    <span>Capacity:</span>
                    <span className="font-semibold text-slate-700">{s.current_orders} / {s.max_orders} orders</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Additional Instructions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-slate-900">3. Special Printing Instructions (Optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Staple on top left corner, front cover on thick sheet"
            className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* 4. Live Pricing & Order Submit Bar */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-blue-200 uppercase tracking-wider font-semibold">Estimated Total Price</div>
            <div className="text-3xl font-black text-cyan-400 mt-0.5">₹{calculateGrandTotal().toFixed(2)}</div>
            <div className="text-[11px] text-slate-300 mt-1">
              Includes shop rates ({shopSettings ? `B&W Single: ₹${shopSettings.bw_single_rate}, Double: ₹${shopSettings.bw_double_rate}` : 'standard rates'})
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !filesList.length}
            className="w-full sm:w-auto py-3.5 px-8 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Submitting Order...</span>
            ) : !user ? (
              <span>Sign In to Submit Order</span>
            ) : (
              <>
                <span>Confirm & Send Order</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
