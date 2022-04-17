import { TRPCResponse } from "@trpc/server/rpc";
import { Platform } from "process";

export interface AboutMenuAction {
  action: "about";
}

export interface HelpMenuAction {
  action: "help";
}

export type AppAction = AboutMenuAction
  | HelpMenuAction;

export interface IElectronAPI {
  rpc: (op: {
    type: "query" | "mutation" | "subscription";
    input: unknown;
    path: string;
  }) => Promise<TRPCResponse>,
  receive: (channel: "app", func: (event: AppAction) => void) => void;
  appPlatform: Platform;
  log: (msg: string) => void;
}

declare global {
  interface Window {
    appApi: IElectronAPI;
  }
}
