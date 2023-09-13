"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const cors = require('cors');
const { card, getSheetIdCard, getWelcomeCard } = require("./data");
const bodyParser = require("body-parser");
const { getSpreadSheetServiceInstance, } = require("./services/SpreadSheetService");
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
const PORT = process.env.PORT || 3000;
const spreadSheetService = getSpreadSheetServiceInstance();
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
    return res.json(getWelcomeCard(spreadsheetId));
});
app.post("/submit-gid", (req, res) => {
    const eventObject = req.body;
    console.log("req-body: ", eventObject);
    const sheetId = eventObject.commonEventObject.formInputs.sheetId.stringInputs.value[0];
    const spreadsheetId = eventObject.commonEventObject.formInputs.spreadsheetId.stringInputs
        .value[0];
    return res.json(getSheetIdCard(spreadsheetId, sheetId));
});
app.post("/home", (req, res) => {
    res.json({
        action: {
            navigations: [
                {
                    pushCard: card,
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
