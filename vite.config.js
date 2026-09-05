import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

const ttsProxyPlugin = () => ({
  name: 'indic-tts-proxy',
  configureServer(server) {
    server.middlewares.use('/api/tts', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        const text = urlObj.searchParams.get('q') || '';
        const lang = urlObj.searchParams.get('tl') || 'kn';
        if (!text.trim()) {
          res.statusCode = 400;
          res.end('Missing text query');
          return;
        }

        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
        const fetchRes = await fetch(googleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (fetchRes.ok) {
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          const arrayBuf = await fetchRes.arrayBuffer();
          res.end(Buffer.from(arrayBuf));
          return;
        }
        res.statusCode = fetchRes.status;
        res.end('Upstream TTS returned ' + fetchRes.status);
      } catch (err) {
        console.warn('TTS proxy error:', err);
        res.statusCode = 500;
        res.end('TTS Proxy Error');
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), basicSsl(), ttsProxyPlugin()],
  server: {
    host: true,
    port: 5173,
    https: true,
  },
})

