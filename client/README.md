# Client

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.37.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Hosting with IIS (client on 8085, API on 8086)

Set the IIS site's physical path for port `8085` to
`client/dist/news-portal/browser`. The Angular build copies `public/web.config`
into that directory. It forwards `/api` and `/uploads` to the IIS API site on
port `8086` and rewrites Angular routes to `index.html`.

Set the IIS site's physical path for port `8086` to `server/iis`. Its
`web.config` forwards requests to the Node process on `127.0.0.1:4000`. Install
the IIS URL Rewrite and ARR modules, and enable proxying in ARR. Start the
backend with `npm start` from the `server` directory; keep it running as a
Windows service for deployment.

Build the client and server before deploying:

```powershell
cd client
npm ci
npm run build
cd ..\server
npm ci
npm run build
npm start
```

For production, configure `server/.env` with `NODE_ENV=production`, a persistent
`MONGODB_URI`, a strong `JWT_SECRET`, `CORS_ORIGIN` set to the client site origin
(for example `http://localhost:8085`), and `PUBLIC_URL` set to the externally
reachable API site URL (for example `http://localhost:8086`). Use your real
hostnames and HTTPS URLs when applicable. The Node `PORT` remains `4000`; IIS
owns ports `8085` and `8086`.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
