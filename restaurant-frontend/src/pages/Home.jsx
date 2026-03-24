/**
 * Home.jsx — Example usage of HeroSection
 *
 * Drop this into your router as the "/" route, e.g.:
 *   <Route path="/" element={<Home />} />
 *
 * The page composes Navbar + HeroSection (fully animated
 * with Framer Motion) + the rest of the landing sections.
 */
import React from 'react';
import Navbar      from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';  // animated hero
import BenefitsSection  from '../components/landing/BenefitsSection';
import SolutionsSection from '../components/landing/SolutionsSection';
import HowItWorks       from '../components/landing/HowItWorks';
import ServicesSection  from '../components/landing/ServicesSection';
import CTASection       from '../components/landing/CTASection';
import BlogSection      from '../components/landing/BlogSection';
import Footer           from '../components/landing/Footer';

const Home = () => (
  <>
    <Navbar />
    <main>
      {/*
        HeroSection renders:
          • Left  — pill badge, animated headline, description, CTA buttons, stats row
          • Right — landscape image card with:
              – radial glow background
              – 2 slowly-rotating outline shapes
              – 3D tilt on mouse-move
              – continuous float animation
              – 3 floating UI badges (Orders / Revenue / Rating)
              – entrance: left side slides from left, right slides from right
      */}
      <HeroSection />

      <BenefitsSection />
      <SolutionsSection />
      <HowItWorks />
      <ServicesSection />
      <CTASection />
      <BlogSection />
    </main>
    <Footer />
  </>
);

export default Home;
