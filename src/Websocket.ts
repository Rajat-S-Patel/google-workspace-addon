import { IMessageEncryptDecrypter } from "./MessageDecrypter";
import { WebSocket, RawData } from "ws";
import MessageDecrypter from "./MessageDecrypter";
import { config } from "dotenv";
import {
  ACTIVE_COLUMNS_CHANGED,
  FETCH_CLIENT_POSITIONS,
} from "./services/constants";

config();

export type DataCallBack = (data: any) => void;
export type onConnect = () => void;

export interface IWebSocket {
  connect: (cb: onConnect) => void;
  listen: () => void;
  subscribe: (dataSourceId: string, cb: DataCallBack) => void;
  updateSubscription: (
    dataSourceId: string,
    activeColumns: string[],
    inActiveColumns: string[]
  ) => void;
  sendMessage: (message: any) => void;
  register: (spreadSheetId: string, cb: DataCallBack) => void;
  isSubscribed: (dataSouceId: string) => boolean;
}
const WEBSOCKET_URL = process.env.WEBSOCKET_URL;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
type AuthCredentials = {
  userName: string;
  password: string;
  fingerPrint: string;
};
class WebSocketService implements IWebSocket {
  private websocket;
  private messageDecrypter: IMessageEncryptDecrypter;
  private activeColMap: Map<string, Map<string, number>>;
  private cbMap: Map<string, DataCallBack>;
  private credentials: AuthCredentials;
  private messageBuffer: any[];
  // maintain websocket connection against every spreadsheetId
  // every spreadsheet has multiple sheets and will use the same websocket connection
  //
  constructor(userName: string, password: string) {
    this.messageDecrypter = new MessageDecrypter();
    this.cbMap = new Map<string, DataCallBack>();
    this.websocket = new WebSocket(WEBSOCKET_URL, { perMessageDeflate: false });
    this.onOpen = this.onOpen.bind(this);
    this.onError = this.onError.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.websocket.on("error", this.onError);
    this.websocket.on("open", this.onOpen);
    this.websocket.on("message", this.onMessage);
    this.activeColMap = new Map<string, Map<string, number>>();
    this.credentials = {
      userName,
      password,
      fingerPrint: "*",
    };
  }
  onError(err: Error) {}
  onOpen() {
    console.log("connection opened..............");
    this.sendMessage({
      type: "login",
      login: this.credentials.userName,
      pwd: this.credentials.password,
      serialNo: this.credentials.fingerPrint,
    });
    // this.sendMessage({
    //   type: "FETCH_CLIENT_POSITIONS",
    //   action: "refresh",
    //   time: 0,
    //   loginUser: "1001",
    // });
    // this.sendMessage({
    //   type: ACTIVE_COLUMNS_CHANGED,
    //   requestType: FETCH_CLIENT_POSITIONS,
    //   columns: ["login", "symbol", "volume"],
    //   loginUser: "1001",
    // });
  }
  onMessage(data: RawData, isBinary: boolean) {
    const decryptedMessage: any = this.messageDecrypter.decrypt(
      data.toString()
    );
    if(decryptedMessage.insert) {
      const callback = this.cbMap.get("client-position-live");
      console.log("message: ",decryptedMessage);
      if(callback) callback(decryptedMessage);
    }
  }
  connect(cb: onConnect) {
    // this.websocket = new WebSocket("wss://auttrading.com:90", {
    //   perMessageDeflate: false,
    // });
    // this.websocket.on("error", console.error);
    // this.websocket.on("open", (message: string) => {
    //   cb(); // execute onConnect callBack ...
    //   this.sendMessage({
    //     type: "login",
    //     login: "1001",
    //     pwd: "hello12345",
    //     serialNo: "fcd4fe32919aa9d64b69703004fa3a0d",
    //   });
    // });
    // this.websocket.on("message", (message: any) => {
    //   const decryptedMessage: any = this.messageDecrypter.decrypt(
    //     message.toString()
    //   );
    //   if (decryptedMessage.insert) {
    //     this.cbMap.forEach((cb, sheetId) => {
    //       cb(decryptedMessage);
    //     });
    //   }
    // });
  }
  listen() {}
  sendMessage(message: any): void {
    console.log("sending message:", message);
    this.websocket.send(JSON.stringify(message));
  }
  register(spreadSheetId: string, cb: DataCallBack): void {
    // const current = this.cbMap.get(spreadSheetId);
    // if (current) return;
    // this.cbMap.set(spreadSheetId, cb);
    // setInterval(() => {
    //   console.debug("sending message....");
    //   this.sendMessage({
    //     type: "FETCH_CLIENT_POSITIONS",
    //     action: "refresh",
    //     time: 0,
    //     loginUser: "1001",
    //   });
    // }, 5000);
  }
  subscribe(dataSourceId: string, cb: DataCallBack): void {
    const callback = this.cbMap.get(dataSourceId);
    if (callback) return;
    this.cbMap.set(dataSourceId, cb);
    setInterval(() => {
      console.debug("sending message....");
      this.sendMessage({
        type: "FETCH_CLIENT_POSITIONS",
        action: "refresh",
        time: 0,
        loginUser: "1001",
      });
    }, 5000);
  }
  isSubscribed(dataSourceId: string): boolean {
    return this.cbMap.has(dataSourceId);
  }
  updateSubscription(
    dataSourceId: string,
    activeColumns: string[],
    inActiveColumns: string[]
  ): void {
    const callback = this.cbMap.get(dataSourceId);
    if (!callback) return;
    const activeColCount = this.activeColMap.get(dataSourceId);
    if (activeColCount) {
      activeColumns.forEach((col) => {
        const colValue = activeColCount.get(col);
        if (colValue !== undefined) activeColCount.set(col, colValue + 1);
        else activeColCount.set(col, 1);
      });
      inActiveColumns.forEach((col) => {
        const colValue = activeColCount.get(col);
        if (colValue !== undefined && colValue === 1)
          activeColCount.delete(col);
        else if (colValue !== undefined) activeColCount.set(col, colValue - 1);
      });
    } else {
      const mp = new Map<string, number>();
      activeColumns.forEach((col) => mp.set(col, 1));
      this.activeColMap.set(dataSourceId, mp);
    }
    const activeCols = this.getActiveColumns(dataSourceId);
    // TODO: requestType to be replaced by actual datasource event
    this.sendMessage({
      type: ACTIVE_COLUMNS_CHANGED,
      requestType: FETCH_CLIENT_POSITIONS,
      columns: activeCols,
      loginUser: "1001",
    });
    // compute active columns for dataSourceId
  }
  private getActiveColumns(dataSourceId: string): string[] {
    const activeColCount = this.activeColMap.get(dataSourceId);
    if (!activeColCount) return [];
    return Array.from(activeColCount.keys());
  }
}

export { WebSocketService };
