import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Старые адреса (до «пульта») ведут в новое место — чтобы не ломались сохранённые ссылки
  async redirects() {
    return [
      { source: '/new-order', destination: '/?new=1', permanent: false },
      { source: '/orders/:id', destination: '/?id=:id', permanent: false },
      { source: '/orders/:id/:rest*', destination: '/?id=:id', permanent: false },
      { source: '/test:n(\\d+)', destination: '/', permanent: false },
    ]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
