import { resolve } from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { seo } from "./src/config/seo";

// npm run build        -> dist/ (public site + /admin), deploy to Cloudflare Pages
// npm run build:single -> one self-contained dist/index.html (public site preview)
// npm run build:demo   -> dist-demo/admin.html (admin with fake data, no backend needed)
const demo = Boolean(process.env.VITE_DEMO);
const siteUrl = (process.env.SITE_URL ?? seo.url).replace(/\/$/, "");

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function metaTags() {
  const image = `${siteUrl}${seo.image}`;
  const person = { "@context": "https://schema.org", "@type": "Person", url: siteUrl, image, ...seo.person };
  return [
    `<link rel="canonical" href="${siteUrl}/" />`,
    `<meta name="theme-color" content="#1b1c1f" />`,
    `<script type="application/ld+json">${JSON.stringify(person)}</script>`,
  ].join("\n    ");
}

function siteFiles(): Plugin {
  return {
    name: "site-files",
    transformIndexHtml(html, ctx) {
      return ctx.filename.endsWith("index.html") ? html.replace("<!--seo-->", metaTags()) : html;
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${siteUrl}/uses</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${siteUrl}/blog</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${siteUrl}/games</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    preact(),
    ...(demo ? [] : [siteFiles()]),
    ...(process.env.SINGLE || demo ? [viteSingleFile()] : []),
  ],
  build: demo
    ? { outDir: "dist-demo", rollupOptions: { input: resolve(__dirname, "admin.html") } }
    : {
        rollupOptions: {
          input: process.env.SINGLE
            ? resolve(
                __dirname,
                process.env.PAGE === "uses"
                  ? "uses.html"
                  : process.env.PAGE === "blog"
                    ? "blog.html"
                    : process.env.PAGE === "games"
                      ? "games.html"
                      : "index.html",
              )
            : {
                main: resolve(__dirname, "index.html"),
                uses: resolve(__dirname, "uses.html"),
                blog: resolve(__dirname, "blog.html"),
                games: resolve(__dirname, "games.html"),
                admin: resolve(__dirname, "admin.html"),
              },
        },
      },
});
