import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` must match the GitHub Pages subpath. The site is served from
// https://projects.ahmadjalil.com/PowerAppsCanvasAppRenderer/ (the custom
// domain is configured on the ahzs645.github.io user-pages repo, so this
// project repo is served under its /repo-name/ subpath).
export default defineConfig({
  base: '/PowerAppsCanvasAppRenderer/',
  plugins: [react()],
})
