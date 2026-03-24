import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import './HeroSection.css';

/* ─── animation variants ─────────────────────────────── */
const ease = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13 } },
};

const itemVariants = {
  hidden:   { opacity: 0, y: 28 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
};

const rightVariants = {
  hidden:   { opacity: 0, x: 70 },
  visible:  { opacity: 1, x: 0, transition: { duration: 0.85, ease, delay: 0.1 } },
};

/* ─── badge data ──────────────────────────────────────── */
const BADGES = [
  { id: 'orders',  cls: 'hs-badge hs-badge--orders',  icon: 'fas fa-shopping-bag', iconCls: 'hs-bi--green',  label: 'NEW ORDERS', value: '+24 TODAY',    delay: 0    },
  { id: 'revenue', cls: 'hs-badge hs-badge--revenue', icon: 'fas fa-chart-line',   iconCls: 'hs-bi--orange', label: 'REVENUE',    value: '↑ 32%',       delay: 0.28 },
  { id: 'rating',  cls: 'hs-badge hs-badge--rating',  icon: 'fas fa-star',         iconCls: 'hs-bi--yellow', label: 'AVG RATING', value: '★★★★★  4.9', delay: 0.56 },
];

/* ─── stats ───────────────────────────────────────────── */
const STATS = [
  { num: '500+',  lbl: 'Restaurants' },
  { num: '1M+',   lbl: 'Orders'      },
  { num: '99.9%', lbl: 'Uptime'      },
];

/* ══════════════════════════════════════════════════════ */
const HeroSection = () => {
  /* 3-D tilt on right column */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-1, 1], [7, -7]), { stiffness: 110, damping: 20 });
  const rotY = useSpring(useTransform(mx, [-1, 1], [-6, 6]), { stiffness: 110, damping: 20 });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width  - 0.5) * 2);
    my.set(((e.clientY - r.top)  / r.height - 0.5) * 2);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <section className="hs-section" id="home">
      {/* ── decorative bg blobs ── */}
      <div className="hs-blob hs-blob--1" />
      <div className="hs-blob hs-blob--2" />
      <div className="hs-blob hs-blob--3" />

      <div className="landing-container">
        <div className="hs-inner">

          {/* ════ LEFT COLUMN ════ */}
          <motion.div
            className="hs-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* pill badge */}
            <motion.div className="hs-pill" variants={itemVariants}>
              <span className="hs-pill-dot" />
              QR-Powered Restaurant &amp; Hotel Solution
            </motion.div>

            {/* headline */}
            <motion.h1 className="hs-title" variants={itemVariants}>
              <span className="hs-brand">Anawuma</span>
              <br />
              The All in One QR Ordering &amp; Hospitality Management Platform
            </motion.h1>

            {/* description */}
            <motion.p className="hs-desc" variants={itemVariants}>
              Transform guest experiences with lightning-fast QR code ordering,
              real-time menu updates, and intuitive operations — all in one system.
            </motion.p>

            {/* CTA buttons */}
            <motion.div className="hs-ctas" variants={itemVariants}>
              <Link to="/register" className="hs-btn-primary">
                Start Free Trial <span className="hs-btn-arrow">→</span>
                <span className="hs-btn-ripple" />
              </Link>
              <Link to="/contact" className="hs-btn-secondary">
                <i className="fas fa-play-circle" /> Request a Demo
              </Link>
            </motion.div>

            {/* stats row */}
            <motion.div className="hs-stats" variants={itemVariants}>
              {STATS.map((s) => (
                <div className="hs-stat" key={s.lbl}>
                  <div className="hs-stat-num">{s.num}</div>
                  <div className="hs-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ════ RIGHT COLUMN ════ */}
          <motion.div
            className="hs-right"
            variants={rightVariants}
            initial="hidden"
            animate="visible"
            onMouseMove={onMove}
            onMouseLeave={onLeave}
          >
            {/* radial glow */}
            <motion.div
              className="hs-glow"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease }}
            />

            {/* rotating outline shape 1 */}
            <motion.div
              className="hs-shape hs-shape--1"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1, rotate: [0, 360] }}
              transition={{
                opacity: { duration: 0.8, delay: 0.5 },
                scale:   { duration: 0.8, delay: 0.5, ease },
                rotate:  { duration: 26, repeat: Infinity, ease: 'linear' },
              }}
            />

            {/* rotating outline shape 2 */}
            <motion.div
              className="hs-shape hs-shape--2"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1, rotate: [0, -360] }}
              transition={{
                opacity: { duration: 0.8, delay: 0.65 },
                scale:   { duration: 0.8, delay: 0.65, ease },
                rotate:  { duration: 19, repeat: Infinity, ease: 'linear' },
              }}
            />

            {/* image card — 3-D tilt wrapper */}
            <motion.div
              className="hs-card-tilt"
              style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            >
              {/* continuous float */}
              <motion.div
                className="hs-card-float"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* corner accents */}
                <span className="hs-corner hs-corner--tl" />
                <span className="hs-corner hs-corner--tr" />
                <span className="hs-corner hs-corner--bl" />
                <span className="hs-corner hs-corner--br" />

                <div className="hs-card">
                  <img
                    src="/assets/images/hero/bg-image.png"
                    alt="Anawuma dashboard"
                    className="hs-card-img"
                    draggable={false}
                  />
                  <div className="hs-card-shimmer" />
                </div>
              </motion.div>
            </motion.div>

            {/* floating badges */}
            {BADGES.map((b) => (
              <motion.div
                key={b.id}
                className={b.cls}
                initial={{ opacity: 0, y: 20, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
                transition={{
                  opacity: { duration: 0.5, delay: 0.9 + b.delay },
                  scale:   { duration: 0.5, delay: 0.9 + b.delay },
                  y: {
                    duration: 4 + b.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1.3 + b.delay,
                  },
                }}
                whileHover={{ scale: 1.08, transition: { duration: 0.2 } }}
              >
                <span className={`hs-bi ${b.iconCls}`}>
                  <i className={b.icon} />
                </span>
                <div className="hs-bd-text">
                  <span className="hs-bd-label">{b.label}</span>
                  <span className="hs-bd-value">{b.value}</span>
                </div>
              </motion.div>
            ))}

          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
