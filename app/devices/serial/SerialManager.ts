import { Data } from "~/protocols/protobuf/ohw";

export interface SerialProtocolConfig {
  readonly MAGIC: Uint8Array;
  readonly HEADER_LENGTH: 5;
  readonly LENGTH_BYTES: number;
  readonly MAX_LENGTH: number;
}

export interface SerialConfig {
  readonly PORT: SerialOptions;
  readonly PROTOCOL: SerialProtocolConfig;
}

export const DEFAULT_SERIAL_CONFIG: SerialConfig = {
  PORT: {
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  },
  PROTOCOL: {
    // ₿ UTF-8: E2 82 BF
    MAGIC: new Uint8Array([0xe2, 0x82, 0xbf]),
    HEADER_LENGTH: 5,
    LENGTH_BYTES: 2,
    MAX_LENGTH: 1024,
  },
};

export class SerialManager {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buffer: Uint8Array = new Uint8Array(0);
  private readonly config: SerialConfig;
  private messageHandler?: (data: Data) => void;
  private readingStateHandler?: (reading: boolean) => void;

  constructor(config: SerialConfig = DEFAULT_SERIAL_CONFIG) {
    this.config = config;
  }

  onMessage(handler: (data: Data) => void): void {
    this.messageHandler = handler;
  }

  onReadingState(handler: (reading: boolean) => void): void { 
    this.readingStateHandler = handler;
  }

  async connect(): Promise<void> {
    if (!navigator.serial) {
      throw new Error("Not Support WebSerial API");
    }
    if (!this.port?.connected) {
      this.port = await navigator.serial.requestPort();
    }

    await this.port.open(this.config.PORT);

    this.startReading();

  }

  async close(): Promise<void> {
    if (this.reader) {
      await this.reader.cancel().catch(() => {});
      this.reader.releaseLock();
    }
    this.reader = null;
    if (this.port && this.port.readable) {
      await this.port.close();
    }
    this.buffer = new Uint8Array(0);
  }

  private async startReading(): Promise<void> {
    if (!this.port?.readable) return;
    try {
      this.reader = this.port.readable.getReader();

      this.readingStateHandler?.(true);

      while (this.port.readable) {
        const { value, done } = await this.reader.read();
        if (done) break;

        const newBuffer = new Uint8Array(this.buffer.length + value.length);
        newBuffer.set(this.buffer);
        newBuffer.set(value, this.buffer.length);
        this.buffer = newBuffer;

        console.log(this.buffer);

        this.processBuffer();
      }
    } catch (error) {
      console.error("Read Port Error:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      await this.close();
      this.readingStateHandler?.(false);
    }
  }

  private processBuffer(): void {
    while (this.buffer.length >= this.config.PROTOCOL.HEADER_LENGTH) {
      const magicMatch = this.arrayEquals(
        this.buffer.slice(0, this.config.PROTOCOL.MAGIC.length),
        this.config.PROTOCOL.MAGIC,
      );

      if (!magicMatch) {
        this.buffer = this.buffer.slice(1);
        break;
      }

      const length = (this.buffer[3] << 8) | this.buffer[4];

      if (this.buffer.length < this.config.PROTOCOL.HEADER_LENGTH + length) {
        break;
      }

      const message = this.buffer.slice(
        this.config.PROTOCOL.HEADER_LENGTH,
        this.config.PROTOCOL.HEADER_LENGTH + length,
      );
      
      const data = Data.fromBinary(message);
      
      this.messageHandler?.(data);

      this.buffer = this.buffer.slice(
        this.config.PROTOCOL.HEADER_LENGTH + length,
      );
    }
  }

  private arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }
}
