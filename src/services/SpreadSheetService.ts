import { IWebSocket } from "../Websocket";
const axios = require("axios");

const { v4: uuidv4 } = require("uuid");
const { WebSocketService } = require("../Websocket");
const { google } = require("googleapis");

export interface ISpreadSheetService {
  register(spreadSheetId: string,userAuthToken:string): string;
}

// const API_KEY = "AIzaSyD9WUQouDmtP7Et4AqTJmTX2qV4F0yJzNU";
const CLIENT_ID = "277891092538-1l88abaphnnhp97fj8id48dpvq528khi.apps.googleusercontent.com";
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
  private mp: Map<string, string>;
  private websocket: IWebSocket;
  private sheets;
  constructor() {
    this.mp = new Map<string, string>();
    this.websocket = new WebSocketService();
    this.websocket.connect();
    
  }
  register(spreadSheetId: string,userAuthToken:string): string {
    const id = this.mp.get(spreadSheetId);
    if (id) {
      return id;
    }
    const subscriptionId = uuidv4();
    this.mp.set(spreadSheetId, subscriptionId);
    this.websocket.register(spreadSheetId, (data: any) =>
      this.sendData(data, spreadSheetId, userAuthToken)
    );
    return subscriptionId;
  }
  sendData(data: any, spreadSheetId: string,userAuthToken:string) {
    console.log("data: ", data, spreadSheetId);
    const range = `Sheet1!A1:G${data.insert.length+1}`; // Modify this to your desired range
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID);
    oAuth2Client.setCredentials({ access_token: userAuthToken });
    this.sheets = google.sheets({ version: "v4", auth: oAuth2Client });
    const values = [ACTIVE_COLUMNS];
    data.insert.forEach(row => {
      values.push([]);
      ACTIVE_COLUMNS.forEach(col => {
        values[values.length-1].push(row[col]??"");
      })
    });
    // The data you want to write to the spreadsheet
    
    this.sheets.spreadsheets.values.update({
      spreadsheetId: spreadSheetId,
      range: range,
      valueInputOption: 'RAW',
      resource: { values: values }
  }, (err, response) => {
      if (err) {
          console.error('The API returned an error:', err);
          return;
      }
      console.log('Data written to the spreadsheet:', response.data);
  });
  }
}
let spreadSheetServiceInstance: ISpreadSheetService | null = null;

const getSpreadSheetServiceInstance = () => {
  if (spreadSheetServiceInstance === null)
    spreadSheetServiceInstance = new SpreadSheetService();
  return spreadSheetServiceInstance;
};

module.exports = { SpreadSheetService, getSpreadSheetServiceInstance };
