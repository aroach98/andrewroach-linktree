// Fetches the live DNS records for the root domain from the Vercel API and
// derives the list of subdomains to show in the link tree. Runs server-side
// only (the token is never exposed to the browser).

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "andrewroach.xyz";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "";
const TOKEN = process.env.VERCEL_DNS_TOKEN || "";

// Record types that represent a browsable subdomain.
const WEB_TYPES = new Set(["A", "AAAA", "ALIAS", "CNAME"]);

// Names we never want to surface as a public link.
function isHidden(name) {
  if (!name) return true; // apex ("" / "@") is the site itself, not a subdomain
  if (name === "@") return true;
  if (name === "*") return true; // wildcard
  if (name.startsWith("_")) return true; // _vercel, _dmarc, ACME challenges, etc.
  if (name === "www") return true; // treated as the apex, not a separate link
  return false;
}

// Prettify a subdomain label for display, e.g. "blog" -> "Blog".
function labelFor(name) {
  const first = name.split(".")[0];
  return first
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export async function getSubdomains() {
  if (!TOKEN) {
    // Misconfigured deployment — fail soft with an empty list rather than crash.
    return { subdomains: [], error: "missing-token" };
  }

  const url = new URL(
    `https://api.vercel.com/v4/domains/${ROOT_DOMAIN}/records`
  );
  url.searchParams.set("limit", "100");
  if (TEAM_ID) url.searchParams.set("teamId", TEAM_ID);

  let data;
  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${TOKEN}` },
      // Re-check DNS at most every 5 minutes; new subdomains appear automatically.
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return { subdomains: [], error: `api-${res.status}` };
    }
    data = await res.json();
  } catch (e) {
    return { subdomains: [], error: "fetch-failed" };
  }

  const seen = new Map(); // subdomain name -> entry (dedupe across record types)
  for (const rec of data.records || []) {
    if (!WEB_TYPES.has(rec.type)) continue;
    if (isHidden(rec.name)) continue;
    if (seen.has(rec.name)) continue;
    seen.set(rec.name, {
      name: rec.name,
      label: labelFor(rec.name),
      host: `${rec.name}.${ROOT_DOMAIN}`,
      url: `https://${rec.name}.${ROOT_DOMAIN}`,
    });
  }

  const subdomains = [...seen.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return { subdomains, error: null, rootDomain: ROOT_DOMAIN };
}

export { ROOT_DOMAIN };
