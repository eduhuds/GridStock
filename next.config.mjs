/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exact LAN host used to test on the iPhone; applies only to development.
  allowedDevOrigins: ['172.16.1.48'],
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ] }];
  },
  serverExternalPackages: ['node:sqlite'],
};

export default nextConfig;
