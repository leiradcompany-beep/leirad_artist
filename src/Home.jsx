import { useEffect, useState } from 'react';
import Preloader from './Preloader.jsx';
import { FaFacebook, FaTiktok, FaInstagram, FaSpotify, FaTh, FaList, FaThLarge } from 'react-icons/fa';
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
    const [showCookieBanner, setShowCookieBanner] = useState(false);

    useEffect(() => {
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

        // Check for Cookie Consent
        const cookieConsent = localStorage.getItem('cookie-consent');
        if (!cookieConsent) {
            // Slight delay to allow entrance animations to finish first
            setTimeout(() => {
                setShowCookieBanner(true);
            }, 1000);
        }
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

    const handleAcceptCookies = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setShowCookieBanner(false);
    };

    const handleDeclineCookies = () => {
        localStorage.setItem('cookie-consent', 'declined');
        setShowCookieBanner(false);
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
        // Scroll to top of releases section
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div style={{minHeight:'100vh', fontFamily: "'Inter', sans-serif", paddingBottom: showCookieBanner ? '80px' : '0', transition: 'padding 0.3s ease'}}>
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
                <h1>{home.artist_name}</h1>
                <h2>{home.hero_title}</h2>
                <iframe 
                    className="spotify-embed" 
                    data-testid="embed-iframe" 
                    style={{borderRadius:'12px'}} 
                    src="https://open.spotify.com/embed/artist/78yrPwOcBEFSnaUPOycNmS?utm_source=generator" 
                    width="100%" 
                    height="352" 
                    frameBorder="0" 
                    allowfullscreen="" 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                ></iframe>
                <p>{home.hero_subtitle}</p>
            </div>

            {/* Releases Section - User Selectable View */}
            <div className="releases-section">
                {/* Section Header with View Toggle */}
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
                            <img 
                                src={r.full_cover_url}
                                alt={r.title}
                            />
                            <h3>{r.title}</h3>
                            <p>{r.artist}</p>
                            {r.stream_count && (
                                <p style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    <FaSpotify size={12} />
                                    {r.stream_count} Streams
                                </p>
                            )}
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
                            <img 
                                src={r.full_cover_url}
                                alt={r.title}
                            />
                            <div className="release-info">
                                <h3>{r.title}</h3>
                                <p>{r.artist}</p>
                                {r.stream_count && (
                                    <p style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                        <FaSpotify size={12} />
                                        {r.stream_count} Streams
                                    </p>
                                )}
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
                                <img 
                                    src={r.full_cover_url}
                                    alt={r.title}
                                />
                                <h3>{r.title}</h3>
                                <p>{r.artist}</p>
                                {r.stream_count && (
                                    <p style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                        <FaSpotify size={12} />
                                        {r.stream_count} Streams
                                    </p>
                                )}
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
                            {home.full_about_me_image_url ? (
                                <img 
                                    src={home.full_about_me_image_url} 
                                    alt="About" 
                                    className="about-image"
                                />
                            ) : (
                                <div className="about-image-placeholder">
                                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                            )}
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

            {/* Cookie Consent Banner */}
            {showCookieBanner && (
                <div className="cookie-banner">
                    <div className="cookie-content">
                        <p>We use cookies to improve your experience on our site. By continuing to use our site, you accept our use of cookies.</p>
                    </div>
                    <div className="cookie-actions">
                        <button onClick={handleAcceptCookies} className="cookie-btn accept">Accept</button>
                        <button onClick={handleDeclineCookies} className="cookie-btn decline">Decline</button>
                    </div>
                </div>
            )}

            {/* Responsive Styles */}
            <style>{`
                /* Spotify Embed Responsive */
                .spotify-embed {
                    width: 100%;
                    max-width: 100%;
                    height: 352px;
                }
                
                /* Mobile devices (≤480px) */
                @media (max-width: 480px) {
                    .spotify-embed {
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 352px !important;
                    }
                }
                
                /* Tablet devices (481px-768px) */
                @media (min-width: 481px) and (max-width: 768px) {
                    .spotify-embed {
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 352px !important;
                    }
                }
                
                /* Desktop devices (≥769px) */
                @media (min-width: 769px) {
                    .spotify-embed {
                        width: 40% !important;
                        max-width: 500px !important;
                        height: 352px !important;
                    }
                }
                
                /* Releases Section Header */
                .releases-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                
                .releases-title {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                }
                
                /* View Toggle Buttons */
                .view-toggle {
                    display: flex;
                    gap: 8px;
                    background: rgba(255, 255, 255, 0.08);
                    padding: 6px;
                    border-radius: 10px;
                }
                
                .view-btn {
                    width: 40px;
                    height: 40px;
                    border: none;
                    background: transparent;
                    color: rgba(255, 255, 255, 0.6);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                
                .view-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: rgba(255, 255, 255, 0.9);
                }
                
                .view-btn.active {
                    background: rgba(255, 255, 255, 0.25);
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                
                /* Releases Container */
                .releases-container {
                    display: none;
                }
                
                .releases-container.view-grid,
                .releases-container.view-list,
                .releases-container.view-carousel {
                    display: block;
                }
                
                /* Grid View */
                .releases-container.view-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 20px;
                }
                
                /* List View */
                .releases-container.view-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .release-card-list {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 15px;
                    border-radius: 12px;
                    text-decoration: none;
                    color: inherit;
                    transition: all 0.3s;
                }
                
                .release-card-list:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateX(5px);
                }
                
                .release-card-list img {
                    width: 80px;
                    height: 80px;
                    border-radius: 8px;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                
                .release-card-list .release-info {
                    flex: 1;
                }
                
                .release-card-list h3 {
                    margin: 0 0 5px 0;
                    font-size: 16px;
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
                    gap: 15px;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                    padding-bottom: 20px;
                    margin-bottom: 10px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                
                .releases-container.view-carousel .carousel-wrapper::-webkit-scrollbar {
                    display: none;
                }
                
                .carousel-hint {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    text-align: center;
                    margin: 10px 0 0 0;
                }
                
                /* Pagination Styles */
                .pagination-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 15px;
                    margin-top: 40px;
                    padding: 20px 0;
                }
                
                .pagination-btn {
                    padding: 10px 20px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: rgba(255, 255, 255, 0.8);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .pagination-btn:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.2);
                    color: #fff;
                    transform: translateY(-2px);
                }
                
                .pagination-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                
                .pagination-numbers {
                    display: flex;
                    gap: 8px;
                }
                
                .pagination-number {
                    min-width: 40px;
                    height: 40px;
                    padding: 0 12px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: rgba(255, 255, 255, 0.7);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .pagination-number:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: #fff;
                    transform: translateY(-2px);
                }
                
                .pagination-number.active {
                    background: rgba(255, 255, 255, 0.25);
                    color: #fff;
                    border-color: rgba(255, 255, 255, 0.4);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }

                /* Cookie Banner Styles */
                .cookie-banner {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 90%;
                    max-width: 700px;
                    background: rgba(24, 24, 27, 0.95);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 16px;
                    padding: 20px 24px;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
                    animation: slideUpCookie 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .cookie-content p {
                    margin: 0;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.6;
                }

                .cookie-actions {
                    display: flex;
                    gap: 12px;
                    flex-shrink: 0;
                }

                .cookie-btn {
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }

                .cookie-btn.accept {
                    background: #10b981;
                    color: white;
                }

                .cookie-btn.accept:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }

                .cookie-btn.decline {
                    background: transparent;
                    color: rgba(255, 255, 255, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .cookie-btn.decline:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }

                @keyframes slideUpCookie {
                    from {
                        transform: translate(-50%, 150%);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
                
                /* Mobile Responsive */
                @media (max-width: 768px) {
                    .releases-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .releases-title {
                        font-size: 24px;
                    }
                    
                    .releases-container.view-grid {
                        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                        gap: 15px;
                    }
                    
                    .release-card-list img {
                        width: 70px;
                        height: 70px;
                    }
                    
                    .release-card-list h3 {
                        font-size: 14px;
                    }
                    
                    .release-card-list p {
                        font-size: 12px;
                    }
                    
                    .pagination-container {
                        flex-wrap: wrap;
                        gap: 10px;
                    }
                    
                    .pagination-btn {
                        padding: 8px 16px;
                        font-size: 13px;
                    }
                    
                    .pagination-number {
                        min-width: 36px;
                        height: 36px;
                        font-size: 13px;
                    }
                    
                    .footer-grid {
                        grid-template-columns: 1fr !important;
                        gap: 30px !important;
                    }

                    .cookie-banner {
                        flex-direction: column;
                        text-align: center;
                        padding: 20px;
                        bottom: 16px;
                        gap: 16px;
                    }
                    
                    .cookie-actions {
                        width: 100%;
                        justify-content: stretch;
                    }
                    
                    .cookie-btn {
                        flex: 1;
                        padding: 12px;
                    }
                }
                
                /* Small mobile devices */
                @media (max-width: 480px) {
                    .releases-container.view-grid {
                        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                        gap: 12px;
                    }
                    
                    .view-toggle {
                        width: 100%;
                        justify-content: space-around;
                    }
                }
                
                /* About Me Section */
                .about-section {
                    padding: 80px 20px;
                    margin: 40px auto;
                    max-width: 1200px;
                }
                
                .about-container {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    gap: 60px;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    padding: 50px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }
                
                .about-image-wrapper {
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .about-image {
                    width: 100%;
                    max-width: 400px;
                    height: auto;
                    border-radius: 20px;
                    object-fit: cover;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
                    border: 3px solid rgba(255, 255, 255, 0.1);
                    transition: transform 0.3s ease;
                }
                
                .about-image:hover {
                    transform: scale(1.02);
                }
                
                .about-image-placeholder {
                    width: 100%;
                    max-width: 400px;
                    aspect-ratio: 1;
                    border-radius: 20px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
                    border: 2px dashed rgba(255, 255, 255, 0.15);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: rgba(255, 255, 255, 0.3);
                }
                
                .about-content {
                    display: flex;
                    flex-direction: column;
                    gap: 25px;
                }
                
                .about-title {
                    font-size: 42px;
                    font-weight: 700;
                    margin: 0;
                    background: linear-gradient(135deg, #ffffff, rgba(255, 255, 255, 0.7));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    line-height: 1.2;
                }
                
                .about-text {
                    font-size: 16px;
                    line-height: 1.8;
                    color: rgba(255, 255, 255, 0.85);
                }
                
                .about-text p {
                    margin: 0 0 16px 0;
                }
                
                .about-text p:last-child {
                    margin-bottom: 0;
                }
                
                .about-text strong,
                .about-text b {
                    color: #ffffff;
                    font-weight: 600;
                }
                
                .about-text a {
                    color: #10b981;
                    text-decoration: none;
                    transition: color 0.2s;
                }
                
                .about-text a:hover {
                    color: #34d399;
                    text-decoration: underline;
                }
                
                /* About Me Section Responsive */
                @media (max-width: 1024px) {
                    .about-container {
                        grid-template-columns: 1fr;
                        gap: 40px;
                        padding: 40px;
                    }
                    
                    .about-image-wrapper {
                        order: -1;
                    }
                    
                    .about-image,
                    .about-image-placeholder {
                        max-width: 350px;
                        margin: 0 auto;
                    }
                    
                    .about-title {
                        font-size: 36px;
                        text-align: center;
                    }
                    
                    .about-text {
                        font-size: 15px;
                    }
                }
                
                @media (max-width: 768px) {
                    .about-section {
                        padding: 60px 15px;
                        margin: 30px auto;
                    }
                    
                    .about-container {
                        padding: 30px;
                        gap: 30px;
                    }
                    
                    .about-title {
                        font-size: 32px;
                    }
                    
                    .about-text {
                        font-size: 14px;
                        line-height: 1.7;
                    }
                    
                    .about-image,
                    .about-image-placeholder {
                        max-width: 300px;
                    }
                }
                
                @media (max-width: 480px) {
                    .about-section {
                        padding: 40px 10px;
                        margin: 20px auto;
                    }
                    
                    .about-container {
                        padding: 25px 20px;
                        border-radius: 16px;
                    }
                    
                    .about-title {
                        font-size: 28px;
                    }
                    
                    .about-text {
                        font-size: 14px;
                    }
                    
                    .about-image,
                    .about-image-placeholder {
                        max-width: 100%;
                    }
                }
            `}</style>

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
                        <div style={{display: 'flex', gap: 12}}>
                            <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" rel="noopener noreferrer" style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                textDecoration: 'none',
                                transition: '0.3s',
                                fontSize: 18
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                                e.currentTarget.style.transform = 'translateY(-3px)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            >
                                <FaFacebook />
                            </a>
                            <a href="#" target="_blank" rel="noopener noreferrer" style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                textDecoration: 'none',
                                transition: '0.3s',
                                fontSize: 18
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                                e.currentTarget.style.transform = 'translateY(-3px)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            >
                                <FaInstagram />
                            </a>
                            <a href="https://www.tiktok.com/@leirad.g.official" target="_blank" rel="noopener noreferrer" style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                textDecoration: 'none',
                                transition: '0.3s',
                                fontSize: 18
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                                e.currentTarget.style.transform = 'translateY(-3px)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            >
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
                        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                            <a href="/" style={{
                                textDecoration: 'none',
                                fontSize: 14,
                                transition: '0.2s',
                                padding: '4px 0'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.paddingLeft = '8px';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.paddingLeft = '0';
                            }}
                            >Home</a>
                            <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" rel="noopener noreferrer" style={{
                                textDecoration: 'none',
                                fontSize: 14,
                                transition: '0.2s',
                                padding: '4px 0'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.paddingLeft = '8px';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.paddingLeft = '0';
                            }}
                            >Facebook</a>
                            <a href="https://www.tiktok.com/@chen.official" target="_blank" rel="noopener noreferrer" style={{
                                textDecoration: 'none',
                                fontSize: 14,
                                transition: '0.2s',
                                padding: '4px 0'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.paddingLeft = '8px';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.paddingLeft = '0';
                            }}
                            >TikTok</a>
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
                        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                            {releases && releases.slice(0, 3).map(r => (
                                <a key={r.id} href={`/?s=${r.shortcode}`} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: '0.2s',
                                    padding: '6px',
                                    borderRadius: 6
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                                >
                                    <img src={r.full_cover_url} alt={r.title} style={{
                                        width: 45,
                                        height: 45,
                                        borderRadius: 4,
                                        objectFit: 'cover',
                                        border: '1px solid rgba(255,255,255,0.15)'
                                    }} />
                                    <div>
                                        <p style={{
                                            margin: 0,
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: 'rgba(255,255,255,0.95)'
                                        }}>{r.title}</p>
                                        <p style={{
                                            margin: '3px 0 0 0',
                                            fontSize: 12,
                                            color: 'rgba(255,255,255,0.65)'
                                        }}>{r.artist}</p>
                                        {r.stream_count && (
                                            <p style={{
                                                margin: '3px 0 0 0',
                                                fontSize: 11,
                                                color: '#10b981',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 3
                                            }}>
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
                            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: '0.2s'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                    }}
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
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: subscribed ? 'rgba(16, 185, 129, 0.8)' : 'rgba(255,255,255,0.2)',
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        transition: '0.3s',
                                        letterSpacing: 0.5
                                    }}
                                    onMouseOver={(e) => {
                                        if (!subscribed) {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!subscribed) {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                                        }
                                    }}
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
    );
}
