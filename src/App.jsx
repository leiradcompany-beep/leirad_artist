import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import Preloader from './Preloader.jsx';
import './index.css';
import { 
    FaSpotify, FaApple, FaYoutube, FaDeezer, FaSoundcloud, 
    FaAmazon, FaMusic, FaTimes, FaEnvelope 
} from 'react-icons/fa';
import { SiTidal } from 'react-icons/si';
import toast, { Toaster } from 'react-hot-toast';
import { Turnstile } from '@marsidev/react-turnstile';

import { API_BASE_URL } from './config.js';

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

function App() {
    const [release, setRelease] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

            setIsSubmitting(true);
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
                    
                    // Delay modal close slightly for better UX
                    setTimeout(() => {
                        setIsModalOpen(false);
                        setSubscribed(false);
                    }, 2000);
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
            } finally {
                setIsSubmitting(false);
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
                    success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                    loading: { iconTheme: { primary: '#3b82f6', secondary: '#fff' } }
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
                                onClick={async (e) => {
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
                                    let trackingFailed = false;
                                    
                                    const doOpen = () => {
                                        if (!tracked) {
                                            tracked = true;
                                            openLink();
                                            if (trackingFailed) {
                                                console.warn('Click tracking failed, but link was opened');
                                            }
                                        }
                                    };
                                    
                                    try {
                                        let trackingSuccess = false;
                                        if (navigator.sendBeacon) {
                                            try {
                                                trackingSuccess = navigator.sendBeacon(
                                                    `${API_BASE_URL}/track_click.php`, 
                                                    new Blob([trackData], { type: 'application/json' })
                                                );
                                            } catch (beaconError) {
                                                console.warn('sendBeacon failed:', beaconError);
                                                trackingSuccess = false;
                                            }
                                        }
                                        
                                        if (trackingSuccess) {
                                            tracked = true;
                                            openLink();
                                        } else {
                                            const fallbackTimer = setTimeout(() => {
                                                if (!tracked) {
                                                    trackingFailed = true;
                                                    doOpen();
                                                }
                                            }, 500);
                                            
                                            try {
                                                const response = await fetch(`${API_BASE_URL}/track_click.php`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: trackData
                                                });
                                                
                                                if (response.ok) {
                                                    clearTimeout(fallbackTimer);
                                                    tracked = true;
                                                    openLink();
                                                } else {
                                                    throw new Error(`Tracking failed with status: ${response.status}`);
                                                }
                                            } catch (fetchError) {
                                                clearTimeout(fallbackTimer);
                                                trackingFailed = true;
                                                doOpen();
                                            }
                                        }
                                    } catch (error) {
                                        trackingFailed = true;
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
                <div 
                    className="modal-overlay"
                    onClick={() => setIsModalOpen(false)} // Click outside to close
                >
                    <div 
                        className="modal-container"
                        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
                    >
                        <button 
                            className="modal-close-btn"
                            onClick={() => setIsModalOpen(false)}
                            aria-label="Close modal"
                        >
                            <FaTimes />
                        </button>

                        <div className="modal-header">
                            <div className="modal-icon-wrapper">
                                <FaEnvelope className="modal-icon" />
                            </div>
                            <h3>Stay Updated</h3>
                            <p>Subscribe to get the latest news and exclusive releases directly to your inbox.</p>
                        </div>
                        
                        <form onSubmit={handleSubscribe} className="modal-form">
                            <div className="input-group">
                                <input 
                                    type="email" 
                                    className="subscribe-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    required
                                    disabled={isSubmitting || subscribed}
                                />
                            </div>
                            
                            <div className="turnstile-wrapper">
                                <Turnstile 
                                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
                                    onSuccess={(token) => setTurnstileToken(token)}
                                    options={{ theme: 'dark' }}
                                />
                            </div>
                            
                            <button 
                                type="submit"
                                className={`subscribe-btn ${subscribed ? 'success' : ''}`}
                                disabled={!email || isSubmitting || subscribed}
                            >
                                {isSubmitting ? 'Subscribing...' : (subscribed ? '✓ Subscribed!' : 'Subscribe Now')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                /* Modal Overlay */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.65);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    animation: overlayFadeIn 0.3s ease-out forwards;
                }

                /* Modal Container */
                .modal-container {
                    background: linear-gradient(145deg, #18181b 0%, #121214 100%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    padding: 40px 32px;
                    width: 100%;
                    max-width: 420px;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
                    animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                /* Close Button */
                .modal-close-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(255, 255, 255, 0.05);
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .modal-close-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    transform: scale(1.05);
                }

                /* Modal Header & Text */
                .modal-header {
                    text-align: center;
                    margin-bottom: 28px;
                }
                .modal-icon-wrapper {
                    width: 56px;
                    height: 56px;
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px auto;
                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
                }
                .modal-icon {
                    color: #10b981;
                    font-size: 22px;
                }
                .modal-header h3 {
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 10px 0;
                    color: #ffffff;
                    letter-spacing: -0.02em;
                }
                .modal-header p {
                    font-size: 15px;
                    color: #a1a1aa;
                    margin: 0;
                    line-height: 1.5;
                }

                /* Form Elements */
                .modal-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .subscribe-input {
                    width: 100%;
                    padding: 16px 20px;
                    border-radius: 12px;
                    font-size: 15px;
                    outline: none;
                    box-sizing: border-box;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(0, 0, 0, 0.2);
                    color: #fff;
                    transition: all 0.2s ease;
                }
                .subscribe-input::placeholder {
                    color: #71717a;
                }
                .subscribe-input:focus {
                    border-color: #10b981;
                    background: rgba(0, 0, 0, 0.3);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                .subscribe-input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .turnstile-wrapper {
                    display: flex;
                    justify-content: center;
                    min-height: 65px;
                    overflow: hidden;
                }

                /* Submit Button */
                .subscribe-btn {
                    width: 100%;
                    padding: 16px;
                    border-radius: 12px;
                    border: none;
                    background: #10b981;
                    color: #fff;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
                }
                .subscribe-btn:not(:disabled):hover {
                    background: #059669;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
                }
                .subscribe-btn:not(:disabled):active {
                    transform: translateY(0);
                }
                .subscribe-btn:disabled {
                    background: #27272a;
                    color: #71717a;
                    box-shadow: none;
                    cursor: not-allowed;
                }
                .subscribe-btn.success {
                    background: #059669;
                    color: #fff;
                }

                /* Animations */
                @keyframes overlayFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                /* Mobile Responsiveness */
                @media (max-width: 480px) {
                    .modal-container {
                        padding: 32px 24px;
                    }
                    .modal-header h3 {
                        font-size: 22px;
                    }
                    .modal-header p {
                        font-size: 14px;
                    }
                    .turnstile-wrapper {
                        transform: scale(0.9); /* Prevent Turnstile overflow on very small devices */
                        transform-origin: center center;
                    }
                }
            `}} />
        </>
    );
}

export default App;
