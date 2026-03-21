const nextConfig = {
  turbopack: {
    resolveAlias: {
      "@aptos-connect/wallet-adapter-plugin": "./lib/aptos-connect-mock.js",
    },
  },
};

export default nextConfig;