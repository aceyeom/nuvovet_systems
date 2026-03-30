import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import * as THREE from 'three';
import { useI18n } from '../../i18n';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function mix(start, end, progress) {
  return start + (end - start) * progress;
}

function mixColor(from, to, progress) {
  const amount = clamp01(progress);
  const red = Math.round(mix(from[0], to[0], amount));
  const green = Math.round(mix(from[1], to[1], amount));
  const blue = Math.round(mix(from[2], to[2], amount));
  return `rgb(${red}, ${green}, ${blue})`;
}

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

function Nav({ progress }) {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const l = lang || 'ko';
  const navProgress = clamp01(progress * 1.2);
  const logoColor = mixColor([255, 255, 255], [15, 23, 42], navProgress);
  const navStyle = {
    backgroundColor: `rgba(255, 255, 255, ${mix(0, 0.92, navProgress)})`,
    borderBottomColor: `rgba(226, 232, 240, ${mix(0, 0.9, navProgress)})`,
    boxShadow: `0 10px 30px rgba(15, 23, 42, ${mix(0, 0.08, navProgress)})`,
    backdropFilter: `blur(${mix(0, 18, navProgress)}px)`,
  };
  const primaryStyle = navProgress > 0.55
    ? 'bg-slate-900 text-white hover:bg-slate-800'
    : 'bg-white text-[#050510] hover:bg-white/90';

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300"
      style={navStyle}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* nuvovet text logo */}
        <span
          className="text-[24px] font-black tracking-[-0.045em] leading-none select-none transition-colors duration-300"
          style={{ color: logoColor }}
        >
          nuvovet
        </span>

        <button
          onClick={() => navigate('/register')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${primaryStyle}`}
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
  const [transitionProgress, setTransitionProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const hero = heroRef.current;
      if (!hero) return;

      const rect = hero.getBoundingClientRect();
      const total = hero.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setTransitionProgress(0);
        return;
      }

      const travelled = Math.min(Math.max(-rect.top, 0), total);
      setTransitionProgress(clamp01(travelled / total));
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  const textProgress = clamp01(transitionProgress * 1.1);
  const badgeTextColor = mixColor([255, 255, 255], [51, 65, 85], textProgress);
  const bodyColor = mixColor([255, 255, 255], [15, 23, 42], textProgress);
  const subColor = mixColor([255, 255, 255], [71, 85, 105], clamp01(textProgress * 0.92));
  const accentColor = mixColor([255, 255, 255], [15, 23, 42], clamp01(textProgress * 0.85));
  const statPanelOpacity = mix(0.08, 0.96, clamp01(transitionProgress * 1.15));
  const statBorderOpacity = mix(0.14, 0.85, clamp01(transitionProgress * 1.05));
  const statDividerColor = `rgba(148, 163, 184, ${mix(0.12, 0.3, textProgress)})`;
  const shaderOpacity = mix(1, 0.08, transitionProgress);
  const whiteOverlayOpacity = mix(0, 1, transitionProgress);
  const heroSubtitle = t.landing?.heroDesc || (
    l === 'ko'
      ? '처방 입력 즉시 상호작용, 용량, 장기 부담을 한 화면에서 정리합니다.'
      : 'See interactions, dosing, and organ burden the moment a prescription is entered.'
  );
  const stats = [
    { value: '862', label: t.landing?.statsProducts || (l === 'ko' ? '등록 의약품' : 'Registered Drugs') },
    { value: '9,746', label: t.landing?.statsRules || (l === 'ko' ? '상호작용 규칙' : 'Interaction Rules') },
    { value: '5', label: t.landing?.statsEngines || (l === 'ko' ? 'DUR 규칙 엔진' : 'DUR Rule Engines') },
    { value: '2', label: t.landing?.statsSpecies || (l === 'ko' ? '대상 종 (개·고양이)' : 'Species (Dog & Cat)') },
  ];

  return (
    <section ref={heroRef} className="relative h-[180vh] bg-white">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0" style={{ opacity: shaderOpacity }}>
          <ShaderCanvas />
        </div>
        <div className="absolute inset-0 bg-white" style={{ opacity: whiteOverlayOpacity }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: clamp01((transitionProgress - 0.18) / 0.82),
            background: 'radial-gradient(circle at 50% 18%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.72) 28%, rgba(255,255,255,0.12) 64%, rgba(255,255,255,0) 100%)',
          }}
        />

        <Nav progress={transitionProgress} />

        <motion.div
          className="relative z-10 flex min-h-screen items-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col px-5 pt-24 sm:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <motion.div variants={fadeUp} className="mb-6">
                <span
                  className="inline-block rounded-full border px-4 py-1.5 text-[11px] font-medium tracking-wide uppercase transition-colors duration-300"
                  style={{
                    color: badgeTextColor,
                    borderColor: `rgba(148, 163, 184, ${mix(0.12, 0.38, textProgress)})`,
                    backgroundColor: `rgba(255, 255, 255, ${mix(0.04, 0.74, clamp01(transitionProgress * 1.1))})`,
                  }}
                >
                  {t.landing?.heroBadge || (l === 'ko' ? 'AI 기반 수의약품 처방점검' : 'AI-Powered Veterinary DUR')}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className={`text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[64px] ${
                  l === 'ko' ? 'leading-[1.25]' : 'leading-[1.1]'
                }`}
                style={{ color: bodyColor }}
              >
                {l === 'ko' ? (
                  <>
                    수의 약학의 미래,
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${mixColor([255, 255, 255], [51, 65, 85], clamp01(textProgress * 0.65))} 0%, ${accentColor} 50%, ${mixColor([255, 255, 255], [100, 116, 139], clamp01(textProgress * 0.8))} 100%)`,
                      }}
                    >
                      지금 여기에
                    </span>
                  </>
                ) : (
                  <>
                    The Future of Veterinary
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${mixColor([255, 255, 255], [51, 65, 85], clamp01(textProgress * 0.65))} 0%, ${accentColor} 50%, ${mixColor([255, 255, 255], [100, 116, 139], clamp01(textProgress * 0.8))} 100%)`,
                      }}
                    >
                      Pharmacology Is Here
                    </span>
                  </>
                )}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className={`mx-auto mt-6 max-w-2xl text-base sm:text-lg ${
                  l === 'ko' ? 'leading-[1.8] break-keep' : 'leading-relaxed'
                }`}
                style={{ color: subColor }}
              >
                {heroSubtitle}
              </motion.p>

              <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  onClick={() => navigate('/register')}
                  className={`rounded-full px-8 py-3.5 text-[15px] font-semibold transition-all ${
                    transitionProgress > 0.48
                      ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/10'
                      : 'bg-white text-[#050510] hover:bg-white/90 hover:shadow-lg hover:shadow-white/10'
                  }`}
                >
                  {t.landing?.ctaPrimary || (l === 'ko' ? '무료로 시작' : 'Start Free')}
                </button>
                <button
                  onClick={() => navigate('/demo')}
                  className="rounded-full border px-8 py-3.5 text-[15px] font-semibold transition-all"
                  style={{
                    color: mixColor([255, 255, 255], [15, 23, 42], clamp01(textProgress * 0.95)),
                    borderColor: `rgba(${Math.round(mix(255, 148, textProgress))}, ${Math.round(mix(255, 163, textProgress))}, ${Math.round(mix(255, 184, textProgress))}, ${mix(0.15, 0.42, textProgress)})`,
                    backgroundColor: `rgba(255, 255, 255, ${mix(0.03, 0.7, clamp01(transitionProgress * 0.95))})`,
                  }}
                >
                  {t.landing?.ctaSecondary || (l === 'ko' ? '데모 보기' : 'View Demo')}
                </button>
              </motion.div>
            </div>

            <motion.div variants={fadeUp} className="mt-14 w-full sm:mt-16">
              <div
                className="grid overflow-hidden rounded-[30px] border sm:grid-cols-2 lg:grid-cols-4"
                style={{
                  backgroundColor: `rgba(255, 255, 255, ${statPanelOpacity})`,
                  borderColor: `rgba(148, 163, 184, ${statBorderOpacity})`,
                  boxShadow: `0 24px 80px rgba(15, 23, 42, ${mix(0.08, 0.12, clamp01(transitionProgress * 0.6))})`,
                  backdropFilter: `blur(${mix(12, 18, clamp01(transitionProgress * 0.75))}px)`,
                }}
              >
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className={`px-6 py-7 sm:px-7 sm:py-8 ${
                      index < stats.length - 1 ? 'border-b' : ''
                    } ${
                      index < 2 ? 'sm:border-b' : 'sm:border-b-0'
                    } ${
                      index % 2 === 0 ? 'sm:border-r' : 'sm:border-r-0'
                    } ${
                      index < stats.length - 1 ? 'lg:border-r' : 'lg:border-r-0'
                    } lg:border-b-0`}
                    style={{ borderColor: statDividerColor }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: subColor }}>
                      {stat.label}
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl" style={{ color: bodyColor }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-12 sm:mt-14">
              <div
                className="mx-auto h-14 w-px"
                style={{
                  background: `linear-gradient(to bottom, rgba(148, 163, 184, ${mix(0.22, 0.45, textProgress)}) 0%, rgba(148, 163, 184, 0) 100%)`,
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
