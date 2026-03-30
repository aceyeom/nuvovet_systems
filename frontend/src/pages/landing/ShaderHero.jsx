import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { NuvovetLogo } from '../../components/NuvovetLogo';
import { useI18n } from '../../i18n';

/* ─── Three.js Shader ─────────────────────────────────────────────── */

const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
    float d = length(uv);

    // layered concentric ripples
    float ripple1 = sin(d * 18.0 - uTime * 1.2) * 0.5 + 0.5;
    float ripple2 = sin(d * 12.0 - uTime * 0.8 + 1.5) * 0.5 + 0.5;
    float ripple3 = sin(d * 24.0 - uTime * 1.6 + 3.0) * 0.5 + 0.5;

    // combine with distance falloff
    float mask = smoothstep(0.8, 0.0, d);
    float v = (ripple1 * 0.5 + ripple2 * 0.3 + ripple3 * 0.2) * mask;

    // thin line emphasis
    float line1 = smoothstep(0.015, 0.0, abs(fract(d * 6.0 - uTime * 0.3) - 0.5) - 0.46);
    float line2 = smoothstep(0.012, 0.0, abs(fract(d * 10.0 - uTime * 0.5) - 0.5) - 0.47);

    v += (line1 * 0.15 + line2 * 0.08) * mask;

    // subtle warm tint at center, cool at edges
    vec3 col = mix(
      vec3(v * 0.92, v * 0.92, v * 1.0),      // cool white-blue
      vec3(v * 1.0, v * 0.97, v * 0.9),        // warm white
      smoothstep(0.4, 0.0, d)
    );

    // overall brightness control
    col *= 0.12;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function ShaderCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let animId;
    const clock = new THREE.Clock();

    function animate() {
      material.uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    }
    animate();

    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      material.uniforms.uResolution.value.set(w, h);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}

/* ─── Navigation ──────────────────────────────────────────────────── */

function Nav() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-[#050510]/90 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <NuvovetLogo />
        <button
          onClick={() => navigate('/register')}
          className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-[#050510] hover:bg-white/90 transition-colors"
        >
          {t.landing?.ctaPrimary || '무료로 시작'}
        </button>
      </div>
    </motion.nav>
  );
}

/* ─── Hero Content ────────────────────────────────────────────────── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.4 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function ShaderHero() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050510]">
      {/* Shader background */}
      <ShaderCanvas />

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050510]/30 via-transparent to-[#050510]" />

      {/* Navigation */}
      <Nav />

      {/* Hero content */}
      <motion.div
        className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 text-center pt-20"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={fadeUp} className="mb-6">
          <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wide uppercase border border-white/10 text-white/50 bg-white/[0.04]">
            {t.landing?.heroBadge || 'AI 기반 수의약품 처방점검'}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className={`text-4xl sm:text-5xl lg:text-[64px] font-extrabold text-white tracking-tight ${
            lang === 'ko' ? 'leading-[1.25]' : 'leading-[1.1]'
          }`}
        >
          {lang === 'ko' ? (
            <>
              수의 약학의 미래,
              <br />
              <span className="bg-gradient-to-r from-white/60 via-white to-white/60 bg-clip-text text-transparent">
                지금 여기에
              </span>
            </>
          ) : (
            <>
              The Future of Veterinary
              <br />
              <span className="bg-gradient-to-r from-white/60 via-white to-white/60 bg-clip-text text-transparent">
                Pharmacology Is Here
              </span>
            </>
          )}
        </motion.h1>

        {/* Subtitle with integrated stats */}
        <motion.p
          variants={fadeUp}
          className={`mt-6 text-base sm:text-lg text-white/40 max-w-2xl mx-auto ${
            lang === 'ko' ? 'leading-[1.8] break-keep' : 'leading-relaxed'
          }`}
        >
          {lang === 'ko'
            ? '862종 의약품 데이터베이스 · 9,746개 상호작용 규칙 · 5개 DUR 엔진이 모든 처방을 실시간으로 분석합니다.'
            : '862 drugs · 9,746 interaction rules · 5 DUR engines analyze every prescription in real time.'}
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3.5 rounded-full text-[15px] font-semibold bg-white text-[#050510] hover:bg-white/90 transition-all hover:shadow-lg hover:shadow-white/10"
          >
            {t.landing?.ctaPrimary || '무료로 시작'}
          </button>
          <button
            onClick={() => navigate('/demo')}
            className="px-8 py-3.5 rounded-full text-[15px] font-semibold border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all bg-white/[0.03]"
          >
            {t.landing?.ctaSecondary || '데모 보기'}
          </button>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          variants={fadeUp}
          className="mt-16 sm:mt-20"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/20 to-transparent mx-auto" />
        </motion.div>
      </motion.div>
    </section>
  );
}
