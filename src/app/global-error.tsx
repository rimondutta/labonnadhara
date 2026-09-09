'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#111827' }}>Something went wrong!</h2>
          <p style={{ color: '#4B5563', marginBottom: '2rem' }}>We apologize for the inconvenience.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Try again
            </button>
            <a 
              href="/"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#E5E7EB',
                color: '#1F2937',
                textDecoration: 'none',
                borderRadius: '0.375rem',
                fontWeight: '500'
              }}
            >
              Return Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
