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
      sections: [{
        widgets: [{
          textParagraph: {
            text: 'Hello world'
          }
        }]
      }]
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