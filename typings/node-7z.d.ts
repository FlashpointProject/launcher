// OVERRIDES BROKEN NODE-7Z TYPINGS - DO NOT REMOVE

// Type definitions for node-7z v0.4.1
// Project: https://github.com/quentinrossetti/node-7z
// Definitions by: Erik Rothoff Andersson <https://github.com/erkie>
//                 Colin Berry <https://github.com/colin969>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped/

declare module "node-7z" {
    import Readable = require('stream');

    // @TODO Verify interfaces are correct
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
      file: string;
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

      info: Map<string, string>;

      addListener(event: "end", listener: () => void): this;
      addListener(event: "data", listener: (data: Data) => void): this;
      addListener(event: "progress", listener: (progress: Progress) => void): this;
      addListener(event: "error", listener: (err: Error) => void): this;

      emit(event: "end"): boolean;
      emit(event: "data", data: Data): boolean;
      emit(event: "progress", progress: Progress): boolean;
      emit(event: "error", listener: (err: Error) => void): this;

      on(event: "end", listener: () => void): this;
      on(event: "data", listener: (data: Data) => void): this;
      on(event: "progress", listener: (progress: Progress) => void): this;
      on(event: "error", listener: (err: Error) => void): this;

      once(event: "end", listener: () => void): this;
      once(event: "data", listener: (data: Data) => void): this;
      once(event: "progress", listener: (progress: Progress) => void): this;
      once(event: "error", listener: (err: Error) => void): this;

      prependListener(event: "end", listener: () => void): this;
      prependListener(event: "data", listener: (data: Data) => void): this;
      prependListener(event: "progress", listener: (progress: Progress) => void): this;
      prependListener(event: "error", listener: (err: Error) => void): this;

      prependOnceListener(event: "end", listener: () => void): this;
      prependOnceListener(event: "data", listener: (data: Data) => void): this;
      prependOnceListener(event: "progress", listener: (progress: Progress) => void): this;
      prependOnceListener(event: "error", listener: (err: Error) => void): this;

      removeListener(event: "end", listener: () => void): this;
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
    // @TODO Figure out how to get delete and test working as function names
    // function _delete(archive: string, files: string | Array<string>, options: CommandLineSwitches): PromiseWithProgress<{}>;
    function extract(archive: string, dest: string, options?: CommandLineSwitches): ZipReadable;
    function extractFull(archive: string, dest: string, options?: CommandLineSwitches): ZipReadable;
    function list(archive: string, options?: CommandLineSwitches): ZipReadable;
    // function _test(archive: string, options: CommandLineSwitches): PromiseWithProgress<{}>;
    function update(archive: string, files: string | Array<string>, options?: CommandLineSwitches): ZipReadable;
  
  }