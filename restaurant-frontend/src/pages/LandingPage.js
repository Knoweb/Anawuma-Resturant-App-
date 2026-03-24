import React from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import BenefitsSection from '../components/landing/BenefitsSection';
import SolutionsSection from '../components/landing/SolutionsSection';
import HowItWorks from '../components/landing/HowItWorks';
import ServicesSection from '../components/landing/ServicesSection';
import CTASection from '../components/landing/CTASection';
import BlogSection from '../components/landing/BlogSection';
import Footer from '../components/landing/Footer';
import './LandingPage.css';

const LandingPage = () => (
  <>
    <Navbar />
    <main>
      <HeroSection />
      <BenefitsSection />
      <SolutionsSection />
      <HowItWorks />
      <ServicesSection />
      <CTASection />
      <BlogSection />
    </main>
    <Footer />
    <ScrollTopButton />
  </>
);

/* ---- Scroll to top button ---- */
const ScrollTopButton = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      className="scroll-top-btn"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
    >
      <i className="fas fa-angle-up"></i>
    </button>
  );
};

export default LandingPage;
