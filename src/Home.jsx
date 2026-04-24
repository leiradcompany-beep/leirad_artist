import { useEffect, useState } from 'react';
import Preloader from './Preloader.jsx';
import { FaFacebook, FaTiktok, FaInstagram } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { Turnstile } from '@marsidev/react-turnstile';

import { API_BASE_URL } from './config.js';

export default function Home() {
    const [data, setData] = useState(null);
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');

    useEffect(() => {
        fetch(`${API_BASE_URL}/get_home.php`)
            .then(res => res.json())
            .then(res => {
                if(res.success) setData(res);
            })
            .catch(() => {});
    }, []);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (email) {
            if (!turnstileToken) {
                toast.error('Please complete the security check.');
                return;
            }

            const loadingToast = toast.loading('Subscribing...');
            
            try {
                // Encode email to prevent casual viewing in Network tab
                // Note: This is obfuscation, not encryption. HTTPS provides actual transit security.
                const encodedEmail = btoa(encodeURIComponent(email));
                
                const response = await fetch(`${API_BASE_URL}/subscribe.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        email_encoded: encodedEmail,
                        turnstile_token: turnstileToken 
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    toast.success('Welcome! Check your email for a greeting message.', {
                        id: loadingToast,
                        duration: 5000
                    });
                    setSubscribed(true);
                    setEmail('');
                    setTimeout(() => setSubscribed(false), 5000);
                } else {
                    toast.error(data.error || 'Subscription failed. Please try again.', {
                        id: loadingToast
                    });
                }
            } catch (error) {
                console.error('Subscription error:', error);
                toast.error('Failed to subscribe. Please try again later.', {
                    id: loadingToast
                });
            }
        }
    };

    if (!data) return <Preloader />;

    const { data: home, releases } = data;

    return (
        <div style={{minHeight:'100vh', fontFamily: "'Inter', sans-serif"}}>
            <Toaster 
                position="top-center"
                toastOptions={{
                    style: {
                        background: '#18181b',
                        color: '#fff',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '500',
                        padding: '16px 20px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff'
                        }
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff'
                        }
                    },
                    loading: {
                        iconTheme: {
                            primary: '#3b82f6',
                            secondary: '#fff'
                        }
                    }
                }}
            />
            {home.full_bg_url && <div className="bg-blur" style={{ backgroundImage: `url('${home.full_bg_url}')` }}></div>}
            
            {/* Hero Section */}
            <div className="hero-section">
                {home.full_profile_url && <img src={home.full_profile_url} alt={home.artist_name} className="hero-profile-img" />}
                <h1>{home.artist_name}</h1>
                <h2>{home.hero_title}</h2>
                <p>{home.hero_subtitle}</p>

                <div className="social-links">
                    <a href="#" className="social-link"><FaInstagram /></a>
                    <a href="#" className="social-link"><FaFacebook /></a>
                    <a href="#" className="social-link"><FaTiktok /></a>
                </div>
            </div>

            {/* Releases Section */}
            <div className="releases-section">
                <h2 className="section-title">Latest Releases</h2>
                
                <div className="releases-grid">
                    {releases && releases.map(r => (
                        <a 
                            key={r.id} 
                            href={`/?s=${r.shortcode}`} 
                            className="release-card"
                        >
                            <img 
                                src={r.full_cover_url}
                                alt={r.title}
                            />
                            <h3>{r.title}</h3>
                            <p>{r.artist}</p>
                        </a>
                    ))}
                </div>
            </div>

            {/* Footer Section */}
            <footer className="footer">
                <div className="footer-container">
                    {/* Brand Section */}
                    <div className="footer-brand">
                        <h3>{home.artist_name}</h3>
                        <p>{home.hero_subtitle || 'Official artist website. Listen to the latest releases on all major platforms.'}</p>
                        
                        <div className="footer-socials">
                            <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                                <FaFacebook />
                            </a>
                            <a href="#" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                                <FaInstagram />
                            </a>
                            <a href="https://www.tiktok.com/@chen.official" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                                <FaTiktok />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="footer-column">
                        <h4>Quick Links</h4>
                        <div className="footer-links">
                            <a href="/" className="footer-link">Home</a>
                            <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" rel="noopener noreferrer" className="footer-link">Facebook</a>
                            <a href="https://www.tiktok.com/@chen.official" target="_blank" rel="noopener noreferrer" className="footer-link">TikTok</a>
                        </div>
                    </div>

                    {/* Latest Releases */}
                    <div className="footer-column">
                        <h4>Latest Releases</h4>
                        <div className="footer-releases">
                            {releases && releases.slice(0, 3).map(r => (
                                <a key={r.id} href={`/?s=${r.shortcode}`} className="footer-release-item">
                                    <img src={r.full_cover_url} alt={r.title} />
                                    <div className="footer-release-info">
                                        <p>{r.title}</p>
                                        <span>{r.artist}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Newsletter */}
                    <div className="footer-column footer-newsletter">
                        <h4>Stay Updated</h4>
                        <p>Subscribe to get the latest news and releases.</p>
                        <form onSubmit={handleSubscribe} className="subscription-form">
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                className="subscription-input"
                            />
                            
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <Turnstile 
                                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
                                    onSuccess={(token) => setTurnstileToken(token)}
                                    options={{ theme: 'dark' }}
                                />
                            </div>
                            
                            <button 
                                type="submit"
                                className={`subscription-button ${subscribed ? 'success' : ''}`}
                                disabled={subscribed}
                            >
                                {subscribed ? '✓ Subscribed!' : 'Subscribe'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Copyright */}
                <div className="footer-copyright">
                    <p>&copy; {new Date().getFullYear()} {home.artist_name}. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
