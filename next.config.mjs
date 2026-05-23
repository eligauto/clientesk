/** @type {import('next').NextConfig} */
const nextConfig = {
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
