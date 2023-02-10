export interface IDataFactory<Options, Flags, O = undefined> {
  run(options?: Options, flags?: Flags[]): Promise<O> | O;
  runMany(iterations: number, options?: Options, flags?: Flags[]): Promise<Array<O>> | Array<O>;
}
