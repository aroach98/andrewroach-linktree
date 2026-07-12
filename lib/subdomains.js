// Builds the link-tree list of subdomains for the root domain.
//
// NOTE on data source: this domain's DNS zone is Vercel-managed and uses a
// single wildcard record (ALIAS *) rather than one record per subdomain, so
// the DNS-records API can't enumerate the real subdomains. The authoritative
// list is which hostnames are attached to which Vercel *projects*. So we walk
// every project's domains and collect the `*.andrewroach.xyz` hostnames.
//
// Runs server-side only; the token is never exposed to the browser.

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "andrewroach.xyz";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "";
const TOKEN = process.env.VERCEL_DNS_TOKEN || "";

// This project's own name — exclude its apex/self so the tree doesn't link to
// itself.
const SELF_PROJECT = process.env.SELF_PROJECT || "andrewroach-linktree";

function teamQS() {
  return TEAM_ID ? `&teamId=${TEAM_ID}` : "";
}

// Names we never surface as a public link.
function isHidden(host, name) {
  if (!name) return true; // apex itself
  if (name === "www") return true; // apex alias, not a separate link
  if (name === "*") return true; // wildcard
  if (name.startsWith("_")) return true; // verification records
  return false;
}

function labelFor(name) {
  const first = name.split(".")[0];
  return first
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function vfetch(path) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    // Re-check at most every 5 minutes; new subdomains appear on their own.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`api-${res.status}`);
  return res.json();
}

export async function getSubdomains() {
  if (!TOKEN) return { subdomains: [], error: "missing-token", rootDomain: ROOT_DOMAIN };

  let projects;
  try {
    const data = await vfetch(`/v9/projects?limit=100${teamQS()}`);
    projects = data.projects || [];
  } catch (e) {
    return { subdomains: [], error: String(e.message || e), rootDomain: ROOT_DOMAIN };
  }

  const suffix = `.${ROOT_DOMAIN}`;
  const seen = new Map(); // host -> entry (dedupe)

  for (const p of projects) {
    let domains;
    try {
      const data = await vfetch(`/v9/projects/${p.id}/domains?limit=100${teamQS()}`);
      domains = data.domains || [];
    } catch {
      continue; // skip a project we can't read rather than failing the page
    }

    for (const dom of domains) {
      const host = dom.name || "";
      if (!host.endsWith(suffix)) continue; // only *.andrewroach.xyz
      if (dom.redirect) continue; // skip redirect-only hostnames (e.g. www)
      const name = host.slice(0, -suffix.length); // subdomain label
      if (isHidden(host, name)) continue;
      if (p.name === SELF_PROJECT) continue; // don't link to ourselves
      if (seen.has(host)) continue;
      seen.set(host, {
        name,
        label: labelFor(name),
        host,
        url: `https://${host}`,
        project: p.name,
      });
    }
  }

  const subdomains = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { subdomains, error: null, rootDomain: ROOT_DOMAIN };
}

export { ROOT_DOMAIN };
