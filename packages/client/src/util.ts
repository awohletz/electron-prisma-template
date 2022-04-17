import { TRPCResponse } from "@trpc/server/rpc";
import { LinkRuntimeOptions, TRPCClientError, TRPCLink } from "@trpc/client";
import {TRPCAbortError} from "@trpc/client/src/internals/TRPCAbortError";
import type { AppRouter } from "../../server/app/src/router/router";

export function transformRPCResponse({
                                       envelope,
                                       runtime
                                     }: {
  envelope: TRPCResponse;
  runtime: LinkRuntimeOptions;
}) {
  if ("error" in envelope) {
    return TRPCClientError.from({
      ...envelope,
      error: runtime.transformer.deserialize(envelope.error)
    });
  }
  if (envelope.result.type === "data") {
    return {
      ...envelope.result,
      data: runtime.transformer.deserialize(envelope.result.data)
    };
  }
  return envelope.result;
}

async function ipcRequest(op: {
  type: "query" | "mutation" | "subscription";
  input: unknown;
  path: string;
}): Promise<TRPCResponse> {
  return window.appApi.rpc(op);
}

export const customLink: TRPCLink<AppRouter> = (runtime) => {
  return ({ op, prev, onDestroy }) => {
    console.log("Sending IPC request", op);
    const startTime = performance.now();
    const promise = ipcRequest(op);
    let isDone = false;
    const prevOnce: typeof prev = (result) => {
      if (isDone) {
        return;
      }
      isDone = true;
      prev(result);
    };
    onDestroy(() => {
      prevOnce(TRPCClientError.from(new TRPCAbortError(), { isDone: true }));
    });
    promise
      .then((envelope) => {
        const response = transformRPCResponse({ envelope, runtime });
        const endTime = performance.now();
        console.log(`Got IPC response in ${endTime - startTime}ms`, response);
        prevOnce(response);
      })
      .catch((cause) => {
        console.error("Got IPC error", cause);
        prevOnce(TRPCClientError.from(cause));
      });
  };
};
