import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import toast, { Toaster } from 'react-hot-toast';
import { 
    LayoutDashboard, LogOut, Plus, Edit2, Trash2, Share2, 
    Home as HomeIcon, KeyRound, X, ExternalLink, Menu
} from 'lucide-react';
import Preloader from './Preloader.jsx';

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
    const [isLoading, setIsLoading] = useState(false);
    const [bgUrl, setBgUrl] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');

    useEffect(() => {
        // Fetch public homepage info for the background image
        fetch(`${API_BASE_URL}/get_home.php`)
            .then(res => res.json())
            .then(data => {
                if(data.success && data.data && data.data.full_bg_url) {
                    setBgUrl(data.data.full_bg_url);
                }
            })
            .catch(() => {});
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!turnstileToken) {
            toast.error('Please complete the security check.');
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('password', password);
            formData.append('turnstile_token', turnstileToken);
            const res = await fetch(`${API_BASE_URL}/admin_api.php?action=login`, {
                method: 'POST',
                body: formData
            }).then(r => r.json());

            if (res.success && res.token) {
                setToken(res.token);
                toast.success('Logged in successfully!');
            } else {
                toast.error(res.error || 'Invalid password');
                setIsLoading(false);
            }
        } catch (err) {
            toast.error('Login failed. Check backend configuration.');
            setIsLoading(false);
        }
    };

    if (isLoading) return <Preloader />;

    return (
        <div style={{ position: 'relative', display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#09090b', color:'#fff', margin: 0, fontFamily: 'Inter, sans-serif' }}>
            {bgUrl && <div className="bg-blur" style={{ backgroundImage: `url('${bgUrl}')` }}></div>}
            
            <div style={{ position:'relative', zIndex:10, background:'rgba(24, 24, 27, 0.7)', backdropFilter:'blur(20px)', padding:'40px', borderRadius:'16px', width:'340px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                <div style={{display:'flex', justifyContent:'center', marginBottom: 20}}>
                    <KeyRound size={40} color="#10b981" />
                </div>
                <h2 style={{textAlign:'center', marginTop:0, fontWeight: 600}}>Admin Access</h2>
                <p style={{textAlign:'center', color:'#a1a1aa', fontSize:14, marginBottom:25}}>Enter your master password to continue</p>
                <form onSubmit={handleLogin}>
                    <input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" style={{ width:'100%', padding:'12px 16px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.3)', color:'white', boxSizing:'border-box', marginBottom:20, fontSize:15, outline:'none' }} />
                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                        <Turnstile 
                            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
                            onSuccess={(token) => setTurnstileToken(token)} 
                            options={{ theme: 'dark' }}
                        />
                    </div>
                    <button type="submit" style={{ width:'100%', padding:'12px', background:'#10b981', color:'#fff', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer', fontSize:15, transition:'0.2s', boxShadow:'0 4px 12px rgba(16, 185, 129, 0.3)' }}>Log In</button>
                </form>
            </div>
        </div>
    );
}

// Drawer Component
function Drawer({ isOpen, onClose, title, children }) {
    return (
        <>
            {isOpen && (
                <div 
                    onClick={onClose}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 40, animation: 'fadeIn 0.2s ease' }}
                />
            )}
            <div style={{
                position: 'fixed', top: 0, right: isOpen ? 0 : '-100%', width: '450px', maxWidth: '100vw',
                height: '100vh', background: '#fff', color: '#18181b', zIndex: 50, transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f4f4f5' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717a', padding: 5, display: 'flex' }}>
                        <X size={20} />
                    </button>
                </div>
                <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                    {children}
                </div>
            </div>
        </>
    );
}

// --- Layout with Collapsible Sidebar ---
function AdminLayout({ onLogout, children }) {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    const menuItems = [
        { path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Releases', exact: true },
        { path: '/admin/home', icon: <HomeIcon size={18} />, label: 'Homepage' },
        { path: '/admin/password', icon: <KeyRound size={18} />, label: 'Password' }
    ];

    const sidebarWidth = collapsed ? 80 : 260;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f4f4f5', color: '#18181b', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ width: sidebarWidth, background: '#18181b', color: '#fff', display: 'flex', flexDirection: 'column', padding: '24px 0', borderRight: '1px solid #27272a', transition: 'width 0.3s ease', flexShrink: 0, height: '100vh', overflowY: 'auto', boxSizing: 'border-box' }}>
                <div style={{ padding: collapsed ? '0 10px' : '0 24px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
                    {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ background: '#10b981', padding: 6, borderRadius: 8, display: 'flex' }}><LayoutDashboard size={20} color="#fff" /></div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>Admin</h2>
                        </div>
                    )}
                    <button onClick={() => setCollapsed(!collapsed)} style={{ background:'transparent', border:'none', color:'#a1a1aa', cursor:'pointer', padding: 4, display:'flex', borderRadius:4 }} onMouseOver={e=>e.currentTarget.style.color='#fff'} onMouseOut={e=>e.currentTarget.style.color='#a1a1aa'}>
                        <Menu size={24} />
                    </button>
                </div>

                <div style={{ flex: 1 }}>
                    {menuItems.map(item => {
                        const isActive = item.exact ? location.pathname === item.path || location.pathname === item.path + '/' : location.pathname.startsWith(item.path);
                        return (
                            <div key={item.path} style={{ padding: collapsed ? '0 10px' : '0 16px', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                                <Link to={item.path} style={{ width: '100%', textDecoration: 'none', padding: '12px 16px', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', color: isActive ? '#fff' : '#a1a1aa', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 12, fontWeight: 500, fontSize: 15, transition: '0.2s', boxSizing: 'border-box' }} onMouseOver={e=>{if(!isActive) e.currentTarget.style.color='#fff'}} onMouseOut={e=>{if(!isActive) e.currentTarget.style.color='#a1a1aa'}}>
                                    {item.icon} {collapsed ? null : <span>{item.label}</span>}
                                </Link>
                            </div>
                        );
                    })}
                </div>

                <div style={{ padding: collapsed ? '0 10px' : '0 16px', display: 'flex', justifyContent: 'center' }}>
                    <button onClick={onLogout} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 12, fontWeight: 500, fontSize: 15, transition: '0.2s', boxSizing: 'border-box' }} onMouseOver={e=>e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                        <LogOut size={18} /> {collapsed ? null : <span>Log Out</span>}
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
                {children}
            </div>
        </div>
    );
}

// Modal Component
function Modal({ isOpen, onClose, title, message, onConfirm, confirmText='Confirm', isDestructive=false }) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)',backdropFilter:'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: '#fff', padding: '24px 30px', borderRadius: '16px', width: '380px', maxWidth: '90vw', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 18, fontWeight: 600, color:'#18181b' }}>{title}</h3>
                <p style={{ margin: '0 0 24px 0', color: '#52525b', fontSize:14, lineHeight:1.5 }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={onClose} style={{ padding: '10px 16px', background: '#f4f4f5', color: '#3f3f46', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition:'0.2s' }}>Cancel</button>
                    <button onClick={onConfirm} style={{ padding: '10px 16px', background: isDestructive ? '#ef4444' : '#18181b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition:'0.2s' }}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

// --- Views ---

function ReleasesView({ token, onLogout }) {
    const [releases, setReleases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeReleaseId, setActiveReleaseId] = useState(null);

    // Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [releaseToDelete, setReleaseToDelete] = useState(null);

    const loadReleases = () => {
        setIsLoading(true);
        fetchApi('list', token).then(data => {
            if (data.success) setReleases(data.data);
            else if (data.error === 'Unauthorized') onLogout();
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    };

    useEffect(() => { loadReleases(); }, [token]);

    const confirmDelete = async () => {
        if (!releaseToDelete) return;
        const res = await fetchApi('delete&id=' + releaseToDelete, token, { method: 'DELETE' });
        if (res.success) {
            toast.success('Release deleted');
            setReleases(releases.filter(r => r.id !== releaseToDelete));
        } else {
            toast.error('Failed to delete');
        }
        setDeleteModalOpen(false);
        setReleaseToDelete(null);
    };

    const openDeleteModal = (id) => {
        setReleaseToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleShare = (shortcode) => {
        const url = window.location.origin + '/?s=' + shortcode;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
    };

    const openDrawer = (id = null) => {
        setActiveReleaseId(id);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        loadReleases(); // refresh after close
    };

    if (isLoading) return <Preloader />;

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                <div>
                    <h1 style={{ margin: '0 0 5px 0', fontSize: 28, fontWeight: 700 }}>Releases</h1>
                    <p style={{ margin: 0, color: '#71717a' }}>Manage your artist releases and links here.</p>
                </div>
                <button onClick={() => openDrawer()} style={{ padding: '12px 20px', background: '#18181b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: '0.2s' }}>
                    <Plus size={18} /> Add Release
                </button>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                {releases.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>
                        <p>No releases found. Click "Add Release" to get started.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#fafafa', borderBottom: '1px solid #e4e4e7' }}>
                                <th style={{ padding: '16px 24px', fontWeight: 600, color: '#52525b', fontSize: 13, textTransform: 'uppercase' }}>Release</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600, color: '#52525b', fontSize: 13, textTransform: 'uppercase' }}>Artist</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600, color: '#52525b', fontSize: 13, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {releases.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                                    <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 15 }}>
                                        <img src={r.full_cover_url} alt="Cover" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid #e4e4e7' }} />
                                        <span style={{ fontWeight: 600, color: '#18181b' }}>{r.title}</span>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#52525b' }}>{r.artist}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', gap: 10 }}>
                                            <a href={`/?s=${r.shortcode}`} target="_blank" rel="noreferrer" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', color: '#52525b', borderRadius: 6, transition: '0.2s' }} title="View">
                                                <ExternalLink size={16} />
                                            </a>
                                            <button onClick={() => handleShare(r.shortcode)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', color: '#0ea5e9', border: 'none', borderRadius: 6, cursor: 'pointer', transition: '0.2s' }} title="Share">
                                                <Share2 size={16} />
                                            </button>
                                            <button onClick={() => openDrawer(r.id)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', color: '#10b981', border: 'none', borderRadius: 6, cursor: 'pointer', transition: '0.2s' }} title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => openDeleteModal(r.id)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', transition: '0.2s' }} title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Drawer isOpen={drawerOpen} onClose={closeDrawer} title={activeReleaseId ? 'Edit Release' : 'Add New Release'}>
                <EditReleaseForm token={token} releaseId={activeReleaseId} onLogout={onLogout} onSuccess={closeDrawer} />
            </Drawer>

            <Modal 
                isOpen={deleteModalOpen} 
                onClose={() => setDeleteModalOpen(false)} 
                title="Delete Release" 
                message="Are you sure you want to delete this release permanently? This action cannot be undone."
                onConfirm={confirmDelete}
                confirmText="Delete"
                isDestructive={true}
            />
        </>
    );
}

function EditReleaseForm({ token, releaseId, onSuccess, onLogout }) {
    const isNew = !releaseId;
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [coverFile, setCoverFile] = useState(null);
    const [links, setLinks] = useState([{ platform_name: '', platform_url: '' }]);

    useEffect(() => {
        if (!isNew) {
            fetchApi(`get&id=${releaseId}`, token).then(data => {
                if (data.success) {
                    setTitle(data.data.title);
                    setArtist(data.data.artist);
                    if (data.data.links && data.data.links.length > 0) setLinks(data.data.links);
                } else if (data.error === 'Unauthorized') onLogout();
            });
        } else {
            setTitle('');
            setArtist('');
            setCoverFile(null);
            setLinks([{ platform_name: '', platform_url: '' }]);
        }
    }, [releaseId, isNew, token, onLogout]);

    const handleSave = async (e) => {
        e.preventDefault();
        const loadingToast = toast.loading('Saving release...');
        const formData = new FormData();
        if (releaseId) formData.append('id', releaseId);
        formData.append('title', title);
        formData.append('artist', artist);
        if (coverFile) formData.append('cover_image', coverFile);
        formData.append('links', JSON.stringify(links));

        try {
            const res = await fetch(API_URL + '?action=save', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            }).then(r => r.json());

            if (res.success) {
                toast.success('Release saved successfully!', { id: loadingToast });
                onSuccess();
            } else {
                toast.error('Failed to save release', { id: loadingToast });
            }
        } catch(err) {
            toast.error('Error occurred', { id: loadingToast });
        }
    };

    return (
        <form onSubmit={handleSave}>
            <div style={{marginBottom:15}}>
                <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>Title</label>
                <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required style={{width:'100%', padding:'10px 14px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', outline:'none', color:'#18181b', background:'#fff'}}/>
            </div>
            <div style={{marginBottom:15}}>
                <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>Artist</label>
                <input type="text" value={artist} onChange={e=>setArtist(e.target.value)} required style={{width:'100%', padding:'10px 14px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', outline:'none', color:'#18181b', background:'#fff'}}/>
            </div>
            <div style={{marginBottom:25}}>
                <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>Cover Image {isNew ? '' : '(Upload to replace)'}</label>
                <input type="file" onChange={e=>setCoverFile(e.target.files[0])} accept="image/*" required={isNew} style={{width:'100%', padding:'8px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', background:'#fafafa'}}/>
            </div>

            <h3 style={{fontSize:16, marginTop:0, marginBottom:15, borderBottom:'1px solid #f4f4f5', paddingBottom:10}}>Platform Links</h3>
            <div style={{marginBottom:25}}>
                {links.map((link, idx) => (
                    <div key={idx} style={{display:'flex', gap:8, marginBottom:10, alignItems:'center', width:'100%'}}>
                        <input type="text" placeholder="Platform (e.g. Spotify)" value={link.platform_name} onChange={e=> { const l=[...links]; l[idx].platform_name=e.target.value; setLinks(l); }} required style={{flex:1, minWidth:0, padding:'10px 12px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', outline:'none', color:'#18181b', background:'#fff'}}/>
                        <input type="text" placeholder="URL" value={link.platform_url} onChange={e=> { const l=[...links]; l[idx].platform_url=e.target.value; setLinks(l); }} required style={{flex:1, minWidth:0, padding:'10px 12px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', outline:'none', color:'#18181b', background:'#fff'}}/>
                        <button type="button" onClick={() => setLinks(links.filter((_,i) => i!==idx))} style={{flexShrink:0, width: 38, height: 38, background:'#fee2e2', color:'#ef4444', border:'none', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}><X size={18}/></button>
                    </div>
                ))}
                <button type="button" onClick={() => setLinks([...links, {platform_name:'', platform_url:''}])} style={{padding:'8px 16px', background:'#f4f4f5', color:'#18181b', border:'none', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6}}><Plus size={16}/> Add Link</button>
            </div>
            <button type="submit" style={{width:'100%', padding:'12px', background:'#18181b', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:15, transition:'0.2s', boxSizing:'border-box'}}>Save Release</button>
        </form>
    );
}

function EditHomeView({ token, onLogout }) {
    const [artist, setArtist] = useState('');
    const [heroTitle, setHeroTitle] = useState('');
    const [heroSub, setHeroSub] = useState('');
    const [bgFile, setBgFile] = useState(null);
    const [profileFile, setProfileFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchApi('get_home', token).then(data => {
            if (data.success) {
                setArtist(data.data.artist_name || '');
                setHeroTitle(data.data.hero_title || '');
                setHeroSub(data.data.hero_subtitle || '');
            } else if (data.error === 'Unauthorized') onLogout();
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, [token, onLogout]);

    const handleSave = async (e) => {
        e.preventDefault();
        const loadingToast = toast.loading('Saving homepage...');
        const formData = new FormData();
        formData.append('artist_name', artist);
        formData.append('hero_title', heroTitle);
        formData.append('hero_subtitle', heroSub);
        if (bgFile) formData.append('bg_image', bgFile);
        if (profileFile) formData.append('profile_image', profileFile);

        const res = await fetch(API_URL + '?action=save_home', {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
        }).then(r => r.json());

        if (res.success) {
            toast.success('Homepage updated successfully!', { id: loadingToast });
        } else {
            toast.error('Failed to update homepage', { id: loadingToast });
        }
    };

    if (isLoading) return <Preloader />;

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ margin: '0 0 5px 0', fontSize: 28, fontWeight: 700 }}>Homepage Settings</h1>
            <p style={{ margin: '0 0 30px 0', color: '#71717a' }}>Customize your main portfolio interface.</p>
            
            <form onSubmit={handleSave} style={{ background: '#fff', padding: 30, borderRadius: 12, border: '1px solid #e4e4e7', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{marginBottom:20}}>
                    <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>Artist Name</label>
                    <input type="text" value={artist} onChange={e=>setArtist(e.target.value)} required style={{width:'100%', padding:'10px 14px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', outline:'none', color:'#18181b', background:'#fff'}}/>
                </div>
                <div style={{marginBottom:20}}>
                    <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>Hero Title</label>
                    <input type="text" value={heroTitle} onChange={e=>setHeroTitle(e.target.value)} style={{width:'100%', padding:'10px 14px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', outline:'none', color:'#18181b', background:'#fff'}}/>
                </div>
                <div style={{marginBottom:25}}>
                    <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>Hero Subtitle</label>
                    <textarea value={heroSub} onChange={e=>setHeroSub(e.target.value)} style={{width:'100%', padding:'10px 14px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', minHeight:80, outline:'none', color:'#18181b', background:'#fff'}}/>
                </div>
                <div style={{marginBottom:20}}>
                    <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>Background Image</label>
                    <input type="file" onChange={e=>setBgFile(e.target.files[0])} accept="image/*" style={{width:'100%', padding:'8px', borderRadius:6, border:'1px solid #e4e4e7', background:'#fafafa'}}/>
                </div>
                <div style={{marginBottom:30}}>
                    <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>Profile Image</label>
                    <input type="file" onChange={e=>setProfileFile(e.target.files[0])} accept="image/*" style={{width:'100%', padding:'8px', borderRadius:6, border:'1px solid #e4e4e7', background:'#fafafa'}}/>
                </div>
                <button type="submit" style={{width:'100%', padding:'12px', background:'#18181b', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:15, transition:'0.2s'}}>Update Homepage</button>
            </form>
        </div>
    );
}

function ChangePasswordView({ token, setToken }) {
    const [newPassword, setNewPassword] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        const loadingToast = toast.loading('Changing password...');
        const formData = new FormData();
        formData.append('new_password', newPassword);

        let res;
        try {
            const response = await fetch(API_URL + '?action=change_password', {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            const text = await response.text();
            if (!text) {
                toast.error('Backend error: Please upload the updated admin_api.php to Hostinger.', { id: loadingToast, duration: 6000 });
                return;
            }
            res = JSON.parse(text);
        } catch (err) {
            toast.error('API Error: Check formatting of backend response.', { id: loadingToast });
            return;
        }

        if (res && res.success) {
            toast.success('Password changed! Please log in again.', { id: loadingToast });
            setNewPassword('');
            setToken(newPassword);
            localStorage.setItem('admin_token', newPassword);
        } else {
            toast.error(res.error || 'Failed to change password', { id: loadingToast });
        }
    };

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ margin: '0 0 5px 0', fontSize: 28, fontWeight: 700 }}>Security</h1>
            <p style={{ margin: '0 0 30px 0', color: '#71717a' }}>Update your master administration password.</p>
            
            <form onSubmit={handleSave} style={{ background: '#fff', padding: 30, borderRadius: 12, border: '1px solid #e4e4e7', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{marginBottom:25}}>
                    <label style={{display:'block', marginBottom:6, fontWeight:500, fontSize:14, color:'#3f3f46'}}>New Password</label>
                    <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength="4" autoComplete="new-password" placeholder="Min 4 characters" style={{width:'100%', padding:'10px 14px', borderRadius:6, border:'1px solid #e4e4e7', boxSizing:'border-box', outline:'none', color:'#18181b', background:'#fff'}}/>
                </div>
                <button type="submit" style={{width:'100%', padding:'12px', background:'#18181b', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:15, transition:'0.2s'}}>Save New Password</button>
            </form>
        </div>
    );
}

export default function AdminApp() {
    const [token, setToken] = useState(localStorage.getItem('admin_token') || '');

    const handleLogin = (t) => {
        localStorage.setItem('admin_token', t);
        setToken(t);
    };

    const handleLogout = async () => {
        if (token) {
            try {
                await fetchApi('logout', token, { method: 'POST' });
            } catch(e) {}
        }
        localStorage.removeItem('admin_token');
        setToken('');
        toast.success('Logged out successfully');
    };

    return (
        <div style={{fontFamily: 'Inter, sans-serif'}}>
            <Toaster position="top-center" toastOptions={{ style: { background: '#18181b', color: '#fff', borderRadius: '8px', fontSize: 14 } }} />
            {!token ? (
                <Login setToken={handleLogin} />
            ) : (
                <AdminLayout onLogout={handleLogout}>
                    <Routes>
                        <Route path="/" element={<ReleasesView token={token} onLogout={handleLogout} />} />
                        <Route path="home" element={<EditHomeView token={token} onLogout={handleLogout} />} />
                        <Route path="password" element={<ChangePasswordView token={token} setToken={handleLogin} />} />
                    </Routes>
                </AdminLayout>
            )}
        </div>
    );
}
