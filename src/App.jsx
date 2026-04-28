import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import Preloader from './Preloader.jsx';
import './index.css';
import { FaSpotify, FaApple, FaYoutube, FaDeezer, FaSoundcloud, FaAmazon, FaMusic } from 'react-icons/fa';
import { SiTidal } from 'react-icons/si';
import toast, { Toaster } from 'react-hot-toast';
import { Turnstile } from '@marsidev/react-turnstile';

function getPlatformInfo(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('spotify')) return { color: '#1DB954', icon: <FaSpotify /> };
    else if (nameLower.includes('apple') || nameLower.includes('itunes')) return { color: '#FA243C', icon: <FaApple /> };
    else if (nameLower.includes('youtube')) return { color: '#FF0000', icon: <FaYoutube /> };
    else if (nameLower.includes('deezer')) return { color: '#ef5466', icon: <FaDeezer /> };
    else if (nameLower.includes('soundcloud')) return { color: '#ff5500', icon: <FaSoundcloud /> };
    else if (nameLower.includes('amazon')) return { color: '#FF9900', icon: <FaAmazon /> };
    else if (nameLower.includes('tidal')) return { color: '#ffffff', icon: <SiTidal /> };
    return { color: '#ffffff', icon: <FaMusic /> };
}

import { API_BASE_URL } from './config.js';

function App() {
    const [release, setRelease] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const queryParams = new URLSearchParams(window.location.search);
    const shortcode = queryParams.get('s');

    useEffect(() => {
        if (!shortcode) return; // Router will just output Home.

        // Dynamically fetch from the configured environment API URL
        fetch(`${API_BASE_URL}/get_release.php?s=${shortcode}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setRelease(data.data);
                    // Automatically show popup modal when a release is visited
                    setTimeout(() => {
                        setIsModalOpen(true);
                    }, 1500); // 1.5s delay for better UX
                } else {
                    setError(data.error || 'Release not found.');
                }
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to load release from API.');
                setLoading(false);
            });
    }, [shortcode]);

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
                    setIsModalOpen(false);
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

    if (!shortcode) return <Home />;

    if (loading) {
        return <Preloader />;
    }

    if (error || !release) {
        return (
            <div className="container not-found">
                <h1>Release Not Found</h1>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <>
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
            <div 
                className="bg-blur" 
                style={{ backgroundImage: `url('${release.full_cover_url}')` }}
            ></div>

            <div className="container">
                {release.spotify_embed ? (
                    <div className="spotify-embed" style={{ marginBottom: '24px' }}>
                        <div dangerouslySetInnerHTML={{ __html: release.spotify_embed }} />
                        {release.stream_count && (
                            <div style={{ textAlign: 'center', marginTop: '12px', color: '#a1a1aa', fontSize: '14px', fontWeight: 500 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <FaSpotify size={16} />
                                    {release.stream_count} Streams
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="release-info">
                            <h1 className="artist-name">{release.artist}</h1>
                            <h2 className="title">{release.title}</h2>
                            {release.stream_count && (
                                <div style={{ color: '#a1a1aa', fontSize: '14px', fontWeight: 500, marginTop: '8px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                        <FaSpotify size={16} />
                                        {release.stream_count} Streams
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="release-info" style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <p className="subtitle">Choose music service</p>
                </div>

                <div className="links-box">
                    {release.links.map((link, idx) => {
                        const pInfo = getPlatformInfo(link.platform_name);
                        const isDownload = link.platform_name.toLowerCase().includes('itunes') || 
                                           link.platform_name.toLowerCase().includes('download');
                        return (
                            <a 
                                key={idx} 
                                href={link.platform_url} 
                                className="link-item" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const trackData = JSON.stringify({
                                        release_id: release.id,
                                        platform_name: link.platform_name
                                    });
                                    
                                    const openLink = () => {
                                        window.open(link.platform_url, '_blank', 'noopener,noreferrer');
                                    };
                                    
                                    let tracked = false;
                                    const doOpen = () => {
                                        if (!tracked) {
                                            tracked = true;
                                            openLink();
                                        }
                                    };
                                    
                                    // Always open the link after a short timeout as fallback
                                    const fallbackTimer = setTimeout(doOpen, 350);
                                    
                                    try {
                                        if (navigator.sendBeacon) {
                                            navigator.sendBeacon(`${API_BASE_URL}/track_click.php`, new Blob([trackData], { type: 'application/json' }));
                                            clearTimeout(fallbackTimer);
                                            doOpen();
                                        } else {
                                            fetch(`${API_BASE_URL}/track_click.php`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: trackData,
                                                keepalive: true
                                            })
                                            .catch(() => {})
                                            .finally(() => {
                                                clearTimeout(fallbackTimer);
                                                doOpen();
                                            });
                                        }
                                    } catch (err) {
                                        clearTimeout(fallbackTimer);
                                        doOpen();
                                    }
                                }}
                            >
                                <div className="platform-info">
                                    <span style={{ color: pInfo.color, fontSize: '20px', marginRight: '12px', display: 'flex', alignItems: 'center' }}>
                                        {pInfo.icon}
                                    </span>
                                    <strong>{link.platform_name}</strong>
                                </div>
                                <span className="btn-play">{isDownload ? 'Download' : 'Play'}</span>
                            </a>
                        );
                    })}
                </div>
            </div>

            {/* Subscribe Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#18181b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '40px',
                        width: '100%',
                        maxWidth: '440px',
                        position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        animation: 'fadeInUp 0.3s ease'
                    }}>
                        {/* Close Button */}
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '24px',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                        >
                            &times;
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <h3 style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                margin: '0 0 12px 0',
                                color: '#fff',
                                letterSpacing: '-0.02em'
                            }}>Stay Updated</h3>
                            <p style={{
                                fontSize: '15px',
                                color: 'rgba(255,255,255,0.6)',
                                margin: 0,
                                lineHeight: '1.5'
                            }}>Subscribe to get the latest news and releases directly to your inbox.</p>
                        </div>
                        
                        <form onSubmit={handleSubscribe}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '16px 20px',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: '#fff',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#10b981';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                    }}
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
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: subscribed ? '#059669' : '#10b981',
                                        color: '#fff',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        marginTop: '8px'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!subscribed) {
                                            e.currentTarget.style.background = '#059669';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!subscribed) {
                                            e.currentTarget.style.background = '#10b981';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }
                                    }}
                                >
                                    {subscribed ? '✓ Subscribed!' : 'Subscribe Now'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}} />
        </>
    );
}

export default App;
