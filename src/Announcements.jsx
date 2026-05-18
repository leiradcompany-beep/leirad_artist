import { useEffect, useState } from 'react';
import Preloader from './Preloader.jsx';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from './config.js';

export default function Announcements() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Reusing the get_home.php endpoint which returns the announcements array.
        fetch(`${API_BASE_URL}/get_home.php`)
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    setData(res);
                }
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    if (loading) return <Preloader />;

    const announcements = data?.announcements || [];

    return (
        <div style={{ minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#09090b', color: '#fff', paddingBottom: '60px' }}>
            {/* Background Blur if available */}
            {data?.data?.full_bg_url && (
                <div className="bg-blur" style={{ backgroundImage: `url('${data.data.full_bg_url}')` }}></div>
            )}

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', position: 'relative', zIndex: 10 }}>
                {/* Header Navigation */}
                <div style={{ marginBottom: '40px' }}>
                    <Link 
                        to="/" 
                        style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            color: '#a1a1aa', 
                            textDecoration: 'none',
                            fontSize: '15px',
                            fontWeight: '500',
                            transition: 'color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#a1a1aa'}
                    >
                        <ArrowLeft size={18} /> Back to Home
                    </Link>
                </div>

                <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '10px', background: 'linear-gradient(135deg, #ffffff, rgba(255, 255, 255, 0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Latest Updates
                </h1>
                <p style={{ color: '#a1a1aa', fontSize: '16px', marginBottom: '40px' }}>
                    News, releases, and announcements directly from {data?.data?.artist_name || 'the artist'}.
                </p>

                {/* Announcements List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {announcements.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)', color: '#a1a1aa' }}>
                            No new updates at this time. Check back later!
                        </div>
                    ) : (
                        announcements.map(ann => (
                            <div key={ann.id} className="announcement-card">
                                <div className="announcement-header">
                                    <h3>{ann.title}</h3>
                                    <span className="announcement-date">
                                        {new Date(ann.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div 
                                    className="announcement-content" 
                                    dangerouslySetInnerHTML={{ __html: ann.content }} 
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .bg-blur {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-size: cover;
                    background-position: center;
                    filter: blur(80px) brightness(0.3);
                    transform: scale(1.2);
                    z-index: 0;
                    pointer-events: none;
                }

                .announcement-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 30px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    transition: transform 0.3s ease, border-color 0.3s ease;
                }
                
                .announcement-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(16, 185, 129, 0.3);
                }
                
                .announcement-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                
                .announcement-header h3 {
                    margin: 0;
                    font-size: 22px;
                    color: #fff;
                    font-weight: 700;
                }
                
                .announcement-date {
                    font-size: 13px;
                    color: #10b981;
                    font-weight: 600;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 6px 14px;
                    border-radius: 20px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .announcement-content {
                    font-size: 16px;
                    line-height: 1.7;
                    color: rgba(255, 255, 255, 0.85);
                }
                
                .announcement-content p {
                    margin: 0 0 12px 0;
                }
                .announcement-content p:last-child {
                    margin-bottom: 0;
                }
                .announcement-content strong, .announcement-content b {
                    color: #fff;
                }
                .announcement-content a {
                    color: #10b981;
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .announcement-content a:hover {
                    color: #34d399;
                    text-decoration: underline;
                }
                
                @media (max-width: 600px) {
                    .announcement-card {
                        padding: 20px;
                    }
                    .announcement-header h3 {
                        font-size: 18px;
                    }
                }
            `}} />
        </div>
    );
}
