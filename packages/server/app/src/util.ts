import path from "path";
import { fork } from "child_process";
import { app, WebContents } from "electron";
import { AppAction } from "../../../client/src/renderer";
import log from "electron-log";
import { mePath, qePath } from "./constants";

export async function runPrismaCommand({ command, dbUrl }: {
  command: string[];
  dbUrl: string;
}): Promise<number> {

  log.info("Migration engine path", mePath);
  log.info("Query engine path", qePath);

  // Currently we don't have any direct method to invoke prisma migration programatically.
  // As a workaround, we spawn migration script as a child process and wait for its completion.
  // Please also refer to the following GitHub issue: https://github.com/prisma/prisma/issues/4703
  try {
    const exitCode = await new Promise((resolve, _) => {
      const prismaPath = path.resolve(__dirname, "..", "..", "node_modules/prisma/build/index.js");
      log.info("Prisma path", prismaPath);

      const child = fork(
        prismaPath,
        command,
        {
          env: {
            ...process.env,
            DATABASE_URL: dbUrl,
            PRISMA_MIGRATION_ENGINE_BINARY: mePath,
            PRISMA_QUERY_ENGINE_LIBRARY: qePath
          },
          stdio: "pipe"
        }
      );

      child.on("message", msg => {
        log.info(msg);
      });

      child.on("error", err => {
        log.error("Child process got error:", err);
      });

      child.on("close", (code, signal) => {
        resolve(code);
      });

      child.stdout?.on("data", function(data) {
        log.info("prisma: ", data.toString());
      });

      child.stderr?.on("data", function(data) {
        log.error("prisma: ", data.toString());
      });
    });

    if (exitCode !== 0) throw Error(`command ${command} failed with exit code ${exitCode}`);

    return exitCode;
  } catch (e) {
    log.error(e);
    throw e;
  }
}

export function sendToRenderer(contents: WebContents, event: AppAction) {
  console.log("Sending to renderer ", event);
  contents.send("app", event);
}
