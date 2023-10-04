import { sheets_v4 } from "googleapis";
import { IWebSocket } from "../Websocket";
import { WebSocketService } from "../Websocket";
import { getDataServiceInstance } from "./DataService";
import { google } from "googleapis";
import A1 from "@flighter/a1-notation";
import { config } from "dotenv";

config();
export interface ISpreadSheetService {
  register(
    userName: string,
    password: string,
    spreadSheetId: string,
    userAuthToken: string
  ): void;
  setConfigs(
    spreadsheetId: string,
    sheetId: number,
    configs: SheetConfigs
  ): Promise<void>;
  getFormulaFromConfigs(configs: SheetConfigs): string;
  setConfigsFromFormula(
    spreadsheetId: string,
    sheetId: number,
    configs: FormulaConfigs
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
export interface FormulaConfigs {
  visibleCols: string;
  functionCols: string;
  groupBy: string;
  splitBy: string;
  orderBy: string;
  filterBy: string;
  dataSourceId: string;
  startCell:string;
}

export interface SheetConfigs {
  startCell: string;
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
  sheetId: number;
  sheetName: string;
};

const CLIENT_ID = process.env.CLIENT_ID;
const dataServiceInstance = getDataServiceInstance();
class SpreadSheetService implements ISpreadSheetService {
  private mp: Set<string>;
  // private websocket: IWebSocket;
  private configMap: Map<string, SheetDetails>;
  private websockets: Map<string, IWebSocket>;
  private sheetApi: Map<string, sheets_v4.Sheets>;
  private sheetMetaDataMap: Map<string, Map<number, SheetMetaData>>;

  constructor() {
    this.mp = new Set<string>();
    this.websockets = new Map<string, IWebSocket>();
    this.configMap = new Map<string, SheetDetails>();
    this.sheetApi = new Map<string, sheets_v4.Sheets>();
    this.sheetMetaDataMap = new Map<string, Map<number, SheetMetaData>>();
  }
  register(
    userName: string,
    password: string,
    spreadSheetId: string,
    userAuthToken: string
  ): void {
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
    this.websockets.set(
      spreadSheetId,
      new WebSocketService(userName, password)
    );
    this.sheetMetaDataMap.set(spreadSheetId, new Map<number, SheetMetaData>());
  }
  getFormulaFromConfigs(configs: SheetConfigs): string {
    configs.startCell = "A1";
    const groupBy = configs.groupBy.join(";");
    const splitBy = configs.splitBy.join(";");
    const visibleCols = configs.visibleCols.join(";");
    const functionCols = configs.functionCols
      .map((val) => val.join(":"))
      .join(";");
    const filterBy = configs.filterBy
      .map((val) => Object.values(val).join(":"))
      .join(";");
    const orderBy = configs.orderBy
      .map((val) => Object.values(val).join(":"))
      .join(";");
    const formula = `FetchData("${configs.startCell}","${configs.dataSourceId}","${visibleCols}","${groupBy}","${functionCols}","${filterBy}","${orderBy}","${splitBy}")`;
    console.info("formula:", formula);
    return formula;
  }
  async setConfigs(
    spreadSheetId: string,
    sheetId: number,
    configs: SheetConfigs
  ) {
    if (!this.mp.has(spreadSheetId)) return;
    // TODO: get spreadsheet id and gid from the configs
    // compute active columns per sheet and update the websocket
    // single websocket per spreadsheet. every sheet inside the spreadsheet will share the same connection
    // hence active columns will be common across the spreadsheet
    const sheetsMetaData = this.sheetMetaDataMap.get(spreadSheetId);
    // if spreadsheetMetaData does not exist then spreadSheetId is invalid so return from here
    if (!sheetsMetaData) return;

    const sheetMetaData = sheetsMetaData.get(sheetId);
    if (!sheetMetaData) {
      // if sheet meta data doesn't exist then fetch it using API request
      try {
        const sheetMetaData = await this.getSheetMetaData(
          spreadSheetId,
          sheetId
        );
        // const sheetMetaData: SheetMetaData = {
        //   sheetId,
        //   sheetName: "Sheet1",
        // };
        sheetsMetaData.set(sheetId, sheetMetaData);
      } catch (err) {
        console.error("error:", err);
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

    if (websocket.isSubscribed(configs.dataSourceId)) {
      // if subscribed already then update active cols
      websocket.updateSubscription(
        configs.dataSourceId,
        configs.visibleCols,
        []
      );
    } else {
      // subscribe to datasource
      websocket.subscribe(configs.dataSourceId, (data: any) =>
        this.writeData(data, spreadSheetId, configs.dataSourceId)
      );
      websocket.updateSubscription(
        configs.dataSourceId,
        configs.visibleCols,
        []
      );
    }
    // now reset subscription ...
  }
  private async getAllSheets(spreadsheetId: string) {
    const sheetApi = this.sheetApi.get(spreadsheetId);
    if (!sheetApi) return Promise.reject();

    try {
      const res = await sheetApi.spreadsheets.get({
        spreadsheetId,
      });
      const tabs: SheetMetaData[] = res.data.sheets.map((sheet) => {
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
  private writeData(
    data: any,
    spreadsheetId: string,
    dataSouceId: string
  ): void {
    const configs = this.configMap.get(spreadsheetId);
    // single spreadSheet have multiple sheets
    // multiple datasource for single spreadsheet
    // for each sheet in spreadsheet, fetch the configs and if datasource matches then only send the data

    const spreadSheetMetaData = this.sheetMetaDataMap.get(spreadsheetId);
    if (!configs || !spreadSheetMetaData) return;

    spreadSheetMetaData.forEach((sheet, sheetId) => {
      const sheetConfig = configs[sheetId];
      if (!sheetConfig || sheetConfig.dataSourceId !== dataSouceId) return;
      dataServiceInstance
        .process(sheetConfig, data.insert)
        .then((transformedData: any[]) => {
          console.log("transformedData: ", transformedData);
          this.sendData(sheet, sheetConfig, transformedData, spreadsheetId);
        });
    });
  }
  private sendData(
    sheet: SheetMetaData,
    sheetConfig: SheetConfigs,
    data: any[],
    spreadsheetId: string
  ) {
    const sheetApi = this.sheetApi.get(spreadsheetId);
    if (!sheetApi || data.length === 0) return;

    const initialCol = A1.getCol(sheetConfig.startCell)-1;
    const initialRow = A1.getRow(sheetConfig.startCell)-1;
    const colLen = A1.toCol(sheetConfig.visibleCols.length + initialCol);

    const range = `${sheet.sheetName}!${sheetConfig.startCell}:${colLen}${data.length + 1 + initialRow}`;
    console.log("range=datalength: ",range,data.length);
    const visibleCols = new Set<string>(sheetConfig.visibleCols);
    const headerCols = [];
    Object.keys(data[0]).forEach((key) => {
      if (visibleCols.has(key)) headerCols.push(key);
    });
    const values = [headerCols];
    data.forEach((row) => {
      values.push([]);
      headerCols.forEach((col) => {
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
  }
  private async getSheetMetaData(
    spreadSheetId: string,
    sheetId: number
  ): Promise<SheetMetaData> {
    const sheets = await this.getAllSheets(spreadSheetId);
    console.log("sheets: ", sheets, sheets[0].sheetId === sheetId, sheetId);
    const filteredRes = sheets.filter((sheet) => sheet.sheetId === sheetId);
    if (filteredRes.length !== 1)
      return Promise.reject(`No sheet exists with id ${sheetId}`);
    return filteredRes[0];
  }
  async setConfigsFromFormula(
    spreadsheetId: string,
    sheetId: number,
    configs: FormulaConfigs
  ): Promise<void> {
    const sheetConfigs: SheetConfigs =
      this.getConfigsFromFormulaConfigs(configs);
    console.log("sheetConfigs:", sheetConfigs);
    await this.setConfigs(spreadsheetId, sheetId, sheetConfigs);
  }
  private getConfigsFromFormulaConfigs(configs: FormulaConfigs): SheetConfigs {
    const groupBy = configs.groupBy.split(";").filter((val) => val.length > 0);
    const visibleCols = configs.visibleCols
      .split(";")
      .filter((val) => val.length > 0);
    const splitBy = configs.splitBy.split(";").filter((val) => val.length > 0);
    const functionCols: AggFunc[] = configs.functionCols
      .split(";")
      .filter((val) => val.length > 0)
      .map((val) => {
        const [col, fnType] = val.split(":");
        return [col, fnType];
      });
    const filterBy: Filter[] = configs.filterBy
      .split(";")
      .filter((val) => val.length > 0)
      .map((val) => {
        const [colId, filterType, value] = val.split(":");
        return { colId, filterType: filterType as FilterType, value };
      });
    const orderBy: OrderBy[] = configs.orderBy
      .split(";")
      .filter((val) => val.length > 0)
      .map((val) => {
        const [colId, orderByType] = val.split(":");
        return { colId, orderByType: orderByType as OrderByType };
      });
    return {
      groupBy,
      dataSourceId: configs.dataSourceId,
      filterBy,
      functionCols,
      orderBy,
      splitBy,
      visibleCols,
      startCell: configs.startCell,
    };
  }
}
let spreadSheetServiceInstance: ISpreadSheetService | null = null;

const getSpreadSheetServiceInstance = () => {
  if (spreadSheetServiceInstance === null)
    spreadSheetServiceInstance = new SpreadSheetService();
  return spreadSheetServiceInstance;
};

export { SpreadSheetService, getSpreadSheetServiceInstance };
