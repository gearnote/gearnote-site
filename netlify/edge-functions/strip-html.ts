// /xxx.html -> 301 -> /xxx (canonical, extension-less URL). Added 2026-11-10: all internal links, canonicals and the
// sitemap already use the extension-less form, but Netlify served both URLs with 200 (duplicate URLs for Google).
// Only requests whose path ends in .html run this function. Errors fall back to serving the file (onError: bypass).
export default async (request: Request) => {
  const url = new URL(request.url);
  if (!url.pathname.endsWith(".html")) return;
  let p = url.pathname.slice(0, -5);
  if (p === "/index" || p === "") p = "/";
  url.pathname = p;
  return new Response(null, {
    status: 301,
    headers: { Location: url.toString(), "Cache-Control": "public, max-age=3600" },
  });
};

export const config = { path: "/*.html", onError: "bypass" };
