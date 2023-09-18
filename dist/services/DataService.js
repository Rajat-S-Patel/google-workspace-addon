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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataServiceInstance = exports.DataService = void 0;
const workerpool_1 = __importDefault(require("workerpool"));
// every sheet inside a spreadsheet will need to be registered with dataservice
class DataService {
    constructor() {
        this.pool = workerpool_1.default.pool(__dirname + "/worker/DataWorker.js", {
            workerType: 'thread',
            maxWorkers: 50,
            onCreateWorker: () => console.log("worker created..."),
            onTerminateWorker: () => console.log("worker terminated..."),
            workerThreadOpts: {
                execArgv: ['--require', 'ts-node/register', '-r', 'tsconfig-paths/register']
            }
        });
    }
    process(configs, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = yield this.pool.exec("transformData", [configs, data]);
                    resolve(res);
                    this.pool.terminate();
                }
                catch (err) {
                    console.error("err: ", err);
                    reject("error");
                }
            }));
        });
    }
}
exports.DataService = DataService;
let dataServiceInstance = null;
const getDataServiceInstance = () => {
    if (dataServiceInstance === null)
        dataServiceInstance = new DataService();
    return dataServiceInstance;
};
exports.getDataServiceInstance = getDataServiceInstance;
