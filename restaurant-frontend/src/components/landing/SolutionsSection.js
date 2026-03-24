import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import './SolutionsSection.css';

const solutions = [
  {
    icon: '/assets/icons/food.png',
    bg: '#d4f0d6',
    title: 'Run Smoothly, Even Short-Staffed',
    description:
      "Stop worrying about the waiter shortage. Anawuma acts as your digital waiter, taking orders directly from customers — freeing your staff to focus on delivering great service.",
  },
  {
    icon: '/assets/icons/time-icon.png',
    bg: '#b3efb8',
    title: 'Turn Tables 20% Faster',
    description:
      "No more waiting for menus or the bill. Customers order the moment they sit down and can pay when they're done — giving you faster table turnover and happier guests.",
  },
  {
    icon: '/assets/icons/schedule.png',
    bg: '#d4f0d6',
    title: 'Stop Guessing, Start Knowing',
    description:
      "What's your highest margin dish? Who are your repeat customers? Anawuma gives you analytics that actually help you make smarter decisions and grow your revenue.",
  },
  {
    icon: '/assets/icons/qr-icon.png',
    bg: '#b3efb8',
    title: 'No App Downloads. Just Scan & Eat.',
    description:
      "We don't force your customers to install anything. A simple scan of the QR code opens your digital menu instantly in their browser — no friction, no barriers.",
  },
];

const delayClasses = ['', 'reveal-delay-2', 'reveal-delay-3', 'reveal-delay-4'];

const SolutionsSection = () => {
  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: gridRef, inView: gridIn } = useScrollReveal();

  return (
    <section className="solutions-section" id="solutions">
      <div className="landing-container">
        {/* Heading */}
        <div
          ref={headRef}
          className={`solutions-heading-wrap reveal reveal-up ${headIn ? 'in-view' : ''}`}
        >
          <h2 className="solutions-heading">
            Make Every Service <span className="text-green-gradient">Contactless, Fast &amp; Profitable.</span>
          </h2>
          <p className="solutions-sub">
            Anawuma is built for modern hospitality businesses that want to reduce costs, increase
            table turnover, and delight their guests with a seamless digital experience.
          </p>
        </div>

        {/* Cards */}
        <div ref={gridRef} className="solutions-grid">
          {solutions.map((s, i) => (
            <div
              className={`solution-card reveal reveal-up ${delayClasses[i]} ${gridIn ? 'in-view' : ''}`}
              key={i}
              style={{ '--card-bg': s.bg }}
            >
              <div className="solution-icon-wrap float-anim">
                <img src={s.icon} alt={s.title} />
              </div>
              <h3 className="solution-title">{s.title}</h3>
              <p className="solution-desc">{s.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="solutions-cta-row">
          <a href="/register" className="solutions-cta-btn">
            Get Started <i className="fas fa-arrow-right"></i>
          </a>
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;

