import { IMessageEncryptDecrypter } from "./MessageDecrypter";

const { WebSocket } = require("ws");
const MessageDecrypter = require("./MessageDecrypter");

export interface IWebSocket {
  connect: () => void;
  listen: () => void;
  sendMessage: (message: any) => void;
}
class WebSocketService implements IWebSocket {
  private websocket;
  private messageDecrypter: IMessageEncryptDecrypter;
  constructor() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    this.messageDecrypter = new MessageDecrypter();
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
      this.sendMessage({"type":"FETCH_CLIENT_POSITIONS","loginUser":"1001"});
      this.sendMessage({"type":"ACTIVE_COLUMNS_CHANGED","requestType":"FETCH_CLIENT_POSITIONS","columns":["login","symbol","ag-Grid-AutoColumn","volume","companyvolume","previousvolume","difference"],"loginUser":"1001"});
      this.sendMessage({"type":"FETCH_CLIENT_POSITIONS","action":"refresh","time":0});
    });

    this.websocket.on("message",(message: any) =>  {
      const decryptedMessage = this.messageDecrypter.decrypt(message.toString());
      console.log("decryptedMessage:", decryptedMessage);
    });
  }
  listen() {}
  sendMessage(message: any): void {
    this.websocket.send(JSON.stringify(message));
  }
}

module.exports = { WebSocketService };
export { WebSocketService };
