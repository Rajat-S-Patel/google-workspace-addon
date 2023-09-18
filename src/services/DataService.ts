import workerpool, {WorkerPool} from "workerpool";
import { SheetConfigs } from "./SpreadSheetService";
export type Callback = (transformedData:any[]) => void;
export interface IDataService {
    process(configs:SheetConfigs,data:any[]):Promise<any[]>;
}
// every sheet inside a spreadsheet will need to be registered with dataservice
class DataService implements IDataService  {
    private pool:WorkerPool;
    constructor() {
      this.pool = workerpool.pool(__dirname+"/worker/DataWorker.ts",  {
        workerType: 'thread',
        maxWorkers:50,
        onCreateWorker:() => console.log("worker created..."),
        onTerminateWorker:() => console.log("worker terminated..."),
        workerThreadOpts: {
          execArgv: ['--require', 'ts-node/register', '-r', 'tsconfig-paths/register']
        }
      });
    }
    async process(configs:SheetConfigs,data:any[]): Promise<any[]> {
      return new Promise(async (resolve,reject) => {
        try {  
          const res = await this.pool.exec("transformData",[configs,data]);
          resolve(res);
          this.pool.terminate()
          
        } catch(err) {
          console.error("err: ",err);
          reject("error");
        }
      })
    }
}
let dataServiceInstance: IDataService | null = null;

const getDataServiceInstance = () => {
  if (dataServiceInstance === null)
  dataServiceInstance = new DataService();
  return dataServiceInstance;
};


export { DataService, getDataServiceInstance };
