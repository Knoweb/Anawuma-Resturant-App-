import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import './BlogSection.css';

const blogs = [
  {
    id: 1,
    title: "5 Ways to Boost Your Restaurant's Table Turnover Rate (Without Rushing Guests)",
    date: '26 July 2025',
    image: 'Blog Post 1.png',
    tags: ['Restaurant', 'Management', 'Efficiency'],
  },
  {
    id: 2,
    title: 'The Future of Contactless Dining: Why QR Menus Are Here to Stay',
    date: 'August 2025',
    image: 'Blog Post 2.png',
    tags: ['QR Code', 'Technology', 'Trends'],
  },
  {
    id: 3,
    title: 'How Smart Analytics Can Transform Your Restaurant Revenue',
    date: 'August 2025',
    image: 'Blog Post 3.png',
    tags: ['Analytics', 'Revenue', 'Data'],
  },
];

const BlogSection = () => {
  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: gridRef, inView: gridIn } = useScrollReveal();

  return (
    <section className="blog-section-landing" id="blog">
      <div className="landing-container">
        <div
          ref={headRef}
          className={`blog-heading-wrap reveal reveal-up ${headIn ? 'in-view' : ''}`}
        >
          <span className="section-sub-label">Latest News &amp; Blog</span>
          <h2 className="blog-heading">
            Get Our Every Single Update — <span className="text-green-gradient">Latest News &amp; Blog</span>
          </h2>
        </div>

        <div ref={gridRef} className="blog-grid">
          {blogs.map((b, i) => (
            <div
              className={`blog-card reveal reveal-up ${i === 1 ? 'reveal-delay-2' : i === 2 ? 'reveal-delay-3' : ''} ${gridIn ? 'in-view' : ''}`}
              key={b.id}
            >
              <div className="blog-img-wrap">
                <img
                  src={`/assets/images/blog/${b.image}`}
                  alt={b.title}
                  className="blog-img"
                  onError={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #e8f5e9, #c8e6c9)';
                    e.target.style.opacity = '0';
                  }}
                />
                <div className="blog-tags">
                  {b.tags.slice(0, 2).map((t) => (
                    <span className="blog-tag" key={t}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="blog-body">
                <div className="blog-meta">
                  <i className="far fa-calendar-alt"></i> {b.date}
                </div>
                <h4 className="blog-title">
                  <a href={`/blog/${b.id}`}>{b.title}</a>
                </h4>
                <a href={`/blog/${b.id}`} className="blog-learn-more">
                  Learn More <i className="fas fa-arrow-right"></i>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="blog-view-more">
          <a href="/blog" className="solutions-cta-btn">
            View More News <i className="fas fa-arrow-right"></i>
          </a>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
