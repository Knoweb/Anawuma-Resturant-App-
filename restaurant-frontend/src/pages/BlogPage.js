import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import apiClient, { sanitizeUrl } from '../api/apiClient';
import './BlogPage.css';

const BlogPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const currentCategory = searchParams.get('category');
  const currentSearch = searchParams.get('query');

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (currentCategory) params.category = currentCategory;
      if (currentSearch) params.query = currentSearch;

      const res = await apiClient.get('/blogs', { params });
      setBlogs(res.data.data);
    } catch (error) {
      console.error('Failed to fetch blogs', error);
    } finally {
      setLoading(false);
    }
  }, [currentCategory, currentSearch]);

  const fetchSidebarData = async () => {
    try {
      const [catRes, recentRes] = await Promise.all([
        apiClient.get('/blogs/categories'),
        apiClient.get('/blogs/recent?limit=3')
      ]);
      setCategories(catRes.data.data);
      setRecentPosts(recentRes.data.data);
    } catch (error) {
      console.error('Failed to fetch sidebar data', error);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  useEffect(() => {
    fetchSidebarData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ query: searchQuery });
    } else {
      searchParams.delete('query');
      setSearchParams(searchParams);
    }
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery('');
  };

  return (
    <div className="blog-page">
      <Navbar />

      <section className="blog-hero">
        <div className="landing-container blog-hero-grid">
          <div className="blog-hero-image">
            <img src="/assets/images/blog/blog.png" alt="Blog Illustration" />
          </div>
          <div className="blog-hero-text">
            <span className="blog-hero-tag">OUR BLOG</span>
            <h1 className="blog-hero-title">Latest Articles & Insights</h1>
            <p className="blog-hero-desc">
              Explore the latest trends, tips, and insights in restaurant and hotel technology. Our 
              blog helps you stay ahead with smart tools, digital solutions, and industry best practices.
            </p>
            <p className="blog-hero-desc">
              From QR ordering to smart restaurant management, discover how Anawuma is 
              shaping the future of hospitality.
            </p>
            <button className="blog-hero-btn" onClick={() => document.getElementById('blog-main').scrollIntoView({ behavior: 'smooth' })}>
              READ BLOG
            </button>
          </div>
        </div>
      </section>

      <main id="blog-main" className="blog-main landing-container">
        <div className="blog-layout">
          {/* Main Content: List of Blogs */}
          <div className="blog-list-container">
            {currentCategory || currentSearch ? (
              <div className="filter-info">
                <span>
                  Showing posts for {currentCategory ? `category "${currentCategory}"` : ''} 
                  {currentCategory && currentSearch ? ' and ' : ''}
                  {currentSearch ? `search "${currentSearch}"` : ''}
                </span>
                <button onClick={clearFilters} className="clear-filter-btn">Clear All</button>
              </div>
            ) : null}

            {loading ? (
              <div className="blog-loading">Loading delicious insights...</div>
            ) : blogs.length === 0 ? (
              <div className="blog-empty">No blog posts found matching your criteria.</div>
            ) : (
              <div className="blog-cards-stack">
                {blogs.map((blog) => (
                  <article key={blog.id} className="blog-card">
                    <div className="blog-card-img-wrap">
                      <div className="blog-card-badge-ribbon"></div>
                      <Link to={`/blog/${blog.id}`}>
                        <img 
                          src={sanitizeUrl(blog.imageUrl)} 
                          alt={blog.title} 
                          className="blog-card-img"
                          onError={(e) => { e.target.src = '/assets/images/blog/blog1.jpg'; }}
                        />
                      </Link>
                    </div>
                    <div className="blog-card-body">
                      <div className="blog-card-date">
                        <i className="far fa-calendar-alt me-2"></i> 
                        {new Date(blog.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <h2 className="blog-card-title">
                        <Link to={`/blog/${blog.id}`}>{blog.title}</Link>
                      </h2>
                      <p className="blog-card-excerpt">
                        {blog.excerpt.length > 200 ? blog.excerpt.substring(0, 200) + '...' : blog.excerpt}
                      </p>
                      <Link to={`/blog/${blog.id}`} className="blog-read-more">
                        Read More <i className="fas fa-arrow-right ms-2"></i>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="blog-sidebar">
            <div className="sidebar-widget search-widget">
              <h4 className="widget-title">Search</h4>
              <form onSubmit={handleSearch} className="sidebar-search-form">
                <input 
                  type="text" 
                  placeholder="Keyword" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit"><i className="fas fa-search"></i></button>
              </form>
            </div>

            <div className="sidebar-widget categories-widget">
              <h4 className="widget-title">Category</h4>
              <ul className="sidebar-cat-list">
                {categories.map((cat) => (
                  <li key={cat.name}>
                    <button 
                      className={currentCategory === cat.name ? 'active' : ''}
                      onClick={() => setSearchParams({ category: cat.name })}
                    >
                      <span><i className="fas fa-chevron-right me-3"></i> {cat.name}</span>
                      <span className="cat-count">({cat.count})</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sidebar-widget recent-widget">
              <h4 className="widget-title">Recent News</h4>
              <ul className="sidebar-recent-list">
                {recentPosts.map((post) => (
                  <li key={post.id} className="recent-post-item">
                    <img 
                      src={sanitizeUrl(post.imageUrl)} 
                      alt={post.title} 
                      onError={(e) => { e.target.src = '/assets/images/blog/admin.jpg'; }}
                    />
                    <div className="recent-post-info">
                      <h5><Link to={`/blog/${post.id}`}>{post.title}</Link></h5>
                      <span><i className="far fa-calendar-alt me-1"></i> {new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sidebar-consultation-card">
              <h3>Need Any Consultation?</h3>
              <Link to="/contact" className="consult-btn">
                Contact Us <i className="fas fa-arrow-right ms-2"></i>
              </Link>
            </div>

            <div className="sidebar-widget tags-widget">
              <h4 className="widget-title">Popular Tags</h4>
              <div className="sidebar-tags-cloud">
                {['Restaurant', 'Management', 'Efficiency', 'Turnover', 'Hospitality', 'Service', 'Operations'].map(tag => (
                  <Link key={tag} to={`/blog?query=${tag}`} className="tag-link">{tag}</Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <section className="blog-footer-cta">
        <div className="landing-container cta-bg-box">
          <div className="cta-content">
            <h2>Ready to Enhance Your Hospitality Business?</h2>
            <p>Contact us today to learn more about Anawuma and how it can revolutionize the way you serve your guests.</p>
          </div>
          <Link to="/register" className="cta-reg-btn">
            Register Now <i className="fas fa-chevron-right ms-2"></i>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogPage;
