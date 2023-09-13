import  LZString from "lz-string";
export interface IMessageEncryptDecrypter {
    decrypt: (message: string) => string;
    encrypt: (message: Map<string, any>) => string;
}


class MessageDecrypter implements IMessageEncryptDecrypter {
    decrypt(message: string) {
        var result = LZString.decompressFromUTF16(message)
        if (result != undefined)
            return JSON.parse(result)
        return undefined
    }
    encrypt(message: any) {
        if (message instanceof Map) {
            const msg = JSON.stringify(mapToObj(message));
            return msg;
        } else {
            return JSON.stringify(message);
        }
    }
}

function mapToObj(map: Map<string, any>) {
    const obj: any = {}
    for (let [k, v] of map)
        obj[k] = v
    return obj
}

export default MessageDecrypter;