import { Data } from "~/protocols/protobuf/ohw";

export class UsbManager {
  private messageHandler?: (data: Data) => void;
  private readingStateHandler?: (reading: boolean) => void;

  async connect(): Promise<void> {}

  async close(): Promise<void> {}

  onMessage(handler: (data: Data) => void): void {
    this.messageHandler = handler;
  }

  onReadingState(handler: (reading: boolean) => void): void { 
    this.readingStateHandler = handler;
  }
}
