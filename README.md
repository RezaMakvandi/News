# News

A full-stack practice project with an Angular client and a Node/Express server.

## Structure

- `client/` — Angular frontend
- `server/` — Node.js/Express backend API (deployed behind IIS with a reverse proxy, see `server/iis/web.config`)

## Getting started

### Server

```bash
cd server
npm install
cp .env.example .env   # fill in your environment variables
npm run build
npm start
```

### Client

```bash
cd client
npm install
npm start   # or ng serve
```

The client uses `proxy.conf.json` to forward API calls to the server during development.
