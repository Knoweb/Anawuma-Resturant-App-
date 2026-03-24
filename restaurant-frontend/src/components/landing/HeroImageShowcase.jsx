import React from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import './HeroImageShowcase.css';

/* ─── Floating badge data ───────────────────────────── */
const badges = [
  {
    id: 'orders',
    className: 'badge badge-orders',
    delay: 0,
    content: (
      <>
        <span className="badge-icon badge-icon--green">
          <i className="fas fa-shopping-bag"></i>
        </span>
        <div className="badge-text">
          <span className="badge-label">New Orders</span>
          <span className="badge-value">+24 today</span>
        </div>
      </>
    ),
  },
  {
    id: 'revenue',
    className: 'badge badge-revenue',
    delay: 0.3,
    content: (
      <>
        <span className="badge-icon badge-icon--yellow">
          <i className="fas fa-chart-line"></i>
        </span>
        <div className="badge-text">
          <span className="badge-label">Revenue</span>
          <span className="badge-value">↑ 32%</span>
        </div>
      </>
    ),
  },
  {
    id: 'rating',
    className: 'badge badge-rating',
    delay: 0.6,
    content: (
      <>
        <span className="badge-icon badge-icon--star">
          <i className="fas fa-star"></i>
        </span>
        <div className="badge-text">
          <span className="badge-label">Avg Rating</span>
          <span className="badge-rating-stars">
            {'★★★★★'}
            <span className="badge-value"> 4.9</span>
          </span>
        </div>
      </>
    ),
  },
];

/* ─── Shared entrance easing ────────────────────────── */
const easeOut = [0.22, 1, 0.36, 1];

const HeroImageShowcase = () => {
  /* tilt on mouse move */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [6, -6]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-6, 6]), { stiffness: 120, damping: 20 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(cx * 2);
    mouseY.set(cy * 2);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="his-wrapper" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>

      {/* ── Radial glow behind everything ── */}
      <motion.div
        className="his-glow"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: easeOut, delay: 0.2 }}
      />

      {/* ── Rotating outline shape 1 (large) ── */}
      <motion.div
        className="his-shape his-shape--1"
        initial={{ opacity: 0, rotate: -20, scale: 0.8 }}
        animate={{
          opacity: 1,
          rotate: ['-20deg', '20deg', '-20deg'],
          scale: 1,
        }}
        transition={{
          opacity: { duration: 0.8, delay: 0.4, ease: easeOut },
          scale:   { duration: 0.8, delay: 0.4, ease: easeOut },
          rotate:  { duration: 18, repeat: Infinity, ease: 'linear', repeatType: 'loop' },
        }}
      />

      {/* ── Rotating outline shape 2 (small, opposite) ── */}
      <motion.div
        className="his-shape his-shape--2"
        initial={{ opacity: 0, rotate: 15, scale: 0.8 }}
        animate={{
          opacity: 1,
          rotate: ['15deg', '-15deg', '15deg'],
          scale: 1,
        }}
        transition={{
          opacity: { duration: 0.8, delay: 0.55, ease: easeOut },
          scale:   { duration: 0.8, delay: 0.55, ease: easeOut },
          rotate:  { duration: 14, repeat: Infinity, ease: 'linear', repeatType: 'loop' },
        }}
      />

      {/* ── Main image frame with tilt + float ── */}
      <motion.div
        className="his-frame-outer"
        style={{ rotateX, rotateY, perspective: 1000 }}
        initial={{ opacity: 0, x: 60, scale: 0.92 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: easeOut, delay: 0.1 }}
        whileHover={{ scale: 1.025 }}
      >
        {/* Continuous float */}
        <motion.div
          className="his-float"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Corner accents */}
          <span className="his-corner his-corner--tl" />
          <span className="his-corner his-corner--tr" />
          <span className="his-corner his-corner--bl" />
          <span className="his-corner his-corner--br" />

          {/* Image card */}
          <div className="his-card">
            <img
              src="/assets/images/hero/bg-image.png"
              alt="Anawuma dashboard"
              className="his-img"
              draggable={false}
            />
            {/* Inner card shimmer */}
            <div className="his-card-shimmer" />
          </div>
        </motion.div>
      </motion.div>

      {/* ── Floating badges ── */}
      {badges.map((b) => (
        <motion.div
          key={b.id}
          className={b.className}
          initial={{ opacity: 0, y: 20, scale: 0.85 }}
          animate={{
            opacity: 1,
            y: [0, -8, 0],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 0.5, delay: 0.7 + b.delay, ease: easeOut },
            scale:   { duration: 0.5, delay: 0.7 + b.delay, ease: easeOut },
            y: {
              duration: 4 + b.delay,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1 + b.delay,
            },
          }}
          whileHover={{ scale: 1.07, transition: { duration: 0.2 } }}
        >
          {b.content}
        </motion.div>
      ))}

    </div>
  );
};

export default HeroImageShowcase;
