import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

export default function CookiePolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        
        {/* Header / Back Link */}
        <div style={{ marginBottom: '30px' }}>
          <Link to="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#10b981',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: '500',
            transition: 'color 0.2s'
          }}>
            <FaArrowLeft /> Back to Home
          </Link>
        </div>

        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #ffffff, rgba(255, 255, 255, 0.7))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Cookie Policy</h1>
        
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '40px' }}>
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div style={{ lineHeight: '1.7', color: 'rgba(255,255,255,0.85)' }}>
          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '15px', color: '#fff' }}>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your computer or mobile device when you visit a website. 
              They are widely used to make websites work more efficiently, as well as to provide information to the owners of the site.
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '15px', color: '#fff' }}>2. How We Use Cookies</h2>
            <p style={{ marginBottom: '10px' }}>We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. The cookies we use generally fall into the following categories:</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <strong style={{ color: '#10b981' }}>Necessary Cookies:</strong> These are essential for the website to function properly. They enable basic features like page navigation and access to secure areas. The website cannot function properly without these cookies.
              </li>
              <li>
                <strong style={{ color: '#10b981' }}>Analytics Cookies:</strong> These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve the way our website works.
              </li>
              <li>
                <strong style={{ color: '#10b981' }}>Advertising/Tracking Cookies:</strong> These cookies are used to track visitors across websites. The intention is to display ads that are relevant and engaging for the individual user and thereby more valuable for publishers and third party advertisers.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '15px', color: '#fff' }}>3. Managing Your Cookie Preferences</h2>
            <p>
              You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted.
            </p>
            <p style={{ marginTop: '15px' }}>
              You can also manage your preferences at any time by clicking the "Cookie Preferences" link located in the footer of our website.
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '15px', color: '#fff' }}>4. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time in order to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '15px', color: '#fff' }}>5. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies or other technologies, please use the chat widget on our website to contact our support team.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}