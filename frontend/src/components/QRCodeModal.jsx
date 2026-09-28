import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, CheckCircle2, Copy } from 'lucide-react';

export const QRCodeModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const qrData = JSON.stringify({
    token: order.token_number,
    id: order.id,
    student: order.user_name,
    total: order.total_price,
    status: order.status
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 text-center relative overflow-hidden">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mt-2 inline-flex p-3 rounded-full bg-blue-50 text-blue-600 mb-3">
          <QrCode className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-slate-900">Order Token Pass</h3>
        <p className="text-xs text-slate-500 mt-1">Show this QR code or Token Number at the Xerox Shop Counter</p>

        {/* Token Badge */}
        <div className="my-5 p-4 bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-xl shadow-inner">
          <div className="text-xs text-blue-200 tracking-wider uppercase font-semibold">Token Number</div>
          <div className="text-4xl font-black text-cyan-400 tracking-tight my-1">{order.token_number}</div>
          <div className="text-xs text-slate-300">Pickup Slot: {order.slot_time || 'General Queue'}</div>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center my-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs inline-block">
          <QRCodeSVG 
            value={qrData} 
            size={160} 
            level="H" 
            includeMargin={true}
            fgColor="#0f172a"
          />
        </div>

        {/* Details Summary */}
        <div className="text-left bg-slate-50 p-3.5 rounded-lg text-xs space-y-1.5 border border-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-500">Student:</span>
            <span className="font-semibold text-slate-900">{order.user_name} ({order.user_reg || 'N/A'})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Amount:</span>
            <span className="font-bold text-emerald-600 text-sm">₹{order.total_price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-blue-600">{order.status}</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
        >
          Done / Close Pass
        </button>
      </div>
    </div>
  );
};
