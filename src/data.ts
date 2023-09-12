const { cloneDeep } = require("lodash");
require("dotenv").config();
const CLIENT_URL = process.env.CLIENT_URL;
const card = {
  header: {
    title: "Oreka RMS",
    subtitle: "Spreadsheet Data",
    imageUrl: "https://google-workspace-addon.onrender.com/oreka-logo-50.png",
    imageType: "SQUARE",
    imageAltText: "Oreka-Logo",
  },
  sections: [
    {
      widgets: [
        {
          textParagraph: {
            text: "Welcome to Oreka RMS",
          },
        },
        {
          textInput: {
            name: "username",
            label: "Username",
          },
        },
        {
          textInput: {
            name: "password",
            label: "Password",
            type: "SINGLE_LINE",
          },
        },
        {
          textInput: {
            name: "spreadsheetId",
            label: "SpreadSheet Id",
          },
        },
        {
          buttonList: {
            buttons: [
              {
                text: "Sign In",
                onClick: {
                  action: {
                    function:
                      "https://google-workspace-addon.onrender.com/signIn",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  ],
  cardActions: [
    {
      actionLabel: "View Details",
      onClick: {
        action: {
          function: "handleCardAction",
        },
      },
    },
  ],
  name: "Home Card",
};
const welcomeCard = {
  renderActions: {
    action: {
      navigations: [
        {
          pushCard: {
            header: {
              title: "Welcome",
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: "You have successfully signed in!",
                    },
                  },
                  {
                    textInput: {
                      name: "spreadsheetId",
                      label: "SpreadSheet Id",
                      defaultValue:"",
                      disabled:true,
                      type:"SINGLE_LINE"
                    },
                  },
                  {
                    textInput: {
                      name: "sheetId",
                      label: "sheet gid",
                    },
                  },
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: "Submit",
                          onClick: {
                            action: {
                              function:
                                `${CLIENT_URL}/submit-gid`,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
            cardActions: [
              {
                actionLabel: "View Details",
                onClick: {
                  action: {
                    function: "handleCardAction",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  stateChanged: true,
};

const linkCard = {
  renderActions: {
    action: {
      navigations: [
        {
          pushCard: {
            header: {
              title: "Configure",
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: "Configure Sheet",
                    },
                  },
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: "Click to configure",
                          onClick: {
                            openLink: {
                              url: undefined,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
            cardActions: [
              {
                actionLabel: "View Details",
                onClick: {
                  action: {
                    function: "handleCardAction",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  stateChanged: true,
};


function getWelcomeCard(spreadSheetId: string) {
  const newCard = cloneDeep(welcomeCard);
  newCard.renderActions.action.navigations[0].pushCard.sections[0].widgets[1].textInput.defaultValue = `${spreadSheetId}`;
  return newCard;
}

function getSheetIdCard(spreadSheetId: string, sheetId: string) {
  const newCard = cloneDeep(linkCard);
  const orekaUrl = process.env.OREKA_URL;
  newCard.renderActions.action.navigations[0].pushCard.sections[0].widgets.push(
    {
      buttonList: {
        buttons: [
          {
            text: "Click to Configure",
            onClick: {
              openLink: {
                url: `${orekaUrl}/addon-configure/${spreadSheetId}?sheetId=${sheetId}`,
              },
            },
          },
        ],
      },
    }
  );
  return newCard;
}

module.exports = { card, getWelcomeCard, getSheetIdCard };
export { card, getWelcomeCard, getSheetIdCard };
