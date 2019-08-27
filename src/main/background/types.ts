// Parsable arguments without config data used
export type ParseArgs = {
  [key:string] : string
}

// Parsable arguments with config data used
export type ParseArgsConfig = ParseArgs & {
  [key:string] : string
  flashpointPath: string;
}