import { useEffect, useState } from 'react';
import Preloader from './Preloader.jsx';
import { FaFacebook, FaTiktok, FaInstagram, FaSpotify, FaPlay } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion } from 'framer-motion';

import { API_BASE_URL } from './config.js';

// --- Animation Configuration ---
// These variants handle the smooth reveal animations when scrolling
const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1
        }
    }
};

const cardVariant = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default function Home() {
    const [data, setData] = useState(null);
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');

    useEffect(() => {
        // Fetch Homepage Data
        fetch(`${API_BASE_URL}/get_home.php`)
            .then(res => res.json())
            .then(res => {
                if(res.success) setData(res);
            })
            .catch(() => {});

        // Load Tawk.to Chat Widget
        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
        (function() {
            var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
            s1.async = true;
            s1.src = 'https://embed.tawk.to/69f18b77db9e841c36b065d3/1jnbohiu5';
            s1.charset = 'UTF-8';
            s1.setAttribute('crossorigin', '*');
            s0.parentNode.insertBefore(s1, s0);
        })();
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
                const encodedEmail = btoa(encodeURIComponent(email));
                
                const response = await fetch(`${API_BASE_URL}/subscribe.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
        <div className="home-container">
            {/* Elegant Toast Notifications */}
            <Toaster 
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'rgba(24, 24, 27, 0.85)',
                        backdropFilter: 'blur(12px)',
                        color: '#fff',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        padding: '16px 24px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }
                }}
            />
            
            {/* Cinematic Background */}
            {home.full_bg_url && (
                <div className="bg-blur" style={{ backgroundImage: `url('${home.full_bg_url}')` }}></div>
            )}
            <div className="gradient-overlay"></div>
            
            {/* Hero Section */}
            <motion.div 
                className="hero-section"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.3 }}
                variants={staggerContainer}
            >
                {home.full_profile_url && (
                    <motion.div variants={fadeUp} className="profile-image-container">
                        <img src={home.full_profile_url} alt={home.artist_name} className="profile-image" />
                    </motion.div>
                )}
                <motion.h1 variants={fadeUp} className="hero-title">{home.artist_name}</motion.h1>
                <motion.h2 variants={fadeUp} className="hero-subtitle">{home.hero_title}</motion.h2>
                <motion.p variants={fadeUp} className="hero-desc">{home.hero_subtitle}</motion.p>
            </motion.div>

            {/* Releases Section */}
            <motion.div 
                className="releases-section"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.1 }}
                variants={staggerContainer}
            >
                {/* Desktop Grid */}
                <div className="releases-grid-desktop">
                    <motion.h2 variants={fadeUp} className="section-title">Latest Releases</motion.h2>
                    <motion.div className="grid-container" variants={staggerContainer}>
                        {releases && releases.map(r => (
                            <motion.a 
                                key={r.id} 
                                href={`/?s=${r.shortcode}`} 
                                className="release-card modern-card"
                                variants={cardVariant}
                                whileHover={{ y: -10 }}
                            >
                                <div className="card-image-wrapper">
                                    <img src={r.full_cover_url} alt={r.title} />
                                    <div className="play-overlay"><FaPlay size={24} /></div>
                                </div>
                                <div className="card-content">
                                    <h3>{r.title}</h3>
                                    <p>{r.artist}</p>
                                    {r.stream_count && (
                                        <span className="stream-badge">
                                            <FaSpotify size={12} /> {r.stream_count} Streams
                                        </span>
                                    )}
                                </div>
                            </motion.a>
                        ))}
                    </motion.div>
                </div>

                {/* Mobile Carousel */}
                <div className="releases-carousel-mobile">
                    <motion.h2 variants={fadeUp} className="section-title">Latest Releases</motion.h2>
                    <motion.div className="carousel-container" variants={staggerContainer}>
                        {releases && releases.map(r => (
                            <motion.a 
                                key={r.id} 
                                href={`/?s=${r.shortcode}`} 
                                className="release-card modern-card"
                                variants={cardVariant}
                            >
                                <div className="card-image-wrapper">
                                    <img src={r.full_cover_url} alt={r.title} />
                                    <div className="play-overlay"><FaPlay size={18} /></div>
                                </div>
                                <div className="card-content">
                                    <h3>{r.title}</h3>
                                    <p>{r.artist}</p>
                                    {r.stream_count && (
                                        <span className="stream-badge">
                                            <FaSpotify size={10} /> {r.stream_count} Streams
                                        </span>
                                    )}
                                </div>
                            </motion.a>
                        ))}
                    </motion.div>
                    <motion.p variants={fadeUp} className="swipe-indicator">← Swipe to see more →</motion.p>
                </div>
            </motion.div>

            {/* Footer Section */}
            <motion.footer
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.2 }}
                variants={staggerContainer}
                className="modern-footer"
            >
                <div className="footer-grid">
                    {/* Brand Section */}
                    <motion.div variants={fadeUp}>
                        <h3 className="footer-brand">{home.artist_name}</h3>
                        <p className="footer-desc">
                            {home.hero_subtitle || 'Official artist website. Listen to the latest releases on all major platforms.'}
                        </p>
                        <div className="social-links">
                            <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" rel="noopener noreferrer"><FaFacebook /></a>
                            <a href="#" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
                            <a href="https://www.tiktok.com/@leirad.g.official" target="_blank" rel="noopener noreferrer"><FaTiktok /></a>
                        </div>
                    </motion.div>

                    {/* Quick Links */}
                    <motion.div variants={fadeUp}>
                        <h4 className="footer-heading">Quick Links</h4>
                        <div className="footer-links">
                            <a href="/">Home</a>
                            <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" rel="noopener noreferrer">Facebook</a>
                            <a href="https://www.tiktok.com/@chen.official" target="_blank" rel="noopener noreferrer">TikTok</a>
                        </div>
                    </motion.div>

                    {/* Latest Releases Mini List */}
                    <motion.div variants={fadeUp}>
                        <h4 className="footer-heading">Latest Releases</h4>
                        <div className="footer-releases">
                            {releases && releases.slice(0, 3).map(r => (
                                <a key={r.id} href={`/?s=${r.shortcode}`} className="mini-release">
                                    <img src={r.full_cover_url} alt={r.title} />
                                    <div>
                                        <p className="mini-title">{r.title}</p>
                                        <p className="mini-artist">{r.artist}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Newsletter */}
                    <motion.div variants={fadeUp}>
                        <h4 className="footer-heading">Stay Updated</h4>
                        <p className="footer-desc">Subscribe to get the latest news and releases.</p>
                        <form onSubmit={handleSubscribe} className="newsletter-form">
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                            />
                            <div className="turnstile-wrapper">
                                <Turnstile 
                                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
                                    onSuccess={(token) => setTurnstileToken(token)}
                                    options={{ theme: 'dark' }}
                                />
                            </div>
                            <button type="submit" className={subscribed ? 'subscribed' : ''}>
                                {subscribed ? '✓ Subscribed!' : 'Subscribe'}
                            </button>
                        </form>
                    </motion.div>
                </div>

                <motion.div variants={fadeUp} className="copyright">
                    <p>&copy; {new Date().getFullYear()} {home.artist_name}. All rights reserved.</p>
                </motion.div>
            </motion.footer>

            {/* Global & Scoped CSS */}
            <style>{`
                /* Base & Background */
                .home-container {
                    min-height: 100vh;
                    font-family: 'Inter', sans-serif;
                    color: #fff;
                    overflow-x: hidden;
                }
                .bg-blur {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background-size: cover; background-position: center;
                    filter: blur(25px) brightness(0.35);
                    transform: scale(1.1); /* Prevents blurred edges from showing background */
                    z-index: -2;
                }
                .gradient-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(10,10,12,0.95) 100%);
                    z-index: -1;
                }

                /* Hero Section */
                .hero-section {
                    min-height: 75vh;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    text-align: center; padding: 60px 20px 20px;
                }
                .profile-image-container { position: relative; margin-bottom: 35px; }
                .profile-image-container::after {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                    border-radius: 50%; box-shadow: 0 0 60px rgba(255,255,255,0.15); z-index: -1;
                }
                .profile-image {
                    width: 170px; height: 170px; border-radius: 50%; object-fit: cover;
                    border: 4px solid rgba(255,255,255,0.15);
                    transition: transform 0.4s ease, border-color 0.4s ease;
                }
                .profile-image:hover { transform: scale(1.05); border-color: rgba(255,255,255,0.4); }
                .hero-title { font-size: 4rem; font-weight: 800; margin: 0; letter-spacing: -1px; text-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .hero-subtitle { font-size: 1.5rem; font-weight: 400; color: rgba(255,255,255,0.85); margin: 15px 0 10px; }
                .hero-desc { font-size: 1.1rem; color: rgba(255,255,255,0.6); max-width: 600px; margin: 0 auto; line-height: 1.6; }

                /* Releases Section */
                .releases-section { padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
                .section-title { font-size: 2.2rem; font-weight: 700; margin-bottom: 40px; text-align: center; letter-spacing: -0.5px; }
                
                /* Glassmorphism Card */
                .modern-card {
                    display: flex; flex-direction: column; text-decoration: none; color: #fff;
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 20px; padding: 16px; overflow: hidden;
                    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .modern-card:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.25);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
                
                .card-image-wrapper { position: relative; border-radius: 12px; overflow: hidden; aspect-ratio: 1/1; }
                .card-image-wrapper img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
                .modern-card:hover .card-image-wrapper img { transform: scale(1.1); }
                
                /* Hover Play Overlay */
                .play-overlay {
                    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
                    display: flex; align-items: center; justify-content: center;
                    opacity: 0; transition: all 0.3s ease; color: #fff;
                    transform: scale(0.9);
                }
                .modern-card:hover .play-overlay { opacity: 1; transform: scale(1); }
                
                .card-content { padding-top: 18px; }
                .card-content h3 { margin: 0 0 6px 0; font-size: 1.15rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .card-content p { margin: 0; font-size: 0.95rem; color: rgba(255,255,255,0.6); }
                
                .stream-badge {
                    display: inline-flex; align-items: center; gap: 6px; margin-top: 12px;
                    padding: 5px 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25);
                    border-radius: 20px; color: #10b981; font-size: 0.8rem; font-weight: 600;
                }

                /* Footer */
                .modern-footer {
                    background: rgba(15, 15, 18, 0.7); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
                    border-top: 1px solid rgba(255,255,255,0.05); padding: 80px 20px 30px; margin-top: 40px;
                }
                .footer-grid {
                    max-width: 1100px; margin: 0 auto; display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 50px; margin-bottom: 60px;
                }
                .footer-brand { font-size: 1.6rem; font-weight: 700; margin: 0 0 15px 0; letter-spacing: 0.5px; }
                .footer-desc { font-size: 0.95rem; color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 25px 0; }
                
                /* Social Icons */
                .social-links { display: flex; gap: 15px; }
                .social-links a {
                    width: 44px; height: 44px; border-radius: 50%;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    display: flex; align-items: center; justify-content: center; color: #fff;
                    text-decoration: none; font-size: 1.2rem; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .social-links a:hover { background: #fff; color: #000; transform: translateY(-5px) scale(1.1); box-shadow: 0 10px 20px rgba(255,255,255,0.2); }
                
                .footer-heading { font-size: 1rem; font-weight: 600; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.9); }
                
                /* Quick Links */
                .footer-links { display: flex; flex-direction: column; gap: 12px; }
                .footer-links a { color: rgba(255,255,255,0.6); text-decoration: none; transition: all 0.2s ease; font-size: 0.95rem; display: inline-block; }
                .footer-links a:hover { color: #fff; transform: translateX(6px); }
                
                /* Mini Releases in Footer */
                .footer-releases { display: flex; flex-direction: column; gap: 12px; }
                .mini-release { display: flex; align-items: center; gap: 15px; text-decoration: none; color: inherit; padding: 8px; border-radius: 12px; transition: background 0.3s ease; }
                .mini-release:hover { background: rgba(255,255,255,0.08); }
                .mini-release img { width: 55px; height: 55px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
                .mini-title { margin: 0; font-size: 0.95rem; font-weight: 600; }
                .mini-artist { margin: 4px 0 0; font-size: 0.8rem; color: rgba(255,255,255,0.6); }
                
                /* Newsletter Input */
                .newsletter-form { display: flex; flex-direction: column; gap: 12px; }
                .newsletter-form input {
                    width: 100%; padding: 14px 16px; border-radius: 12px; font-size: 0.95rem;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
                    color: #fff; outline: none; transition: all 0.3s ease; box-sizing: border-box;
                }
                .newsletter-form input:focus { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.4); box-shadow: 0 0 0 4px rgba(255,255,255,0.05); }
                .turnstile-wrapper { display: flex; justify-content: flex-start; margin: 4px 0; }
                .newsletter-form button {
                    width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 0.95rem; font-weight: 600; cursor: pointer;
                    background: #fff; color: #000; transition: all 0.3s ease;
                }
                .newsletter-form button:hover { background: rgba(255,255,255,0.8); transform: translateY(-2px); }
                .newsletter-form button.subscribed { background: #10b981; color: #fff; pointer-events: none; }
                
                .copyright { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 30px; text-align: center; color: rgba(255,255,255,0.4); font-size: 0.85rem; }

                /* Layout Responsiveness */
                @media (max-width: 768px) {
                    .hero-title { font-size: 2.8rem; }
                    .releases-grid-desktop { display: none !important; }
                    .releases-carousel-mobile { display: block !important; }
                    
                    .carousel-container {
                        display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory;
                        padding: 10px 0 30px 0; scrollbar-width: none; -webkit-overflow-scrolling: touch;
                    }
                    .carousel-container::-webkit-scrollbar { display: none; }
                    .carousel-container > a { min-width: 180px; max-width: 180px; scroll-snap-align: start; }
                    
                    .swipe-indicator { text-align: center; font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: -10px; }
                    .footer-grid { grid-template-columns: 1fr; gap: 40px; }
                }
                
                @media (min-width: 769px) {
                    .releases-carousel-mobile { display: none !important; }
                    .grid-container {
                        display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px;
                    }
                }
            `}</style>
        </div>
    );
}
