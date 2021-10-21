require("dotenv").config()
const { Pool } = require("pg")
const express = require("express")
const bcrypt = require("bcryptjs")
const cors = require("cors")

const { PORT, DB_PORT } = process.env
const { USERSDB_USERNAME, USERSDB_PASSWORD, USERSDB_HOST, USERSDB_DB } =
    process.env
const { WBDB_USERNAME, WBDB_PASSWORD, WBDB_HOST, WBDB_DB } = process.env

// const usersPool = new Pool({
//     user: USERSDB_USERNAME,
//     host: USERSDB_HOST,
//     database: USERSDB_DB,
//     password: USERSDB_PASSWORD,
//     port: DB_PORT,
// })

const usersPool = new Pool({
    connectionString:
        "postgres://wvaqhyzu:XY_8USt0r719EGGeJAIWFUBkTehInMEX@surus.db.elephantsql.com/wvaqhyzu",
})
// Do we need to make a history pool or can we reuse users Pool (the links are identical)?
const historyPool = new Pool({
    connectionString:
        "postgres://wvaqhyzu:XY_8USt0r719EGGeJAIWFUBkTehInMEX@surus.db.elephantsql.com/wvaqhyzu",
})

const worldBankPool = new Pool({
    user: WBDB_USERNAME,
    host: WBDB_HOST,
    database: WBDB_DB,
    password: WBDB_PASSWORD,
    port: DB_PORT,
    ssl: true,
})

// Create views
createThetaView()

const app = express()
app.use(express.json())
app.use(cors())

app.get("/", (req, res) => {
    res.send("Hello world...")
})

app.get("/allData", async (req, res) => {
    const client = await worldBankPool.connect()
    const getAllData = `SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM Theta_View ORDER BY CountryName ASC LIMIT 3`
    const queryResult = await client.query(getAllData, [])
    res.send(queryResult.rows)
    res.status(200)
    client.release()
})

app.get("/search/:countryCode", async (req, res) => {
    const client = await worldBankPool.connect()
    const countryCode = req.params.countryCode
    const getAllData =
        "SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM Theta_View WHERE CountryCode = $1 ORDER BY Year ASC LIMIT 3"
    const queryResult = await client.query(getAllData, [countryCode])
    res.send(queryResult.rows)
    res.status(200)
    client.release()
})

app.get("/search/:countryCode/:indicatorCode", async (req, res) => {
    const client = await worldBankPool.connect()
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
    const client = await worldBankPool.connect()
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

    const salt = await bcrypt.genSalt()
    const hashedPass = await bcrypt.hash(password, salt)

    const client = await usersPool.connect()
    const insertUserQuery =
        "INSERT INTO users (email, hashed_password, salt) values ($1, $2, $3);"
    const queryResult = await client
        .query(insertUserQuery, [email, hashedPass, salt])
        .catch((error) => {
            res.send(error)
        })
    res.send(queryResult)
    res.status(200)
    client.release()
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body
    const client = await usersPool.connect()
    const getAllData = "SELECT hashed_password FROM users WHERE email = $1"
    let passwordsAreEqual
    client
        .query(getAllData, [email])
        .then(async (queryResult) => {
            let [hashedPass] = queryResult.rows
            hashedPass = hashedPass.hashed_password
            passwordsAreEqual = await bcrypt.compare(password, hashedPass)
            if (passwordsAreEqual) {
                res.send("success")
                res.status(200)
            } else {
                res.send("Password is invalid")
                res.status(400)
            }
        })
        .catch((error) => {
            console.log("error found")
            console.log(error)
            res.send({ error })
            res.status(500)
        })
    client.release()
})

app.get("/history", async (req, res) => {
    const { user_id } = req.body
    const client = await historyPool.connect()
    let getAllHistory
    user_id === undefined //or admin ID no.
        ? (getAllHistory = "SELECT * FROM history") //May need to limit this later
        : (getAllHistory = "SELECT * FROM history WHERE user_id= $1")
    const queryResult = await client
        .query(getAllHistory)
        .catch((error) => console.log("ERROR BRO! " + error))
    res.send(queryResult.rows)
    res.status(200)
    client.release()
})

app.get("/username/:userId", async (req, res) => {
    const user_id = req.params.userId
    console.log("userid is...")
    console.log(user_id)
    if (user_id === "undefined" || undefined) {
        res.send("Error")
        res.status(400)
    }
    const client = await historyPool.connect()
    const getUsername = "SELECT email FROM users WHERE user_id = $1"
    const queryResult = await client
        .query(getUsername, [user_id])
        .catch((error) => console.log("ERROR BRO! " + error))
    if (user_id !== undefined || "undefined") {
        res.send(queryResult.rows)
        res.status(200)
    }
    client.release()
})

app.listen(PORT, () => {
    console.log(`Server started (http://localhost:${PORT}/) !`)
})

async function createThetaView() {
    const client = await worldBankPool.connect()
    const generateThetaView = `CREATE OR REPLACE VIEW Theta_View AS SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM indicators`
    await client.query(generateThetaView, [])
    client.release()
}
