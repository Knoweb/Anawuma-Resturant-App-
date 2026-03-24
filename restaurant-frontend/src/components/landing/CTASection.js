import React from 'react';
import { Link } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal';
import './CTASection.css';

const CTASection = () => {
  const { ref: textRef, inView: textIn } = useScrollReveal();
  const { ref: imgRef,  inView: imgIn  } = useScrollReveal();

  return (
    <section className="cta-section" id="contact">
      <div className="cta-inner-full">
        {/* Left — text */}
        <div
          ref={textRef}
          className={`cta-text reveal reveal-left ${textIn ? 'in-view' : ''}`}
        >
          <h2 className="cta-heading">Get in Touch with Anawuma</h2>
          <p className="cta-body">
            Have questions or need support? Our dedicated team is here to help you! Whether you need
            assistance with implementation, custom feature requests, or inquiries about our services,
            we are just a message away.
          </p>
          <Link to="/contact" className="cta-link-btn">
            For Custom Developments <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        {/* Right — photo */}
        <div
          ref={imgRef}
          className={`cta-img-wrap reveal reveal-right ${imgIn ? 'in-view' : ''}`}
        >
          <img
            src="/assets/images/contacts/contact-us.png"
            alt="Contact Anawuma"
            className="cta-img"
          />
        </div>
      </div>
    </section>
  );
};

export default CTASection;
