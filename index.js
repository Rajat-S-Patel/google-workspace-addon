const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World!')
})
app.get('/home',(req,res) => {
    console.log('home called');
    res.send('Home called');
})
app.post('/home',(req,res) => {
    console.log('home called post');
    res.send('Home called Post');
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})