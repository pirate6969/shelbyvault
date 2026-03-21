import path from "path";

const nextConfig = {
  allowedDevOrigins: ["192.168.56.1"],
  webpack: (config: any) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@aptos-connect/wallet-adapter-plugin": path.resolve(
        "./lib/aptos-connect-mock.js"
      ),
    };
    return config;
  },
};

export default nextConfig;