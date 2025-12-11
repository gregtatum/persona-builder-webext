declare module "*vendor/zipjs/index.js" {
  export interface ConfigureOptions {
    useWebWorkers?: boolean;
    maxWorkers?: number;
    chunkSize?: number;
    workerScripts?: Record<string, string[]>;
  }

  export function configure(options: ConfigureOptions): void;

  export class BlobReader {
    constructor(blob: Blob);
  }

  export class BlobWriter {
    constructor(type?: string);
  }

  export class TextWriter {
    constructor(encoding?: string);
  }

  export interface ZipReaderOptions {
    password?: string;
    useWebWorkers?: boolean;
    signal?: AbortSignal;
  }

  export class ZipReader {
    constructor(reader: BlobReader, options?: ZipReaderOptions);
    getEntries(): Promise<
      Array<{
        filename: string;
        getData?: (writer: TextWriter | BlobWriter) => Promise<string | Blob>;
      }>
    >;
    close(): Promise<void>;
  }

  export class ZipWriter<TOutput = Blob> {
    constructor(writer: BlobWriter | TextWriter, options?: { bufferedWrite?: boolean });
    add(name: string, reader?: BlobReader | null): Promise<void>;
    close(): Promise<TOutput>;
  }
}
