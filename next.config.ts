const nextConfig = {
  turbopack: {},
  experimental: {
    turbo: {
      resolveAlias: {
        "@aptos-connect/wallet-adapter-plugin": { browser: "./lib/aptos-connect-mock.js" },
      },
    },
  },
};

export default nextConfig;