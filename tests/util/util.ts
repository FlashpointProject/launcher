export function syncRunManyFactory<Options, Flags, Output = undefined>(run: (options?: Options, flags?: Flags) => Promise<Output> | Output) {
  return async (iterations: number, options?: Options, flags?: Flags): Promise<Array<Output>> => {
    const results = [];
    for (let i = 0; i < iterations; i++)  {
      results.push(await run(options, flags));
    }
    return results;
  };
}

export function asyncRunManyFactory<Flags, Options, Output = undefined>(run: (flags?: Flags, options?: Options) => Promise<Output> | Output) {
  return async (iterations: number, flags?: Flags, options?: Options): Promise<Array<Output>> => {
    const promises = [];
    for (let i = 0; i < iterations; i++) {
      promises.push(run(flags, options));
    }
    return Promise.all(promises);
  };
}
