const nextConfig = {
  allowedDevOrigins: ["192.168.56.1"],
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        "@aptos-connect/wallet-adapter-plugin": false,
      };
    }
    return config;
  },
};

export default nextConfig;