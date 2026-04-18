"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function WorkerTerminal() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  
  const [status, setStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');

  const completeTask = async () => {
    if (!orderId) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (!orderId) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6 bg-slate-900 text-white">
        <div className="text-center opacity-50">Invalid Work Order Link</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-slate-900 text-slate-200">
      <div className="w-full max-w-sm bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700">
        
        <div className="flex flex-col items-center mb-6">
          {status === 'success' ? (
            <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
          ) : (
            <ShieldAlert size={48} className="text-amber-500 mb-4" />
          )}
          <h1 className="text-xl font-bold text-white text-center">Work Order {orderId}</h1>
          <p className="text-sm text-slate-400 mt-1">Uma Digital Twin Dispatch</p>
        </div>

        {status === 'pending' || status === 'error' ? (
          <div className="flex flex-col gap-4">
            <div className="text-sm bg-slate-900 p-4 rounded text-center border border-slate-700">
              Please execute the assigned maintenance task in the grow facility, then mark as complete below.
            </div>
            
            <button 
              onClick={completeTask}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg transition-colors flex justify-center items-center gap-2"
            >
              <CheckCircle2 size={18} /> Mark Task Completed
            </button>
            
            {status === 'error' && (
              <div className="text-rose-500 text-xs text-center">Failed to sync with main server. Try again.</div>
            )}
          </div>
        ) : (
          <div className="text-center text-emerald-400 font-bold bg-emerald-900/30 p-4 rounded-lg">
            Task Successfully Completed! <br/><span className="font-normal text-sm text-slate-400">The digital twin has been notified.</span>
          </div>
        )}
      </div>
    </div>
  );
}
