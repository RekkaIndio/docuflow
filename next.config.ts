
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Provide browser-friendly fallbacks/aliases for node built-ins used by some deps in client bundles only
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        canvas: false,
        'node:process': require.resolve('process/browser'),
        process: require.resolve('process/browser'),
        'node:buffer': require.resolve('buffer'),
        buffer: require.resolve('buffer'),
        'node:stream': require.resolve('stream-browserify'),
        stream: require.resolve('stream-browserify'),
        'node:stream/web': require.resolve('web-streams-polyfill/dist/ponyfill.es2018'),
        'node:http': require.resolve('stream-http'),
        'node:https': require.resolve('https-browserify'),
        'node:zlib': require.resolve('browserify-zlib'),
        'node:crypto': require.resolve('crypto-browserify'),
        crypto: require.resolve('crypto-browserify'),
        util: require.resolve('util/'),
      };

      const webpack = require('webpack');
      config.plugins = config.plugins || [];

      const replaceNodeScheme = (name: string, replacement: string) => {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(new RegExp(`node:${name}`), function (resource: any) {
            resource.request = require.resolve(replacement);
          })
        );
      };

      replaceNodeScheme('process', 'process/browser');
      replaceNodeScheme('buffer', 'buffer');
      replaceNodeScheme('stream', 'stream-browserify');
      replaceNodeScheme('stream/web', 'web-streams-polyfill/dist/ponyfill.es2018');
      replaceNodeScheme('http', 'stream-http');
      replaceNodeScheme('https', 'https-browserify');
      replaceNodeScheme('zlib', 'browserify-zlib');
      replaceNodeScheme('crypto', 'crypto-browserify');
    }

    return config;
  },
};

export default nextConfig;
