import { ISpreadSheetService } from "./services/SpreadSheetService";
import express from "express";
import cors from "cors";
import { card, getSheetIdCard, getWelcomeCard } from "./data";
import bodyParser from "body-parser";
import { getSpreadSheetServiceInstance } from "./services/SpreadSheetService";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const spreadSheetService: ISpreadSheetService = getSpreadSheetServiceInstance();

app.get("/", (req, res) => {
  console.log("root called");
  res.send("Hello World!");
});

app.get("/home", (req, res) => {
  console.log("home called");
  res.send("Home called");
});
app.post("/client-signin", (req, res) => {
  console.log("signIn called: ", req.body);
  // verify credentials and send the auth token back to client
  const { userName, password, spreadsheetId, oauthToken } = req.body;
  spreadSheetService.register(userName,password,spreadsheetId,oauthToken);
  return res.status(200).end();
});
app.post("/signIn", (req, res) => {
  console.log("signIn called");
  const eventObject = req.body;
  console.log("req-body: ", eventObject);
  const userName =
    eventObject.commonEventObject.formInputs.username.stringInputs.value[0];
  const password =
    eventObject.commonEventObject.formInputs.password.stringInputs.value[0];
  const spreadsheetId =
    eventObject.commonEventObject.formInputs.spreadsheetId.stringInputs
      .value[0];

  spreadSheetService.register(
    userName,
    password,
    spreadsheetId,
    eventObject.authorizationEventObject.userOAuthToken
  );
  return res.json(getWelcomeCard(spreadsheetId));
});

app.post("/submit-gid", (req, res) => {
  const eventObject = req.body;
  console.log("req-body: ", eventObject);
  const sheetId =
    eventObject.commonEventObject.formInputs.sheetId.stringInputs.value[0];
  const spreadsheetId =
    eventObject.commonEventObject.formInputs.spreadsheetId.stringInputs
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

app.post("/configs", (req, res) => {
  const data = req.body;
  console.log("data: ", data);
  spreadSheetService.setConfigs(
    data.spreadSheetId,
    Number(data.sheetId),
    data.configs
  );
  res.send("Recieved configs");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
