import React from 'react';
import { Clock, Printer, CheckCircle2, PackageCheck, XCircle } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const badgeMap = {
    Received: {
      label: 'Received',
      bg: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: Clock
    },
    Printing: {
      label: 'Printing',
      bg: 'bg-blue-100 text-blue-800 border-blue-300 pulse-active',
      icon: Printer
    },
    Ready: {
      label: 'Ready for Pickup',
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      icon: CheckCircle2
    },
    Collected: {
      label: 'Collected',
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: PackageCheck
    },
    Cancelled: {
      label: 'Cancelled',
      bg: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: XCircle
    }
  };

  const config = badgeMap[status] || badgeMap.Received;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};
