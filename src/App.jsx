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
                <div className="release-header">
                    <div className="release-cover-container">
                        <img src={release.full_cover_url} alt={`${release.artist} - ${release.title}`} />
                    </div>
                    
                    <div className="release-info">
                        <h1 className="artist-name">{release.artist}</h1>
                        <h2 className="title">{release.title}</h2>
                        <p className="subtitle">Choose your preferred music service</p>
                    </div>
                </div>

                {release.spotify_embed && (
                    <div className="spotify-embed" style={{ width: '100%', marginBottom: '32px' }}>
                        <div dangerouslySetInnerHTML={{ __html: release.spotify_embed }} />
                    </div>
                )}

                <div className="links-box">
                    {release.links.map((link, idx) => {
                        const pInfo = getPlatformInfo(link.platform_name);
                        const isDownload = link.platform_name.toLowerCase().includes('itunes') || 
                                           link.platform_name.toLowerCase().includes('download');
                        return (
                            <a key={idx} href={link.platform_url} className="link-item" target="_blank" rel="noopener noreferrer">
                                <div className="platform-info">
                                    <span style={{ color: pInfo.color, fontSize: '22px', marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                                        {pInfo.icon}
                                    </span>
                                    <strong>{link.platform_name}</strong>
                                </div>
                                <span className="btn-play">{isDownload ? 'Download' : 'Play'}</span>
                            </a>
                        );
                    })}
                </div>

                {/* Subscription Form Section */}
                <div className="subscription-card">
                    <div style={{ marginBottom: '24px' }}>
                        <h3 className="subscription-title">Stay Updated</h3>
                        <p className="subscription-text">Subscribe to get the latest news and releases directly to your inbox.</p>
                    </div>
                    
                    <form onSubmit={handleSubscribe} className="subscription-form">
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            required
                            className="subscription-input"
                        />
                        
                        {/* Cloudflare Turnstile */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center'
                        }}>
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
        </>
    );
}

export default App;
