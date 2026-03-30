import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import * as THREE from 'three';
import { useI18n } from '../../i18n';

/* ─── Three.js Shader (exact reference animation) ────────────────── */

const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  #define TWO_PI 6.2831853072
  #define PI 3.14159265359

  precision highp float;
  uniform vec2 resolution;
  uniform float time;

  void main(void) {
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
    float t = time * 0.05;
    float lineWidth = 0.002;

    vec3 color = vec3(0.0);
    for (int j = 0; j < 3; j++) {
      for (int i = 0; i < 5; i++) {
        color[j] += lineWidth * float(i * i) /
          abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0 -
          length(uv) + mod(uv.x + uv.y, 0.2));
      }
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

function ShaderCanvas() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { type: 'f', value: 1.0 },
      resolution: { type: 'v2', value: new THREE.Vector2() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };
    onResize();
    window.addEventListener('resize', onResize, false);

    const animate = () => {
      const id = requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
      if (sceneRef.current) sceneRef.current.animationId = id;
    };

    sceneRef.current = { camera, scene, renderer, uniforms, animationId: 0 };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        if (container && sceneRef.current.renderer.domElement) {
          container.removeChild(sceneRef.current.renderer.domElement);
        }
        sceneRef.current.renderer.dispose();
        geometry.dispose();
        material.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ background: '#000', overflow: 'hidden' }}
    />
  );
}

/* ─── Navigation ──────────────────────────────────────────────────── */

function Nav() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const l = lang || 'ko';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/70 shadow-sm'
          : 'bg-transparent'
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <span
          className={`text-[24px] font-black tracking-[-0.045em] leading-none select-none transition-colors duration-500 ${
            scrolled ? 'text-slate-900' : 'text-white'
          }`}
        >
          nuvovet
        </span>

        <button
          onClick={() => navigate('/register')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-500 ${
            scrolled
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-white text-[#050510] hover:bg-white/90'
          }`}
        >
          {t.landing?.ctaPrimary || (l === 'ko' ? '무료로 시작' : 'Start Free')}
        </button>
      </div>
    </motion.nav>
  );
}

/* ─── Hero Content ────────────────────────────────────────────────── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};

const stats = [
  { value: '862', label: { ko: '의약품', en: 'Drugs' } },
  { value: '9,746', label: { ko: '상호작용 규칙', en: 'Interaction Rules' } },
  { value: '5', label: { ko: 'DUR 엔진', en: 'DUR Engines' } },
  { value: '2', label: { ko: '대상 종', en: 'Species' } },
];

export default function ShaderHero() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const l = lang || 'ko';

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Scroll-driven crossfade: white overlay opacity from 0 → 1
  const whiteOverlayOpacity = useTransform(scrollYProgress, [0.5, 1.0], [0, 1]);

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Shader background */}
      <ShaderCanvas />

      {/* Scroll-driven white crossfade overlay */}
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none z-[1]"
        style={{ opacity: whiteOverlayOpacity }}
      />

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
            {t.landing?.heroBadge || (l === 'ko' ? 'AI 기반 수의약품 처방점검' : 'AI-Powered Veterinary DUR')}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className={`text-4xl sm:text-5xl lg:text-[64px] font-extrabold text-white tracking-tight ${
            l === 'ko' ? 'leading-[1.25]' : 'leading-[1.1]'
          }`}
        >
          {l === 'ko' ? (
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

        {/* Stats row */}
        <motion.div
          variants={fadeUp}
          className="mt-10 grid grid-cols-4 gap-3 sm:gap-6 max-w-xl mx-auto"
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-none">
                {stat.value}
              </div>
              <div className="mt-1.5 text-[10px] sm:text-[11px] text-white/35 font-medium uppercase tracking-wider">
                {stat.label[l]}
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3.5 rounded-full text-[15px] font-semibold bg-white text-[#050510] hover:bg-white/90 transition-all hover:shadow-lg hover:shadow-white/10"
          >
            {t.landing?.ctaPrimary || (l === 'ko' ? '무료로 시작' : 'Start Free')}
          </button>
          <button
            onClick={() => navigate('/demo')}
            className="px-8 py-3.5 rounded-full text-[15px] font-semibold border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all bg-white/[0.03]"
          >
            {t.landing?.ctaSecondary || (l === 'ko' ? '데모 보기' : 'View Demo')}
          </button>
        </motion.div>

        {/* Scroll hint */}
        <motion.div variants={fadeUp} className="mt-14 sm:mt-16">
          <div className="w-[1px] h-10 bg-gradient-to-b from-white/20 to-transparent mx-auto" />
        </motion.div>
      </motion.div>
    </section>
  );
}
