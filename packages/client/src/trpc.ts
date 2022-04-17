import { createReactQueryHooks } from '@trpc/react';
import type {AppRouter} from "../../server/app/src/router/router";

export const trpc = createReactQueryHooks<AppRouter>();
