'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Summary } from '@/types';

export default function DashboardPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [user, setUser] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
    const [history, setHistory] = useState<Summary[]>([]);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/api/auth/me');
                const data = await response.json();

                if (data.success) {
                    setUser(data.user);
                    fetchHistory();
                } else {
                    router.push('/auth/login');
                }
            } catch (err) {
                router.push('/auth/login');
            }
        };

        checkSession();
    }, [router]);

    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            if (data.success) {
                setHistory(data.summaries);
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
            setCurrentSummary(null);
        }
    };

    const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
    const [urlInput, setUrlInput] = useState('');

    const handleUrlProcess = async () => {
        if (!urlInput) {
            setError('Please enter a valid URL');
            return;
        }

        setUploading(true);
        setError('');
        setProgress(0);

        // Fake progress for URL as we can't easily track server-side download progress yet
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 5, 90));
        }, 500);

        try {
            const response = await fetch('/api/process-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlInput })
            });

            clearInterval(progressInterval);

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid server response');
            }

            if (response.ok && data.success) {
                setProgress(100);
                setCurrentSummary(data.summary);
                setUrlInput('');
                await fetchHistory();
            } else {
                throw new Error(data.error || 'Failed to process URL');
            }
        } catch (err: any) {
            clearInterval(progressInterval);
            setError(err.message || 'Network error');
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const handleUpload = async () => {
        if (uploadMode === 'link') {
            await handleUrlProcess();
            return;
        }

        if (!file) {
            setError('Please select a file');
            return;
        }

        setUploading(true);
        setError('');
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const xhr = new XMLHttpRequest();

            // Promise wrapper for XHR
            const response = await new Promise<any>((resolve, reject) => {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 90); // 90% for upload
                        setProgress(percentComplete);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            setProgress(100); // 100% when processed
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            reject(new Error('Invalid response format'));
                        }
                    } else {
                        try {
                            const errorData = JSON.parse(xhr.responseText);
                            reject(new Error(errorData.error || 'Upload failed'));
                        } catch {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.open('POST', '/api/upload');
                xhr.send(formData);
            });

            if (response.success) {
                setCurrentSummary(response.summary);
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                // Refresh history
                await fetchHistory();
            } else {
                setError(response.error || 'Upload failed');
            }
        } catch (err: any) {
            setError(err.message || 'Network error. Please try again.');
        } finally {
            setUploading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('user'); // Optional cleanup
        router.push('/');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this summary?')) return;

        try {
            const response = await fetch(`/api/history/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setHistory(prev => prev.filter(item => item.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete history item');
        }
    };

    if (!user) return null;

    return (
        <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <header style={{
                padding: '1.5rem 2rem',
                borderBottom: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)'
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="gradient-text">
                        OmniBrief
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                        <button
                            className="btn btn-outline"
                            onClick={handleLogout}
                            style={{ padding: '0.5rem 1.25rem' }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '2rem'
            }}>
                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '2rem',
                    borderBottom: '2px solid var(--glass-border)'
                }}>
                    <button
                        onClick={() => setActiveTab('upload')}
                        style={{
                            padding: '1rem 2rem',
                            background: 'transparent',
                            border: 'none',
                            color: activeTab === 'upload' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'upload' ? '2px solid var(--primary)' : '2px solid transparent',
                            marginBottom: '-2px',
                            transition: 'all var(--transition-base)',
                            fontFamily: 'inherit'
                        }}
                    >
                        📤 Upload
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{
                            padding: '1rem 2rem',
                            background: 'transparent',
                            border: 'none',
                            color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                            marginBottom: '-2px',
                            transition: 'all var(--transition-base)',
                            fontFamily: 'inherit'
                        }}
                    >
                        📚 History ({history.length})
                    </button>
                </div>

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                    <div className="animate-fade-in">
                        <div className="glass-card" style={{ padding: '4rem 3rem', marginBottom: '2rem', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                                What would you like to summarize?
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
                                AI-powered insights for all your content. Supports documents, images, audio, and video.
                            </p>

                            <div style={{
                                display: 'inline-flex',
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-xl)',
                                marginBottom: '2rem',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <button
                                    onClick={() => setUploadMode('file')}
                                    style={{
                                        padding: '0.75rem 2rem',
                                        borderRadius: 'var(--radius-lg)',
                                        border: 'none',
                                        background: uploadMode === 'file' ? 'var(--primary)' : 'transparent',
                                        color: uploadMode === 'file' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Upload File
                                </button>
                                <button
                                    onClick={() => setUploadMode('link')}
                                    style={{
                                        padding: '0.75rem 2rem',
                                        borderRadius: 'var(--radius-lg)',
                                        border: 'none',
                                        background: uploadMode === 'link' ? 'var(--primary)' : 'transparent',
                                        color: uploadMode === 'link' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Paste Link
                                </button>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '1rem',
                                    background: 'rgba(251, 113, 133, 0.1)',
                                    border: '1px solid rgba(251, 113, 133, 0.2)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--error)',
                                    marginBottom: '2rem',
                                    maxWidth: '600px',
                                    margin: '0 auto 2rem'
                                }}>
                                    {error}
                                </div>
                            )}

                            {uploadMode === 'file' ? (
                                <div
                                    style={{
                                        border: '2px dashed var(--glass-border)',
                                        borderRadius: 'var(--radius-xl)',
                                        padding: '4rem 2rem',
                                        transition: 'all var(--transition-base)',
                                        cursor: 'pointer',
                                        background: 'rgba(255, 255, 255, 0.01)',
                                        maxWidth: '800px',
                                        margin: '0 auto'
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.background = 'rgba(129, 140, 248, 0.05)';
                                    }}
                                    onDragLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            setFile(e.dataTransfer.files[0]);
                                            setError('');
                                            setCurrentSummary(null);
                                        }
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".pdf,.docx,.txt,.mp3,.wav,.m4a,.mp4,.mov,.avi,.png,.jpg,.jpeg,.webp,.heic"
                                        style={{ display: 'none' }}
                                        disabled={uploading}
                                    />
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.2), rgba(244, 114, 182, 0.2))',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '2.5rem',
                                        margin: '0 auto 1.5rem',
                                        boxShadow: '0 0 30px rgba(129, 140, 248, 0.1)'
                                    }}>
                                        {uploading ? <div className="spinner" style={{ width: '30px', height: '30px', borderWidth: '3px' }}></div> : '✨'}
                                    </div>

                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        {file ? file.name : 'Click to upload or drag and drop'}
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {file ? `${formatFileSize(file.size)} - Ready to analyze` : 'Max size: 500MB (Auto-compressed) • PDF, DOCX, Video, Audio, Images'}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                                    <input
                                        type="text"
                                        placeholder="Paste a URL (YouTube, Video File, Audio File, etc.)"
                                        value={urlInput || ''}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '1.25rem',
                                            borderRadius: 'var(--radius-lg)',
                                            border: '1px solid var(--glass-border)',
                                            background: 'rgba(0, 0, 0, 0.2)',
                                            color: 'white',
                                            fontSize: '1rem',
                                            marginBottom: '1rem',
                                            outline: 'none',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                                    />
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'left', marginLeft: '0.5rem' }}>
                                        Supports YouTube videos, direct MP4/MP3 links, and web pages.
                                    </p>
                                </div>
                            )}

                            {uploading && (
                                <div style={{ marginTop: '2rem', maxWidth: '600px', margin: '2rem auto 0' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 500
                                    }}>
                                        <span>{uploadMode === 'link' ? 'Downloading & Processing...' : (progress < 90 ? 'Uploading...' : 'Analyzing & Optimizing...')}</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div style={{
                                        height: '6px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-xl)',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${progress}%`,
                                            background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                            transition: 'width 0.3s ease',
                                            borderRadius: 'var(--radius-xl)'
                                        }} />
                                    </div>
                                </div>
                            )}

                            <button
                                className="btn btn-primary"
                                onClick={handleUpload}
                                disabled={(uploadMode === 'file' && !file) || (uploadMode === 'link' && !urlInput) || uploading}
                                style={{
                                    marginTop: '2.5rem',
                                    padding: '1rem 3rem',
                                    fontSize: '1.1rem',
                                    boxShadow: '0 10px 30px -10px var(--primary)'
                                }}
                            >
                                {uploading ? 'Processing...' : 'Summarize Now'}
                            </button>
                        </div>

                        {/* Current Summary */}
                        {currentSummary && (
                            <div className="glass-card animate-fade-in" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--primary)', boxShadow: '0 0 40px rgba(129, 140, 248, 0.15)', marginTop: '3rem' }}>
                                <div style={{
                                    padding: '1.5rem 3rem',
                                    borderBottom: '1px solid var(--glass-border)',
                                    background: 'rgba(129, 140, 248, 0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                                            Analysis Result
                                        </h3>
                                        {(currentSummary.chapters?.length || 0) > 0 && (
                                            <span style={{
                                                background: 'var(--primary)',
                                                color: 'white',
                                                fontSize: '0.65rem',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '100px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase'
                                            }}>
                                                Gemini Enhanced ✨
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            <span>{currentSummary.fileType.toUpperCase()}</span>
                                            <span>{(currentSummary.processingTime / 1000).toFixed(1)}s</span>
                                        </div>
                                        <button
                                            onClick={() => setCurrentSummary(null)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid var(--glass-border)',
                                                color: 'var(--text-secondary)',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            ✕ Close
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                                    {/* Summary Column */}
                                    <div style={{ padding: '3rem', borderRight: '1px solid var(--glass-border)' }}>
                                        <h4 style={{
                                            textTransform: 'uppercase',
                                            fontSize: '0.75rem',
                                            letterSpacing: '0.1em',
                                            color: 'var(--primary)',
                                            marginBottom: '1.5rem',
                                            fontWeight: 700
                                        }}>
                                            Executive Summary
                                        </h4>
                                        <p style={{
                                            fontSize: '1.1rem',
                                            lineHeight: '1.8',
                                            color: 'var(--text-primary)',
                                            fontWeight: 300
                                        }}>
                                            {currentSummary.summary}
                                        </p>
                                    </div>

                                    {/* Key Points Column */}
                                    <div style={{ padding: '3rem', background: 'rgba(15, 23, 42, 0.3)' }}>
                                        <h4 style={{
                                            textTransform: 'uppercase',
                                            fontSize: '0.75rem',
                                            letterSpacing: '0.1em',
                                            color: 'var(--accent)',
                                            marginBottom: '1.5rem',
                                            fontWeight: 700
                                        }}>
                                            Key Takeaways
                                        </h4>
                                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            {currentSummary.keyPoints.map((point, index) => (
                                                <li key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                                    <span style={{
                                                        minWidth: '24px',
                                                        height: '24px',
                                                        background: 'rgba(45, 212, 191, 0.1)',
                                                        color: 'var(--accent)',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        marginTop: '2px'
                                                    }}>{index + 1}</span>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                                            {typeof point === 'object' && point !== null ? (point as any).point || (point as any).title : point}
                                                        </span>
                                                        {typeof point === 'object' && point !== null && (point as any).description && (
                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                {(point as any).description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Better Version Extra Content */}
                                {((currentSummary.chapters?.length || 0) > 0 || (currentSummary.speakers?.length || 0) > 0) && (
                                    <div style={{
                                        padding: '3rem',
                                        borderTop: '1px solid var(--glass-border)',
                                        background: 'rgba(0, 0, 0, 0.14)',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                                        gap: '3rem'
                                    }}>
                                        {/* Smart Chapters */}
                                        {(currentSummary.chapters?.length || 0) > 0 && (
                                            <div>
                                                <h4 style={{
                                                    textTransform: 'uppercase',
                                                    fontSize: '0.75rem',
                                                    letterSpacing: '0.1em',
                                                    color: 'var(--primary)',
                                                    marginBottom: '1.5rem',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    📅 Smart Chapters
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {currentSummary.chapters?.map((chapter, idx) => (
                                                        <div key={idx} style={{
                                                            display: 'flex',
                                                            gap: '1.5rem',
                                                            padding: '1rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            borderRadius: 'var(--radius-lg)',
                                                            border: '1px solid var(--glass-border)'
                                                        }}>
                                                            <div style={{
                                                                color: 'var(--primary)',
                                                                fontWeight: 700,
                                                                fontSize: '0.9rem',
                                                                minWidth: '60px'
                                                            }}>
                                                                {chapter.time}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{chapter.title}</div>
                                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{chapter.description}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Speakers */}
                                        {(currentSummary.speakers?.length || 0) > 0 && (
                                            <div>
                                                <h4 style={{
                                                    textTransform: 'uppercase',
                                                    fontSize: '0.75rem',
                                                    letterSpacing: '0.1em',
                                                    color: 'var(--accent)',
                                                    marginBottom: '1.5rem',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    👥 Who's Speaking?
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                                    {currentSummary.speakers?.map((speaker, idx) => (
                                                        <div key={idx} style={{
                                                            padding: '1.25rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            borderRadius: 'var(--radius-lg)',
                                                            border: '1px solid var(--glass-border)'
                                                        }}>
                                                            <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{speaker.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{speaker.traits}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="animate-fade-in">
                        {history.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                                <div style={{ fontSize: '4rem', opacity: 0.5, marginBottom: '1.5rem' }}>📭</div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>History is empty</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Analyzed content will appear here.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                                {history.map((summary) => (
                                    <div
                                        key={summary.id}
                                        className="glass-card"
                                        onClick={() => {
                                            setCurrentSummary(summary);
                                            setActiveTab('upload');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            height: '100%',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{
                                            padding: '1.5rem',
                                            borderBottom: '1px solid var(--glass-border)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'start'
                                        }}>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: 'var(--primary)',
                                                    marginBottom: '0.5rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {summary.fileType} {(summary.chapters?.length || 0) > 0 ? '✨' : ''}
                                                </div>
                                                <h3 style={{
                                                    fontSize: '1.1rem',
                                                    fontWeight: 600,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {summary.fileName}
                                                </h3>
                                            </div>
                                        </div>

                                        <div style={{ padding: '1.5rem', flex: 1 }}>
                                            <p style={{
                                                color: 'var(--text-secondary)',
                                                fontSize: '0.95rem',
                                                lineHeight: '1.6',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}>
                                                {summary.summary}
                                            </p>
                                        </div>

                                        <div style={{
                                            padding: '1.25rem 1.5rem',
                                            background: 'rgba(0,0,0,0.2)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            <span>{formatDate(summary.createdAt)}</span>
                                            <button
                                                onClick={(e) => handleDelete(summary.id, e)}
                                                className="btn"
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: 'var(--error)',
                                                    fontSize: '0.75rem',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
