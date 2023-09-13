"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpreadSheetServiceInstance = exports.SpreadSheetService = void 0;
const Websocket_1 = require("../Websocket");
const googleapis_1 = require("googleapis");
const constants_1 = require("./constants");
// const API_KEY = "AIzaSyD9WUQouDmtP7Et4AqTJmTX2qV4F0yJzNU";
const CLIENT_ID = "277891092538-1l88abaphnnhp97fj8id48dpvq528khi.apps.googleusercontent.com";
const GID = "0";
class SpreadSheetService {
    constructor() {
        this.mp = new Set();
        this.websockets = new Map();
        this.configMap = new Map();
        this.sheetApi = new Map();
    }
    register(spreadSheetId, userAuthToken) {
        if (this.mp.has(spreadSheetId)) {
            return;
        }
        const oAuth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID);
        oAuth2Client.setCredentials({ access_token: userAuthToken });
        const sheetApi = googleapis_1.google.sheets({ version: "v4", auth: oAuth2Client });
        this.sheetApi.set(spreadSheetId, sheetApi);
        this.mp.add(spreadSheetId);
        this.websockets.set(spreadSheetId, new Websocket_1.WebSocketService());
        const websocket = this.websockets.get(spreadSheetId);
        if (!websocket)
            return;
        websocket.connect(() => {
            websocket.register(spreadSheetId, (data) => this.sendData(data, spreadSheetId, userAuthToken));
        });
    }
    setConfigs(spreadSheetId, sheetId, configs) {
        if (!this.mp.has(spreadSheetId))
            return;
        // TODO: get spreadsheet id and gid from the configs
        // compute active columns per sheet and update the websocket
        // single websocket per spreadsheet. every sheet inside the spreadsheet will share the same connection
        // hence active columns will be common across the spreadsheet
        this.configMap.set(spreadSheetId, configs);
        const websocket = this.websockets.get(spreadSheetId);
        if (!websocket)
            return;
        websocket.sendMessage({
            type: constants_1.ACTIVE_COLUMNS_CHANGED,
            requestType: constants_1.FETCH_CLIENT_POSITIONS,
            columns: configs.visibleCols,
            loginUser: "1001",
        });
        // now reset subscription ...
    }
    getAllSheets(spreadsheetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sheetApi = this.sheetApi.get(spreadsheetId);
            if (!sheetApi)
                return Promise.reject();
            try {
                const res = yield sheetApi.spreadsheets.get({
                    spreadsheetId,
                });
                const tabs = res.data.sheets.map((sheet) => {
                    return {
                        sheetId: sheet.properties.sheetId,
                        title: sheet.properties.title,
                    };
                });
                return Promise.resolve(tabs);
            }
            catch (err) {
                console.error("The API returned an error:", err);
                return Promise.reject(err);
            }
        });
    }
    sendData(data, spreadSheetId, userAuthToken) {
        const configs = this.configMap.get(spreadSheetId);
        const sheetApi = this.sheetApi.get(spreadSheetId);
        if (!configs || !sheetApi)
            return;
        // TODO: get active columns for the spreadsheet and send updates to all the sheets inside the spreadsheet
        // based on their active columns
        const range = `Sheet1!A1:${String.fromCharCode(65 + configs.visibleCols.length - 1)}${data.insert.length + 1}`; // Modify this to your desired range
        console.log("range:", range);
        const values = [configs.visibleCols];
        data.insert.forEach((row) => {
            values.push([]);
            configs.visibleCols.forEach((col) => {
                var _a;
                values[values.length - 1].push((_a = row[col]) !== null && _a !== void 0 ? _a : "");
            });
        });
        // The data you want to write to the spreadsheet
        sheetApi.spreadsheets.values.clear({
            spreadsheetId: spreadSheetId,
            range,
        });
        sheetApi.spreadsheets.values.update({
            spreadsheetId: spreadSheetId,
            range: range,
            valueInputOption: "RAW",
            resource: { values: values },
        }, (err, response) => {
            if (err) {
                console.error("The API returned an error:", err);
                return;
            }
            console.log("Data written to the spreadsheet:", response.data);
        });
    }
}
exports.SpreadSheetService = SpreadSheetService;
let spreadSheetServiceInstance = null;
const getSpreadSheetServiceInstance = () => {
    if (spreadSheetServiceInstance === null)
        spreadSheetServiceInstance = new SpreadSheetService();
    return spreadSheetServiceInstance;
};
exports.getSpreadSheetServiceInstance = getSpreadSheetServiceInstance;
