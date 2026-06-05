const BLUEY_URL = 'https://www.trybluey.com/products/bluey-lite';
const DISCORD_URL = 'https://discord.com/invite/SndB4Psg';

/** Fixed top-right buttons: try Bluey Lite + join the Discord. Sits above everything. */
export function TopLinks() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 60,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <style>{`
        .ef-link {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 15px; border-radius: 999px; text-decoration: none;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 12px; letter-spacing: 0.04em; line-height: 1; white-space: nowrap;
          border: 1px solid transparent; cursor: pointer;
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .ef-link:hover { transform: translateY(-1px); }
        .ef-link--bluey {
          color: #d8f6ff; background: rgba(95, 208, 255, 0.14);
          border-color: rgba(95, 208, 255, 0.5);
          box-shadow: 0 0 16px rgba(95, 208, 255, 0.25);
        }
        .ef-link--bluey:hover {
          background: rgba(95, 208, 255, 0.24);
          box-shadow: 0 0 22px rgba(95, 208, 255, 0.5);
        }
        .ef-link--discord {
          color: #fff; background: #5865F2; border-color: #5865F2;
          box-shadow: 0 0 16px rgba(88, 101, 242, 0.35);
        }
        .ef-link--discord:hover {
          background: #6b77f5;
          box-shadow: 0 0 22px rgba(88, 101, 242, 0.6);
        }
      `}</style>

      <a className="ef-link ef-link--bluey" href={BLUEY_URL} target="_blank" rel="noreferrer">
        <span style={{ fontSize: 13 }}>✦</span>
        Built with Bluey Lite
      </a>

      <a className="ef-link ef-link--discord" href={DISCORD_URL} target="_blank" rel="noreferrer">
        <svg width="16" height="12" viewBox="0 0 127.14 96.36" aria-hidden="true">
          <path
            fill="currentColor"
            d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
          />
        </svg>
        Join Discord
      </a>
    </div>
  );
}
