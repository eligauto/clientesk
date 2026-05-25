/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/clientes",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
