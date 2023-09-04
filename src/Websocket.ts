import { IMessageEncryptDecrypter } from "./MessageDecrypter";

const { WebSocket } = require("ws");
const MessageDecrypter = require("./MessageDecrypter");

export type DataCallBack = (data: any) => void;
export interface IWebSocket {
  connect: () => void;
  listen: () => void;
  sendMessage: (message: any) => void;
  register: (spreadSheetId: string, cb: DataCallBack) => void;
}
class WebSocketService implements IWebSocket {
  private websocket;
  private messageDecrypter: IMessageEncryptDecrypter;
  private cbMap: Map<string, DataCallBack>;
  constructor() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    this.messageDecrypter = new MessageDecrypter();
    this.cbMap = new Map<string, DataCallBack>();
  }
  connect() {
    this.websocket = new WebSocket("wss://auttrading.com:90", {
      perMessageDeflate: false,
    });
    this.websocket.on("error", console.error);

    this.websocket.on("open", (message: string) => {
      this.sendMessage({
        type: "login",
        login: "1001",
        pwd: "hello12345",
        serialNo: "fcd4fe32919aa9d64b69703004fa3a0d",
      });
      setTimeout(() => {
        this.sendMessage({
          type: "ACTIVE_COLUMNS_CHANGED",
          requestType: "FETCH_CLIENT_POSITIONS",
          columns: [
            "login",
            "symbol",
            "subbroker",
            "clientbalance",
            "clientfloatingpl",
            "clientplnet",
            "companyplnet",
          ],
          loginUser: "1001",
        });
      }, 100);
    });

    this.websocket.on("message", (message: any) => {
      const decryptedMessage: any = this.messageDecrypter.decrypt(
        message.toString()
      );
      if (decryptedMessage.insert) {
        this.cbMap.forEach((cb, sheetId) => {
          cb(decryptedMessage);
        });
      }
    });
  }
  listen() {}
  sendMessage(message: any): void {
    this.websocket.send(JSON.stringify(message));
  }
  register(spreadSheetId: string, cb: DataCallBack): void {
    const current = this.cbMap.get(spreadSheetId);
    if (current) return;
    this.cbMap.set(spreadSheetId, cb);
    setInterval(() => {
      console.debug("sending message....");
      this.sendMessage({
        type: "FETCH_CLIENT_POSITIONS",
        action: "refresh",
        time: 0,
        loginUser: "1001",
      });
    }, 3000);
  }
}

module.exports = { WebSocketService };
export { WebSocketService };
