require('dotenv').config()
const express = require("express")
const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_HOST
});

const app = express();
app.use(express.json())

app.get("/", (req, res) => { {
  res.send ("Hello world...")
})

const port = process.env.PORT
app.listen(port, () => { {
  console.log(`Server started (http://localhost:${port}/) !`)
})