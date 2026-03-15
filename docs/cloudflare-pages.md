Cloudflare Pages Deployment Guide

Overview
- This project builds with VitePress and outputs a static site to docs/.vitepress/dist.
- Cloudflare Pages can host this as a static site. The recommended path is to configure the Pages project to run a build and deploy the dist directory.

Prerequisites
- Cloudflare account and a Pages project created for this repo.
- Access token stored as a GitHub Secret (CLOUDFLARE_API_TOKEN) if using CI-based deployment.

Build locally for Cloudflare Pages
- Run: npm install
- Run: npm run docs:build
- The output will be at: docs/.vitepress/dist

Cloudflare Pages configuration (UI)
- Build command: npm run docs:build
- Build output directory: docs/.vitepress/dist
- Root directory: (your repo root)
- Environment variables: optional, add if needed

CI/Automation (GitHub Actions example)
- This repo can deploy automatically to Cloudflare Pages after pushes to main.
- Example workflow file is provided in the repository at .github/workflows/cloudflare-pages.yml

Notes
- The dispatch uses the Pages build system; if you prefer push-based deploys, you can adjust to your flow.
- This setup assumes Cloudflare Pages as a static hosting service; if you plan to run Cloudflare Workers, you’ll need a different approach.
