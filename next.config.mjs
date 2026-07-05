/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin is a heavy Node package with optional native/telemetry deps.
  // Keep it out of the bundler so it's required at runtime (works on Netlify functions).
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore"],
};

export default nextConfig;
