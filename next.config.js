const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'search1.kakaocdn.net',
      'thumbnail.image.kakao.com',
    ],
  },
};

module.exports = withPWA(nextConfig);