import {AnyRouter, inferRouterContext, inferRouterError, ProcedureType, Subscription, TRPCError} from "@trpc/server";
import {TRPCErrorResponse, TRPCResponse, TRPCResultResponse} from "@trpc/server/rpc";
import {OnErrorFunction} from "@trpc/server/dist/declarations/src/internals/OnErrorFunction";

export async function callProcedure<
    TRouter extends AnyRouter<TContext>,
    TContext,
    >(opts: {
    path: string;
    input: unknown;
    router: TRouter;
    ctx: TContext;
    type: ProcedureType;
}): Promise<unknown | Subscription<TRouter>> {
    const { type, path, input } = opts;

    const caller = opts.router.createCaller(opts.ctx);
    if (type === 'query') {
        return caller.query(path, input as any);
    }
    if (type === 'mutation') {
        return caller.mutation(path, input as any);
    }
    if (type === 'subscription') {
        const sub = (await caller.subscription(path, input as any)) as Subscription;
        return sub;
    }
    /* istanbul ignore next */
    throw new Error(`Unknown procedure type ${type}`);
}

function transformTRPCResponseItem(
    router: AnyRouter,
    item: TRPCResponse,
): TRPCResponse {
    if ('error' in item) {
        return {
            ...item,
            error: router._def.transformer.output.serialize(item.error),
        };
    }
    if (item.result.type !== 'data') {
        return item;
    }
    return {
        ...item,
        result: {
            ...item.result,
            data: router._def.transformer.output.serialize(item.result.data),
        },
    };
}

/**
 * Takes a unserialized `TRPCResponse` and serializes it with the router's transformers
 **/
export function transformTRPCResponse<
    TResponse extends TRPCResponse | TRPCResponse[],
    >(router: AnyRouter, itemOrItems: TResponse) {
    return Array.isArray(itemOrItems)
        ? itemOrItems.map((item) => transformTRPCResponseItem(router, item))
        : transformTRPCResponseItem(router, itemOrItems);
}

export function getMessageFromUnkownError(
    err: unknown,
    fallback: string,
): string {
    if (typeof err === 'string') {
        return err;
    }

    if (err instanceof Error && typeof err.message === 'string') {
        return err.message;
    }
    return fallback;
}

export function getErrorFromUnknown(cause: unknown): TRPCError {
    // this should ideally be an `instanceof TRPCError` but for some reason that isn't working
    // ref https://github.com/trpc/trpc/issues/331
    if (cause instanceof Error && cause.name === 'TRPCError') {
        return cause as TRPCError;
    }
    const err = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        cause,
    });

    // take stack trace from cause
    if (cause instanceof Error) {
        err.stack = cause.stack;
    }
    return err;
}

export async function resolveIPCResponse<TRouter extends AnyRouter>(opts: {
    createContext: () => Promise<inferRouterContext<TRouter>>;
    onError?: OnErrorFunction<TRouter, IpcRpcRequest>;
    batching?: {
        enabled: boolean;
    };
    router: TRouter;
    req: IpcRpcRequest;
    error?: TRPCError | null;
}): Promise<TRPCResponse | TRPCResponse[]> {
    const {createContext, onError, router, req} = opts;
    const batchingEnabled = opts.batching?.enabled ?? true;
    let ctx: inferRouterContext<TRouter> | undefined = undefined;
    let paths: string[] | undefined = undefined;

    const isBatchCall = !!req.isBatch;
    type TRouterError = inferRouterError<TRouter>;
    type TRouterResponse = TRPCResponse<unknown, TRouterError>;

    function endResponse(
        untransformedJSON: TRouterResponse | TRouterResponse[],
        errors: TRPCError[],
    ): TRPCResponse | TRPCResponse[] {
        return transformTRPCResponse(router, untransformedJSON);
    }

    const {type, path, input, id, context} = req;

    try {
        if (opts.error) {
            throw opts.error;
        }
        if (isBatchCall && !batchingEnabled) {
            throw new Error(`Batching is not enabled on the server`);
        }
        // @ts-expect-error no unknown string in union
        if (type === 'unknown' || type === 'subscription') {
            throw new TRPCError({
                message: `Unexpected request method ${type}`,
                code: 'METHOD_NOT_SUPPORTED',
            });
        }
        const rawInput = input;

        paths = isBatchCall ? path.split(',') : [path];
        ctx = await createContext();

        const deserializeInputValue = (rawValue: unknown) => {
            return typeof rawValue !== 'undefined'
                ? router._def.transformer.input.deserialize(rawValue)
                : rawValue;
        };
        const getInputs = (): Record<number, unknown> => {
            if (!isBatchCall) {
                return {
                    0: deserializeInputValue(rawInput),
                };
            }

            if (
                rawInput == null ||
                typeof rawInput !== 'object' ||
                Array.isArray(rawInput)
            ) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: '"input" needs to be an object when doing a batch call',
                });
            }
            const input: Record<number, unknown> = {};
            for (const key in rawInput) {
                const k = key as any as number;
                const rawValue = (rawInput as any)[k];

                const value = deserializeInputValue(rawValue);

                input[k] = value;
            }
            return input;
        };
        const inputs = getInputs();

        const rawResults = await Promise.all(
            paths.map(async (path, index) => {
                const input = inputs[index];
                try {
                    const output = await callProcedure({
                        ctx,
                        router: router,
                        path,
                        input,
                        type,
                    });
                    return {
                        input,
                        path,
                        data: output,
                    };
                } catch (cause) {
                    const error = getErrorFromUnknown(cause);

                    onError?.({error, path, input, ctx, type: type, req});
                    return {
                        input,
                        path,
                        error,
                    };
                }
            }),
        );
        const errors = rawResults.flatMap((obj) => (obj.error ? [obj.error] : []));
        const resultEnvelopes = rawResults.map((obj) => {
            const {path, input} = obj;

            if (obj.error) {
                const json: TRPCErrorResponse<TRouterError> = {
                    id: null,
                    error: router.getErrorShape({
                        error: obj.error,
                        type,
                        path,
                        input,
                        ctx,
                    }),
                };
                return json;
            } else {
                const json: TRPCResultResponse<unknown> = {
                    id: null,
                    result: {
                        type: 'data',
                        data: obj.data,
                    },
                };
                return json;
            }
        });

        const result = isBatchCall ? resultEnvelopes : resultEnvelopes[0];
        return endResponse(result, errors);
    } catch (cause) {
        // we get here if
        // - batching is called when it's not enabled
        // - `createContext()` throws
        // - post body is too large
        // - input deserialization fails
        const error = getErrorFromUnknown(cause);

        const json: TRPCErrorResponse<TRouterError> = {
            id: null,
            error: router.getErrorShape({
                error,
                type,
                path: undefined,
                input: undefined,
                ctx,
            }),
        };
        onError?.({
            error,
            path: undefined,
            input: undefined,
            ctx,
            type: type,
            req,
        });
        return endResponse(json, [error]);
    }
}

export interface IpcRpcRequest {
    id: number;
    type: "query" | "mutation" | "subscription";
    path: string;
    input: unknown;
    context: unknown;
    isBatch?: boolean;
}
