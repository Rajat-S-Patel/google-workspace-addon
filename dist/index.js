"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const data_1 = require("./data");
const body_parser_1 = __importDefault(require("body-parser"));
const SpreadSheetService_1 = require("./services/SpreadSheetService");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use(express_1.default.static("public"));
const PORT = process.env.PORT || 3000;
const spreadSheetService = (0, SpreadSheetService_1.getSpreadSheetServiceInstance)();
app.get("/", (req, res) => {
    console.log("root called");
    res.send("Hello World!");
});
app.get("/home", (req, res) => {
    console.log("home called");
    res.send("Home called");
});
app.post("/signIn", (req, res) => {
    console.log("signIn called");
    const eventObject = req.body;
    console.log("req-body: ", eventObject);
    const userName = eventObject.commonEventObject.formInputs.username.stringInputs.value[0];
    const password = eventObject.commonEventObject.formInputs.password.stringInputs.value[0];
    const spreadsheetId = eventObject.commonEventObject.formInputs.spreadsheetId.stringInputs
        .value[0];
    spreadSheetService.register(spreadsheetId, eventObject.authorizationEventObject.userOAuthToken);
    return res.json((0, data_1.getWelcomeCard)(spreadsheetId));
});
app.post("/submit-gid", (req, res) => {
    const eventObject = req.body;
    console.log("req-body: ", eventObject);
    const sheetId = eventObject.commonEventObject.formInputs.sheetId.stringInputs.value[0];
    const spreadsheetId = eventObject.commonEventObject.formInputs.spreadsheetId.stringInputs
        .value[0];
    return res.json((0, data_1.getSheetIdCard)(spreadsheetId, sheetId));
});
app.post("/home", (req, res) => {
    res.json({
        action: {
            navigations: [
                {
                    pushCard: data_1.card,
                },
            ],
        },
    });
});
app.post('/configs', (req, res) => {
    const data = req.body;
    console.log("data: ", data);
    spreadSheetService.setConfigs(data.spreadSheetId, data.sheetId, data.configs);
    res.send("Recieved configs");
});
app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
});
