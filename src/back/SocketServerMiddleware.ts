import { BackRes, BackResParams, BackResReturnTypes } from '@shared/back/types';

export type ContextMiddlewareRes = {
  type: BackRes;
  args?: BackResParams<BackRes>;
  res?: BackResReturnTypes<BackRes>;
};

export type Next = () => Promise<void> | void

export type MiddlewareRes = (context: ContextMiddlewareRes, next: Next) => Promise<void> | void

export type PipelineRes = {
  push: (...middlewares: MiddlewareRes[]) => void
  execute: (context: ContextMiddlewareRes) => Promise<void>
}

export function genPipelineBackOut(...middlewares: MiddlewareRes[]): PipelineRes {
  const stack: MiddlewareRes[] = middlewares;

  const push: PipelineRes['push'] = (...middlewares) => {
    stack.push(...middlewares);
  };

  const execute: PipelineRes['execute'] = async (context) => {
    let prevIndex = -1;

    const runner = async (index: number): Promise<void> => {
      if (index === prevIndex) {
        throw new Error('next() called multiple times');
      }

      prevIndex = index;

      const middleware = stack[index];

      if (middleware) {
        await middleware(context, () => {
          return runner(index + 1);
        });
      }
    };

    await runner(0);
  };

  return { push, execute };
}
