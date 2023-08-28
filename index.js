const express = require('express');
const { card } = require('./data');
const bodyParser = require('body-parser');
const app = express()
app.use(bodyParser.json());

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
app.post('/signIn',(req,res) => {
  console.log('signIn called');
  const eventObject = req.body;
  console.log("req-body: ",eventObject);
  console.log("formInputs: ",eventObject.commonEventObject.formInputs.username,eventObject.commonEventObject.formInputs.password);
  return res.send('SignIn called: ');
})
app.post('/home',(req,res) => {
    console.log('home called post');

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