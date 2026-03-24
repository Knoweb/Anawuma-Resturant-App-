import React from 'react';
import { Link } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal';
import './Footer.css';

const Footer = () => {
  const { ref: ctaRef, inView: ctaIn } = useScrollReveal();
  const { ref: col1Ref, inView: col1In } = useScrollReveal();
  const { ref: col2Ref, inView: col2In } = useScrollReveal();
  const { ref: col3Ref, inView: col3In } = useScrollReveal();

  return (
    <footer className="landing-footer">
      {/* CTA Banner */}
      <div className="footer-cta-banner">
        <img className="cta-shape-circle" src="/assets/images/shapes/white-circle.png" alt="" />
        <img className="cta-shape-dots"   src="/assets/images/shapes/white-dots.png"   alt="" />
        <img className="cta-shape-striped" src="/assets/images/shapes/white-dots-circle.png" alt="" />
        <span className="fcta-dot" aria-hidden="true"></span>

        <div className="landing-container">
          <div
            ref={ctaRef}
            className={`fcta-inner reveal reveal-up ${ctaIn ? 'in-view' : ''}`}
          >
            <div className="fcta-text">
              <h2>Ready to Enhance Your Hospitality Business?</h2>
              <p>
                Contact us today to learn more about Anawuma and how it can revolutionize the way you
                serve your guests.
              </p>
            </div>
            <div className="fcta-btns">
              <Link to="/register" className="fcta-btn-primary">
                Register Now <i className="fas fa-arrow-right"></i>
              </Link>
              <Link to="/about" className="fcta-btn-outline">
                Learn More <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Body */}
      <div className="footer-body">
        <div className="landing-container">
          <div className="footer-grid">

            {/* Col 1: Logo + Social */}
            <div
              ref={col1Ref}
              className={`footer-col logo-col reveal reveal-left ${col1In ? 'in-view' : ''}`}
            >
              <Link to="/">
                <img
                  src="/assets/images/logos/logo-rmbg-2.png"
                  alt="Anawuma"
                  className="footer-logo"
                />
              </Link>

              <div className="footer-social">
                <a href="#facebook" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                <a href="#twitter"  aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                <a href="#linkedin" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                <a href="#instagram" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
              </div>
            </div>

            {/* Col 2: About + Quick Links */}
            <div
              ref={col2Ref}
              className={`footer-col-group reveal reveal-up reveal-delay-2 ${col2In ? 'in-view' : ''}`}
            >
              {/* About */}
              <div className="footer-col">
                <h4 className="footer-col-title">About</h4>
                <ul className="footer-links">
                  <li><Link to="/about">Company</Link></li>
                  <li><Link to="/contact">Contact</Link></li>
                </ul>
              </div>

              {/* Quick Links — 2 columns */}
              <div className="footer-col">
                <h4 className="footer-col-title">Quick Links</h4>
                <div className="footer-links-two-col">
                  <ul className="footer-links">
                    <li><Link to="/pricing">Pricing</Link></li>
                    <li><Link to="/login">Login</Link></li>
                  </ul>
                  <ul className="footer-links">
                    <li><Link to="/register">Register</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Col 3: Get in Touch — multiple offices */}
            <div
              ref={col3Ref}
              className={`footer-col reveal reveal-right reveal-delay-3 ${col3In ? 'in-view' : ''}`}
            >
              <h4 className="footer-col-title">Get in Touch</h4>
              <ul className="footer-contact-list">
                {/* Scandinavian Office */}
                <li className="contact-office-label">
                  <i className="fas fa-globe"></i>
                  <strong>Scandinavian Office</strong>
                </li>
                <li>
                  <i className="fas fa-map-marker-alt"></i>
                  15, Dr Waalers Gata, Hamar 2321
                </li>
                <li>
                  <i className="fas fa-phone-alt"></i>
                  <a href="tel:+46700236926">Call : +46 700 236 926</a>
                </li>

                {/* Australia Office */}
                <li className="contact-office-label">
                  <i className="fas fa-globe"></i>
                  <strong>Australia Office</strong>
                </li>
                <li>
                  <i className="fas fa-map-marker-alt"></i>
                  15, Manuka street, Constitution Hill, NSW 2145
                </li>
                <li>
                  <i className="fas fa-phone-alt"></i>
                  <a href="tel:+61434502385">Call : +61 434 502 385</a>
                </li>

                {/* Head Office — Sri Lanka */}
                <li className="contact-office-label">
                  <i className="fas fa-home"></i>
                  <strong>Head Office – Sri Lanka</strong>
                </li>
                <li>
                  <i className="fas fa-map-marker-alt"></i>
                  No 16, Wewalwala Road, Bataganwila, Galle.
                </li>
                <li>
                  <i className="fas fa-phone-alt"></i>
                  <a href="tel:+94777547239">Call : +94 777 547 239</a>
                </li>
                <li>
                  <i className="fas fa-envelope"></i>
                  <a href="mailto:info@anawuma.com">info@anawuma.com</a>
                </li>
              </ul>
            </div>

          </div>

          {/* Copyright */}
          <div className="footer-copyright">
            <p>
              &copy; {new Date().getFullYear()}{' '}
              <a href="http://knowebsolutions.com" target="_blank" rel="noopener noreferrer">
                Knoweb (PVT) LTD.
              </a>{' '}
              All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Background Decorative Shapes */}
      <div className="footer-bg-decor">
        <div className="footer-green-glow"></div>
      </div>
    </footer>
  );
};

export default Footer;
