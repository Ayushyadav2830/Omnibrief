export default function Loading() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)'
        }}>
            <div className="spinner" style={{
                width: '50px',
                height: '50px',
                borderWidth: '4px',
                borderColor: 'var(--glass-border)',
                borderTopColor: 'var(--primary)'
            }}></div>
        </div>
    );
}
