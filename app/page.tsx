'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setMounted(true);
        // Check if user session exists without auto-redirecting
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                setUser(null);
            }
        }
    }, []);

    if (!mounted) return null;

    const features = [
        {
            icon: '📄',
            title: 'Documents',
            desc: 'PDF, DOCX, TXT — extract key insights from any document instantly',
            gradient: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
        },
        {
            icon: '🎵',
            title: 'Audio & Video',
            desc: 'MP3, MP4, WAV — analyze meetings, podcasts, and video lectures',
            gradient: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
        },
        {
            icon: '🖼️',
            title: 'Images',
            desc: 'PNG, JPG, WEBP — extract insights from charts, diagrams, and screenshots',
            gradient: 'linear-gradient(135deg, var(--accent), #0d9488)',
        },
    ];

    const stats = [
        { value: '10x', label: 'Faster Processing' },
        { value: '95%', label: 'Time Saved' },
        { value: 'AI', label: 'Powered Insights' },
    ];

    return (
        <div className="home-wrapper">
            {/* Hero Section */}
            <main className="home-main">
                <div className="animate-fade-in home-container">
                    {/* Logo/Brand */}
                    <div className="hero-brand">
                        <h1 className="gradient-text hero-title">OmniBrief</h1>
                        <p className="hero-subtitle">
                            Transform hours of content into instant insights
                        </p>
                    </div>

                    {/* Feature Cards — always 3 per row */}
                    <div className="feature-grid">
                        {features.map((f) => (
                            <div 
                                className="glass-card feature-card feature-card-interactive" 
                                key={f.title}
                                onClick={() => router.push(user ? '/dashboard' : '/auth/login')}
                                role="button"
                                tabIndex={0}
                                title={user ? `Open ${f.title} in Dashboard` : `Sign In / Log In to use ${f.title}`}
                            >
                                <div className="feature-icon" style={{ background: f.gradient }}>
                                    {f.icon}
                                </div>
                                <h3 className="feature-title">{f.title}</h3>
                                <p className="feature-desc">{f.desc}</p>
                                <span className="feature-action-hint">
                                    {user ? 'Open in Dashboard →' : 'Sign In to use →'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Notice / Service Note */}
                    <div className="service-note-banner">
                        <span className="service-note-badge">NOTE</span>
                        <span className="service-note-text">
                            Please <strong>Sign In / Log In</strong> to use these services.
                        </span>
                    </div>

                    {/* CTA Buttons */}
                    <div className="cta-row">
                        {user ? (
                            <>
                                <button
                                    className="btn btn-primary cta-btn"
                                    onClick={() => router.push('/dashboard')}
                                >
                                    Go to Dashboard →
                                </button>
                                <button
                                    className="btn btn-outline cta-btn"
                                    onClick={() => router.push('/auth/login')}
                                >
                                    Sign In / Log In
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="btn btn-primary cta-btn"
                                    onClick={() => router.push('/auth/register')}
                                >
                                    Get Started Free
                                </button>
                                <button
                                    className="btn btn-outline cta-btn"
                                    onClick={() => router.push('/auth/login')}
                                >
                                    Sign In / Log In
                                </button>
                            </>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="stats-row">
                        {stats.map((s) => (
                            <div className="stat-item" key={s.label}>
                                <div className="stat-value gradient-text">{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="home-footer">
                <div className="footer-inner">
                    <span>© 2026 OmniBrief Inc.</span>
                    <span>Powered by Gemini 1.5 Flash</span>
                    <a href="#" className="footer-link">Privacy</a>
                    <a href="#" className="footer-link">Terms</a>
                </div>
            </footer>
        </div>
    );
}
