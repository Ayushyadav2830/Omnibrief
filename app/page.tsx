'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check if user is logged in
        const user = localStorage.getItem('user');
        if (user) {
            router.push('/dashboard');
        }
    }, [router]);

    if (!mounted) return null;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1
        }}>
            {/* Hero Section */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center'
            }}>
                <div className="animate-fade-in" style={{ maxWidth: '1200px' }}>
                    {/* Logo/Brand */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{
                            fontSize: 'clamp(3rem, 8vw, 6rem)',
                            fontWeight: 800,
                            marginBottom: '1rem',
                            letterSpacing: '-0.02em'
                        }} className="gradient-text">
                            OmniBrief
                        </h1>
                        <p style={{
                            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                            color: 'var(--text-secondary)',
                            fontWeight: 300,
                            maxWidth: '800px',
                            margin: '0 auto'
                        }}>
                            Transform hours of content into instant insights
                        </p>
                    </div>

                    {/* Feature Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1.5rem',
                        margin: '3rem 0',
                        padding: '0 1rem'
                    }}>
                        <div className="glass-card" style={{ padding: '2rem' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem',
                                fontSize: '2rem'
                            }}>
                                📄
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Documents
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                PDF, DOCX, TXT - Extract key insights from any document instantly
                            </p>
                        </div>

                        <div className="glass-card" style={{ padding: '2rem' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem',
                                fontSize: '2rem'
                            }}>
                                🎵
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Audio & Video
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                MP3, MP4, WAV - Analyze meetings, podcasts, and video lectures
                            </p>
                        </div>

                        <div className="glass-card" style={{ padding: '2rem' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                background: 'linear-gradient(135deg, var(--accent), #0d9488)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem',
                                fontSize: '2rem'
                            }}>
                                🖼️
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Images
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                PNG, JPG, WEBP - Extract insights from charts, diagrams, and screenshots
                            </p>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginTop: '3rem'
                    }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/auth/register')}
                            style={{ fontSize: '1.1rem', padding: '1rem 2.5rem' }}
                        >
                            Get Started Free
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => router.push('/auth/login')}
                            style={{ fontSize: '1.1rem', padding: '1rem 2.5rem' }}
                        >
                            Sign In
                        </button>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'flex',
                        gap: '3rem',
                        justifyContent: 'center',
                        marginTop: '4rem',
                        flexWrap: 'wrap'
                    }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700 }} className="gradient-text">
                                10x
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Faster Processing
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700 }} className="gradient-text">
                                95%
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Time Saved
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700 }} className="gradient-text">
                                AI
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Powered Insights
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                borderTop: '1px solid var(--glass-border)',
                background: 'rgba(2, 6, 23, 0.5)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <span>© 2026 OmniBrief Inc.</span>
                    <span>Powered by Gemini 1.5 Flash</span>
                    <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy</a>
                    <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms</a>
                </div>
            </footer>
        </div>
    );
}
