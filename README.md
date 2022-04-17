# electron-prisma-template
Use [tRPC](https://trpc.io/) and [Prisma](https://www.prisma.io/) with Electron. Forked from [secure-electron-template](https://github.com/reZach/secure-electron-template).

## How to get started
To get started, clone the repository by clicking the ![Use this template](https://github.com/awohletz/electron-prisma-template/blob/master/docs/imgs/usethistemplate.png "Use this template") button, or through the command line (`git clone https://github.com/reZach/secure-electron-template.git`). 

Once cloned, install the dependencies for the repo by running the following commands (you do _not_ have to run the first command if your command line is already inside the newly cloned respository):

```
cd electron-prisma-template
npm i
cd packages/client
npm run start
cd ../server
npm run dev
```

> Are you using `yarn`? You'll want to [read this issue](https://github.com/reZach/secure-electron-template/issues/62).

When you'd like to test your app in production, or package it for distribution, please navigate to [this page](https://github.com/awohletz/electron-prisma-template/blob/master/docs/scripts.md) for more details on how to do this.

## Features
All the features from secure-electron-template plus:
- tRPC for communication between the renderer and main processes.
- Prisma for database access.

## TODO
- Verify the packaging is working with the given electron-builder config files.
- Auto updating.
- Demonstrate communication from the main to the renderer process.
