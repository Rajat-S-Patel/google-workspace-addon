"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = require("ws");
const MessageDecrypter_1 = __importDefault(require("./MessageDecrypter"));
class WebSocketService {
    constructor() {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        this.messageDecrypter = new MessageDecrypter_1.default();
        this.cbMap = new Map();
    }
    connect(cb) {
        this.websocket = new ws_1.WebSocket("wss://auttrading.com:90", {
            perMessageDeflate: false,
        });
        this.websocket.on("error", console.error);
        this.websocket.on("open", (message) => {
            cb(); // execute onConnect callBack ...
            this.sendMessage({
                type: "login",
                login: "1001",
                pwd: "hello12345",
                serialNo: "fcd4fe32919aa9d64b69703004fa3a0d",
            });
            // setTimeout(() => {
            //   this.sendMessage({
            //     type: "ACTIVE_COLUMNS_CHANGED",
            //     requestType: "FETCH_CLIENT_POSITIONS",
            //     columns: [
            //       "login",
            //       "symbol",
            //       "subbroker",
            //       "clientbalance",
            //       "clientfloatingpl",
            //       "clientplnet",
            //       "companyplnet",
            //     ],
            //     loginUser: "1001",
            //   });
            // }, 100);
        });
        this.websocket.on("message", (message) => {
            const decryptedMessage = this.messageDecrypter.decrypt(message.toString());
            if (decryptedMessage.insert) {
                this.cbMap.forEach((cb, sheetId) => {
                    cb(decryptedMessage);
                });
            }
        });
    }
    listen() { }
    sendMessage(message) {
        console.log("sending message:", message);
        this.websocket.send(JSON.stringify(message));
    }
    register(spreadSheetId, cb) {
        const current = this.cbMap.get(spreadSheetId);
        if (current)
            return;
        this.cbMap.set(spreadSheetId, cb);
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
}
exports.WebSocketService = WebSocketService;
