import { useEffect, useState } from 'react';
import Preloader from './Preloader.jsx';
import { FaFacebook, FaTiktok, FaInstagram, FaSpotify } from 'react-icons/fa';
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

            {/* Releases Section - Responsive Grid/Carousel */}
            <div className="releases-section">
                {/* Section Title - Desktop */}
                <h2 className="releases-title-desktop">Latest Releases</h2>

                {/* Mobile Carousel Container */}
                <div className="releases-carousel-mobile">
                    <h2>Latest Releases</h2>
                    <div>
                        {releases && releases.map(r => (
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
                    {/* Scroll indicator for mobile */}
                    <p style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.5)',
                        textAlign: 'center',
                        margin: '10px 0 0 0'
                    }}>← Swipe to see more →</p>
                </div>

                {/* Desktop Grid Container */}
                <div className="releases-grid-desktop">
                    <div>
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
                                {r.stream_count && (
                                    <p style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                        <FaSpotify size={12} />
                                        {r.stream_count} Streams
                                    </p>
                                )}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

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
                
                /* Mobile: Show carousel, hide grid */
                @media (max-width: 768px) {
                    .releases-carousel-mobile {
                        display: block !important;
                    }
                    .releases-carousel-mobile div {
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
                    .releases-carousel-mobile div::-webkit-scrollbar {
                        display: none;
                    }
                    .releases-grid-desktop {
                        display: none !important;
                    }
                    .releases-title-desktop {
                        display: none !important;
                    }
                    /* Footer mobile optimization */
                    .footer-grid {
                        grid-template-columns: 1fr !important;
                        gap: 30px !important;
                    }
                }
                
                /* Desktop: Show grid, hide carousel */
                @media (min-width: 769px) {
                    .releases-carousel-mobile {
                        display: none !important;
                    }
                    .releases-grid-desktop {
                        display: block !important;
                    }
                    .releases-grid-desktop div {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 20px;
                    }
                    .releases-title-desktop {
                        display: block !important;
                    }
                }
                
                /* Tablet optimizations */
                @media (min-width: 769px) and (max-width: 1024px) {
                    .releases-grid-desktop div {
                        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
                    }
                }
                
                /* Small mobile devices */
                @media (max-width: 480px) {
                    .releases-carousel-mobile a {
                        min-width: 140px !important;
                        maxWidth: 140px !important;
                        padding: 10px !important;
                    }
                    .releases-carousel-mobile h3 {
                        font-size: 13px !important;
                    }
                    .releases-carousel-mobile p {
                        font-size: 11px !important;
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
