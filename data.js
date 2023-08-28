const card = {
    header: {
      title:"Oreka RMS",
      subtitle:"Spreadsheet Data",
      imageUrl: "https://google-workspace-addon.onrender.com/oreka-logo-50.png",
      imageType:"SQUARE",
      imageAltText:"Oreka-Logo"
    },
    sections: [{
      widgets: [{
        textParagraph: {
          text: 'Welcome to Oreka RMS'
        }
      },
      {
        textInput: {
          name: "username",
          label: "Username"
        }
      },
      {
        "textInput": {
          "name": "password",
          "label": "Password",
          "type": "SINGLE_LINE"
        }
      },
      {
        "buttonList": {
          "buttons":[
            {
              "text":"Sign In",
              onClick:{
                action: {
                  function:"https://google-workspace-addon.onrender.com/signIn",
                  parameters: {
                    "username": "{{username.value}}",
                    "password": "{{password.value}}"
                  }
                }
              }
            }
          ]
        }
      }]
    }],
    cardActions: [{
      actionLabel:"View Details",
      onClick: {
        action: {
          function: "handleCardAction"
        }
      }
    }],
    name:"Home Card"
  };
  
  module.exports = {card};