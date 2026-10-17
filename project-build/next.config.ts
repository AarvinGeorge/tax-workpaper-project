import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg uses native-optional requires; keep it out of the server bundle.
  serverExternalPackages: ["pg"],
  // The packet is read from disk at runtime (process.cwd()/data/packet.json); ship it with every server function.
  outputFileTracingIncludes: { "/**": ["./data/packet.json"] },
};

export default nextConfig;
