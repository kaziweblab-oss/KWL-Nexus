/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
	dest: "public",
	disable: process.env.NODE_ENV === "development",
	register: true,
	skipWaiting: true,
	cacheOnFrontEndNav: false,
	reloadOnOnline: true,
	runtimeCaching: [
		{
			urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
			handler: "NetworkFirst",
			options: { cacheName: "next-data", expiration: { maxEntries: 32, maxAgeSeconds: 60 }, networkTimeoutSeconds: 5 },
		},
		{
			// Public read-only metadata only. Private/personalized APIs (auth, user, payment,
			// subscription, license, admin, notifications, download) must NEVER be cached.
			urlPattern: /^\/api\/(public|docs)\/.*/i,
			handler: "NetworkFirst",
			options: { cacheName: "public-apis", expiration: { maxEntries: 16, maxAgeSeconds: 300 }, networkTimeoutSeconds: 5 },
		},
	],
});

const nextConfig = {
	async headers() {
		return [{ source: "/(.*)", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }] }];
	},
	experimental: {
		webpackBuildWorker: false,
	},
	// Fix Windows + space-in-path HMR + PackFileCache ENOENT + app-page `call` runtime: disable filesystem cache in dev
	webpack: (config, { dev }) => {
		if (dev) {
			// Must be memory, not filesystem pack.gz, to avoid `11.pack.gz` ENOENT + `call` error on `KWL NEXUS` space path
			// eslint-disable-next-line no-param-reassign
			config.cache = false;
			config.watchOptions = {
				poll: 1000,
				aggregateTimeout: 300,
			};
		}
		return config;
	},
};

module.exports = withPWA(nextConfig);
