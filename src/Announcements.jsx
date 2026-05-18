import { useEffect, useState, useRef } from 'react';
import Preloader from './Preloader.jsx';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from './config.js';

const AnnouncementCard = ({ ann, isExpanded, toggleExpand }) => {
    const contentRef = useRef(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        if (contentRef.current) {
            // Check if content is taller than the max-height (80px)
            if (contentRef.current.scrollHeight > 80) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setIsOverflowing(true);
            }
        }
    }, [ann.content]);

    return (
        <div 
            className={`announcement-card ${isExpanded ? 'expanded' : ''} ${isOverflowing ? 'has-overflow' : ''}`}
            onClick={() => isOverflowing && toggleExpand(ann.id)}
            style={{ cursor: isOverflowing ? 'pointer' : 'default' }}
        >
            <div className="announcement-header">
                <h3>{ann.title}</h3>
                <span className="announcement-date">
                    {new Date(ann.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
            </div>
            <div 
                ref={contentRef}
                className="announcement-content" 
                dangerouslySetInnerHTML={{ __html: ann.content }} 
            />
            {isOverflowing && (
                <div className="expand-indicator">
                    {isExpanded ? 'Show less ↑' : 'Read more ↓'}
                </div>
            )}
        </div>
    );
};

export default function Announcements() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
    const [expandedCards, setExpandedCards] = useState({});

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

    const announcements = data?.announcements ? [...data.announcements] : [];
    
    // Apply sorting
    announcements.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    const toggleExpand = (id) => {
        setExpandedCards(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: '700', margin: '0 0 10px 0', background: 'linear-gradient(135deg, #ffffff, rgba(255, 255, 255, 0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Latest Updates
                        </h1>
                        <p style={{ color: '#a1a1aa', fontSize: '16px', margin: 0 }}>
                            News, releases, and announcements directly from {data?.data?.artist_name || 'the artist'}.
                        </p>
                    </div>
                    
                    {/* Sort Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ color: '#a1a1aa', fontSize: '14px', fontWeight: '500' }}>Sort by:</label>
                        <select 
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="newest" style={{ background: '#18181b' }}>Newest First</option>
                            <option value="oldest" style={{ background: '#18181b' }}>Oldest First</option>
                        </select>
                    </div>
                </div>

                {/* Announcements List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {announcements.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)', color: '#a1a1aa' }}>
                            No new updates at this time. Check back later!
                        </div>
                    ) : (
                        announcements.map(ann => (
                            <AnnouncementCard 
                                key={ann.id}
                                ann={ann}
                                isExpanded={expandedCards[ann.id]}
                                toggleExpand={toggleExpand}
                            />
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
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }
                
                .announcement-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(16, 185, 129, 0.4);
                    background: rgba(255, 255, 255, 0.08);
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
                    transition: color 0.3s ease;
                }

                .announcement-card:hover .announcement-header h3 {
                    color: #10b981;
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
                    max-height: 80px; /* Approximately 3 lines */
                    overflow: hidden;
                    position: relative;
                    transition: max-height 0.5s ease;
                }
                
                .announcement-card.has-overflow:not(.expanded) .announcement-content {
                    mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
                    -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
                }

                .announcement-card.has-overflow.expanded .announcement-content {
                    max-height: 2000px; /* Arbitrary large number to allow full expansion */
                    mask-image: none;
                    -webkit-mask-image: none;
                }
                
                .expand-indicator {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #10b981;
                    opacity: 0.8;
                    transition: opacity 0.3s;
                }

                .announcement-card:hover .expand-indicator {
                    opacity: 1;
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
