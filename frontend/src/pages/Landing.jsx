import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Activity, Lock } from 'lucide-react';
import { RequestAccessModal } from '../components/RequestAccessModal';

export default function Landing() {
  const navigate = useNavigate();
  const [showAccessModal, setShowAccessModal] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900 tracking-tight">VetDUR</span>
        </div>
        <button
          onClick={() => navigate('/system')}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Lock size={12} />
          Full System
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-lg w-full text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mb-8">
            <Activity size={28} className="text-slate-700" />
          </div>

          {/* Product name */}
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
            VetDUR
          </h1>

          {/* Tagline */}
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-10 max-w-md mx-auto">
            Veterinary Drug Utilization Review — real-time interaction screening for companion animal prescriptions.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              onClick={() => navigate('/demo')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-sm"
            >
              Try Demo
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => setShowAccessModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
            >
              Request Full Access
            </button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              877 Korean Vet Drugs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              8 DUR Rules
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Dog &amp; Cat
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-gray-100 text-center">
        <p className="text-xs text-slate-400">
          For veterinary professional use only. Not a substitute for clinical judgment.
        </p>
      </footer>

      {/* Modal */}
      <RequestAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
      />
    </div>
  );
}
