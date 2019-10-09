// OVERRIDES BROKEN NODE-7Z TYPINGS - DO NOT REMOVE

// Type definitions for node-7z v0.4.1
// Project: https://github.com/quentinrossetti/node-7z
// Definitions by: Erik Rothoff Andersson <https://github.com/erkie>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped/

// node-7z uses `when` promises which have a progress method, however they are deprecated
// internally node-7z uses the progress events to emit files that are extracted,
// (also the progress event emits an array of strings, which doesn't correlate with any promise<T>)
// so instead of patching `when` promises I'm extending the generic Promise for use internally
declare module "node-7z" {
    import Readable = require('stream');

    interface Data {
      file: string;
      status: string;
      attributes?: string;
      size?: number;
      sizeCompressed?: number;
      hash?: string;
    }

    interface Progress {
      percent: number;
      fileCount: number;
      file?: string;
    }

    import * as events from "events";

    class internal extends events.EventEmitter {
      pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;
    }

    class Stream extends internal { }

    class ZipReadable extends Stream implements NodeJS.ReadableStream {
      readable: boolean;
      readonly readableHighWaterMark: number;
      readonly readableLength: number;
      _read(size: number): void;
      read(size?: number): any;
      setEncoding(encoding: string): this;
      pause(): this;
      resume(): this;
      isPaused(): boolean;
      unpipe(destination?: NodeJS.WritableStream): this;
      unshift(chunk: any, encoding?: BufferEncoding): void;
      wrap(oldStream: NodeJS.ReadableStream): this;
      push(chunk: any, encoding?: string): boolean;
      _destroy(error: Error | null, callback: (error?: Error | null) => void): void;
      destroy(error?: Error): void;

      addListener(event: "end", listener: (info: Map<string, string>) => void): this;
      addListener(event: "data", listener: (data: Data) => void): this;
      addListener(event: "progress", listener: (progress: Progress) => void): this;
      addListener(event: "error", listener: (err: Error) => void): this;

      emit(event: "end", info: Map<string, string>): boolean;
      emit(event: "data", data: Data): boolean;
      emit(event: "progress", progress: Progress): boolean;
      emit(event: "error", listener: (err: Error) => void): this;

      on(event: "end", listener: (info: Map<string, string>) => void): this;
      on(event: "data", listener: (data: Data) => void): this;
      on(event: "progress", listener: (progress: Progress) => void): this;
      on(event: "error", listener: (err: Error) => void): this;

      once(event: "end", listener: (info: Map<string, string>) => void): this;
      once(event: "data", listener: (data: Data) => void): this;
      once(event: "progress", listener: (progress: Progress) => void): this;
      once(event: "error", listener: (err: Error) => void): this;

      prependListener(event: "end", listener: (info: Map<string, string>) => void): this;
      prependListener(event: "data", listener: (data: Data) => void): this;
      prependListener(event: "progress", listener: (progress: Progress) => void): this;
      prependListener(event: "error", listener: (err: Error) => void): this;

      prependOnceListener(event: "end", listener: (info: Map<string, string>) => void): this;
      prependOnceListener(event: "data", listener: (data: Data) => void): this;
      prependOnceListener(event: "progress", listener: (progress: Progress) => void): this;
      prependOnceListener(event: "error", listener: (err: Error) => void): this;

      removeListener(event: "end", listener: (info: Map<string, string>) => void): this;
      removeListener(event: "data", listener: (data: Data) => void): this;
      removeListener(event: "progress", listener: (data: Data) => void): this;
      removeListener(event: "error", listener: (error: Error) => void): this;

      [Symbol.asyncIterator](): AsyncIterableIterator<any>;
    }
  
    // Options are mapped to the 7z program so there is no idea to define all possible types here
    interface CommandLineSwitches {
      raw?: Array<string>;
      [key: string]: any
    }


  
    function add(archive: string, files: string | Array<string>, options?: CommandLineSwitches): ZipReadable;
    // function _delete(archive: string, files: string | Array<string>, options: CommandLineSwitches): PromiseWithProgress<{}>;
    function extract(archive: string, dest: string, options?: CommandLineSwitches): ZipReadable;
    function extractFull(archive: string, dest: string, options?: CommandLineSwitches): ZipReadable;
    function list(archive: string, options?: CommandLineSwitches): ZipReadable;
    // function _test(archive: string, options: CommandLineSwitches): PromiseWithProgress<{}>;
    function update(archive: string, files: string | Array<string>, options?: CommandLineSwitches): ZipReadable;
  
  }