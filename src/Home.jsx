import { useEffect, useState } from 'react';

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

    if (!data) return <div className="container not-found"><h1>Loading Portfolio...</h1></div>;

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
        </div>
    );
}
