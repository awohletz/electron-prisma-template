# Scripts
This page is specific to the scripts in the package.json file; what they do and why we have them.

#### Running locally
To run the template locally, run `npm start` in packages/client and 
`npm run dev` in packages/server.

#### Running production
- `npm run build` in client
- `npm run prod` in server

#### Running E2E tests
You can run E2E tests with the `npm run test` command.

#### Packaging your application
- `npm run build` in client
- `npm run prod` in server
- Test it out
- `npm run dist` in server
- Test out the resultant executable in server/packed
- Commit any outstanding changes you have
- `npm run publish` in server. This will commit a new version tag and then upload to github releases.

These commands make use of [electron-builder](https://www.electron.build) to build your app for production.

#### Generating translation files
Translations for multiple languages can be generated automatically without manual effort. To create translations, run `npm run translate`.
> Note - There are additional details/setup that must be done the first time in `app/electron/localization/translateMissing.js` before running the command successfully. There is also additional information in this file how the translation process works.

#### Audit your application
Thanks to [`@doyensec/electronegativity`](https://github.com/doyensec/electronegativity), we can audit that our application meets all of the secure practices as recommended by the Electron team. To run it, run `npm run audit-app`. 
> Note - there are limitations of AST/DOM parsing (which the package uses) to verify secure practices. Some results of the report are false positives (ie. `LIMIT_NAVIGATION_GLOBAL_CHECK` and `PERMISSION_REQUEST_HANDLER_GLOBAL_CHECK`).
