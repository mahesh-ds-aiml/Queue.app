import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Clock, Activity, Zap } from 'lucide-react';

export const LiveQueueBadge = () => {
  const [waitData, setWaitData] = useState(null);

  const fetchWait = async () => {
    try {
      const res = await apiClient.get('/predict-wait');
      setWaitData(res.data);
    } catch (err) {
      console.error("Error fetching wait time prediction", err);
    }
  };

  useEffect(() => {
    fetchWait();
    const interval = setInterval(fetchWait, 5000); // 5s realtime polling
    return () => clearInterval(interval);
  }, []);

  if (!waitData) return null;

  const { queue_status, estimated_minutes, queue_length, model_used } = waitData;

  const statusConfig = {
    Free: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Shop Queue: Free' },
    Moderate: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500', label: 'Shop Queue: Moderate' },
    Busy: { color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', dot: 'bg-rose-500', label: 'Shop Queue: Busy' },
  };

  const currentStatus = statusConfig[queue_status] || statusConfig.Free;

  return (
    <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${currentStatus.color}`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStatus.dot}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${currentStatus.dot}`}></span>
      </span>
      <span>{currentStatus.label} ({queue_length} ahead)</span>
      <span className="text-gray-400">|</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        ~{estimated_minutes} min wait
      </span>
    </div>
  );
};
