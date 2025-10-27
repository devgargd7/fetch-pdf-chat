/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Turbopack configuration instead of webpack
  turbopack: {
    // Turbopack configuration for PDF.js
  },
  // Enable static file serving for worker
  async headers() {
    return [
      {
        source: '/pdf.worker.min.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
