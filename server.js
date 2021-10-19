require("dotenv").config()
const { Pool } = require("pg")
const express = require("express")
const bcrypt = require("bcryptjs")
const cors = require("cors")


const { PORT, DB_PORT } = process.env
const { USERSDB_USERNAME, USERSDB_PASSWORD, USERSDB_HOST, USERSDB_DB } =
    process.env
const { WBDB_USERNAME, WBDB_PASSWORD, WBDB_HOST, WBDB_DB } = process.env

const usersPool = new Pool({
    user: USERSDB_USERNAME,
    host: USERSDB_HOST,
    database: USERSDB_DB,
    password: USERSDB_PASSWORD,
    port: DB_PORT,
})

const worldBankPool = new Pool({
    user: WBDB_USERNAME,
    host: WBDB_HOST,
    database: WBDB_DB,
    password: WBDB_PASSWORD,
    port: DB_PORT,
})

// Create views
createCountriesView()

//

const app = express()
app.use(express.json())
app.use(cors())

app.get("/", (req, res) => {
    res.send("Hello world...")
})

app.get("/allData", async (req, res) => {
    const client = await pool.connect()
    const getAllData = `SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM Theta_View ORDER BY CountryName ASC LIMIT 3`
    const queryResult = await client.query(getAllData, [])
    res.send(queryResult.rows)
    res.status(200)
    client.release()
})

app.get("/search/:countryCode", async (req, res) => {
    const client = await pool.connect()
    const countryCode = req.params.countryCode
    const getAllData =
        "SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM Theta_View WHERE CountryCode = $1 ORDER BY Year ASC LIMIT 3"
    const queryResult = await client.query(getAllData, [countryCode])
    res.send(queryResult.rows)
    res.status(200)
    client.release()
})

app.get("/search/:countryCode/:indicatorCode", async (req, res) => {
    const client = await pool.connect()
    const countryCode = req.params.countryCode
    const indicatorCode = req.params.indicatorCode.replaceAll("_", ".")
    const getAllData =
        "SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM Theta_View WHERE CountryCode = $1 AND IndicatorCode = $2 ORDER BY Year ASC LIMIT 3"
    const queryResult = await client.query(getAllData, [
        countryCode,
        indicatorCode,
    ])
    res.send(queryResult.rows)
    res.status(200)
    client.release()
})

app.get("/search/:countryCode/:indicatorCode/:year", async (req, res) => {
    const client = await pool.connect()
    const countryCode = req.params.countryCode
    const indicatorCode = req.params.indicatorCode.replaceAll("_", ".")
    const year = req.params.year
    const getAllData =
        "SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM Theta_View WHERE CountryCode = $1 AND IndicatorCode = $2 AND Year = $3"
    const queryResult = await client.query(getAllData, [
        countryCode,
        indicatorCode,
        year,
    ])
    res.send(queryResult.rows)
    res.status(200)
    client.release()
})

app.post("/signup", async (req, res) => {
    const { email, password, confirmPassword } = req.body
    console.log(email, password, confirmPassword)
    const salt = await bcrypt.genSalt()
    const hashedPass = await bcrypt.hash(password, salt)
    res.send("Working...")
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body
    console.log(email, password, confirmPassword)
    res.send("Working...")
})

app.listen(PORT, () => {
    console.log(`Server started (http://localhost:${PORT}/) !`)
})

async function createThetaView() {
    const generateThetaView = `CREATE OR REPLACE VIEW Theta_View AS SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM indicators`
    await client.query(generateThetaView, [])
}
