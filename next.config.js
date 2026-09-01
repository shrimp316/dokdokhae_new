/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'search1.kakaocdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'thumbnail.image.kakao.com',
        pathname: '/**',
      },
    ],
  },
  turbopack: {},
};

module.exports = nextConfig;