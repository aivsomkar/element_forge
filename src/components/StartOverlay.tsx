import { useElementStore } from '../store/elementStore';

/**
 * Intro veil shown over the live experience until the user taps Begin. The webcam + element are
 * already running underneath, so the camera-permission prompt happens immediately.
 */
export function StartOverlay() {
  const started = useElementStore((s) => s.started);
  const start = useElementStore((s) => s.start);
  if (started) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        background: 'radial-gradient(circle at 50% 40%, rgba(8,20,40,0.72), rgba(2,6,14,0.92))',
        backdropFilter: 'blur(6px)',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.5em',
          fontSize: 'var(--font-size-md)',
          color: '#5fd0ff',
          textTransform: 'uppercase',
          paddingLeft: '0.5em',
        }}
      >
        Stark Industries · R&amp;D
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: 'clamp(40px, 9vw, 84px)',
          lineHeight: 1,
          color: '#eaffff',
          textShadow: '0 0 40px rgba(95,208,255,0.6)',
        }}
      >
        ELEMENT FORGE
      </h1>
      <p
        style={{
          maxWidth: 520,
          margin: 0,
          fontSize: 'var(--font-size-lg)',
          lineHeight: 1.5,
          color: '#a9d6ee',
        }}
      >
        Raise your hands to the camera and discover a new element — just like Tony Stark.
        Spread your hands to peel the world apart into its atomic structure. Pinch to hold it.
      </p>
      <button
        onClick={start}
        style={{
          marginTop: 8,
          padding: '14px 38px',
          fontSize: 'var(--font-size-lg)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#021018',
          background: '#5fd0ff',
          border: 'none',
          borderRadius: 'var(--radius-button)',
          boxShadow: '0 0 30px rgba(95,208,255,0.7)',
          cursor: 'pointer',
        }}
      >
        Begin
      </button>
      <div style={{ fontSize: 'var(--font-size-md)', color: '#6f93a8' }}>
        Allow camera access · best with both hands visible · good lighting
      </div>
    </div>
  );
}
