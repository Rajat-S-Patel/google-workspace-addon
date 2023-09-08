import { IWebSocket } from "../Websocket";

const { v4: uuidv4 } = require("uuid");
const { WebSocketService } = require("../Websocket");
const { google } = require("googleapis");
const {ACTIVE_COLUMNS_CHANGED,FETCH_CLIENT_POSITIONS} = require('./constants');

export interface ISpreadSheetService {
  register(spreadSheetId: string, userAuthToken: string): void;
  setConfigs(spreadsheetId: string, configs: SheetConfigs): void;
}
export type AggFunc = [string, string];

export type OrderByType = "ASC" | "DSC";
export interface OrderBy {
  colId: string;
  orderByType: OrderByType;
}
export interface Filter {
  colId: string;
  filterType: FilterType;
  value:
    | string
    | number
    | Date
    | boolean
    | Array<string | number | Date | boolean>;
}
export type FilterType =
  | "<"
  | ">"
  | "<="
  | ">="
  | "=="
  | "!="
  | "is null"
  | "is not null"
  | "in"
  | "not in"
  | "begins with"
  | "ends with"
  | "contains"
  | "not contains";

export interface SheetConfigs {
  id: string;
  visibleCols: string[];
  functionCols: AggFunc[];
  groupBy: string[];
  splitBy: string[];
  orderBy: OrderBy[];
  filterBy: Filter[];
  dataSourceId: string;
}
// const API_KEY = "AIzaSyD9WUQouDmtP7Et4AqTJmTX2qV4F0yJzNU";
const CLIENT_ID =
  "277891092538-1l88abaphnnhp97fj8id48dpvq528khi.apps.googleusercontent.com";
const ACTIVE_COLUMNS = [
  "login",
  "symbol",
  "subbroker",
  "clientbalance",
  "clientfloatingpl",
  "clientplnet",
  "companyplnet",
];
class SpreadSheetService implements ISpreadSheetService {
  private mp: Set<string>;
  // private websocket: IWebSocket;
  private configMap: Map<string, SheetConfigs>;
  private websockets: Map<string, IWebSocket>;
  private sheets;
  constructor() {
    this.mp = new Set<string>();
    this.websockets = new Map<string, IWebSocket>();
    this.configMap = new Map<string, SheetConfigs>();
  }
  register(spreadSheetId: string, userAuthToken: string): void {
    if (this.mp.has(spreadSheetId)) {
      return;
    }
    this.mp.add(spreadSheetId);
    this.websockets.set(spreadSheetId, new WebSocketService());
    const websocket = this.websockets.get(spreadSheetId);
    if (!websocket) return;
    websocket.connect(() => {
      websocket.register(spreadSheetId, (data: any) =>
        this.sendData(data, spreadSheetId, userAuthToken)
      );
    });
  }
  setConfigs(spreadSheetId: string, configs: SheetConfigs) {
    if (!this.mp.has(spreadSheetId)) return;

    this.configMap.set(spreadSheetId, configs);
    const websocket = this.websockets.get(spreadSheetId);
    if (!websocket) return;
    websocket.sendMessage({
      type: ACTIVE_COLUMNS_CHANGED,
      requestType: FETCH_CLIENT_POSITIONS,
      columns: configs.visibleCols,
      loginUser: "1001",
    });
    // now reset subscription ...
  }
  private sendData(data: any, spreadSheetId: string, userAuthToken: string) {
    const configs = this.configMap.get(spreadSheetId);
    if(!configs) return;
    const range = `Sheet1!A1:${String.fromCharCode(65+configs.visibleCols.length-1)}${data.insert.length + 1}`; // Modify this to your desired range
    console.log("range:",range);
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID);
    oAuth2Client.setCredentials({ access_token: userAuthToken });
    this.sheets = google.sheets({ version: "v4", auth: oAuth2Client });
    const values = [configs.visibleCols];
    data.insert.forEach((row) => {
      values.push([]);
      configs.visibleCols.forEach((col) => {
        values[values.length - 1].push(row[col] ?? "");
      });
    });
    // The data you want to write to the spreadsheet

    this.sheets.spreadsheets.values.update(
      {
        spreadsheetId: spreadSheetId,
        range: range,
        valueInputOption: "RAW",
        resource: { values: values },
      },
      (err, response) => {
        if (err) {
          console.error("The API returned an error:", err);
          return;
        }
        console.log("Data written to the spreadsheet:", response.data);
      }
    );
  }
}
let spreadSheetServiceInstance: ISpreadSheetService | null = null;

const getSpreadSheetServiceInstance = () => {
  if (spreadSheetServiceInstance === null)
    spreadSheetServiceInstance = new SpreadSheetService();
  return spreadSheetServiceInstance;
};

module.exports = { SpreadSheetService, getSpreadSheetServiceInstance };
