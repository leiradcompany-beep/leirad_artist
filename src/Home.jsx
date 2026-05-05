import { useEffect, useState } from 'react';
import Preloader from './Preloader.jsx';
import { 
    FaFacebook, 
    FaTiktok, 
    FaInstagram, 
    FaSpotify, 
    FaTh, 
    FaList, 
    FaThLarge, 
    FaApple, 
    FaYoutube, 
    FaAmazon 
} from 'react-icons/fa';
import { SiTidal } from 'react-icons/si';
import toast, { Toaster } from 'react-hot-toast';
import { Turnstile } from '@marsidev/react-turnstile';

import { API_BASE_URL } from './config.js';

export default function Home() {
    const [data, setData] = useState(null);
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [releaseView, setReleaseView] = useState('grid'); // Default view: grid, list, carousel
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Number of releases per page

    useEffect(() => {
        fetch(`${API_BASE_URL}/get_home.php`)
            .then(res => res.json())
            .then(res => {
                if (res.success) setData(res);
            })
            .catch(() => { });

        // Load Tawk.to Chat Widget
        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
        (function () {
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
                // Encode email to prevent casual viewing in Network tab
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

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentReleases = releases ? releases.slice(indexOfFirstItem, indexOfLastItem) : [];
    const totalPages = releases ? Math.ceil(releases.length / itemsPerPage) : 0;

    // Reset to page 1 when view changes
    const handleViewChange = (view) => {
        setReleaseView(view);
        setCurrentPage(1);
    };

    // Pagination controls
    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div style={{ minHeight: '100vh', fontFamily: "'Inter', sans-serif", position: 'relative', overflowX: 'hidden' }}>
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
                        iconTheme: { primary: '#10b981', secondary: '#fff' }
                    },
                    error: {
                        iconTheme: { primary: '#ef4444', secondary: '#fff' }
                    },
                    loading: {
                        iconTheme: { primary: '#3b82f6', secondary: '#fff' }
                    }
                }}
            />

            {/* Aesthetic Animated Background Wrapper */}
            <div className="modern-bg-wrapper">
                {home.full_bg_url && (
                    <div 
                        className="modern-bg-image" 
                        style={{ backgroundImage: `url('${home.full_bg_url}')` }}
                    ></div>
                )}
                <div className="modern-bg-overlay"></div>
                {/* Floating Ambient Globs */}
                <div className="ambient-blob blob-1"></div>
                <div className="ambient-blob blob-2"></div>
                <div className="ambient-blob blob-3"></div>
            </div>

            {/* Main Content Container (z-index 1 so it sits above background) */}
            <div className="main-content-layer">
                
                {/* Hero Section */}
                <div className="hero-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '80px' }}>
                    <h1>{home.artist_name}</h1>
                    <h2>{home.hero_title}</h2>
                    
                    {/* Profile Image (Swapped from About Section) */}
                    {home.full_about_me_image_url ? (
                        <img
                            src={home.full_about_me_image_url}
                            alt="Profile"
                            className="hero-image"
                        />
                    ) : (
                        <div className="hero-image-placeholder">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                    )}
                    
                    <p>{home.hero_subtitle}</p>
                </div>

                {/* Releases Section */}
                <div className="releases-section">
                    <div className="releases-header">
                        <h2 className="releases-title">Latest Releases</h2>
                        <div className="view-toggle">
                            <button
                                className={`view-btn ${releaseView === 'grid' ? 'active' : ''}`}
                                onClick={() => handleViewChange('grid')}
                                title="Grid View"
                            >
                                <FaTh />
                            </button>
                            <button
                                className={`view-btn ${releaseView === 'list' ? 'active' : ''}`}
                                onClick={() => handleViewChange('list')}
                                title="List View"
                            >
                                <FaList />
                            </button>
                            <button
                                className={`view-btn ${releaseView === 'carousel' ? 'active' : ''}`}
                                onClick={() => handleViewChange('carousel')}
                                title="Carousel View"
                            >
                                <FaThLarge />
                            </button>
                        </div>
                    </div>

                    {/* Grid View */}
                    <div className={`releases-container ${releaseView === 'grid' ? 'view-grid' : ''}`}>
                        {currentReleases && currentReleases.map(r => (
                            <a
                                key={r.id}
                                href={`/?s=${r.shortcode}`}
                                className="release-card"
                            >
                                <img src={r.full_cover_url} alt={r.title} />
                                <h3>{r.title}</h3>
                                <p>{r.artist}</p>
                                {r.stream_count && (
                                    <p style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                        <FaSpotify size={12} />
                                        {r.stream_count} Streams
                                    </p>
                                )}
                                <div className="platform-icons">
                                    <FaSpotify title="Spotify" />
                                    <FaApple title="Apple Music" />
                                    <FaYoutube title="YouTube Music" />
                                    <FaAmazon title="Amazon Music" />
                                    <SiTidal title="Tidal" />
                                </div>
                            </a>
                        ))}
                    </div>

                    {/* List View */}
                    <div className={`releases-container ${releaseView === 'list' ? 'view-list' : ''}`}>
                        {currentReleases && currentReleases.map(r => (
                            <a
                                key={r.id}
                                href={`/?s=${r.shortcode}`}
                                className="release-card-list"
                            >
                                <img src={r.full_cover_url} alt={r.title} />
                                <div className="release-info">
                                    <h3>{r.title}</h3>
                                    <p>{r.artist}</p>
                                    {r.stream_count && (
                                        <p style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 4 }}>
                                            <FaSpotify size={12} />
                                            {r.stream_count} Streams
                                        </p>
                                    )}
                                    <div className="platform-icons">
                                        <FaSpotify title="Spotify" />
                                        <FaApple title="Apple Music" />
                                        <FaYoutube title="YouTube Music" />
                                        <FaAmazon title="Amazon Music" />
                                        <SiTidal title="Tidal" />
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>

                    {/* Carousel View */}
                    <div className={`releases-container ${releaseView === 'carousel' ? 'view-carousel' : ''}`}>
                        <div className="carousel-wrapper">
                            {currentReleases && currentReleases.map(r => (
                                <a
                                    key={r.id}
                                    href={`/?s=${r.shortcode}`}
                                    className="release-card"
                                    style={{
                                        minWidth: 160,
                                        maxWidth: 160,
                                        flexShrink: 0,
                                        scrollSnapAlign: 'start'
                                    }}
                                >
                                    <img src={r.full_cover_url} alt={r.title} />
                                    <h3>{r.title}</h3>
                                    <p>{r.artist}</p>
                                    {r.stream_count && (
                                        <p style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                            <FaSpotify size={12} />
                                            {r.stream_count} Streams
                                        </p>
                                    )}
                                    <div className="platform-icons">
                                        <FaSpotify title="Spotify" />
                                        <FaApple title="Apple Music" />
                                        <FaYoutube title="YouTube Music" />
                                        <FaAmazon title="Amazon Music" />
                                        <SiTidal title="Tidal" />
                                    </div>
                                </a>
                            ))}
                        </div>
                        <p className="carousel-hint">← Swipe to see more →</p>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="pagination-container">
                            <button
                                className="pagination-btn"
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                ← Previous
                            </button>

                            <div className="pagination-numbers">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                    <button
                                        key={number}
                                        className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                                        onClick={() => paginate(number)}
                                    >
                                        {number}
                                    </button>
                                ))}
                            </div>

                            <button
                                className="pagination-btn"
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>

                {/* About Me Section */}
                {home.about_me_content && (
                    <div className="about-section">
                        <div className="about-container">
                            <div className="about-image-wrapper">
                                {/* Spotify Embed (Swapped from Hero Section) */}
                                <iframe
                                    className="spotify-embed"
                                    data-testid="embed-iframe"
                                    style={{ borderRadius: '12px' }}
                                    src="https://open.spotify.com/embed/artist/78yrPwOcBEFSnaUPOycNmS?utm_source=generator"
                                    width="100%"
                                    height="352"
                                    frameBorder="0"
                                    allowFullScreen
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                ></iframe>
                            </div>
                            <div className="about-content">
                                <h2 className="about-title">{home.about_me_title || 'About Me'}</h2>
                                <div
                                    className="about-text"
                                    dangerouslySetInnerHTML={{ __html: home.about_me_content }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Section */}
                <footer>
                    <div style={{
                        maxWidth: 1000,
                        margin: '0 auto',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 40,
                        marginBottom: 40
                    }} className="footer-grid">
                        {/* Brand Section */}
                        <div>
                            <h3 style={{
                                fontSize: 22,
                                fontWeight: 700,
                                margin: '0 0 15px 0',
                                letterSpacing: 1
                            }}>{home.artist_name}</h3>
                            <p style={{
                                fontSize: 14,
                                lineHeight: 1.6,
                                margin: '0 0 20px 0'
                            }}>{home.hero_subtitle || 'Official artist website. Listen to the latest releases on all major platforms.'}</p>

                            {/* Social Media Icons */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                                    <FaFacebook />
                                </a>
                                <a href="#" target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                                    <FaInstagram />
                                </a>
                                <a href="https://www.tiktok.com/@leirad.g.official" target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                                    <FaTiktok />
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 style={{
                                fontSize: 14,
                                fontWeight: 600,
                                margin: '0 0 15px 0',
                                textTransform: 'uppercase',
                                letterSpacing: 1.5
                            }}>Quick Links</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <a href="/" className="footer-link">Home</a>
                                <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" rel="noopener noreferrer" className="footer-link">Facebook</a>
                                <a href="https://www.tiktok.com/@chen.official" target="_blank" rel="noopener noreferrer" className="footer-link">TikTok</a>
                            </div>
                        </div>

                        {/* Latest Releases */}
                        <div>
                            <h4 style={{
                                fontSize: 14,
                                fontWeight: 600,
                                margin: '0 0 15px 0',
                                textTransform: 'uppercase',
                                letterSpacing: 1.5
                            }}>Latest Releases</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {releases && releases.slice(0, 3).map(r => (
                                    <a key={r.id} href={`/?s=${r.shortcode}`} className="footer-release-item">
                                        <img src={r.full_cover_url} alt={r.title} />
                                        <div>
                                            <p className="footer-release-title">{r.title}</p>
                                            <p className="footer-release-artist">{r.artist}</p>
                                            {r.stream_count && (
                                                <p className="footer-release-streams">
                                                    <FaSpotify size={10} />
                                                    {r.stream_count} Streams
                                                </p>
                                            )}
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Newsletter */}
                        <div>
                            <h4 style={{
                                fontSize: 14,
                                fontWeight: 600,
                                margin: '0 0 15px 0',
                                textTransform: 'uppercase',
                                letterSpacing: 1.5
                            }}>Stay Updated</h4>
                            <p style={{
                                fontSize: 14,
                                lineHeight: 1.6,
                                margin: '0 0 15px 0'
                            }}>Subscribe to get the latest news and releases.</p>
                            <form onSubmit={handleSubscribe}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        required
                                        className="newsletter-input"
                                    />

                                    {/* Cloudflare Turnstile */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        margin: '5px 0'
                                    }}>
                                        <Turnstile
                                            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                                            onSuccess={(token) => setTurnstileToken(token)}
                                            options={{ theme: 'dark' }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className={`newsletter-btn ${subscribed ? 'subscribed' : ''}`}
                                    >
                                        {subscribed ? '✓ Subscribed!' : 'Subscribe'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div style={{
                        borderTop: '1px solid rgba(255,255,255,0.15)',
                        paddingTop: 25,
                        textAlign: 'center'
                    }}>
                        <p style={{
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.5)',
                            margin: 0
                        }}>
                            &copy; {new Date().getFullYear()} {home.artist_name}. All rights reserved.
                        </p>
                    </div>
                </footer>
            </div>

            {/* Responsive & Aesthetic Styles */}
            <style>{`
                /* Modern Animated Background Setup */
                .modern-bg-wrapper {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    z-index: -1;
                    overflow: hidden;
                    background-color: #0f0f12; /* Deep modern dark base */
                }

                .modern-bg-image {
                    position: absolute;
                    top: -5%;
                    left: -5%;
                    width: 110%;
                    height: 110%;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    filter: blur(12px) brightness(0.5);
                    animation: backgroundBreath 25s infinite alternate ease-in-out;
                }

                .modern-bg-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(circle at center, transparent 0%, rgba(10, 10, 12, 0.8) 100%);
                    z-index: 1;
                }

                /* Aesthetic Ambient Globs */
                .ambient-blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(90px);
                    opacity: 0.5;
                    z-index: 2;
                    animation: floatGlob 20s infinite ease-in-out alternate;
                }
                
                .blob-1 {
                    width: 400px;
                    height: 400px;
                    background: #10b981; /* Spotify Green vibe */
                    top: -10%;
                    left: -10%;
                    animation-delay: 0s;
                }
                
                .blob-2 {
                    width: 500px;
                    height: 500px;
                    background: #3b82f6; /* Deep Blue vibe */
                    bottom: -20%;
                    right: -10%;
                    animation-delay: -5s;
                }

                .blob-3 {
                    width: 350px;
                    height: 350px;
                    background: #8b5cf6; /* Purple vibe */
                    top: 40%;
                    left: 50%;
                    transform: translateX(-50%);
                    animation-delay: -10s;
                }

                @keyframes backgroundBreath {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }

                @keyframes floatGlob {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(60px, 80px) scale(1.2); }
                    100% { transform: translate(-40px, 40px) scale(0.9); }
                }

                /* Container for actual content to sit above background */
                .main-content-layer {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                }

                /* Spotify Embed Responsive */
                .spotify-embed {
                    width: 100%;
                    max-width: 400px;
                    height: 352px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
                    transition: transform 0.4s ease;
                }

                .spotify-embed:hover {
                    transform: translateY(-5px);
                }
                
                /* Hero Image Styles */
                .hero-image {
                    width: 100%;
                    max-width: 250px;
                    height: 250px;
                    border-radius: 50%;
                    object-fit: cover;
                    margin: 20px 0;
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
                    border: 4px solid rgba(255, 255, 255, 0.15);
                    transition: all 0.5s ease;
                }

                .hero-image:hover {
                    transform: scale(1.03) rotate(2deg);
                    border-color: rgba(16, 185, 129, 0.5);
                    box-shadow: 0 20px 50px rgba(16, 185, 129, 0.3);
                }
                
                .hero-image-placeholder {
                    width: 100%;
                    max-width: 250px;
                    height: 250px;
                    border-radius: 50%;
                    margin: 20px 0;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
                    border: 2px dashed rgba(255, 255, 255, 0.15);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: rgba(255, 255, 255, 0.3);
                }

                /* Music Platform Icons */
                .platform-icons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    align-items: center;
                    margin-top: 15px;
                    color: rgba(255, 255, 255, 0.4);
                }

                .release-card-list .platform-icons {
                    justify-content: flex-start;
                    margin-top: 10px;
                }

                .platform-icons svg {
                    font-size: 16px;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .release-card:hover .platform-icons svg,
                .release-card-list:hover .platform-icons svg {
                    color: rgba(255, 255, 255, 0.8);
                }

                .platform-icons svg:hover {
                    color: #fff !important;
                    transform: scale(1.25) translateY(-2px);
                }

                /* Release Cards Aesthetic Update */
                .release-card, .release-card-list {
                    background: rgba(25, 25, 30, 0.4);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .release-card:hover, .release-card-list:hover {
                    background: rgba(30, 30, 35, 0.6);
                    border-color: rgba(255, 255, 255, 0.15);
                    transform: translateY(-8px);
                    box-shadow: 0 15px 40px rgba(0,0,0,0.4);
                }
                
                /* Releases Section Header */
                .releases-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                
                .releases-title {
                    margin: 0;
                    font-size: 32px;
                    font-weight: 800;
                    background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                /* View Toggle Buttons */
                .view-toggle {
                    display: flex;
                    gap: 8px;
                    background: rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(10px);
                    padding: 6px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                
                .view-btn {
                    width: 44px;
                    height: 44px;
                    border: none;
                    background: transparent;
                    color: rgba(255, 255, 255, 0.5);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                
                .view-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.9);
                }
                
                .view-btn.active {
                    background: rgba(255, 255, 255, 0.2);
                    color: #fff;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                }
                
                /* Releases Container */
                .releases-container { display: none; }
                .releases-container.view-grid,
                .releases-container.view-list,
                .releases-container.view-carousel { display: block; }
                
                .releases-container.view-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 25px;
                }
                
                .releases-container.view-list {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                .release-card-list {
                    display: flex;
                    align-items: center;
                    gap: 25px;
                    padding: 15px;
                }
                
                .release-card-list img {
                    width: 90px;
                    height: 90px;
                    border-radius: 10px;
                    object-fit: cover;
                    flex-shrink: 0;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                
                .release-card-list .release-info { flex: 1; }
                
                .release-card-list h3 {
                    margin: 0 0 5px 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #fff !important;
                }
                
                .release-card-list p {
                    margin: 0;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7) !important;
                }
                
                /* Carousel View */
                .releases-container.view-carousel .carousel-wrapper {
                    display: flex;
                    gap: 20px;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                    padding-bottom: 25px;
                    margin-bottom: 10px;
                    scrollbar-width: none;
                }
                
                .releases-container.view-carousel .carousel-wrapper::-webkit-scrollbar {
                    display: none;
                }
                
                .carousel-hint {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.4);
                    text-align: center;
                    margin: 10px 0 0 0;
                    letter-spacing: 1px;
                }
                
                /* Pagination Styles */
                .pagination-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 15px;
                    margin-top: 50px;
                    padding: 20px 0;
                }
                
                .pagination-btn, .pagination-number {
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }

                .pagination-btn {
                    padding: 10px 22px;
                    border-radius: 10px;
                    font-size: 14px;
                }

                .pagination-number {
                    min-width: 42px;
                    height: 42px;
                    padding: 0 12px;
                    border-radius: 10px;
                    font-size: 15px;
                }
                
                .pagination-btn:hover:not(:disabled), .pagination-number:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    transform: translateY(-3px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                
                .pagination-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
                
                .pagination-number.active {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                    border-color: rgba(16, 185, 129, 0.5);
                    box-shadow: 0 5px 20px rgba(16, 185, 129, 0.2);
                }
                
                /* About Me Section */
                .about-section {
                    padding: 100px 20px;
                    margin: 0 auto;
                    max-width: 1200px;
                }
                
                .about-container {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    gap: 60px;
                    align-items: center;
                    background: rgba(20, 20, 25, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 30px;
                    padding: 60px;
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
                }
                
                .about-image-wrapper {
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .about-content {
                    display: flex;
                    flex-direction: column;
                    gap: 25px;
                }
                
                .about-title {
                    font-size: 48px;
                    font-weight: 800;
                    margin: 0;
                    background: linear-gradient(135deg, #ffffff, #a1a1aa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    line-height: 1.2;
                }
                
                .about-text {
                    font-size: 16px;
                    line-height: 1.9;
                    color: rgba(255, 255, 255, 0.8);
                }
                
                .about-text a {
                    color: #10b981;
                    text-decoration: none;
                    transition: color 0.2s;
                    border-bottom: 1px solid transparent;
                }
                
                .about-text a:hover {
                    color: #34d399;
                    border-bottom-color: #34d399;
                }

                /* Footer Custom Styles */
                .social-icon-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    font-size: 20px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .social-icon-btn:hover {
                    background: rgba(255,255,255,0.15);
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                    border-color: rgba(255,255,255,0.2);
                }

                .footer-link {
                    text-decoration: none;
                    font-size: 15px;
                    color: rgba(255,255,255,0.6);
                    transition: all 0.2s;
                    padding: 4px 0;
                }
                .footer-link:hover {
                    color: #fff;
                    padding-left: 8px;
                }

                .footer-release-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    text-decoration: none;
                    color: inherit;
                    transition: all 0.3s ease;
                    padding: 8px;
                    border-radius: 10px;
                    background: transparent;
                }
                .footer-release-item:hover {
                    background: rgba(255,255,255,0.05);
                    transform: translateX(5px);
                }
                .footer-release-item img {
                    width: 50px;
                    height: 50px;
                    border-radius: 8px;
                    object-fit: cover;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .footer-release-title { margin: 0; font-size: 15px; font-weight: 600; color: #fff; }
                .footer-release-artist { margin: 3px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.6); }
                .footer-release-streams { margin: 5px 0 0 0; font-size: 12px; color: #10b981; display: flex; align-items: center; gap: 4px; }

                .newsletter-input {
                    width: 100%;
                    padding: 14px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(0,0,0,0.3);
                    color: #fff;
                    font-size: 15px;
                    outline: none;
                    box-sizing: border-box;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                }
                .newsletter-input:focus {
                    border-color: rgba(16, 185, 129, 0.5);
                    background: rgba(0,0,0,0.5);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                }

                .newsletter-btn {
                    width: 100%;
                    padding: 14px;
                    border-radius: 12px;
                    border: none;
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    letter-spacing: 0.5px;
                }
                .newsletter-btn:not(.subscribed):hover {
                    background: rgba(255,255,255,0.2);
                    transform: translateY(-2px);
                }
                .newsletter-btn.subscribed {
                    background: rgba(16, 185, 129, 0.8);
                    box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
                }

                /* Mobile Responsive */
                @media (max-width: 1024px) {
                    .about-container { grid-template-columns: 1fr; gap: 40px; padding: 40px; }
                    .about-image-wrapper { order: -1; }
                    .about-title { font-size: 40px; text-align: center; }
                }

                @media (max-width: 768px) {
                    .hero-section { paddingTop: 60px; }
                    .releases-header { flex-direction: column; align-items: flex-start; }
                    .releases-container.view-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; }
                    .about-section { padding: 60px 15px; }
                    .about-container { padding: 30px; border-radius: 20px; }
                    .about-title { font-size: 32px; }
                    .footer-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
                }
                
                @media (max-width: 480px) {
                    .releases-container.view-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
                    .view-toggle { width: 100%; justify-content: space-around; }
                    .about-section { padding: 40px 10px; }
                    .about-container { padding: 25px 20px; border-radius: 16px; }
                    .about-title { font-size: 28px; }
                    .hero-image, .hero-image-placeholder { max-width: 200px; height: 200px; }
                }
            `}</style>
        </div>
    );
}
