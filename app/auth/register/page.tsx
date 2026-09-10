'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                router.push('/dashboard');
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div suppressHydrationWarning className="auth-wrapper">
            <div suppressHydrationWarning className="glass-card auth-card animate-fade-in">
                {/* Header */}
                <div suppressHydrationWarning style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 className="gradient-text auth-heading">Get Started</h1>
                    <p className="auth-sub">Create your OmniBrief account</p>
                </div>

                {/* Error */}
                {error && <div className="auth-error">{error}</div>}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label className="auth-label">Full Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label">Email Address</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Password row — two fields side by side on wider screens */}
                    <div className="auth-field">
                        <label className="auth-label">Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label">Confirm Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '0.75rem' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                                Creating account…
                            </div>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="auth-divider">
                    <div className="auth-divider-line"></div>
                    <span className="auth-divider-text">OR</span>
                    <div className="auth-divider-line"></div>
                </div>

                {/* Links */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Already have an account?{' '}
                        <Link href="/auth/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                            Sign in
                        </Link>
                    </p>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.82rem' }}>
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
