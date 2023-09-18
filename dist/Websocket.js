"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = require("ws");
const MessageDecrypter_1 = __importDefault(require("./MessageDecrypter"));
const dotenv_1 = require("dotenv");
const constants_1 = require("./services/constants");
(0, dotenv_1.config)();
const WEBSOCKET_URL = process.env.WEBSOCKET_URL;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
class WebSocketService {
    // maintain websocket connection against every spreadsheetId
    // every spreadsheet has multiple sheets and will use the same websocket connection
    //
    constructor(userName, password) {
        this.messageDecrypter = new MessageDecrypter_1.default();
        this.cbMap = new Map();
        this.websocket = new ws_1.WebSocket(WEBSOCKET_URL, { perMessageDeflate: false });
        this.onOpen = this.onOpen.bind(this);
        this.onError = this.onError.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.websocket.on("error", this.onError);
        this.websocket.on("open", this.onOpen);
        this.websocket.on("message", this.onMessage);
        this.activeColMap = new Map();
        this.credentials = {
            userName,
            password,
            fingerPrint: "*",
        };
    }
    onError(err) { }
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
    onMessage(data, isBinary) {
        const decryptedMessage = this.messageDecrypter.decrypt(data.toString());
        if (decryptedMessage.insert) {
            const callback = this.cbMap.get("client-position-live");
            if (callback)
                callback(decryptedMessage);
        }
    }
    listen() { }
    sendMessage(message) {
        console.log("sending message:", message);
        this.websocket.send(JSON.stringify(message));
    }
    register(spreadSheetId, cb) {
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
    subscribe(dataSourceId, cb) {
        const callback = this.cbMap.get(dataSourceId);
        if (callback)
            return;
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
    isSubscribed(dataSourceId) {
        return this.cbMap.has(dataSourceId);
    }
    updateSubscription(dataSourceId, activeColumns, inActiveColumns) {
        const callback = this.cbMap.get(dataSourceId);
        if (!callback)
            return;
        const activeColCount = this.activeColMap.get(dataSourceId);
        if (activeColCount) {
            activeColumns.forEach((col) => {
                const colValue = activeColCount.get(col);
                if (colValue !== undefined)
                    activeColCount.set(col, colValue + 1);
                else
                    activeColCount.set(col, 1);
            });
            inActiveColumns.forEach((col) => {
                const colValue = activeColCount.get(col);
                if (colValue !== undefined && colValue === 1)
                    activeColCount.delete(col);
                else if (colValue !== undefined)
                    activeColCount.set(col, colValue - 1);
            });
        }
        else {
            const mp = new Map();
            activeColumns.forEach((col) => mp.set(col, 1));
            this.activeColMap.set(dataSourceId, mp);
        }
        const activeCols = this.getActiveColumns(dataSourceId);
        // TODO: requestType to be replaced by actual datasource event
        this.sendMessage({
            type: constants_1.ACTIVE_COLUMNS_CHANGED,
            requestType: constants_1.FETCH_CLIENT_POSITIONS,
            columns: activeCols,
            loginUser: "1001",
        });
        // compute active columns for dataSourceId
    }
    getActiveColumns(dataSourceId) {
        const activeColCount = this.activeColMap.get(dataSourceId);
        if (!activeColCount)
            return [];
        return Array.from(activeColCount.keys());
    }
}
exports.WebSocketService = WebSocketService;
