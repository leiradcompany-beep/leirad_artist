import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import toast, { Toaster } from 'react-hot-toast';
import { 
    LayoutDashboard, LogOut, Plus, Edit2, Trash2, Share2, 
    Home as HomeIcon, KeyRound, X, ExternalLink, Menu, Users, Mail
} from 'lucide-react';
import Preloader from './Preloader.jsx';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

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
    const [step, setStep] = useState('password'); // 'password' or 'otp'
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [bgUrl, setBgUrl] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    
    // OTP State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [otpTimer, setOtpTimer] = useState(0);
    const [otpExpiresAt, setOtpExpiresAt] = useState(null);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [isResending, setIsResending] = useState(false);
    const otpInputRefs = useRef([]);

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
        
        // Check for existing OTP session in localStorage
        try {
            const savedOtp = localStorage.getItem('adminOtpExpiry');
            if (savedOtp) {
                const session = JSON.parse(savedOtp);
                if (session.expires_at) {
                    const expiresAt = new Date(session.expires_at);
                    const now = new Date();
                    
                    if (now < expiresAt) {
                        setStep('otp');
                        setMaskedEmail(session.masked_email || '');
                        setOtpExpiresAt(session.expires_at);
                        const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
                        setOtpTimer(secondsLeft);
                    } else {
                        localStorage.removeItem('adminOtpExpiry');
                    }
                }
            }
        } catch (e) {
            console.error("Invalid OTP session data", e);
            localStorage.removeItem('adminOtpExpiry');
        }
    }, []);

    // OTP Timer countdown
    useEffect(() => {
        if (step === 'otp' && otpExpiresAt) {
            const expiresAt = new Date(otpExpiresAt);
            const timer = setInterval(() => {
                const now = new Date();
                const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
                
                if (secondsLeft <= 0) {
                    setOtpTimer(0);
                    clearInterval(timer);
                    localStorage.removeItem('adminOtpExpiry');
                } else {
                    setOtpTimer(secondsLeft);
                }
            }, 1000);
            
            return () => clearInterval(timer);
        }
    }, [step, otpExpiresAt]);

    const handlePasswordSubmit = async (e) => {
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
            
            const response = await fetch(`${API_BASE_URL}/admin_api.php?action=login`, {
                method: 'POST',
                body: formData
            });
            
            const res = await response.json();

            if (res.success) {
                setMaskedEmail(res.masked_email);
                setOtpExpiresAt(res.otp_expires_at);
                
                // Calculate initial timer
                const expiresAt = new Date(res.otp_expires_at);
                const now = new Date();
                const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
                setOtpTimer(secondsLeft);
                
                // Save to localStorage
                localStorage.setItem('adminOtpExpiry', JSON.stringify({
                    masked_email: res.masked_email,
                    expires_at: res.otp_expires_at,
                    otp_code: res.otp_code
                }));
                
                // Transition to OTP step
                setStep('otp');
                setIsLoading(false);
                toast.success('OTP sent to your email!');
                
                // Focus first OTP input
                setTimeout(() => {
                    if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
                }, 100);
            } else {
                console.error("Login rejected by backend. Debug Data:", res);
                
                // Show more user-friendly error messages
                let errorMsg = 'Login failed';
                if (res.error) {
                    if (res.error.includes('email not configured')) {
                        errorMsg = 'Admin email not set. Please contact system administrator.';
                    } else if (res.error.includes('Invalid password')) {
                        errorMsg = 'Incorrect password. Please try again.';
                    } else {
                        errorMsg = res.error;
                    }
                }
                
                toast.error(errorMsg, { duration: 5000 });
                setIsLoading(false);
            }
        } catch (err) {
            console.error('Login error:', err);
            toast.error('Login failed. Check backend configuration.');
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        
        // Auto-focus next input
        if (value && index < 5) {
            if (otpInputRefs.current[index + 1]) {
                otpInputRefs.current[index + 1].focus();
            }
        }
        
        // Auto-submit when all digits entered
        if (index === 5 && value) {
            const fullOtp = newOtp.join('');
            if (fullOtp.length === 6) {
                handleOtpVerify(fullOtp);
            }
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            // Move to previous input on backspace
            if (otpInputRefs.current[index - 1]) {
                otpInputRefs.current[index - 1].focus();
            }
        }
    };

    const handleOtpVerify = async (otpCode) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin_api.php?action=verify_otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp: otpCode })
            }).then(r => r.json());

            if (res.success && res.token) {
                localStorage.removeItem('adminOtpExpiry');
                setToken(res.token);
                toast.success('Verified! Logging you in...');
            } else {
                toast.error(res.error || 'Invalid OTP code');
                if (res.expired) {
                    localStorage.removeItem('adminOtpExpiry');
                    setStep('password');
                    setOtp(['', '', '', '', '', '']);
                }
                setIsLoading(false);
            }
        } catch (err) {
            toast.error('Verification failed');
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (otpTimer > 0) return;
        
        setIsResending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin_api.php?action=resend_otp`, {
                method: 'POST'
            }).then(r => r.json());

            if (res.success) {
                setOtpExpiresAt(res.otp_expires_at);
                const expiresAt = new Date(res.otp_expires_at);
                const now = new Date();
                const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
                setOtpTimer(secondsLeft);
                
                localStorage.setItem('adminOtpExpiry', JSON.stringify({
                    masked_email: maskedEmail,
                    expires_at: res.otp_expires_at,
                    otp_code: res.otp_code
                }));
                
                setOtp(['', '', '', '', '', '']);
                toast.success('New OTP sent!');
                
                // Focus first OTP input
                setTimeout(() => {
                    if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
                }, 100);
            } else {
                toast.error(res.error || 'Failed to resend OTP');
            }
        } catch (err) {
            toast.error('Failed to resend OTP');
        } finally {
            setIsResending(false);
        }
    };

    const formatTime = (seconds) => {
        // Handle negative or invalid values
        if (seconds <= 0) {
            return '00:00';
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading && step === 'password') return <Preloader />;

    // Password Login Step
    return (
        <div style={{ position: 'relative', display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#09090b', color:'#fff', margin: 0, fontFamily: 'Inter, sans-serif' }}>
            {bgUrl && <div className="bg-blur" style={{ backgroundImage: `url('${bgUrl}')` }}></div>}
            
            <div style={{ position:'relative', zIndex:10, background:'rgba(24, 24, 27, 0.8)', backdropFilter:'blur(20px)', padding:'50px 40px', borderRadius:'20px', width:'420px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
                {/* Icon */}
                <div style={{display:'flex', justifyContent:'center', marginBottom: 25}}>
                    <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        padding: 20,
                        borderRadius: '50%',
                        boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
                    }}>
                        <KeyRound size={32} color="#fff" />
                    </div>
                </div>
                
                <h2 style={{textAlign:'center', marginTop:0, fontWeight: 700, fontSize: 26, marginBottom: 8}}>Admin Access</h2>
                <p style={{textAlign:'center', color:'#a1a1aa', fontSize:14, marginBottom:30, lineHeight: 1.5}}>Enter your master password to continue</p>
                <form onSubmit={handlePasswordSubmit} aria-label="Admin login form">
                    {/* Hidden username field for accessibility */}
                    <input type="text" name="username" value="admin" style={{display: 'none'}} tabIndex="-1" autoComplete="username" aria-label="username" readOnly />
                    
                    <label className="sr-only" htmlFor="admin-password">Password</label>
                    <input 
                        id="admin-password" 
                        type="password" 
                        required 
                        autoComplete="current-password" 
                        value={password} 
                        onChange={e=>setPassword(e.target.value)} 
                        placeholder="Enter your password"
                        style={{ 
                            width:'100%', 
                            padding:'14px 18px', 
                            borderRadius:'12px', 
                            border:'1px solid rgba(255,255,255,0.15)', 
                            background:'rgba(0,0,0,0.3)', 
                            color:'white', 
                            boxSizing:'border-box', 
                            marginBottom:20, 
                            fontSize:15, 
                            outline:'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                            e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                            e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                        <Turnstile 
                            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
                            onSuccess={(token) => setTurnstileToken(token)} 
                            options={{ theme: 'dark' }}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        style={{ 
                            width:'100%', 
                            padding:'14px', 
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                            color:'#fff', 
                            border:'none', 
                            borderRadius:'12px', 
                            fontWeight:600, 
                            cursor: isLoading ? 'not-allowed' : 'pointer', 
                            fontSize:15,
                            transition:'all 0.2s',
                            boxShadow:'0 4px 12px rgba(16, 185, 129, 0.3)',
                            opacity: isLoading ? 0.7 : 1
                        }}
                        onMouseOver={(e) => {
                            if(!isLoading) {
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if(!isLoading) {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {isLoading ? 'Verifying...' : 'Log In'}
                    </button>
                </form>
            </div>

            {/* OTP Modal Overlay */}
            {step === 'otp' && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        position: 'relative', background: '#18181b', padding: '40px', borderRadius: '24px', width: '420px',
                        border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                        animation: 'slideUp 0.3s ease'
                    }}>
                        <button 
                            onClick={() => {
                                setStep('password');
                                setOtp(['', '', '', '', '', '']);
                            }} 
                            style={{
                                position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', 
                                color: '#71717a', cursor: 'pointer', padding: 5, display: 'flex'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#71717a'}
                        >
                            <X size={20} />
                        </button>

                        <div style={{display:'flex', justifyContent:'center', marginBottom: 20}}>
                            <div style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: 16, borderRadius: '50%', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
                            }}>
                                <Mail size={28} color="#fff" />
                            </div>
                        </div>
                        
                        <h2 style={{textAlign:'center', marginTop:0, fontWeight: 700, fontSize: 24, marginBottom: 8}}>Two-Factor Auth</h2>
                        <p style={{textAlign:'center', color:'#a1a1aa', fontSize:14, marginBottom:30, lineHeight: 1.5}}>
                            Enter the 6-digit code sent to<br/>
                            <span style={{color: '#10b981', fontWeight: 600}}>{maskedEmail}</span>
                        </p>
                        
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 30 }}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => otpInputRefs.current[index] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    style={{
                                        width: 48, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 700,
                                        borderRadius: 12, border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)',
                                        color: '#fff', outline: 'none', transition: 'all 0.2s', fontFamily: 'monospace'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#10b981';
                                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                        e.currentTarget.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.2)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                        e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                            ))}
                        </div>
                        
                        <div style={{
                            textAlign: 'center', marginBottom: 25, padding: '12px',
                            background: otpTimer > 60 ? 'rgba(16, 185, 129, 0.1)' : otpTimer > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 10, border: `1px solid ${otpTimer > 60 ? 'rgba(16, 185, 129, 0.3)' : otpTimer > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                            {otpTimer > 0 ? (
                                <>
                                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4 }}>Expires in</div>
                                    <div style={{ 
                                        fontSize: 24, fontWeight: 700, fontFamily: 'monospace',
                                        color: otpTimer > 60 ? '#10b981' : '#f59e0b'
                                    }}>
                                        {formatTime(otpTimer)}
                                    </div>
                                </>
                            ) : (
                                <div style={{ 
                                    fontSize: 18, fontWeight: 700, color: '#ef4444'
                                }}>
                                    OTP Expired
                                </div>
                            )}
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                            {otpTimer > 0 ? (
                                <p style={{ color: '#71717a', fontSize: 13, margin: 0 }}>
                                    Wait for timer to expire to resend
                                </p>
                            ) : (
                                <button
                                    onClick={handleResendOtp}
                                    disabled={isResending}
                                    style={{
                                        background: 'transparent', border: 'none', color: '#10b981', fontSize: 14, fontWeight: 600,
                                        cursor: isResending ? 'not-allowed' : 'pointer', padding: '8px 16px', borderRadius: 8, transition: '0.2s'
                                    }}
                                    onMouseOver={(e) => !isResending && (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {isResending ? 'Sending...' : 'Resend OTP'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Global Keyframes for animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
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
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 40, animation: 'fadeIn 0.2s ease' }}
                />
            )}
            <div style={{
                position: 'fixed', top: 0, right: isOpen ? 0 : '-100%', width: '450px', maxWidth: '100vw',
                height: '100vh', background: '#18181b', color: '#fff', zIndex: 50, transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
                borderLeft: '1px solid #27272a'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #27272a' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a1a1aa', padding: 5, display: 'flex' }}>
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

// --- Layout with Custom Sidebar ---
function AdminLayout({ onLogout, children }) {
    const [sidebarUnfolded, setSidebarUnfolded] = useState(true);
    const location = useLocation();

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#09090b', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            <div 
                className="admin-sidebar" 
                style={{ 
                    background: '#18181b', 
                    borderRight: '1px solid #27272a',
                    width: sidebarUnfolded ? '260px' : '80px',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    zIndex: 20
                }}
            >
                <div style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: sidebarUnfolded ? 'space-between' : 'center', 
                    padding: '24px 16px', borderBottom: '1px solid #27272a', height: '80px', boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: 8, borderRadius: 10, display: 'flex', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', flexShrink: 0 }}>
                            <LayoutDashboard size={22} color="#fff" />
                        </div>
                        {sidebarUnfolded && <span style={{ fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Admin Panel</span>}
                    </div>
                </div>
                
                <nav style={{ padding: '24px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', overflowX: 'hidden' }}>
                    <Link 
                        to="/admin" 
                        style={{
                            color: (location.pathname === '/admin' || location.pathname === '/admin/') ? '#fff' : '#a1a1aa',
                            background: (location.pathname === '/admin' || location.pathname === '/admin/') ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            padding: '12px 16px',
                            margin: '0 16px',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarUnfolded ? 'flex-start' : 'center',
                            gap: 14,
                            textDecoration: 'none',
                            fontWeight: 500,
                            fontSize: 15,
                            transition: 'all 0.2s ease',
                            border: (location.pathname === '/admin' || location.pathname === '/admin/') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            if (location.pathname !== '/admin' && location.pathname !== '/admin/') {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (location.pathname !== '/admin' && location.pathname !== '/admin/') {
                                e.currentTarget.style.color = '#a1a1aa';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                        title={!sidebarUnfolded ? "Dashboard" : ""}
                    >
                        <LayoutDashboard size={20} style={{ flexShrink: 0, color: (location.pathname === '/admin' || location.pathname === '/admin/') ? '#10b981' : 'inherit' }} />
                        {sidebarUnfolded && <span style={{ whiteSpace: 'nowrap' }}>Dashboard</span>}
                    </Link>

                    <Link 
                        to="/admin/releases" 
                        style={{
                            color: location.pathname.startsWith('/admin/releases') ? '#fff' : '#a1a1aa',
                            background: location.pathname.startsWith('/admin/releases') ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            padding: '12px 16px',
                            margin: '0 16px',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarUnfolded ? 'flex-start' : 'center',
                            gap: 14,
                            textDecoration: 'none',
                            fontWeight: 500,
                            fontSize: 15,
                            transition: 'all 0.2s ease',
                            border: location.pathname.startsWith('/admin/releases') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            if (!location.pathname.startsWith('/admin/releases')) {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!location.pathname.startsWith('/admin/releases')) {
                                e.currentTarget.style.color = '#a1a1aa';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                        title={!sidebarUnfolded ? "Releases" : ""}
                    >
                        <HomeIcon size={20} style={{ flexShrink: 0, color: location.pathname.startsWith('/admin/releases') ? '#10b981' : 'inherit' }} />
                        {sidebarUnfolded && <span style={{ whiteSpace: 'nowrap' }}>Releases</span>}
                    </Link>

                    <Link 
                        to="/admin/subscribers"
                        style={{
                            color: location.pathname.startsWith('/admin/subscribers') ? '#fff' : '#a1a1aa',
                            background: location.pathname.startsWith('/admin/subscribers') ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            padding: '12px 16px',
                            margin: '0 16px',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarUnfolded ? 'flex-start' : 'center',
                            gap: 14,
                            textDecoration: 'none',
                            fontWeight: 500,
                            fontSize: 15,
                            transition: 'all 0.2s ease',
                            border: location.pathname.startsWith('/admin/subscribers') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            if (!location.pathname.startsWith('/admin/subscribers')) {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!location.pathname.startsWith('/admin/subscribers')) {
                                e.currentTarget.style.color = '#a1a1aa';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                        title={!sidebarUnfolded ? "Subscribers" : ""}
                    >
                        <Users size={20} style={{ flexShrink: 0, color: location.pathname.startsWith('/admin/subscribers') ? '#10b981' : 'inherit' }} />
                        {sidebarUnfolded && <span style={{ whiteSpace: 'nowrap' }}>Subscribers</span>}
                    </Link>

                    <Link 
                        to="/admin/home"
                        style={{
                            color: location.pathname.startsWith('/admin/home') ? '#fff' : '#a1a1aa',
                            background: location.pathname.startsWith('/admin/home') ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            padding: '12px 16px',
                            margin: '0 16px',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarUnfolded ? 'flex-start' : 'center',
                            gap: 14,
                            textDecoration: 'none',
                            fontWeight: 500,
                            fontSize: 15,
                            transition: 'all 0.2s ease',
                            border: location.pathname.startsWith('/admin/home') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            if (!location.pathname.startsWith('/admin/home')) {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!location.pathname.startsWith('/admin/home')) {
                                e.currentTarget.style.color = '#a1a1aa';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                        title={!sidebarUnfolded ? "Homepage Settings" : ""}
                    >
                        <Edit2 size={20} style={{ flexShrink: 0, color: location.pathname.startsWith('/admin/home') ? '#10b981' : 'inherit' }} />
                        {sidebarUnfolded && <span style={{ whiteSpace: 'nowrap' }}>Homepage</span>}
                    </Link>

                    <Link 
                        to="/admin/password"
                        style={{
                            color: location.pathname.startsWith('/admin/password') ? '#fff' : '#a1a1aa',
                            background: location.pathname.startsWith('/admin/password') ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            padding: '12px 16px',
                            margin: '0 16px',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarUnfolded ? 'flex-start' : 'center',
                            gap: 14,
                            textDecoration: 'none',
                            fontWeight: 500,
                            fontSize: 15,
                            transition: 'all 0.2s ease',
                            border: location.pathname.startsWith('/admin/password') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            if (!location.pathname.startsWith('/admin/password')) {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!location.pathname.startsWith('/admin/password')) {
                                e.currentTarget.style.color = '#a1a1aa';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                        title={!sidebarUnfolded ? "Security Settings" : ""}
                    >
                        <KeyRound size={20} style={{ flexShrink: 0, color: location.pathname.startsWith('/admin/password') ? '#10b981' : 'inherit' }} />
                        {sidebarUnfolded && <span style={{ whiteSpace: 'nowrap' }}>Security</span>}
                    </Link>
                </nav>

                <div style={{ padding: '16px', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button 
                        onClick={onLogout} 
                        style={{ 
                            width: '100%', 
                            textAlign: 'left', 
                            padding: '12px 16px', 
                            background: 'transparent', 
                            color: '#ef4444', 
                            border: '1px solid transparent', 
                            borderRadius: 10, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: sidebarUnfolded ? 'flex-start' : 'center',
                            gap: 14, 
                            fontWeight: 500, 
                            fontSize: 15, 
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box'
                        }} 
                        onMouseOver={e => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                        }} 
                        onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                        title={!sidebarUnfolded ? "Log Out" : ""}
                    >
                        <LogOut size={20} style={{ flexShrink: 0 }} />
                        {sidebarUnfolded && <span style={{ whiteSpace: 'nowrap' }}>Log Out</span>}
                    </button>
                    
                    <button 
                        onClick={() => setSidebarUnfolded(!sidebarUnfolded)}
                        style={{ 
                            background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', 
                            padding: '8px', display: 'flex', justifyContent: 'center', transition: '0.2s',
                            borderRadius: '8px'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        title={sidebarUnfolded ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        <Menu size={20} />
                    </button>
                </div>
            </div>

            <div className="admin-content" style={{ flex: 1, overflowY: 'auto', padding: '30px', background: '#09090b' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// Modal Component
function Modal({ isOpen, onClose, title, message, onConfirm, confirmText='Confirm', isDestructive=false }) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: '#18181b', padding: '24px 30px', borderRadius: '20px', width: '380px', maxWidth: '90vw', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid #27272a' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 18, fontWeight: 600, color:'#fff' }}>{title}</h3>
                <p style={{ margin: '0 0 24px 0', color: '#a1a1aa', fontSize:14, lineHeight:1.5 }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={onClose} style={{ padding: '10px 16px', background: '#27272a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition:'0.2s' }} onMouseOver={e=>e.currentTarget.style.background='#3f3f46'} onMouseOut={e=>e.currentTarget.style.background='#27272a'}>Cancel</button>
                    <button onClick={onConfirm} style={{ padding: '10px 16px', background: isDestructive ? '#ef4444' : '#fff', color: isDestructive ? '#fff' : '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition:'0.2s' }} onMouseOver={e=>e.currentTarget.style.opacity='0.9'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

// --- Views ---

function DashboardView({ token, onLogout }) {
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchApi('analytics', token).then(data => {
            if (data.success) setAnalytics(data.data);
            else if (data.error === 'Unauthorized') onLogout();
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, [token, onLogout]);

    const handleExport = () => {
        if (!analytics) return;
        const csvRows = [];
        csvRows.push(['Date', 'Visitors', 'Streams']);
        analytics.activity.forEach(row => {
            csvRows.push([row.date, row.visitors, row.streams]);
        });
        const csvContent = csvRows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Analytics report exported');
    };

    if (isLoading) return <Preloader />;
    if (!analytics) return <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Failed to load analytics</div>;

    const { total_releases, total_subscribers, activity, sources } = analytics;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: '0 0 5px 0', fontSize: 28, fontWeight: 700, color: '#fff' }}>Overview</h1>
                    <p style={{ margin: 0, color: '#a1a1aa', fontSize: 15 }}>Welcome back! Here's what's happening with your music.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <select 
                        style={{ 
                            padding: '10px 16px', borderRadius: 8, border: '1px solid #27272a', 
                            background: '#18181b', color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer' 
                        }}
                    >
                        <option value="30">Last 30 Days</option>
                        <option value="7">Last 7 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                    <button 
                        onClick={handleExport}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', 
                            background: '#fff', color: '#000', border: 'none', borderRadius: 8, 
                            cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: '0.2s',
                            boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#e4e4e7'}
                        onMouseOut={e => e.currentTarget.style.background = '#fff'}
                    >
                        <LayoutDashboard size={16} /> Export Report
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
                <div style={{ background: '#18181b', padding: 24, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 10, color: '#10b981' }}>
                            <HomeIcon size={24} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#a1a1aa', fontSize: 15 }}>Total Releases</span>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{total_releases}</div>
                </div>
                <div style={{ background: '#18181b', padding: 24, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 10, borderRadius: 10, color: '#3b82f6' }}>
                            <Users size={24} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#a1a1aa', fontSize: 15 }}>Total Subscribers</span>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{total_subscribers}</div>
                </div>
                <div style={{ background: '#18181b', padding: 24, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 10, color: '#f59e0b' }}>
                            <LayoutDashboard size={24} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#a1a1aa', fontSize: 15 }}>Total Streams (30d)</span>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
                        {activity.reduce((acc, curr) => acc + curr.streams, 0).toLocaleString()}
                    </div>
                </div>
                <div style={{ background: '#18181b', padding: 24, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'rgba(147, 51, 234, 0.1)', padding: 10, borderRadius: 10, color: '#9333ea' }}>
                            <Share2 size={24} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#a1a1aa', fontSize: 15 }}>Total Visitors (30d)</span>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
                        {activity.reduce((acc, curr) => acc + curr.visitors, 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                {/* Line Chart */}
                <div style={{ background: '#18181b', padding: 24, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 600, color: '#fff' }}>Audience Activity</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <LineChart data={activity} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dx={-10} />
                                <Tooltip 
                                    contentStyle={{ background: '#18181b', borderRadius: 12, border: '1px solid #27272a', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', color: '#fff' }}
                                    itemStyle={{ fontWeight: 600 }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                                <Line type="monotone" dataKey="streams" name="Streams" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="visitors" name="Visitors" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div style={{ background: '#18181b', padding: 24, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 600, color: '#fff' }}>Traffic Sources</h3>
                    <div style={{ width: '100%', flex: 1, minHeight: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={sources}
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sources.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ background: '#18181b', borderRadius: 12, border: '1px solid #27272a', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', color: '#fff' }}
                                    itemStyle={{ fontWeight: 600, color: '#fff' }}
                                />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bar Chart Row */}
            <div style={{ background: '#18181b', padding: 24, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 600, color: '#fff' }}>Platform Engagement</h3>
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                        <BarChart data={sources} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dx={-10} />
                            <Tooltip 
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ background: '#18181b', borderRadius: 12, border: '1px solid #27272a', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', color: '#fff' }}
                            />
                            <Bar dataKey="value" name="Engagement Score" radius={[6, 6, 0, 0]}>
                                {sources.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <div>
                    <h1 style={{ margin: '0 0 5px 0', fontSize: 28, fontWeight: 700, color: '#fff' }}>Releases</h1>
                    <p style={{ margin: 0, color: '#a1a1aa' }}>Manage your artist releases and links here.</p>
                </div>
                <button 
                    onClick={() => openDrawer()} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', 
                        background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, 
                        cursor: 'pointer', fontWeight: 600, fontSize: 15, transition: '0.2s',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                    }}
                    onMouseOver={e => {
                        e.currentTarget.style.background = '#059669';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.background = '#10b981';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <Plus size={18} /> Add Release
                </button>
            </div>

            <div style={{ background: '#18181b', borderRadius: 16, border: '1px solid #27272a', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                {releases.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#71717a' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <HomeIcon size={40} />
                        </div>
                        <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>No releases yet</h3>
                        <p style={{ maxWidth: 300, margin: '0 auto' }}>Click the "Add Release" button to create your first release.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #27272a', background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ width: '40%', textAlign: 'left', padding: '16px 24px', color: '#a1a1aa', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Release</th>
                                    <th style={{ width: '30%', textAlign: 'left', padding: '16px 24px', color: '#a1a1aa', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Artist</th>
                                    <th style={{ width: '30%', textAlign: 'right', padding: '16px 24px', color: '#a1a1aa', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {releases.map(r => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #27272a', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                                        <td style={{ padding: '20px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ 
                                                    width: 64, 
                                                    height: 64, 
                                                    borderRadius: 10, 
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                    border: '1px solid #27272a'
                                                }}>
                                                    <img 
                                                        src={r.full_cover_url} 
                                                        alt={r.title} 
                                                        style={{ 
                                                            width: '100%', 
                                                            height: '100%', 
                                                            objectFit: 'cover',
                                                            display: 'block'
                                                        }} 
                                                    />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#fff', fontSize: 15, marginBottom: 4 }}>{r.title}</div>
                                                    <div style={{ fontSize: 12, color: '#71717a', fontFamily: 'monospace' }}>/{r.shortcode}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 24px', color: '#a1a1aa', fontWeight: 500 }}>{r.artist}</td>
                                        <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: 10 }}>
                                                <a href={`/?s=${r.shortcode}`} target="_blank" rel="noreferrer" style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#27272a', color: '#fff', borderRadius: 10, transition: '0.2s' }} title="View Release" onMouseOver={e=>{e.currentTarget.style.background='#3f3f46'}} onMouseOut={e=>{e.currentTarget.style.background='#27272a'}}>
                                                    <ExternalLink size={18} />
                                                </a>
                                                <button onClick={() => handleShare(r.shortcode)} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: 10, cursor: 'pointer', transition: '0.2s' }} title="Share Link" onMouseOver={e=>{e.currentTarget.style.background='rgba(59, 130, 246, 0.2)'}} onMouseOut={e=>{e.currentTarget.style.background='rgba(59, 130, 246, 0.1)'}}>
                                                    <Share2 size={18} />
                                                </button>
                                                <button onClick={() => openDrawer(r.id)} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', borderRadius: 10, cursor: 'pointer', transition: '0.2s' }} title="Edit Release" onMouseOver={e=>{e.currentTarget.style.background='rgba(16, 185, 129, 0.2)'}} onMouseOut={e=>{e.currentTarget.style.background='rgba(16, 185, 129, 0.1)'}}>
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => openDeleteModal(r.id)} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: 10, cursor: 'pointer', transition: '0.2s' }} title="Delete Release" onMouseOver={e=>{e.currentTarget.style.background='rgba(239, 68, 68, 0.2)'}} onMouseOut={e=>{e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'}}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
    const [spotifyEmbed, setSpotifyEmbed] = useState('');
    const [links, setLinks] = useState([{ platform_name: '', platform_url: '' }]);

    useEffect(() => {
        if (!isNew) {
            fetchApi(`get&id=${releaseId}`, token).then(data => {
                if (data.success) {
                    setTitle(data.data.title);
                    setArtist(data.data.artist);
                    setSpotifyEmbed(data.data.spotify_embed || '');
                    if (data.data.links && data.data.links.length > 0) setLinks(data.data.links);
                } else if (data.error === 'Unauthorized') onLogout();
            });
        } else {
            setTitle('');
            setArtist('');
            setCoverFile(null);
            setSpotifyEmbed('');
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
        formData.append('spotify_embed', spotifyEmbed);
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
            <div style={{marginBottom:20}}>
                <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Title</label>
                <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required style={{width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', outline:'none', color:'#fff', background:'#09090b'}} onFocus={e=>e.currentTarget.style.borderColor='#10b981'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}/>
            </div>
            <div style={{marginBottom:20}}>
                <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Artist</label>
                <input type="text" value={artist} onChange={e=>setArtist(e.target.value)} required style={{width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', outline:'none', color:'#fff', background:'#09090b'}} onFocus={e=>e.currentTarget.style.borderColor='#10b981'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}/>
            </div>
            <div style={{marginBottom:25}}>
                <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Cover Image {isNew ? '' : '(Upload to replace)'}</label>
                <input type="file" onChange={e=>setCoverFile(e.target.files[0])} accept="image/*" required={isNew} style={{width:'100%', padding:'10px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', background:'#09090b', color:'#a1a1aa'}}/>
            </div>

            <div style={{marginBottom:25}}>
                <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Spotify Embed Code (Optional)</label>
                <textarea 
                    value={spotifyEmbed} 
                    onChange={e=>setSpotifyEmbed(e.target.value)} 
                    placeholder="Paste Spotify embed iframe code here..." 
                    style={{width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', minHeight:100, outline:'none', color:'#fff', background:'#09090b', fontFamily:'monospace', fontSize:12}}
                    onFocus={e=>e.currentTarget.style.borderColor='#10b981'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}
                />
                <p style={{margin:'8px 0 0 0', fontSize:12, color:'#71717a'}}>Go to Spotify → Share → Embed track → Copy the iframe code</p>
            </div>

            <h3 style={{fontSize:16, fontWeight:600, marginTop:0, marginBottom:20, borderBottom:'1px solid #27272a', paddingBottom:12, color: '#fff'}}>Platform Links</h3>
            <div style={{marginBottom:30}}>
                {links.map((link, idx) => (
                    <div key={idx} style={{display:'flex', gap:10, marginBottom:12, alignItems:'center', width:'100%'}}>
                        <input type="text" placeholder="Platform (e.g. Spotify)" value={link.platform_name} onChange={e=> { const l=[...links]; l[idx].platform_name=e.target.value; setLinks(l); }} required style={{flex:1, minWidth:0, padding:'12px 14px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', outline:'none', color:'#fff', background:'#09090b'}} onFocus={e=>e.currentTarget.style.borderColor='#10b981'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}/>
                        <input type="text" placeholder="URL" value={link.platform_url} onChange={e=> { const l=[...links]; l[idx].platform_url=e.target.value; setLinks(l); }} required style={{flex:1, minWidth:0, padding:'12px 14px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', outline:'none', color:'#fff', background:'#09090b'}} onFocus={e=>e.currentTarget.style.borderColor='#10b981'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}/>
                        <button type="button" onClick={() => setLinks(links.filter((_,i) => i!==idx))} style={{flexShrink:0, width: 44, height: 44, background:'rgba(239, 68, 68, 0.1)', color:'#ef4444', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'0.2s'}} onMouseOver={e=>e.currentTarget.style.background='rgba(239, 68, 68, 0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'}><X size={20}/></button>
                    </div>
                ))}
                <button type="button" onClick={() => setLinks([...links, {platform_name:'', platform_url:''}])} style={{padding:'10px 18px', background:'rgba(255,255,255,0.05)', color:'#fff', border:'1px solid #27272a', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', gap:8, transition:'0.2s'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}><Plus size={18}/> Add Link</button>
            </div>
            <button type="submit" style={{width:'100%', padding:'14px', background: '#fff', color:'#000', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:16, transition:'0.2s', boxSizing:'border-box', boxShadow: '0 10px 20px rgba(0,0,0,0.2)'}} onMouseOver={e=>e.currentTarget.style.background='#e4e4e7'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>Save Release</button>
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
            <h1 style={{ margin: '0 0 5px 0', fontSize: 28, fontWeight: 700, color: '#fff' }}>Homepage Settings</h1>
            <p style={{ margin: '0 0 30px 0', color: '#a1a1aa' }}>Customize your main portfolio interface.</p>
            
            <form onSubmit={handleSave} style={{ background: '#18181b', padding: 40, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <div style={{marginBottom:24}}>
                    <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Artist Name</label>
                    <input type="text" value={artist} onChange={e=>setArtist(e.target.value)} required style={{width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', outline:'none', color:'#fff', background:'#09090b'}} onFocus={e=>e.currentTarget.style.borderColor='#10b981'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}/>
                </div>
                <div style={{marginBottom:24}}>
                    <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Hero Title</label>
                    <input type="text" value={heroTitle} onChange={e=>setHeroTitle(e.target.value)} style={{width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', outline:'none', color:'#fff', background:'#09090b'}} onFocus={e=>e.currentTarget.style.borderColor='#10b981'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}/>
                </div>
                <div style={{marginBottom:24}}>
                    <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Hero Subtitle</label>
                    <textarea value={heroSub} onChange={e=>setHeroSub(e.target.value)} style={{width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', minHeight:100, outline:'none', color:'#fff', background:'#09090b'}} onFocus={e=>e.currentTarget.style.borderColor='#10b981'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}/>
                </div>
                <div style={{marginBottom:24}}>
                    <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Background Image</label>
                    <input type="file" onChange={e=>setBgFile(e.target.files[0])} accept="image/*" style={{width:'100%', padding:'10px', borderRadius:10, border:'1px solid #27272a', background:'#09090b', color:'#a1a1aa'}}/>
                </div>
                <div style={{marginBottom:40}}>
                    <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Profile Image</label>
                    <input type="file" onChange={e=>setProfileFile(e.target.files[0])} accept="image/*" style={{width:'100%', padding:'10px', borderRadius:10, border:'1px solid #27272a', background:'#09090b', color:'#a1a1aa'}}/>
                </div>
                <button type="submit" style={{width:'100%', padding:'14px', background: '#fff', color:'#000', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:16, transition:'0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.2)'}} onMouseOver={e=>e.currentTarget.style.background='#e4e4e7'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>Update Homepage</button>
            </form>
        </div>
    );
}

function SubscribersView({ token, onLogout }) {
    const [subscribers, setSubscribers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        total_pages: 1
    });
    const itemsPerPage = 10;
    
    // Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [subscriberToDelete, setSubscriberToDelete] = useState(null);
    const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);

    const loadSubscribers = (page = 1, search = '') => {
        setIsLoading(true);
        fetchApi(`list_subscribers&page=${page}&per_page=${itemsPerPage}&search=${encodeURIComponent(search)}`, token).then(data => {
            if (data.success) {
                setSubscribers(data.data);
                setPagination(data.pagination || { current_page: 1, per_page: 10, total: 0, total_pages: 1 });
            }
            else if (data.error === 'Unauthorized') onLogout();
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    };

    useEffect(() => { loadSubscribers(); }, [token]);

    const handleDelete = (id) => {
        setSubscriberToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!subscriberToDelete) return;
        
        const res = await fetchApi('delete_subscriber&id=' + subscriberToDelete, token, { method: 'DELETE' });
        if (res.success) {
            toast.success('Subscriber removed');
            loadSubscribers(currentPage, searchTerm);
        } else {
            toast.error('Failed to remove subscriber');
        }
        setDeleteModalOpen(false);
        setSubscriberToDelete(null);
    };

    const handleDeleteAll = () => {
        setDeleteAllModalOpen(true);
    };

    const confirmDeleteAll = async () => {
        const res = await fetchApi('delete_all_subscribers', token, { method: 'DELETE' });
        if (res.success) {
            toast.success('All subscribers removed');
            setCurrentPage(1);
            loadSubscribers(1, '');
        } else {
            toast.error('Failed to remove subscribers');
        }
        setDeleteAllModalOpen(false);
    };

    const handleExport = async () => {
        // Fetch all subscribers for export (admin action)
        const loadingToast = toast.loading('Preparing export...');
        try {
            const allSubscribers = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const data = await fetchApi(`list_subscribers&page=${page}&per_page=100`, token);
                if (data.success && data.data.length > 0) {
                    allSubscribers.push(...data.data);
                    if (page >= (data.pagination?.total_pages || 1)) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }
            
            // Since emails are masked, we'll export what we have
            const csvContent = [
                ['Email (Masked)', 'Subscribed Date'],
                ...allSubscribers.map(s => [s.email, new Date(s.subscribed_at).toLocaleString()])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Subscribers exported to CSV', { id: loadingToast });
        } catch (error) {
            toast.error('Failed to export subscribers', { id: loadingToast });
        }
    };

    const handleSearch = (value) => {
        setSearchTerm(value);
        setCurrentPage(1);
        loadSubscribers(1, value);
    };

    const goToPage = (page) => {
        const newPage = Math.max(1, Math.min(page, pagination.total_pages));
        setCurrentPage(newPage);
        loadSubscribers(newPage, searchTerm);
    };

    if (isLoading) return <Preloader />;

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <div>
                    <h1 style={{ margin: '0 0 5px 0', fontSize: 28, fontWeight: 700 }}>Subscribers</h1>
                    <p style={{ margin: 0, color: '#71717a' }}>Manage newsletter subscribers ({pagination.total} total).</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleExport} style={{ padding: '12px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', transition: '0.2s' }}>
                        <Mail size={18} /> Export CSV
                    </button>
                    {pagination.total > 0 && (
                        <button onClick={handleDeleteAll} style={{ padding: '12px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)', transition: '0.2s' }}>
                            <Trash2 size={18} /> Delete All
                        </button>
                    )}
                </div>
            </div>

            {/* Search and Filters */}
            <div style={{ 
                background: '#fff', 
                padding: 20, 
                borderRadius: 12, 
                border: '1px solid #e4e4e7', 
                marginBottom: 20,
                display: 'flex',
                gap: 15,
                alignItems: 'center'
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder="Search by email..." 
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: '1px solid #e4e4e7',
                            boxSizing: 'border-box',
                            outline: 'none',
                            color: '#18181b',
                            background: '#fff',
                            fontSize: 14
                        }}
                    />
                </div>
                <div style={{ color: '#71717a', fontSize: 14, whiteSpace: 'nowrap' }}>
                    Showing {subscribers.length} of {pagination.total} subscribers
                </div>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                {subscribers.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#71717a' }}>
                        <Mail size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                        <p style={{ fontSize: 16, margin: '0 0 8px 0' }}>
                            {pagination.total === 0 ? 'No subscribers yet' : 'No results found'}
                        </p>
                        <p style={{ fontSize: 14, margin: 0 }}>
                            {pagination.total === 0 
                                ? 'Users will appear here when they subscribe to your newsletter.' 
                                : 'Try adjusting your search terms.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#fafafa', borderBottom: '2px solid #e4e4e7' }}>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, color: '#52525b', fontSize: 13, textTransform: 'uppercase' }}>
                                        Email
                                    </th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, color: '#52525b', fontSize: 13, textTransform: 'uppercase' }}>
                                        Subscribed Date
                                    </th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, color: '#52525b', fontSize: 13, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscribers.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                                        <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Mail size={16} color="#52525b" />
                                            </div>
                                            <span style={{ fontWeight: 500, color: '#18181b', wordBreak: 'break-word', fontFamily: 'monospace' }}>{s.email}</span>
                                            {s.email_masked && (
                                                <span style={{ fontSize: 10, color: '#a1a1aa', background: '#f4f4f5', padding: '2px 6px', borderRadius: 4 }}>masked</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#52525b', fontSize: 14, whiteSpace: 'nowrap' }}>
                                            {new Date(s.subscribed_at).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'short', 
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <button onClick={() => handleDelete(s.id)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', transition: '0.2s' }} title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {pagination.total_pages > 1 && (
                            <div style={{ 
                                padding: '20px 24px', 
                                borderTop: '1px solid #e4e4e7',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#fafafa'
                            }}>
                                <div style={{ fontSize: 14, color: '#71717a' }}>
                                    Page {pagination.current_page} of {pagination.total_pages}
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button 
                                        onClick={() => goToPage(1)} 
                                        disabled={pagination.current_page === 1}
                                        style={{ 
                                            padding: '8px 12px',
                                            background: pagination.current_page === 1 ? '#f4f4f5' : '#fff',
                                            color: pagination.current_page === 1 ? '#a1a1aa' : '#18181b',
                                            border: '1px solid #e4e4e7',
                                            borderRadius: 6,
                                            cursor: pagination.current_page === 1 ? 'not-allowed' : 'pointer',
                                            fontSize: 13,
                                            fontWeight: 500,
                                            transition: '0.2s'
                                        }}
                                    >
                                        First
                                    </button>
                                    <button 
                                        onClick={() => goToPage(pagination.current_page - 1)} 
                                        disabled={pagination.current_page === 1}
                                        style={{ 
                                            padding: '8px 12px',
                                            background: pagination.current_page === 1 ? '#f4f4f5' : '#fff',
                                            color: pagination.current_page === 1 ? '#a1a1aa' : '#18181b',
                                            border: '1px solid #e4e4e7',
                                            borderRadius: 6,
                                            cursor: pagination.current_page === 1 ? 'not-allowed' : 'pointer',
                                            fontSize: 13,
                                            fontWeight: 500,
                                            transition: '0.2s'
                                        }}
                                    >
                                        Previous
                                    </button>
                                    
                                    {/* Page numbers */}
                                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                        let pageNum;
                                        if (pagination.total_pages <= 5) {
                                            pageNum = i + 1;
                                        } else if (pagination.current_page <= 3) {
                                            pageNum = i + 1;
                                        } else if (pagination.current_page >= pagination.total_pages - 2) {
                                            pageNum = pagination.total_pages - 4 + i;
                                        } else {
                                            pageNum = pagination.current_page - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => goToPage(pageNum)}
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    background: pagination.current_page === pageNum ? '#18181b' : '#fff',
                                                    color: pagination.current_page === pageNum ? '#fff' : '#18181b',
                                                    border: '1px solid #e4e4e7',
                                                    borderRadius: 6,
                                                    cursor: 'pointer',
                                                    fontSize: 13,
                                                    fontWeight: pagination.current_page === pageNum ? 600 : 500,
                                                    transition: '0.2s'
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    
                                    <button 
                                        onClick={() => goToPage(pagination.current_page + 1)} 
                                        disabled={pagination.current_page === pagination.total_pages}
                                        style={{ 
                                            padding: '8px 12px',
                                            background: pagination.current_page === pagination.total_pages ? '#f4f4f5' : '#fff',
                                            color: pagination.current_page === pagination.total_pages ? '#a1a1aa' : '#18181b',
                                            border: '1px solid #e4e4e7',
                                            borderRadius: 6,
                                            cursor: pagination.current_page === pagination.total_pages ? 'not-allowed' : 'pointer',
                                            fontSize: 13,
                                            fontWeight: 500,
                                            transition: '0.2s'
                                        }}
                                    >
                                        Next
                                    </button>
                                    <button 
                                        onClick={() => goToPage(pagination.total_pages)} 
                                        disabled={pagination.current_page === pagination.total_pages}
                                        style={{ 
                                            padding: '8px 12px',
                                            background: pagination.current_page === pagination.total_pages ? '#f4f4f5' : '#fff',
                                            color: pagination.current_page === pagination.total_pages ? '#a1a1aa' : '#18181b',
                                            border: '1px solid #e4e4e7',
                                            borderRadius: 6,
                                            cursor: pagination.current_page === pagination.total_pages ? 'not-allowed' : 'pointer',
                                            fontSize: 13,
                                            fontWeight: 500,
                                            transition: '0.2s'
                                        }}
                                    >
                                        Last
                                    </button>
                                </div>
                                <div style={{ fontSize: 14, color: '#71717a' }}>
                                    {itemsPerPage} per page
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Single Subscriber Modal */}
            <Modal 
                isOpen={deleteModalOpen} 
                onClose={() => {
                    setDeleteModalOpen(false);
                    setSubscriberToDelete(null);
                }} 
                title="Delete Subscriber" 
                message="Are you sure you want to remove this subscriber? This action cannot be undone."
                onConfirm={confirmDelete}
                confirmText="Delete"
                isDestructive={true}
            />

            {/* Delete All Subscribers Modal */}
            <Modal 
                isOpen={deleteAllModalOpen} 
                onClose={() => setDeleteAllModalOpen(false)} 
                title="Delete All Subscribers" 
                message="Are you sure you want to delete ALL subscribers? This action cannot be undone and all subscriber data will be permanently removed."
                onConfirm={confirmDeleteAll}
                confirmText="Delete All"
                isDestructive={true}
            />
        </>
    );
}

function ChangePasswordView({ token, setToken }) {
    const [newPassword, setNewPassword] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [currentEmail, setCurrentEmail] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [emailLoaded, setEmailLoaded] = useState(false);

    useEffect(() => {
        // Load current admin email
        fetchApi('get_admin_email', token).then(data => {
            if (data.success && data.email) {
                setCurrentEmail(data.email);
                setMaskedEmail(data.masked_email);
            }
            setEmailLoaded(true);
        });
    }, [token]);

    const handleSavePassword = async (e) => {
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

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        const loadingToast = toast.loading('Updating email...');
        
        try {
            const res = await fetch(API_URL + '?action=update_admin_email', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: adminEmail })
            }).then(r => r.json());

            if (res.success) {
                toast.success('Admin email updated! OTP will be sent to this email on next login.', { id: loadingToast, duration: 6000 });
                setCurrentEmail(adminEmail);
                const parts = adminEmail.split('@');
                setMaskedEmail(parts[0].substring(0, 2) + '***@' + parts[1]);
                setAdminEmail('');
            } else {
                toast.error(res.error || 'Failed to update email', { id: loadingToast });
            }
        } catch (err) {
            toast.error('Failed to update email', { id: loadingToast });
        }
    };

    if (!emailLoaded) return <Preloader />;

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ margin: '0 0 5px 0', fontSize: 28, fontWeight: 700, color: '#fff' }}>Security Settings</h1>
            <p style={{ margin: '0 0 30px 0', color: '#a1a1aa' }}>Manage your admin security preferences.</p>
            
            {/* OTP Email Configuration */}
            <div style={{ background: '#18181b', padding: 40, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 10, display: 'flex', color: '#3b82f6' }}>
                        <Mail size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#fff' }}>Two-Factor Authentication Email</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#a1a1aa' }}>OTP verification codes will be sent to this email</p>
                    </div>
                </div>
                
                {currentEmail && (
                    <div style={{ 
                        background: 'rgba(16, 185, 129, 0.05)', 
                        border: '1px solid rgba(16, 185, 129, 0.2)', 
                        borderRadius: 12, 
                        padding: '16px 20px', 
                        marginBottom: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ fontSize: 12, color: '#10b981', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current OTP Email</div>
                            <div style={{ fontSize: 16, color: '#fff', fontWeight: 500, fontFamily: 'monospace' }}>{maskedEmail}</div>
                        </div>
                        <div style={{ 
                            background: '#10b981', 
                            color: '#fff', 
                            padding: '6px 12px', 
                            borderRadius: 8, 
                            fontSize: 12, 
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}>
                            ✓ Active
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleUpdateEmail}>
                    <div style={{marginBottom:24}}>
                        <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>Update OTP Email Address</label>
                        <input 
                            type="email" 
                            value={adminEmail} 
                            onChange={e=>setAdminEmail(e.target.value)} 
                            required 
                            placeholder="admin@example.com" 
                            style={{width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', outline:'none', color:'#fff', background:'#09090b', transition:'0.2s'}}
                            onFocus={e=>e.currentTarget.style.borderColor='#3b82f6'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}
                        />
                    </div>
                    <button type="submit" style={{width:'100%', padding:'14px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontWeight:600, fontSize:15, transition:'0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'}} onMouseOver={e=>{e.currentTarget.style.background='#2563eb'; e.currentTarget.style.transform='translateY(-1px)'}} onMouseOut={e=>{e.currentTarget.style.background='#3b82f6'; e.currentTarget.style.transform='translateY(0)'}}>Update Email</button>
                </form>
            </div>
            
            {/* Password Change */}
            <div style={{ background: '#18181b', padding: 40, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 10, display: 'flex', color: '#f59e0b' }}>
                        <KeyRound size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#fff' }}>Change Password</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#a1a1aa' }}>Update your master administration password</p>
                    </div>
                </div>
                
                <form onSubmit={handleSavePassword}>
                    <div style={{marginBottom:24}}>
                        <label style={{display:'block', marginBottom:8, fontWeight:500, fontSize:14, color:'#a1a1aa'}}>New Password</label>
                        <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength="4" autoComplete="new-password" placeholder="Min 4 characters" style={{width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid #27272a', boxSizing:'border-box', outline:'none', color:'#fff', background:'#09090b', transition:'0.2s'}} onFocus={e=>e.currentTarget.style.borderColor='#f59e0b'} onBlur={e=>e.currentTarget.style.borderColor='#27272a'}/>
                    </div>
                    <button type="submit" style={{width:'100%', padding:'14px', background:'#fff', color:'#000', border:'none', borderRadius:12, cursor:'pointer', fontWeight:600, fontSize:15, transition:'0.2s', boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)'}} onMouseOver={e=>{e.currentTarget.style.background='#e4e4e7'; e.currentTarget.style.transform='translateY(-1px)'}} onMouseOut={e=>{e.currentTarget.style.background='#fff'; e.currentTarget.style.transform='translateY(0)'}}>Save New Password</button>
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
            <Toaster position="top-center" toastOptions={{ style: { background: '#18181b', color: '#fff', borderRadius: '12px', border: '1px solid #27272a', fontSize: 14 } }} />
            {!token ? (
                <Login setToken={handleLogin} />
            ) : (
                <AdminLayout onLogout={handleLogout}>
                    <Routes>
                        <Route path="/" element={<DashboardView token={token} onLogout={handleLogout} />} />
                        <Route path="releases" element={<ReleasesView token={token} onLogout={handleLogout} />} />
                        <Route path="subscribers" element={<SubscribersView token={token} onLogout={handleLogout} />} />
                        <Route path="home" element={<EditHomeView token={token} onLogout={handleLogout} />} />
                        <Route path="password" element={<ChangePasswordView token={token} setToken={handleLogin} />} />
                    </Routes>
                </AdminLayout>
            )}
        </div>
    );
}
