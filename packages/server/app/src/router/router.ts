import { z } from "zod";
import { createRouter } from "./create-router";
import { BrowserWindow } from "electron";

export const createAppRouter = (win: BrowserWindow) => createRouter()
  .query("hello", {
    input: z.object({
      text: z.string().nullish()
    }),
    async resolve({ input, ctx: {prisma} }) {
      const user = await prisma.user.findFirst({
        where: {
          email: "example@user.com"
        }
      });
      return {
        greeting: `hello ${input?.text ?? "world"} from ${user?.name}`
      };
    }
  });

export type AppRouter = ReturnType<typeof createAppRouter>;
