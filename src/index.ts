import { ISpreadSheetService } from "./services/SpreadSheetService";

const express = require("express");
const { card, welcomeCard } = require("./data");
const bodyParser = require("body-parser");
const {
  getSpreadSheetServiceInstance,
} = require("./services/SpreadSheetService");

const app = express();

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
  console.log("userName:", userName, " Password: ", password);
  console.log("spreadSheetId: ", spreadsheetId);

  const subscriptionId = spreadSheetService.register(spreadsheetId);
  console.log("subscriptionId: ", subscriptionId);
  return res.json(welcomeCard);
});
app.post("/home", (req, res) => {
  console.log("home called post");
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

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
