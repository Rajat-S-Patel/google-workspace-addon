import { IWebSocket } from "../Websocket";
const axios = require("axios");

const { v4: uuidv4 } = require("uuid");
const { WebSocketService } = require("../Websocket");
const { google } = require("googleapis");

export interface ISpreadSheetService {
  register(spreadSheetId: string): string;
}

const API_KEY = "AIzaSyD9WUQouDmtP7Et4AqTJmTX2qV4F0yJzNU";

class SpreadSheetService implements ISpreadSheetService {
  private mp: Map<string, string>;
  private websocket: IWebSocket;
  private sheets;
  constructor() {
    this.mp = new Map<string, string>();
    this.websocket = new WebSocketService();
    this.websocket.connect();
    this.sheets = google.sheets({ version: "v4", auth: API_KEY });
  }
  register(spreadSheetId: string): string {
    const id = this.mp.get(spreadSheetId);
    if (id) {
      return id;
    }
    const subscriptionId = uuidv4();
    this.mp.set(spreadSheetId, subscriptionId);
    this.websocket.register(spreadSheetId, (data: any) =>
      this.sendData(data, spreadSheetId)
    );
    return subscriptionId;
  }
  sendData(data: any, spreadSheetId: string) {
    console.log("data: ", data, spreadSheetId);
    const range = "Sheet1!A1:B2"; // Modify this to your desired range

    // The data you want to write to the spreadsheet
    const values = [
      ["Value 1", "Value 2"],
      ["Value 3", "Value 4"],
    ];
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
