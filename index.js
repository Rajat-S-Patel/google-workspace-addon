const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000;

app.use(express.static('public'))

app.get('/', (req, res) => {
    console.log('root called');
  res.send('Hello World!')
})
app.get('/home',(req,res) => {
    console.log('home called');
    res.send('Home called');
})
app.post('/home',(req,res) => {
    console.log('home called post');
    let card = {
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
        }]
      }],
      cardActions: {
        actionLabel:"View Details",
        onClick: {
          action: {
            function: "handleCardAction"
          }
        }
      },
      name:"Home Card"
    };
    res.json({
      action: {
        navigations: [{
          pushCard:  card
        }]
      }
    });
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})