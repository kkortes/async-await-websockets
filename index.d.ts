export type AsyncAwaitWebsocket = WebSocket & {
  sid: string;
  sendSync: (event: string, data: any) => void;
  sendAsync: (event: string, data: any, timeout?: number) => any;
};
