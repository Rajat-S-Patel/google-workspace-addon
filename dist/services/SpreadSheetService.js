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
const DataService_1 = require("./DataService");
const googleapis_1 = require("googleapis");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const CLIENT_ID = process.env.CLIENT_ID;
const dataServiceInstance = (0, DataService_1.getDataServiceInstance)();
class SpreadSheetService {
    constructor() {
        this.mp = new Set();
        this.websockets = new Map();
        this.configMap = new Map();
        this.sheetApi = new Map();
        this.sheetMetaDataMap = new Map();
    }
    register(userName, password, spreadSheetId, userAuthToken) {
        if (this.mp.has(spreadSheetId)) {
            return;
        }
        // create a websocket connection. single connection per spreadsheetId
        // if websocket connection is already created for specific spreadsheetId then ignore it
        const oAuth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID);
        oAuth2Client.setCredentials({ access_token: userAuthToken });
        const sheetApi = googleapis_1.google.sheets({ version: "v4", auth: oAuth2Client });
        this.sheetApi.set(spreadSheetId, sheetApi);
        this.mp.add(spreadSheetId);
        this.websockets.set(spreadSheetId, new Websocket_1.WebSocketService(userName, password));
        this.sheetMetaDataMap.set(spreadSheetId, new Map());
    }
    setConfigs(spreadSheetId, sheetId, configs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.mp.has(spreadSheetId))
                return;
            // TODO: get spreadsheet id and gid from the configs
            // compute active columns per sheet and update the websocket
            // single websocket per spreadsheet. every sheet inside the spreadsheet will share the same connection
            // hence active columns will be common across the spreadsheet
            const sheetsMetaData = this.sheetMetaDataMap.get(spreadSheetId);
            // if spreadsheetMetaData does not exist then spreadSheetId is invalid so return from here
            if (!sheetsMetaData)
                return;
            const sheetMetaData = sheetsMetaData.get(sheetId);
            if (!sheetMetaData) {
                // if sheet meta data doesn't exist then fetch it using API request
                try {
                    // const sheetMetaData = await this.getSheetMetaData(
                    //   spreadSheetId,
                    //   sheetId
                    // );
                    const sheetMetaData = {
                        sheetId,
                        sheetName: "Sheet1",
                    };
                    sheetsMetaData.set(sheetId, sheetMetaData);
                }
                catch (err) {
                    console.error("error:", err);
                }
            }
            const sheetDetails = this.configMap.get(spreadSheetId);
            if (!sheetDetails) {
                this.configMap.set(spreadSheetId, { [sheetId]: configs });
            }
            else {
                sheetDetails[sheetId] = configs;
            }
            // if unsubscribed  then subscribe to datasource
            // else update the subscription with new active columns
            const websocket = this.websockets.get(spreadSheetId);
            if (!websocket)
                return;
            if (websocket.isSubscribed(configs.dataSourceId)) {
                // if subscribed already then update active cols
                websocket.updateSubscription(configs.dataSourceId, configs.visibleCols, []);
            }
            else {
                // subscribe to datasource
                websocket.subscribe(configs.dataSourceId, (data) => this.writeData(data, spreadSheetId, configs.dataSourceId));
                websocket.updateSubscription(configs.dataSourceId, configs.visibleCols, []);
            }
            // now reset subscription ...
        });
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
                        sheetName: sheet.properties.title,
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
    writeData(data, spreadsheetId, dataSouceId) {
        const configs = this.configMap.get(spreadsheetId);
        // single spreadSheet have multiple sheets
        // multiple datasource for single spreadsheet
        // for each sheet in spreadsheet, fetch the configs and if datasource matches then only send the data
        const spreadSheetMetaData = this.sheetMetaDataMap.get(spreadsheetId);
        if (!configs || !spreadSheetMetaData)
            return;
        spreadSheetMetaData.forEach((sheet, sheetId) => {
            const sheetConfig = configs[sheetId];
            if (!sheetConfig || sheetConfig.dataSourceId !== dataSouceId)
                return;
            dataServiceInstance
                .process(sheetConfig, data.insert)
                .then((transformedData) => {
                this.sendData(sheet, sheetConfig, transformedData, spreadsheetId);
            });
        });
    }
    sendData(sheet, sheetConfig, data, spreadsheetId) {
        const sheetApi = this.sheetApi.get(spreadsheetId);
        if (!sheetApi)
            return;
        const range = `${sheet.sheetName}!A1:${String.fromCharCode(65 + sheetConfig.visibleCols.length - 1)}${data.length + 1}`;
        const values = [sheetConfig.visibleCols];
        data.forEach((row) => {
            values.push([]);
            sheetConfig.visibleCols.forEach((col) => {
                var _a;
                values[values.length - 1].push((_a = row[col]) !== null && _a !== void 0 ? _a : "");
            });
        });
        sheetApi.spreadsheets.values.update({
            spreadsheetId,
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
    getSheetMetaData(spreadSheetId, sheetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sheets = yield this.getAllSheets(spreadSheetId);
            console.log("sheets: ", sheets, sheets[0].sheetId === sheetId, sheetId);
            const filteredRes = sheets.filter((sheet) => sheet.sheetId === sheetId);
            if (filteredRes.length !== 1)
                return Promise.reject(`No sheet exists with id ${sheetId}`);
            return filteredRes[0];
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
