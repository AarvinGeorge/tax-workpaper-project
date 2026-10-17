import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg uses native-optional requires; keep it out of the server bundle.
  serverExternalPackages: ["pg"],
  // Client data is not shipped with the server functions: in production the packet and the AI payload are read
  // encrypted from the private Blob store (src/server/data.ts). Local dev reads data/ and ai/eval/ from disk. File
  // tracing would otherwise pick both up from the loaders' process.cwd() paths, so they are excluded explicitly.
  outputFileTracingExcludes: { "/**": ["./data/**", "./ai/eval/**"] },
};

export default nextConfig;
