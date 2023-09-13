"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lz_string_1 = __importDefault(require("lz-string"));
class MessageDecrypter {
    decrypt(message) {
        var result = lz_string_1.default.decompressFromUTF16(message);
        if (result != undefined)
            return JSON.parse(result);
        return undefined;
    }
    encrypt(message) {
        if (message instanceof Map) {
            const msg = JSON.stringify(mapToObj(message));
            return msg;
        }
        else {
            return JSON.stringify(message);
        }
    }
}
function mapToObj(map) {
    const obj = {};
    for (let [k, v] of map)
        obj[k] = v;
    return obj;
}
exports.default = MessageDecrypter;
