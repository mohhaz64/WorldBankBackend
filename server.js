require("dotenv").config()
const { Pool } = require("pg")
const express = require("express")
const bcrypt = require("bcryptjs")
const cors = require("cors")

const validation = require("./Middleware/validation")
const userLoginSchema = require("./Validation/userLoginValidation")
const userSignUpSchema = require("./Validation/userSignUpValidation")

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
    res.send(queryResult.rows).status(200)
    client.release()
})

app.get("/search/:countryCode", async (req, res) => {
    const client = await worldBankPool.connect()
    const countryCode = req.params.countryCode
    const getAllData =
        "SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM Theta_View WHERE CountryCode = $1 ORDER BY Year ASC LIMIT 3"
    const queryResult = await client.query(getAllData, [countryCode])
    res.send(queryResult.rows).status(200)
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
    res.send(queryResult.rows).status(200)
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
    res.send(queryResult.rows).status(200)
    client.release()
})

app.post("/signup", validation(userSignUpSchema), async (req, res) => {
    const { email, password, confirmPassword } = req.body

    const salt = await bcrypt.genSalt()
    const hashedPass = await bcrypt.hash(password, salt)

    const client = await usersPool.connect()
    const insertUserQuery =
        "INSERT INTO users (email, hashed_password, salt) values ($1, $2, $3);"
    client
        .query(insertUserQuery, [email, hashedPass, salt])
        .then(() => {
            res.send("Successfully created user").status(200)
        })
        .catch((error) => {
            res.send(error).status(500)
        })
    client.release()
})

app.post("/login", validation(userLoginSchema), async (req, res) => {
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
                res.send("success").status(200)
            } else {
                res.send("Password is invalid").status(400)
            }
        })
        .catch((error) => {
            res.send({ error }).status(500)
        })
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
