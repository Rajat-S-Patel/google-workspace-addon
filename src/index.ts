import { IWebSocket } from "./Websocket";

const express = require("express");
const { card, welcomeCard } = require("./data");
const bodyParser = require("body-parser");
const { WebSocketService, IWebSocket } = require("./Websocket");

const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));
const PORT = process.env.PORT || 3000;

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
  const spreadsheetId =  eventObject.commonEventObject.formInputs.spreadsheetId.stringInputs.value[0];
  console.log("userName:", userName, " Password: ", password);
  console.log("spreadSheetId: ",eventObject.spreadSheetId);
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

const websocket:IWebSocket = new WebSocketService();
websocket.connect()

