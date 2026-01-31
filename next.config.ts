import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ['ffmpeg-static', 'fluent-ffmpeg'],
    experimental: {
        serverActions: {
            bodySizeLimit: '500mb',
        },
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }
        return config;
    },
};

export default nextConfig;
