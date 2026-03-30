import React from 'react';
import { useI18n } from '../../i18n';

export default function Footer() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  return (
    <footer className="bg-slate-50 border-t border-slate-200/70">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[18px] font-black tracking-[-0.045em] text-slate-900 leading-none select-none">
              nuvovet
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {l === 'ko' ? '수의약품 처방점검 시스템' : 'Veterinary DUR System'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 text-center sm:text-right max-w-md leading-relaxed">
            {l === 'ko'
              ? '수의 전문가 전용입니다. 임상적 판단을 대체하지 않습니다.'
              : 'For veterinary professional use only. Not a substitute for clinical judgment.'}
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[10px] text-slate-300">
            © {new Date().getFullYear()} NuvoVet Systems
          </span>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
              {l === 'ko' ? '이용약관' : 'Terms'}
            </a>
            <a href="#" className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
              {l === 'ko' ? '개인정보처리방침' : 'Privacy'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
