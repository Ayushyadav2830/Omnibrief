'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                We apologize for the inconvenience. An unexpected error occurred.
            </p>
            <button
                onClick={() => reset()}
                className="btn btn-primary"
            >
                Try again
            </button>
        </div>
    );
}
