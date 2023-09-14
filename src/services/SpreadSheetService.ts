import { sheets_v4 } from "googleapis";
import { IWebSocket } from "../Websocket";
import { WebSocketService } from "../Websocket";
import { google } from "googleapis";
import { ACTIVE_COLUMNS_CHANGED, FETCH_CLIENT_POSITIONS } from "./constants";
import { config } from "dotenv";
config();
export interface ISpreadSheetService {
  register(userName:string,password:string,spreadSheetId: string, userAuthToken: string): void;
  setConfigs(
    spreadsheetId: string,
    sheetId: number,
    configs: SheetConfigs
  ): Promise<void>;
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
export type SheetDetails = {
  [sheetId: number]: SheetConfigs;
};
export type SheetMetaData = {
  sheetId:number;
  sheetName:string;
}

const CLIENT_ID = process.env.CLIENT_ID;
class SpreadSheetService implements ISpreadSheetService {
  private mp: Set<string>;
  // private websocket: IWebSocket;
  private configMap: Map<string, SheetDetails>;
  private websockets: Map<string, IWebSocket>;
  private sheetApi: Map<string, sheets_v4.Sheets>;
  private sheetMetaDataMap: Map<string,Map<number,SheetMetaData>>;

  constructor() {
    this.mp = new Set<string>();
    this.websockets = new Map<string, IWebSocket>();
    this.configMap = new Map<string, SheetDetails>();
    this.sheetApi = new Map<string, sheets_v4.Sheets>();
    this.sheetMetaDataMap = new Map<string,Map<number,SheetMetaData>>();
  }
  register(userName:string,password:string,spreadSheetId: string, userAuthToken: string): void {
    if (this.mp.has(spreadSheetId)) {
      return;
    }
    // create a websocket connection. single connection per spreadsheetId
    // if websocket connection is already created for specific spreadsheetId then ignore it
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID);
    oAuth2Client.setCredentials({ access_token: userAuthToken });
    const sheetApi = google.sheets({ version: "v4", auth: oAuth2Client });
    this.sheetApi.set(spreadSheetId, sheetApi);

    this.mp.add(spreadSheetId);
    this.websockets.set(spreadSheetId, new WebSocketService(userName,password));
    this.sheetMetaDataMap.set(spreadSheetId,new Map<number,SheetMetaData>());
    // const websocket = this.websockets.get(spreadSheetId);
    // if (!websocket) return;
    // websocket.connect(() => {
    //   websocket.register(spreadSheetId, (data: any) =>
    //     this.sendData(data, spreadSheetId, userAuthToken)
    //   );
    // });
  }
  async setConfigs(spreadSheetId: string, sheetId: number, configs: SheetConfigs) {
    if (!this.mp.has(spreadSheetId)) return;
    // TODO: get spreadsheet id and gid from the configs
    // compute active columns per sheet and update the websocket
    // single websocket per spreadsheet. every sheet inside the spreadsheet will share the same connection
    // hence active columns will be common across the spreadsheet
    const sheetsMetaData = this.sheetMetaDataMap.get(spreadSheetId);
    // if spreadsheetMetaData does not exist then spreadSheetId is invalid so return from here
    if(!sheetsMetaData) return;

    const sheetMetaData = sheetsMetaData.get(sheetId);
    if(!sheetMetaData) {
      // if sheet meta data doesn't exist then fetch it using API request
      try {
        const sheetMetaData = await this.getSheetMetaData(spreadSheetId,sheetId);
       sheetsMetaData.set(sheetId,sheetMetaData);
      } catch(err) {
        console.error("error:",err);
      }
    }
    
    const sheetDetails = this.configMap.get(spreadSheetId);
    if (!sheetDetails) {
      this.configMap.set(spreadSheetId, { [sheetId]: configs });
    } else {
      sheetDetails[sheetId] = configs;
    }
    // if unsubscribed  then subscribe to datasource
    // else update the subscription with new active columns

    const websocket = this.websockets.get(spreadSheetId);
    if (!websocket) return;
    
    if(websocket.isSubscribed(configs.dataSourceId)) {
      // if subscribed already then update active cols
      websocket.updateSubscription(configs.dataSourceId,configs.visibleCols,[]);
    }
    else {
      // subscribe to datasource
      websocket.subscribe(configs.dataSourceId,(data:any) => this.writeData(data,spreadSheetId,sheetId));
      websocket.updateSubscription(configs.dataSourceId,configs.visibleCols,[]);
    }
    // websocket.sendMessage({
    //   type: ACTIVE_COLUMNS_CHANGED,
    //   requestType: FETCH_CLIENT_POSITIONS,
    //   columns: configs.visibleCols,
    //   loginUser: "1001",
    // });
    // now reset subscription ...
  }
  private async getAllSheets(spreadsheetId: string) {
    const sheetApi = this.sheetApi.get(spreadsheetId);
    if (!sheetApi) return Promise.reject();

    try {
      const res = await sheetApi.spreadsheets.get({
        spreadsheetId,
      });
      const tabs:SheetMetaData[] = res.data.sheets.map((sheet) => {
        return {
          sheetId: sheet.properties.sheetId,
          sheetName: sheet.properties.title,
        };
      });
      return Promise.resolve(tabs);
    } catch (err) {
      console.error("The API returned an error:", err);
      return Promise.reject(err);
    }
  }
  private writeData(data:any,spreadsheetId:string,sheetId:number):void {
    const configs = this.configMap.get(spreadsheetId);
    const sheetApi = this.sheetApi.get(spreadsheetId);
    const spreadSheetMetaData = this.sheetMetaDataMap.get(spreadsheetId);
    if (!configs || !sheetApi || !spreadSheetMetaData) return;

    const sheetMetaData = spreadSheetMetaData.get(sheetId);
    if(!sheetMetaData) return;
    
    try {

      const range = `${sheetMetaData.sheetName}!A1:${String.fromCharCode(
        65 + configs[sheetId].visibleCols.length - 1
      )}${data.insert.length + 1}`;

      const values = [configs[sheetId].visibleCols];
      data.insert.forEach((row) => {
        values.push([]);
        configs[sheetId].visibleCols.forEach((col) => {
          values[values.length - 1].push(row[col] ?? "");
        });
      });

      (sheetApi as any).spreadsheets.values.update(
        {
          spreadsheetId,
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

    }catch(err) {
      console.error("error: ",err);
    }
  }
  private async getSheetMetaData(spreadSheetId:string,sheetId:number):Promise<SheetMetaData> {
    const sheets = await this.getAllSheets(spreadSheetId);
    const filteredRes = sheets.filter(sheet => sheet.sheetId === sheetId);
    if(filteredRes.length !== 1) return Promise.reject(`No sheet exists with id ${sheetId}`);
    return filteredRes[0];
  }
}
let spreadSheetServiceInstance: ISpreadSheetService | null = null;

const getSpreadSheetServiceInstance = () => {
  if (spreadSheetServiceInstance === null)
    spreadSheetServiceInstance = new SpreadSheetService();
  return spreadSheetServiceInstance;
};

export { SpreadSheetService, getSpreadSheetServiceInstance };
