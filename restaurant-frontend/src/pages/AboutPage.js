import React, { useState, useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import apiClient from '../api/apiClient';
import './AboutPage.css';

const AboutPage = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await apiClient.get('/about');
        setContent(response.data);
      } catch (error) {
        console.error('Failed to fetch about content', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="about-page">
        <Navbar />
        <div className="container py-5 text-center">
          <div className="spinner-border text-primary" role="status">
             <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Fallback content in case backend call fails
  const data = content || {
    sparkDescription: "The journey of Knoweb (Pvt) Ltd began with a simple realization: the restaurant industry was running on passion, but slowing down on outdated systems...",
    solutionDescription: "We didn't want to just build another app; we wanted to build a relief system...",
    missionDescription: "To empower restaurants worldwide with technology that respects local cultures of hospitality...",
    coreValues: [],
    howItWorks: []
  };

  return (
    <div className="about-page">
      <Navbar />
      
      {/* Intro Section */}
      <section className="about-intro">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-5 mb-lg-0">
              <div className="about-image-wrapper">
                <img src="/assets/images/about/about.png" alt="Anawuma Software in use" className="img-fluid rounded shadow-lg" />
              </div>
            </div>
            <div className="col-lg-6 ps-lg-5">
              <h2 className="display-5 fw-bold mb-4" style={{ color: '#1E1E2E' }}>
                Anawuma:<br />
                <span style={{ color: '#266668' }}>More Than Software. It's a Service.</span>
              </h2>
              
              <div className="about-text-block mb-4">
                <h5 className="fw-bold" style={{ color: '#266668' }}>The Spark</h5>
                <p className="text-muted">{data.sparkDescription}</p>
              </div>

              <div className="about-text-block mb-4">
                <h5 className="fw-bold" style={{ color: '#266668' }}>The Solution</h5>
                <p className="text-muted">{data.solutionDescription}</p>
              </div>

              <div className="about-text-block">
                <h5 className="fw-bold" style={{ color: '#266668' }}>Our Mission</h5>
                <p className="text-muted">{data.missionDescription}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="core-values bg-light py-5">
        <div className="container text-center py-4">
          <h2 className="fw-bold mb-5" style={{ color: '#1E1E2E' }}>Core Values</h2>
          <div className="row justify-content-center">
            <div className="col-lg-8 text-start">
              <ul className="list-unstyled core-values-list">
                {data.coreValues?.map((value, idx) => (
                  <li key={idx} className="mb-4 d-flex align-items-start">
                    <div className="value-icon me-3 mt-1">
                      <i className="fas fa-check-circle text-primary"></i>
                    </div>
                    <div>
                      <h5 className="fw-bold mb-1" style={{ color: '#1E1E2E' }}>{value.title}:</h5>
                      <p className="text-muted mb-0">{value.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <span className="badge bg-soft-primary text-primary px-3 py-2 rounded-pill mb-3" style={{ background: '#E6F0F0', color: '#266668' }}>
              How It Works
            </span>
            <h2 className="fw-bold" style={{ color: '#1E1E2E' }}>How Our System Works for You</h2>
          </div>

          <div className="row align-items-center">
            <div className="col-lg-4 mb-5 mb-lg-0">
              {data.howItWorks?.map((step, idx) => (
                <div key={idx} className={`work-step card shadow-sm border-0 ${idx !== data.howItWorks.length - 1 ? 'mb-4' : ''}`}>
                  <div className="card-body p-4 d-flex align-items-center gap-3">
                    <div className="step-icon">
                      <i className={`${step.icon} fa-2x`}></i>
                    </div>
                    <h5 className="mb-0 fw-bold">{step.title}</h5>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="col-lg-8 ps-lg-5">
              <div className="workflow-image text-center">
                <img src="/assets/images/features/system_workflow.jpg" alt="System Workflow" className="img-fluid rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
