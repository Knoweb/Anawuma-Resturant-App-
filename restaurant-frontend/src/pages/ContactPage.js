import React, { useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import apiClient from '../api/apiClient';
import './ContactPage.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    hotelName: '',
    emailAddress: '',
    subject: '',
    website: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      await apiClient.post('/contact', formData);
      setSubmitStatus('success');
      setFormData({
        fullName: '',
        phoneNumber: '',
        hotelName: '',
        emailAddress: '',
        subject: '',
        website: '',
        message: ''
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="cp-container">
        {/* Header Section */}
        <section className="cp-header">
          <div className="cp-header-content">
            <div className="cp-badge">Support</div>
            <h1 className="cp-title">We are here to help</h1>
            <p className="cp-subtitle">
              Have questions or need support? Our dedicated team is here to help you!
              Whether you need assistance with implementation, custom feature requests,
              or inquiries about our services, we are just a message away.
            </p>
          </div>
          <div className="cp-header-image">
            <img src="/assets/images/contacts/contact-us.png" alt="Support Team" />
          </div>
        </section>

        {/* Form and Map Section */}
        <section className="cp-map-form-section">
          {/* Map Image / Embed */}
          <div className="cp-map-container">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15870.093466144576!2d80.20311269999998!3d6.037130200000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae173006a88e6dd%3A0xc6cfbf1f12cb84bd!2sGalle%2C%20Sri%20Lanka!5e0!3m2!1sen!2sus!4v1709669532450!5m2!1sen!2sus" 
              className="cp-map-iframe"
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Galle Locations"
            ></iframe>
          </div>

          {/* Floating Form Box */}
          <div className="cp-form-container">
            <form onSubmit={handleSubmit} className="cp-form">
              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Type your name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="cp-form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="Type your phone number"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="cp-form-group">
                  <label>Hotel / Restaurant Name</label>
                  <input
                    type="text"
                    name="hotelName"
                    placeholder="Type your Company"
                    value={formData.hotelName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="emailAddress"
                    placeholder="Type your Email Address"
                    value={formData.emailAddress}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="cp-form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    name="subject"
                    placeholder="I would like to ........"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="cp-form-group">
                  <label>Website</label>
                  <input
                    type="text"
                    name="website"
                    placeholder="Type your website"
                    value={formData.website}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="cp-form-row cp-full-width">
                <div className="cp-form-group">
                  <label>Message</label>
                  <textarea
                    name="message"
                    placeholder="Write message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
              </div>

              <div className="cp-submit-row">
                <button type="submit" className="cp-btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Sending...'
                  ) : (
                    <>
                      Send Us Message <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }}></i>
                    </>
                  )}
                </button>
              </div>

              {submitStatus === 'success' && (
                <div style={{ color: '#266668', marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                  Thank you! Your message has been sent successfully. We will get back to you soon.
                </div>
              )}
              {submitStatus === 'error' && (
                <div style={{ color: '#dc3545', marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                  Oops! Something went wrong. Please try again later.
                </div>
              )}
            </form>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default ContactPage;
