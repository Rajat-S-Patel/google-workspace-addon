"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LZString = require('lz-string');
class MessageDecrypter {
    decrypt(message) {
        var result = LZString.decompressFromUTF16(message);
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
module.exports = MessageDecrypter;
