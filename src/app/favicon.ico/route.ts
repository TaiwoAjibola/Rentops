const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="9" fill="#10543f"/>
  <path d="M20 6.6 8.3 14.2v12.6L20 34.4l11.7-7.6V14.2L20 6.6Z" fill="none" stroke="#eaf7f0" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M13.8 22.6V16.4h4a2.5 2.5 0 0 1 0 5h-4Zm0 0v5.9M13.8 22.6h4.7m3.9-6.2h6m-6 0v12.4m0 0 6-12.3" fill="none" stroke="#1f8767" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function GET() {
  return new Response(ICON, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
