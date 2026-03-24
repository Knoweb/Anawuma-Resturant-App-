import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { pricingAPI } from '../api/apiClient';
import './PricingPage.css';

const formatPrice = (value) => `$${Number(value).toFixed(2)}`;

const PricingPage = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [pricingData, setPricingData] = useState(null);

  const discountParam = searchParams.get('discount');

  useEffect(() => {
    let isMounted = true;

    const loadPricingPlans = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const parsedDiscount = Number.parseInt(discountParam ?? '', 10);
        const response = await pricingAPI.getPlans(
          Number.isNaN(parsedDiscount) ? undefined : parsedDiscount,
        );

        const payload = response?.data?.data;
        if (!payload || !Array.isArray(payload.plans)) {
          throw new Error('Invalid pricing response');
        }

        if (isMounted) {
          setPricingData(payload);
        }
      } catch (error) {
        console.error('Failed to load pricing plans:', error);
        if (isMounted) {
          setErrorMessage('Unable to load pricing plans right now. Please try again shortly.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPricingPlans();

    return () => {
      isMounted = false;
    };
  }, [discountParam]);

  return (
    <div className="pp-page">
      <Navbar />

      <main className="pp-main">
        <section className="pp-spacer" aria-hidden="true"></section>

        <section className="pp-pricing-section">
          <div className="landing-container">
            <div className="pp-title-wrap">
              <span className="pp-sub-title">Pricing Package</span>
              <h1 className="pp-title">Stop Losing Orders to Long Wait Times.</h1>
              <p className="pp-subtext">
                Pick the plan that matches your hotel or restaurant scale and start managing orders with less wait
                and better customer flow.
              </p>
              {pricingData?.discount > 0 && (
                <div className="pp-discount-banner">
                  {pricingData.discount}% promotional discount is currently active for all packages.
                </div>
              )}
            </div>

            {isLoading && (
              <div className="pp-state-box" role="status">
                Loading pricing plans...
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="pp-state-box pp-state-box-error" role="alert">
                {errorMessage}
              </div>
            )}

            {!isLoading && !errorMessage && pricingData && (
              <div className="pp-grid">
                {pricingData.plans.map((plan) => (
                  <article className="pp-card" key={plan.key}>
                    <h2 className="pp-plan-title">{plan.title}</h2>

                    {pricingData.discount > 0 && (
                      <p className="pp-original-price">
                        {formatPrice(plan.originalPrice)} /monthly
                      </p>
                    )}

                    <p className="pp-price-row">
                      <span className="pp-price-value">{formatPrice(plan.finalPrice)}</span>
                      <span className="pp-price-period">/monthly</span>
                    </p>

                    <p className="pp-plan-description">{plan.description}</p>

                    <Link className="pp-plan-btn" to={`/checkout?package=${plan.key}`}>
                      Choose Package <i className="fas fa-long-arrow-alt-right ms-2 mt-1"></i>
                    </Link>

                    <ul className="pp-feature-list">
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <span className="pp-check" aria-hidden="true">
                            <i className="fas fa-check-circle"></i>
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
