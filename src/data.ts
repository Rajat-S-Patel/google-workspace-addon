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

module.exports = { card, welcomeCard };
export {card, welcomeCard};