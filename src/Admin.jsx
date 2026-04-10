import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import { API_BASE_URL } from './config.js';

const API_URL = `${API_BASE_URL}/admin_api.php`;

function fetchApi(action, token, options = {}) {
    return fetch(`${API_URL}?action=${action}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
    }).then(res => res.json());
}

function Login({ setToken }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const data = await fetchApi('login_test', password);
            if (data.success) {
                setToken(password);
            } else {
                setError('Invalid password');
            }
        } catch (err) {
            setError('Login failed');
        }
    };

    return (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#121212', color:'#fff', margin: 0 }}>
            <div style={{ background:'rgba(255,255,255,0.05)', padding:'40px', borderRadius:'12px', width:'320px' }}>
                <h2 style={{textAlign:'center', marginTop:0}}>Admin Login</h2>
                {error && <div style={{color:'#ff4a4a', textAlign:'center', marginBottom:15}}>{error}</div>}
                <form onSubmit={handleLogin}>
                    <label style={{display:'block', marginBottom:8, color:'#ccc'}}>Password</label>
                    <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.05)', color:'white', boxSizing:'border-box', marginBottom:20 }} />
                    <button type="submit" style={{ width:'100%', padding:'12px', background:'#fff', color:'#000', border:'none', borderRadius:'24px', fontWeight:'bold', cursor:'pointer' }}>Log In</button>
                </form>
            </div>
        </div>
    );
}

function Dashboard({ token, onLogout }) {
    const [releases, setReleases] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchApi('list', token).then(data => {
            if (data.success) setReleases(data.data);
            else if (data.error === 'Unauthorized') onLogout();
        });
    }, [token, onLogout]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this release?')) return;
        const res = await fetchApi('delete&id=' + id, token, { method: 'DELETE' });
        if (res.success) setReleases(releases.filter(r => r.id !== id));
    };

    const handleShare = (shortcode) => {
        const url = window.location.origin + '/?s=' + shortcode;
        navigator.clipboard.writeText(url);
        alert('Copied to clipboard!\n' + url);
    };

    return (
        <div style={{ background:'#f4f6f9', minHeight:'100vh', color:'#333', margin:0, padding:0, fontFamily:'sans-serif' }}>
            <div style={{ background:'#fff', padding:'20px 40px', display:'flex', justifyContent:'space-between', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                <h1 style={{margin:0, fontSize:24}}>Admin Dashboard</h1>
                <div>
                    <button onClick={() => navigate('/admin/home')} style={{ padding:'6px 12px', background:'#1db954', color:'white', border:'none', borderRadius:4, cursor:'pointer', marginRight:10 }}>Edit Homepage</button>
                    <button onClick={onLogout} style={{ padding:'6px 12px', background:'#eee', border:'none', borderRadius:4, cursor:'pointer' }}>Log Out</button>
                </div>
            </div>
            <div style={{ maxWidth:1000, margin:'40px auto', padding:'0 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                    <h2>Releases</h2>
                    <button onClick={() => navigate('/admin/edit/new')} style={{ padding:'10px 20px', background:'#1db954', color:'#fff', border:'none', borderRadius:20, cursor:'pointer' }}>+ New Release</button>
                </div>
                <div style={{ background:'#fff', borderRadius:8, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', padding:20 }}>
                    {releases.length === 0 ? <p>No releases found.</p> : (
                        <table style={{ width:'100%', textAlign:'left', borderCollapse:'collapse' }}>
                            <thead>
                                <tr><th>Cover</th><th>Title</th><th>Artist</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {releases.map(r => (
                                    <tr key={r.id} style={{ borderBottom:'1px solid #eee' }}>
                                        <td style={{ padding:'15px 0' }}><img src={r.full_cover_url} alt="Cover" style={{ width:50, height:50, borderRadius:4, objectFit:'cover' }} /></td>
                                        <td>{r.title}</td>
                                        <td>{r.artist}</td>
                                        <td>
                                            <a href={`/?s=${r.shortcode}`} target="_blank" rel="noreferrer" style={{ background:'#333', color:'#fff', padding:'6px 12px', textDecoration:'none', borderRadius:4, marginRight:5, fontSize:12 }}>View</a>
                                            <button onClick={() => handleShare(r.shortcode)} style={{ background:'#007bff', color:'#fff', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer', marginRight:5, fontSize:12 }}>Share</button>
                                            <button onClick={() => navigate('/admin/edit/' + r.id)} style={{ background:'#1db954', color:'#fff', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer', marginRight:5, fontSize:12 }}>Edit</button>
                                            <button onClick={() => handleDelete(r.id)} style={{ background:'#ff4a4a', color:'#fff', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer', fontSize:12 }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

function Edit({ token, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const isNew = location.pathname.endsWith('/new');
    const id = isNew ? 0 : location.pathname.split('/').pop();

    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [coverFile, setCoverFile] = useState(null);
    const [links, setLinks] = useState([{ platform_name: '', platform_url: '' }]);

    useEffect(() => {
        if (!isNew) {
            fetchApi('get&id=' + id, token).then(data => {
                if (data.success) {
                    setTitle(data.data.title);
                    setArtist(data.data.artist);
                    if (data.data.links) setLinks(data.data.links);
                } else if (data.error === 'Unauthorized') onLogout();
            });
        }
    }, [id, isNew, token, onLogout]);

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        if (id) formData.append('id', id);
        formData.append('title', title);
        formData.append('artist', artist);
        if (coverFile) formData.append('cover_image', coverFile);
        formData.append('links', JSON.stringify(links));

        const res = await fetch(API_URL + '?action=save', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        }).then(r => r.json());

        if (res.success) navigate('/admin');
        else alert('Failed to save');
    };

    return (
        <div style={{ background:'#f4f6f9', minHeight:'100vh', color:'#333', margin:0, padding:0, fontFamily:'sans-serif' }}>
            <div style={{ background:'#fff', padding:'20px 40px', display:'flex', justifyContent:'space-between', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                <h1 style={{margin:0, fontSize:24}}>Admin Dashboard</h1>
                <button onClick={() => navigate('/admin')} style={{ padding:'6px 12px', background:'#eee', border:'none', borderRadius:4, cursor:'pointer' }}>Back to Dashboard</button>
            </div>
            <div style={{ maxWidth:800, margin:'40px auto', padding:'0 20px' }}>
                <div style={{ background:'#fff', borderRadius:8, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', padding:30 }}>
                    <h2 style={{marginTop:0}}>{isNew ? 'Create Release' : 'Edit Release'}</h2>
                    <form onSubmit={handleSave}>
                        <div style={{marginBottom:20}}>
                            <label style={{display:'block', marginBottom:8, fontWeight:500}}>Title</label>
                            <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box'}}/>
                        </div>
                        <div style={{marginBottom:20}}>
                            <label style={{display:'block', marginBottom:8, fontWeight:500}}>Artist</label>
                            <input type="text" value={artist} onChange={e=>setArtist(e.target.value)} required style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box'}}/>
                        </div>
                        <div style={{marginBottom:20}}>
                            <label style={{display:'block', marginBottom:8, fontWeight:500}}>Cover Image {isNew ? '' : '(Upload to replace)'}</label>
                            <input type="file" onChange={e=>setCoverFile(e.target.files[0])} accept="image/*" required={isNew} style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd'}}/>
                        </div>
                        <h3>Platform Links</h3>
                        <div style={{background:'#fafafa', padding:15, borderRadius:8, border:'1px solid #eee', marginBottom:20}}>
                            {links.map((link, idx) => (
                                <div key={idx} style={{display:'flex', gap:10, marginBottom:10}}>
                                    <input type="text" placeholder="Platform" value={link.platform_name} onChange={e=> { const l=[...links]; l[idx].platform_name=e.target.value; setLinks(l); }} required style={{flex:1, padding:8, borderRadius:4, border:'1px solid #ddd'}}/>
                                    <input type="text" placeholder="URL" value={link.platform_url} onChange={e=> { const l=[...links]; l[idx].platform_url=e.target.value; setLinks(l); }} required style={{flex:1, padding:8, borderRadius:4, border:'1px solid #ddd'}}/>
                                    <button type="button" onClick={() => setLinks(links.filter((_,i) => i!==idx))} style={{background:'#ff4a4a', color:'#fff', border:'none', borderRadius:4, padding:'0 15px', cursor:'pointer'}}>X</button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setLinks([...links, {platform_name:'', platform_url:''}])} style={{padding:'6px 12px', background:'#eee', border:'none', borderRadius:4, cursor:'pointer'}}>+ Add Link</button>
                        </div>
                        <button type="submit" style={{padding:'10px 20px', background:'#1db954', color:'#fff', border:'none', borderRadius:20, cursor:'pointer', fontWeight:500}}>Save Release</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function EditHome({ token, onLogout }) {
    const navigate = useNavigate();
    const [artist, setArtist] = useState('');
    const [heroTitle, setHeroTitle] = useState('');
    const [heroSub, setHeroSub] = useState('');
    const [bgFile, setBgFile] = useState(null);
    const [profileFile, setProfileFile] = useState(null);

    useEffect(() => {
        fetchApi('get_home', token).then(data => {
            if (data.success) {
                setArtist(data.data.artist_name || '');
                setHeroTitle(data.data.hero_title || '');
                setHeroSub(data.data.hero_subtitle || '');
            } else if (data.error === 'Unauthorized') onLogout();
        });
    }, [token, onLogout]);

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('artist_name', artist);
        formData.append('hero_title', heroTitle);
        formData.append('hero_subtitle', heroSub);
        if (bgFile) formData.append('bg_image', bgFile);
        if (profileFile) formData.append('profile_image', profileFile);

        const res = await fetch(API_URL + '?action=save_home', {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
        }).then(r => r.json());

        if (res.success) alert('Homepage Saved!');
        else alert('Failed to save');
    };

    return (
        <div style={{ background:'#f4f6f9', minHeight:'100vh', color:'#333', margin:0, padding:0, fontFamily:'sans-serif' }}>
            <div style={{ background:'#fff', padding:'20px 40px', display:'flex', justifyContent:'space-between', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                <h1 style={{margin:0, fontSize:24}}>Homepage Settings</h1>
                <button onClick={() => navigate('/admin')} style={{ padding:'6px 12px', background:'#eee', border:'none', borderRadius:4, cursor:'pointer' }}>Back</button>
            </div>
            <div style={{ maxWidth:800, margin:'40px auto', padding:'0 20px' }}>
                <form onSubmit={handleSave} style={{ background:'#fff', padding:30, borderRadius:8, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{marginBottom:20}}>
                        <label style={{display:'block', marginBottom:8, fontWeight:500}}>Artist Name</label>
                        <input type="text" value={artist} onChange={e=>setArtist(e.target.value)} required style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box'}}/>
                    </div>
                    <div style={{marginBottom:20}}>
                        <label style={{display:'block', marginBottom:8, fontWeight:500}}>Hero Title</label>
                        <input type="text" value={heroTitle} onChange={e=>setHeroTitle(e.target.value)} style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box'}}/>
                    </div>
                    <div style={{marginBottom:20}}>
                        <label style={{display:'block', marginBottom:8, fontWeight:500}}>Hero Subtitle</label>
                        <textarea value={heroSub} onChange={e=>setHeroSub(e.target.value)} style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box', minHeight:80}}/>
                    </div>
                    <div style={{marginBottom:20}}>
                        <label style={{display:'block', marginBottom:8, fontWeight:500}}>Background Image</label>
                        <input type="file" onChange={e=>setBgFile(e.target.files[0])} accept="image/*" style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box'}}/>
                    </div>
                    <div style={{marginBottom:20}}>
                        <label style={{display:'block', marginBottom:8, fontWeight:500}}>Profile Image</label>
                        <input type="file" onChange={e=>setProfileFile(e.target.files[0])} accept="image/*" style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box'}}/>
                    </div>
                    <button type="submit" style={{padding:'10px 20px', background:'#1db954', color:'#fff', border:'none', borderRadius:20, cursor:'pointer', fontWeight:500}}>Save Homepage</button>
                </form>
            </div>
        </div>
    );
}

export default function AdminApp() {
    const [token, setToken] = useState(localStorage.getItem('admin_token') || '');

    const handleLogin = (t) => {
        localStorage.setItem('admin_token', t);
        setToken(t);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setToken('');
    };

    if (!token) return <Login setToken={handleLogin} />;

    return (
        <Routes>
            <Route path="/" element={<Dashboard token={token} onLogout={handleLogout} />} />
            <Route path="edit/*" element={<Edit token={token} onLogout={handleLogout} />} />
            <Route path="home" element={<EditHome token={token} onLogout={handleLogout} />} />
        </Routes>
    );
}
