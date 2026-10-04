<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="web/public/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="web/public/logo-light.png" />
    <img src="web/public/logo-light.png" alt="ternssh logo" width="96" height="93" />
  </picture>
</p>

<h1 align="center">ternssh</h1>

<p align="center">
  SSH workspace on Cloudflare<br />
  Draggable dashboard · Terminal · SFTP · Status monitoring
</p>

<p align="center">
  <a href="LICENSE">GPL-3.0-or-later</a>
  ·
  <a href="README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/haradakashiwa/ternssh-cloudflare-workers-template">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare" />
  </a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/preview-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="docs/preview-light.png" />
    <img src="docs/preview-light.png" alt="ternssh dashboard preview" width="1024" />
  </picture>
</p>

---

**ternssh** is an SSH management tool that runs on Cloudflare Edge. Full documentation: **[Docs](https://ternssh.com/docs/home)**.

## Deployment

### Docker quick start

Using the prebuilt image (recommended):

```bash
docker run -d \
  --name ternssh \
  -p 8787:8787 \
  -v ternssh-data:/app/.wrangler \
  --restart unless-stopped \
  ghcr.io/haradakashiwa/ternssh:latest
```

Or with Docker Compose:

```bash
docker compose -f docker-compose.ghcr.yml up -d
```

Build from source:

```bash
docker compose up -d --build
```

Open http://localhost:8787 after startup. To enable Cloudflare Access authentication, set the `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` environment variables.

### Cloudflare Workers

See the [deployment guide](https://ternssh.com/docs/deployment) for details.
