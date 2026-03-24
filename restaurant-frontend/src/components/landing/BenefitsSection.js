import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import './BenefitsSection.css';

const benefits = [
  {
    icon: 'fas fa-rocket',
    title: 'Lightning Fast',
    description: 'Orders processed in seconds, table turnover increased by 30%.',
  },
  {
    icon: 'fas fa-mobile-alt',
    title: 'No App Required',
    description: 'Simple QR scan, instant ordering — zero downloads needed.',
  },
  {
    icon: 'fas fa-chart-line',
    title: 'Smart Analytics',
    description: 'Real-time insights to optimize menu and maximize revenue.',
  },
  {
    icon: 'fas fa-shield-alt',
    title: 'Secure & Reliable',
    description: '99.9% uptime with enterprise-grade security standards.',
  },
];

const delayClasses = ['', 'reveal-delay-2', 'reveal-delay-3', 'reveal-delay-4'];

const BenefitsSection = () => {
  const { ref: leftRef, inView: leftIn } = useScrollReveal();
  const { ref: gridRef, inView: gridIn } = useScrollReveal();

  return (
    <section className="benefits-section" id="features">
      <div className="landing-container">
        <div className="benefits-inner">
          {/* Left */}
          <div
            ref={leftRef}
            className={`benefits-left reveal reveal-left ${leftIn ? 'in-view' : ''}`}
          >
            <span className="section-sub-label">Why Choose Anawuma</span>
            <h2 className="benefits-heading">
              Built for Modern{' '}
              <span className="text-green-gradient">Hospitality Businesses</span>
            </h2>
            <p className="benefits-body">
              Anawuma is carefully designed to meet the real-world needs of restaurants, cafés, and
              hotels.
            </p>
            <p className="benefits-body">
              Developed with a strong focus on speed, usability, and operational efficiency.
            </p>

            <div className="trust-badge pulse-glow">
              <span className="trust-icon">🏆</span>
              <div>
                <div className="trust-main">Trusted by</div>
                <div className="trust-number">500+ Restaurants</div>
              </div>
            </div>
          </div>

          {/* Right: 2x2 card grid */}
          <div ref={gridRef} className="benefits-grid">
            {benefits.map((b, i) => (
              <div
                className={`benefit-card reveal reveal-up ${delayClasses[i]} ${gridIn ? 'in-view' : ''}`}
                key={i}
              >
                <div className="benefit-shimmer"></div>
                <div className="benefit-icon-wrap">
                  <i className={b.icon}></i>
                </div>
                <h4 className="benefit-title">{b.title}</h4>
                <p className="benefit-desc">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;

