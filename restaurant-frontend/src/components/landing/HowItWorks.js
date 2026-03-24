import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import './HowItWorks.css';

const steps = [
  {
    num: 1,
    cls: 'item-scan',
    icon: 'fas fa-qrcode',
    title: 'Scan',
    subtitle: 'Instant Access to Digital Menu',
    desc: "Customers scan the QR code placed on their table or room using their smartphone. No app downloads required — your digital menu opens instantly.",
  },
  {
    num: 2,
    cls: 'item-order',
    icon: 'fas fa-shopping-cart',
    title: 'Order',
    subtitle: 'Customize & Place Orders Easily',
    desc: "Customers browse the menu, select items, customize preferences, and add special notes — all in a few taps.",
  },
  {
    num: 3,
    cls: 'item-confirm',
    icon: 'fas fa-check-circle',
    title: 'Confirm',
    subtitle: 'Smart Order Confirmation',
    desc: "The waiter receives an instant notification, reviews the order, and confirms it — ensuring accuracy and smooth coordination.",
  },
  {
    num: 4,
    cls: 'item-cook',
    icon: 'fas fa-fire',
    title: 'Cook',
    subtitle: 'Direct Kitchen Integration',
    desc: "Once confirmed, the order is sent straight to the kitchen dashboard, reducing delays, miscommunication, and manual errors.",
  },
  {
    num: 5,
    cls: 'item-update',
    icon: 'fas fa-sync-alt',
    title: 'Update',
    subtitle: 'Real-Time Order Tracking',
    desc: "Order status updates (Preparing, Ready, Served) are visible in real time to both staff and customers, keeping everyone informed.",
  },
  {
    num: 6,
    cls: 'item-deliver',
    icon: 'fas fa-truck',
    title: 'Deliver',
    subtitle: 'Fast & Organized Service',
    desc: "When the food is ready, the waiter is notified immediately for pickup and delivery — ensuring timely and efficient service.",
  },
];

const cardDelays = ['reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3', 'reveal-delay-4', 'reveal-delay-5', 'reveal-delay-6'];

const HowItWorks = () => {
  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: gridRef, inView: gridIn } = useScrollReveal();

  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="landing-container">
        {/* Heading */}
        <div ref={headRef} className={`hiw-heading-wrap reveal reveal-up ${headIn ? 'in-view' : ''}`}>
          <span className="section-sub-label">How It Works</span>
          <h2 className="hiw-heading">
            Simple. Smart. <span className="text-green-gradient">Seamless Dining Experience.</span>
          </h2>
        </div>

        {/* Steps Grid */}
        <div ref={gridRef} className="hiw-grid">
          {steps.map((s) => (
            <div
              className={`hiw-card ${s.cls} reveal reveal-up ${cardDelays[s.num - 1]} ${gridIn ? 'in-view' : ''}`}
              key={s.num}
            >
              <div className="hiw-step-num">{s.num}</div>
              <div className="hiw-icon-wrap">
                <i className={s.icon}></i>
              </div>
              <div className="hiw-content">
                <h4>{s.title}</h4>
                <span className="hiw-subtitle">{s.subtitle}</span>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hiw-cta-row">
          <a href="/register" className="solutions-cta-btn">
            Get Started <i className="fas fa-arrow-right"></i>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

