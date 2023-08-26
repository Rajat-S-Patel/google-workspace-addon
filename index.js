const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000;
const card = require('./Card.json');

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
    res.json(card);
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})