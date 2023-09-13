import { sheets_v4 } from "googleapis";
import { IWebSocket } from "../Websocket";


const { WebSocketService } = require("../Websocket");
import {google} from 'googleapis';

const {
  ACTIVE_COLUMNS_CHANGED,
  FETCH_CLIENT_POSITIONS,
} = require("./constants");

export interface ISpreadSheetService {
  register(spreadSheetId: string, userAuthToken: string): void;
  setConfigs(spreadsheetId: string,sheetId:string, configs: SheetConfigs): void;
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
const GID = "0";
class SpreadSheetService implements ISpreadSheetService {
  private mp: Set<string>;
  // private websocket: IWebSocket;
  private configMap: Map<string, SheetConfigs>;
  private websockets: Map<string, IWebSocket>;
  private sheetApi: Map<string, sheets_v4.Sheets>;

  constructor() {
    this.mp = new Set<string>();
    this.websockets = new Map<string, IWebSocket>();
    this.configMap = new Map<string, SheetConfigs>();
    this.sheetApi = new Map<string, sheets_v4.Sheets>();
  }
  register(spreadSheetId: string, userAuthToken: string): void {
    if (this.mp.has(spreadSheetId)) {
      return;
    }

    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID);
    oAuth2Client.setCredentials({ access_token: userAuthToken });
    const sheetApi = google.sheets({ version: "v4", auth: oAuth2Client });
    this.sheetApi.set(spreadSheetId, sheetApi);

    this.mp.add(spreadSheetId);
    this.websockets.set(spreadSheetId, new WebSocketService());
    const websocket = this.websockets.get(spreadSheetId);
    if (!websocket) return;
    websocket.connect(() => {
      websocket.register(spreadSheetId, (data: any) =>
        this.sendData(data, spreadSheetId,userAuthToken)
      );
    });
  }
  setConfigs(spreadSheetId: string, sheetId:string, configs: SheetConfigs) {
    if (!this.mp.has(spreadSheetId)) return;
    // TODO: get spreadsheet id and gid from the configs
    // compute active columns per sheet and update the websocket
    // single websocket per spreadsheet. every sheet inside the spreadsheet will share the same connection
    // hence active columns will be common across the spreadsheet
    
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
  private async getAllSheets(spreadsheetId: string) {
    const sheetApi = this.sheetApi.get(spreadsheetId);
    if (!sheetApi) return Promise.reject();

    try {
      const res = await sheetApi.spreadsheets.get({
        spreadsheetId,
      });
      const tabs = res.data.sheets.map((sheet) => {
        return {
          sheetId: sheet.properties.sheetId,
          title: sheet.properties.title,
        };
      });
      return Promise.resolve(tabs);
    } catch (err) {
      console.error("The API returned an error:", err);
      return Promise.reject(err);
    }
  }
  private sendData(data: any, spreadSheetId: string, userAuthToken:string) {
    const configs = this.configMap.get(spreadSheetId);
    const sheetApi = this.sheetApi.get(spreadSheetId);
    if (!configs || !sheetApi) return;
    // TODO: get active columns for the spreadsheet and send updates to all the sheets inside the spreadsheet
    // based on their active columns

    const range = `Sheet1!A1:${String.fromCharCode(
      65 + configs.visibleCols.length - 1
    )}${data.insert.length + 1}`; // Modify this to your desired range
    console.log("range:", range);
    
    const values = [configs.visibleCols];
    data.insert.forEach((row) => {
      values.push([]);
      configs.visibleCols.forEach((col) => {
        values[values.length - 1].push(row[col] ?? "");
      });
    });
    // The data you want to write to the spreadsheet
    sheetApi.spreadsheets.values.clear({
      spreadsheetId: spreadSheetId,
      range,
    });
    (sheetApi as any).spreadsheets.values.update(
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
