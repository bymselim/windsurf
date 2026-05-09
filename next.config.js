/** @type {import('next').NextConfig} */
const r2ImageHost = process.env.NEXT_PUBLIC_R2_IMAGE_HOST?.trim();

const remotePatterns = [];

if (r2ImageHost) {
  remotePatterns.push({
    protocol: "https",
    hostname: r2ImageHost,
    pathname: "/**",
  });
}

const nextConfig = {
  images: {
    remotePatterns,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};

module.exports = nextConfig;
