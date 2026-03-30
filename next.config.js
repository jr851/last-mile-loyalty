/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config, { nextRuntime }) => {
    // Explicitly configure @ alias so it resolves in all webpack compile contexts
    // (Next.js reads tsconfig paths for the default context but not always for edge)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };

    // Edge runtime: stub Node.js built-ins that aren't available during webpack bundling.
    // Cloudflare Workers provides these at runtime via the nodejs_compat flag.
    if (nextRuntime === 'edge') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        path: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        stream: false,
        http2: false,
        child_process: false,
        os: false,
        // crypto is provided at runtime by Cloudflare Workers (nodejs_compat).
        // We stub it for webpack so the build succeeds, then the real module
        // is resolved at runtime by the Workers environment.
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
