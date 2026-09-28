import React from 'react';
import { Check, Clock, Printer, PackageCheck, CheckCircle2 } from 'lucide-react';

export const OrderProgressSteps = ({ status }) => {
  if (status === 'Cancelled') {
    return (
      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs text-center font-medium">
        This order was cancelled.
      </div>
    );
  }

  const steps = [
    { key: 'Received', label: 'Order Received', icon: Clock },
    { key: 'Printing', label: 'Printing', icon: Printer },
    { key: 'Ready', label: 'Ready for Pickup', icon: CheckCircle2 },
    { key: 'Collected', label: 'Collected', icon: PackageCheck },
  ];

  const statusOrder = ['Received', 'Printing', 'Ready', 'Collected'];
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
        
        {/* Active Line */}
        <div 
          className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center group">
              <div 
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm ${
                  isDone 
                    ? isCurrent && step.key === 'Ready' 
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110 animate-bounce' 
                      : 'bg-blue-600 text-white' 
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isDone && !isCurrent ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[11px] mt-1.5 font-medium ${isCurrent ? 'text-blue-900 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
