"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalParam = searchParams.get('portal') || '';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/auth/login${portalParam ? `?portal=${portalParam}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.role === 'Admin') router.push('/analytics');
        else router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
      
      {/* Background Blobs for Aesthetic */}
      <div className="bg-blob">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: '420px', padding: '40px', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', color: 'var(--brand-500)' }}>
            Druto Sheba
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Staff Portal Login</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--red-dim)', color: 'var(--red)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--red-glow)', marginBottom: '20px' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>{error}</span>
            </div>
          )}

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={18} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative', marginBottom: '28px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-blue"
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Don't have a staff account?{' '}
            <Link href={`/register${portalParam ? `?portal=${portalParam}` : ''}`} style={{ color: 'var(--blue)', fontWeight: '600' }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="spinner" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
