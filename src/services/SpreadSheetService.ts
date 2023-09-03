import { IWebSocket } from "../Websocket";
const axios = require('axios');

const { v4: uuidv4 } = require('uuid');
const { WebSocketService } = require("../Websocket");

export interface ISpreadSheetService {
  register(spreadSheetId:string):string;
}

class SpreadSheetService implements ISpreadSheetService {
  private mp:Map<string,string>;
  private websocket:IWebSocket;

  constructor() {
    this.mp = new Map<string,string>();
    this.websocket = new WebSocketService();
    this.websocket.connect();
  }
  register(spreadSheetId:string):string{
    const id = this.mp.get(spreadSheetId);
    if(id) {
      return id;
    }
    const subscriptionId = uuidv4();
    this.mp.set(spreadSheetId,subscriptionId);
    this.websocket.register(spreadSheetId,(data:any)=>this.sendData(data,spreadSheetId));
    return subscriptionId;
  }
  sendData(data:any,spreadSheetId:string) {
    console.log("data: ",data,spreadSheetId);
    // https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1!A1:D5?valueInputOption=VALUE_INPUT_OPTION
    axios.put(`https://sheets.googleapis.com/v4/spreadsheets/${spreadSheetId}/values/Sheet1!A1:D5?valueInputOption=RAW`,{
      "range": "Sheet1!A1:D5",
      "majorDimension": "ROWS",
      "values": [
        ["Item", "Cost", "Stocked", "Ship Date"],
        ["Wheel", "$20.50", "4", "3/1/2016"],
        ["Door", "$15", "2", "3/15/2016"],
        ["Engine", "$100", "1", "3/20/2016"],
        ["Totals", "=SUM(B2:B4)", "=SUM(C2:C4)", "=MAX(D2:D4)"]
      ],
    }).then(res => {
      console.log("response:",res);
    }).catch(err => {
      console.log("error: ",err);
    })
  }
}
let spreadSheetServiceInstance: ISpreadSheetService | null = null;

const getSpreadSheetServiceInstance = () => {
  if (spreadSheetServiceInstance === null)
    spreadSheetServiceInstance = new SpreadSheetService();
  return spreadSheetServiceInstance;
};

module.exports = { SpreadSheetService, getSpreadSheetServiceInstance };
