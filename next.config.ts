const nextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {
        "@aptos-connect/wallet-adapter-plugin": "./lib/aptos-connect-mock.js",
      },
    },
  },
};

export default nextConfig;