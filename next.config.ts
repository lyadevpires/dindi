import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // O OAuth exige endereços que começam com ponto (/.well-known/...).
    // Não dá para criar pasta com ponto dentro de src/app, então
    // apontamos internamente para rotas normais.
    return [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/wellknown/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: "/api/wellknown/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/wellknown/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: "/api/wellknown/oauth-protected-resource",
      },
    ];
  },
};

export default nextConfig;
