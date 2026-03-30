import React from 'react';
import { NuvovetLogo } from '../../components/NuvovetLogo';
import { useI18n } from '../../i18n';

export default function Footer() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  return (
    <footer className="bg-[#030308] border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NuvovetLogo />
            <span className="text-[11px] text-white/20 font-medium">
              {l === 'ko' ? '수의약품 처방점검 시스템' : 'Veterinary DUR System'}
            </span>
          </div>

          <p className="text-[11px] text-white/15 text-center sm:text-right max-w-md leading-relaxed">
            {l === 'ko'
              ? '수의 전문가 전용입니다. 임상적 판단을 대체하지 않습니다.'
              : 'For veterinary professional use only. Not a substitute for clinical judgment.'}
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[10px] text-white/10">
            © {new Date().getFullYear()} NuvoVet Systems
          </span>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[10px] text-white/15 hover:text-white/30 transition-colors">
              {l === 'ko' ? '이용약관' : 'Terms'}
            </a>
            <a href="#" className="text-[10px] text-white/15 hover:text-white/30 transition-colors">
              {l === 'ko' ? '개인정보처리방침' : 'Privacy'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
