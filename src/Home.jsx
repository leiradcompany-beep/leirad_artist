import { useEffect, useState } from 'react';
import Preloader from './Preloader.jsx';

import { API_BASE_URL } from './config.js';

export default function Home() {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/get_home.php`)
            .then(res => res.json())
            .then(res => {
                if(res.success) setData(res);
            })
            .catch(() => {});
    }, []);

    if (!data) return <Preloader />;

    const { data: home, releases } = data;

    return (
        <div style={{minHeight:'100vh', fontFamily: "'Inter', sans-serif"}}>
            {home.full_bg_url && <div className="bg-blur" style={{ backgroundImage: `url('${home.full_bg_url}')` }}></div>}
            
            <div style={{ textAlign:'center', paddingTop: 100, paddingBottom: 60, position:'relative', zIndex:10 }}>
                {home.full_profile_url && <img src={home.full_profile_url} style={{width:160, height:160, borderRadius:'50%', objectFit:'cover', border:'4px solid rgba(255,255,255,0.1)', boxShadow:'0 20px 40px rgba(0,0,0,0.5)', marginBottom:25}} />}
                <h1 style={{fontSize: 28, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, margin:0}}>{home.artist_name}</h1>
                <h2 style={{fontSize: 36, fontWeight: 600, margin:'10px 0 15px 0', textShadow:'0 2px 10px rgba(0,0,0,0.5)'}}>{home.hero_title}</h2>
                <p style={{fontSize: 16, color: 'rgba(255,255,255,0.7)', maxWidth: 600, margin: '0 auto', lineHeight: 1.5}}>{home.hero_subtitle}</p>
            </div>

            <div style={{ position:'relative', zIndex:10, maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, padding: 20, paddingBottom: 60}}>
                {releases && releases.map(r => (
                    <a key={r.id} href={`/?s=${r.shortcode}`} style={{textDecoration:'none', color:'inherit', background:'rgba(20,20,20,0.6)', border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(20px)', borderRadius:12, padding:15, transition:'0.3s', display:'flex', flexDirection:'column', alignItems:'center'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e=>e.currentTarget.style.background='rgba(20,20,20,0.6)'}>
                        <img src={r.full_cover_url} style={{width:'100%', aspectRatio:'1/1', objectFit:'cover', borderRadius:8, marginBottom:15, boxShadow:'0 10px 20px rgba(0,0,0,0.3)'}} />
                        <h3 style={{fontSize:16, margin:0, fontWeight:600}}>{r.title}</h3>
                        <p style={{fontSize:13, margin:'5px 0 0 0', color:'rgba(255,255,255,0.5)'}}>{r.artist}</p>
                    </a>
                ))}
            </div>

            {/* Footer Section */}
            <footer style={{
                position: 'relative',
                zIndex: 10,
                marginTop: 40,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(20px)',
                padding: '40px 20px 30px'
            }}>
                <div style={{
                    maxWidth: 1000,
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: 40,
                    marginBottom: 30
                }}>
                    {/* Brand Section */}
                    <div>
                        <h3 style={{
                            fontSize: 20,
                            fontWeight: 700,
                            margin: '0 0 15px 0',
                            color: '#fff',
                            letterSpacing: 1
                        }}>{home.artist_name}</h3>
                        <p style={{
                            fontSize: 14,
                            color: 'rgba(255,255,255,0.6)',
                            lineHeight: 1.6,
                            margin: 0
                        }}>{home.hero_subtitle || 'Official artist website. Listen to the latest releases on all major platforms.'}</p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 style={{
                            fontSize: 14,
                            fontWeight: 600,
                            margin: '0 0 15px 0',
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: 1
                        }}>Quick Links</h4>
                        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                            <a href="/" style={{
                                color: 'rgba(255,255,255,0.6)',
                                textDecoration: 'none',
                                fontSize: 14,
                                transition: '0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.color = '#fff'}
                            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                            >Home</a>
                            {releases && releases.slice(0, 3).map(r => (
                                <a key={r.id} href={`/?s=${r.shortcode}`} style={{
                                    color: 'rgba(255,255,255,0.6)',
                                    textDecoration: 'none',
                                    fontSize: 14,
                                    transition: '0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.color = '#fff'}
                                onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                                >{r.title}</a>
                            ))}
                        </div>
                    </div>

                    {/* Connect */}
                    <div>
                        <h4 style={{
                            fontSize: 14,
                            fontWeight: 600,
                            margin: '0 0 15px 0',
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: 1
                        }}>Connect</h4>
                        <p style={{
                            fontSize: 14,
                            color: 'rgba(255,255,255,0.6)',
                            lineHeight: 1.6,
                            margin: 0
                        }}>Follow on social media and streaming platforms for the latest updates and releases.</p>
                    </div>
                </div>

                {/* Copyright */}
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: 20,
                    textAlign: 'center'
                }}>
                    <p style={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.4)',
                        margin: 0
                    }}>
                        &copy; {new Date().getFullYear()} {home.artist_name}. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
