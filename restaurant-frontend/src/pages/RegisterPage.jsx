import React from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import RegisterForm from '../components/register/RegisterForm';
import RegisterIllustration from '../components/register/RegisterIllustration';
import '../components/register/Register.css';

const RegisterPage = () => (
  <div className="reg-page">
    <Navbar />

    <main className="reg-main">
      <div className="reg-container">

        {/* Badge + Heading */}
        <div className="reg-heading-wrap">
          <span className="reg-badge">Get Started</span>
          <h1 className="reg-heading">Register Your Hotel / Restaurant Now!</h1>
        </div>

        {/* Two-column body */}
        <div className="reg-body">
          <div className="reg-form-col">
            <RegisterForm />
          </div>
          <div className="reg-illus-col">
            <RegisterIllustration />
          </div>
        </div>

      </div>
    </main>

    <Footer />
  </div>
);

export default RegisterPage;
