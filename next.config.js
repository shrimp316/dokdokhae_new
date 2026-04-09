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

module.exports = nextConfig;
