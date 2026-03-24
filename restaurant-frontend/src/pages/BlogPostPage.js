import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import apiClient, { sanitizeUrl } from '../api/apiClient';
import './BlogPostPage.css';

const BlogPostPage = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [blogRes, recentRes] = await Promise.all([
          apiClient.get(`/blogs/${id}`),
          apiClient.get('/blogs/recent?limit=3')
        ]);
        setBlog(blogRes.data.data);
        setRecentPosts(recentRes.data.data);
      } catch (error) {
        console.error('Failed to fetch blog details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="blog-post-page">
        <Navbar />
        <div className="landing-container loading-wrap">
          <div className="spinner-border text-primary" role="status"></div>
          <p>Loading your story...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="blog-post-page">
        <Navbar />
        <div className="landing-container error-wrap">
          <h2>Article Not Found</h2>
          <p>Sorry, the blog post you are looking for does not exist or has been removed.</p>
          <Link to="/blog" className="blog-back-btn">Back to Blog</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const tags = blog.tags ? blog.tags.split(',').map(t => t.trim()) : [];

  return (
    <div className="blog-post-page">
      <Navbar />

      <section className="blog-post-hero">
        <div className="landing-container">
          <div className="post-meta-top">
            <span className="post-cat-badge">{blog.category}</span>
            <span className="post-date-top">{new Date(blog.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1 className="post-full-title">{blog.title}</h1>
          <div className="post-author-wrap">
            <img src={`https://ui-avatars.com/api/?name=${blog.author}&background=006666&color=fff`} alt={blog.author} className="author-thumb" />
            <span>by <span className="author-name">{blog.author}</span></span>
          </div>
        </div>
      </section>

      <main className="blog-post-main landing-container">
        <div className="blog-post-layout">
          {/* Main Article */}
          <article className="blog-post-content">
            <div className="featured-image-wrap">
              <img 
                src={sanitizeUrl(blog.imageUrl)} 
                alt={blog.title} 
                className="full-featured-image"
                onError={(e) => { e.target.src = '/assets/images/blog/blog-details.jpg'; }}
              />
            </div>
            
            <div className="post-text-body">
              {/* If blog.content has HTML tags, we should use dangerouslySetInnerHTML, but for safety with dummy text we'll just map paragraphs */}
              {blog.content.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              
              {/* Dummy content for demonstration if original content is short */}
              {blog.content.length < 500 && (
                <>
                  <h3>Strategic Innovation in Feeding the Future</h3>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam id arcu sed eros hendrerit eleifend. 
                    Donec vel sapien pulvinar, accumsan nunc convallis, lacinia nisi. Pellentesque auctor mauris id 
                    nulla sollicitudin, ut efficitur metus porta. Curabitur vel lectus sem.
                  </p>
                  <ul>
                    <li>Seamless customer experience across all touchpoints</li>
                    <li>Real-time data for better decision making</li>
                    <li>Scalable infrastructure that grows with your business</li>
                  </ul>
                  <p>
                    Nullam rhoncus lectus vitae odio placerat vulputate. Proin venenatis purus non purus sollicitudin 
                    venenatis. In nec nunc a nulla eleifend rhoncus. Aliquam in nisl sit amet sapien scelerisque 
                    porttitor eu eget magna.
                  </p>
                </>
              )}
            </div>

            <div className="post-footer">
              <div className="post-tags">
                <strong>Tags:</strong>
                {tags.map(tag => (
                  <Link key={tag} to={`/blog?query=${tag}`} className="post-tag-item">{tag}</Link>
                ))}
              </div>
              <div className="post-share">
                <strong>Share this post:</strong>
                <div className="share-icons">
                  <a href="#"><i className="fab fa-facebook-f"></i></a>
                  <a href="#"><i className="fab fa-twitter"></i></a>
                  <a href="#"><i className="fab fa-linkedin-in"></i></a>
                  <a href="#"><i className="fab fa-whatsapp"></i></a>
                </div>
              </div>
            </div>
          </article>

          {/* Sidebar (Consistent with List Page) */}
          <aside className="blog-sidebar">
            <div className="sidebar-widget search-widget">
              <h4 className="widget-title">Search</h4>
              <form action="/blog" className="sidebar-search-form">
                <input type="text" name="query" placeholder="Keyword Search..." />
                <button type="submit"><i className="fas fa-search"></i></button>
              </form>
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
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="sidebar-back-widget">
               <Link to="/blog" className="back-link-sidebar">
                 <i className="fas fa-long-arrow-alt-left me-2"></i> Back to list
               </Link>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
