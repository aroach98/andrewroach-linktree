import { getSubdomains, ROOT_DOMAIN } from "../lib/subdomains";
import { qrSvg } from "../lib/qr";

// Re-render at most every 5 minutes so newly added subdomains appear on their
// own, without a redeploy.
export const revalidate = 300;

export default async function Page() {
  const apex = `https://${ROOT_DOMAIN}`;
  const [{ subdomains }, qr] = await Promise.all([
    getSubdomains(),
    qrSvg(apex),
  ]);

  return (
    <main className="wrap">
      <div className="qr-tile" dangerouslySetInnerHTML={{ __html: qr }} />
      <div className="qr-caption">scan to open {ROOT_DOMAIN}</div>

      <h1>{ROOT_DOMAIN}</h1>
      <p className="tagline">Everything I&apos;m building, in one place.</p>

      {subdomains.length > 0 ? (
        <nav className="links">
          {subdomains.map((s) => (
            <a
              key={s.name}
              className="link"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="label">{s.label}</span>
              <span className="host">{s.host}</span>
              <span className="arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </nav>
      ) : (
        <div className="empty">
          <strong>More coming soon.</strong>
          <br />
          New sites appear here automatically the moment their subdomain goes
          live.
        </div>
      )}

      <div className="footer">
        Auto-generated from live DNS · <a href={apex}>{ROOT_DOMAIN}</a>
      </div>
    </main>
  );
}
