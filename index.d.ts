export type AsyncAwaitWebsocket = {
  readonly sid: string;
  sendSync: (event: string, data: any) => void;
  sendAsync: (event: string, data: any, timeout?: number) => Promise<any>;
  on: (event: string, callback: (data: any) => void) => () => void;
  off: (event: string, callback: (data: any) => void) => void;
  dispose: () => void;
};
