import { useElementStore } from '../store/elementStore';

/** Top-center readout of the current morph stage + an expansion meter. */
export function StageHud() {
  const started = useElementStore((s) => s.started);
  const stage = useElementStore((s) => s.stage);
  const expansion = useElementStore((s) => s.expansion);
  if (!started) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 22,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xl)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#eaffff',
          textShadow: '0 0 20px rgba(95,208,255,0.8)',
        }}
      >
        {stage}
      </div>
      <div
        style={{
          width: 220,
          height: 4,
          borderRadius: 2,
          background: 'rgba(95,208,255,0.18)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.round(expansion * 100)}%`,
            height: '100%',
            background: '#5fd0ff',
            boxShadow: '0 0 10px #5fd0ff',
            transition: 'width 0.12s linear',
          }}
        />
      </div>
    </div>
  );
}
