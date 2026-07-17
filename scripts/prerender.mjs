// Post-build prerender: generates static HTML files for each public route
// so non-JS crawlers (Claude, ChatGPT fetcher, older bots) see real,
// per-route content with unique <title>, description, canonical, og:*,
// and <noscript> body content. The SPA still hydrates normally for users.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const SITE = "https://www.ushangachronicles.com";
const DIST = resolve("dist");
const SHELL_PATH = resolve(DIST, "index.html");

if (!existsSync(SHELL_PATH)) {
  console.warn("[prerender] dist/index.html not found — skipping.");
  process.exit(0);
}

const shell = readFileSync(SHELL_PATH, "utf8");

/** @type {Array<{path: string, title: string, description: string, body: string}>} */
const routes = [
  {
    path: "/shop",
    title: "Shop Handmade African Jewelry & Home Decor",
    description:
      "Browse Ushanga Chronicles' full collection — beaded jewelry, home decor, pet accessories, and gifts, handmade by Nairobi artisans and shipped worldwide.",
    body: `
      <h1>Shop Ushanga Chronicles</h1>
      <p>Every piece is handmade in Nairobi, Kenya by skilled artisans. Explore our full collection of beaded jewelry, home decor, pet accessories, and one-of-a-kind gifts.</p>
      <h2>Categories</h2>
      <ul>
        <li><a href="/shop?category=jewelry-apparel">Jewelry &amp; Apparel</a> — necklaces, bracelets, earrings, anklets, waist beads, headpieces</li>
        <li><a href="/shop?category=home-decor">Home Decor &amp; Tableware</a> — placemats, coasters, bowls, sculptures</li>
        <li><a href="/shop?category=pet-accessories">Pet Accessories</a> — beaded collars and leashes</li>
        <li><a href="/custom-order">Create Your Chronicle</a> — commission a custom piece</li>
      </ul>
    `,
  },
  {
    path: "/about-us",
    title: "The Chronicle — Our Story",
    description:
      "The story of Ushanga Chronicles: a Nairobi-based artisan brand preserving African beadwork traditions and empowering the makers behind every piece.",
    body: `
      <h1>The Chronicle Begins</h1>
      <p>Ushanga Chronicles is a Nairobi, Kenya based artisan brand rooted in African heritage. Every necklace, bracelet, home decor piece, and pet accessory is handcrafted by skilled makers whose stories are woven into every bead.</p>
      <p>We work directly with artisans across Kenya to preserve traditional beadwork techniques while creating contemporary pieces that travel the world.</p>
      <p><a href="/shop">Explore the Tribe</a> · <a href="/custom-order">Create Your Chronicle</a></p>
    `,
  },
  {
    path: "/custom-order",
    title: "Create Your Chronicle — Custom Handmade Pieces",
    description:
      "Commission a bespoke handmade jewelry piece or home decor item from Ushanga Chronicles. Choose your materials, colors, and story — made to order in Nairobi.",
    body: `
      <h1>Create Your Chronicle</h1>
      <p>Commission a custom piece made just for you. Choose your category, materials, colors, and share the story you want your piece to tell — our artisans in Nairobi will handcraft it and ship it worldwide.</p>
      <p><a href="/custom-order">Start your custom order</a></p>
    `,
  },
  {
    path: "/tribe-looks",
    title: "The Tribe Wears It — Community Gallery",
    description:
      "See how the Ushanga Tribe wears their pieces. Upload your own photos and join a global community celebrating African-made jewelry and decor.",
    body: `
      <h1>The Tribe Wears It</h1>
      <p>A living gallery of the Ushanga Tribe — customers around the world wearing and styling their handmade pieces. Upload your own photo and become part of the Chronicle.</p>
      <p><a href="/tribe-looks">View the gallery</a></p>
    `,
  },
  {
    path: "/wholesale-gifting",
    title: "Wholesale & Corporate Gifting",
    description:
      "Ushanga Chronicles offers wholesale pricing and bespoke corporate gifting programs — handmade African pieces at scale for retailers, hotels, and companies.",
    body: `
      <h1>Wholesale &amp; Corporate Gifting</h1>
      <p>Retailers, hotels, and companies partner with Ushanga Chronicles for bulk orders and bespoke corporate gifting. Handmade in Nairobi, shipped worldwide.</p>
      <p><a href="/wholesale-gifting">Request a wholesale quote</a></p>
    `,
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions",
    description:
      "Answers to common questions about ordering, shipping, custom pieces, materials, and care for your Ushanga Chronicles jewelry and decor.",
    body: `
      <h1>Frequently Asked Questions</h1>
      <p>Everything you need to know about ordering handmade pieces from Ushanga Chronicles — shipping times, custom orders, care instructions, and returns.</p>
      <p><a href="/faq">Read the full FAQ</a></p>
    `,
  },
  {
    path: "/shipping-returns",
    title: "Shipping & Returns",
    description:
      "Ushanga Chronicles ships handmade pieces from Nairobi, Kenya to customers worldwide. Local Nairobi delivery, Kenya-wide courier, and international rates.",
    body: `
      <h1>Shipping &amp; Returns</h1>
      <p>We ship from Nairobi, Kenya to customers worldwide. Local Nairobi delivery, Kenya-wide courier, and international air freight available. Custom pieces have separate processing times.</p>
      <p><a href="/shipping-returns">See full shipping &amp; returns policy</a></p>
    `,
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "How Ushanga Chronicles collects, uses, and protects your personal information. Compliant with the Kenya Data Protection Act.",
    body: `
      <h1>Privacy Policy</h1>
      <p>How Ushanga Chronicles handles your data — collection, use, storage, and your rights under the Kenya Data Protection Act.</p>
      <p><a href="/privacy-policy">Read the full policy</a></p>
    `,
  },
];

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderRoute(route) {
  const fullTitle = `${route.title} | Ushanga Chronicles`;
  const canonical = `${SITE}${route.path}`;
  let html = shell;

  // Replace <title>
  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeAttr(fullTitle)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeAttr(route.description)}">`
  );

  // Replace og:title / twitter:title
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeAttr(fullTitle)}">`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeAttr(fullTitle)}">`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeAttr(route.description)}">`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeAttr(route.description)}">`
  );

  // Replace canonical
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );

  // Replace <noscript> body content with route-specific content
  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    `<noscript>
      <div style="max-width:760px;margin:2rem auto;padding:1.5rem;font-family:Georgia,serif;color:#1A1A1A;">
        ${route.body}
        <hr style="margin:2rem 0;border:none;border-top:1px solid #eee;" />
        <p><a href="/">Ushanga Chronicles home</a> · <a href="/shop">Shop</a> · <a href="/about-us">The Chronicle</a> · <a href="/custom-order">Create Yours</a></p>
        <p><em>This site is best viewed with JavaScript enabled for the full shopping experience.</em></p>
      </div>
    </noscript>`
  );

  const outPath = resolve(DIST, route.path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  return outPath;
}

let count = 0;
for (const route of routes) {
  try {
    const p = renderRoute(route);
    console.log(`[prerender] ${route.path} → ${p.replace(DIST, "dist")}`);
    count++;
  } catch (err) {
    console.error(`[prerender] failed ${route.path}:`, err.message);
  }
}
console.log(`[prerender] wrote ${count} static route(s).`);