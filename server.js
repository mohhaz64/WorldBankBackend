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

createThetaView()

const app = express()
app.use(express.json())
app.use(cors())

app.get("/", (req, res) => {
    res.send("Hello world...")
})

app.get("/allData", async (req, res) => {
    const client = await worldBankPool.connect()
    const queryForAllData = `SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM Theta_View ORDER BY CountryName ASC LIMIT 3`
    const queryResult = await client.query(queryForAllData, [])
    res.send(queryResult.rows).status(200)
    client.release()
})

app.get("/distinctCountries", async (req, res) => {
    const client = await worldBankPool.connect()
    const queryForDistinctCountries = `SELECT DISTINCT CountryName FROM Theta_View ORDER BY CountryName ASC`
    const queryResult = await client.query(queryForDistinctCountries, [])
    res.send(queryResult.rows).status(200)
    client.release()
})

app.get("/distinctIndicators", async (req, res) => {
    const client = await worldBankPool.connect()
    const queryForDistinctIndicators = `SELECT DISTINCT IndicatorName, IndicatorCode FROM Theta_View ORDER BY IndicatorName ASC`
    const queryResult = await client.query(queryForDistinctIndicators, [])
    res.send(queryResult.rows).status(200)
    client.release()
})

app.get("/distinctYears", async (req, res) => {
    const client = await worldBankPool.connect()
    const queryForDistinctYears = `SELECT DISTINCT Year FROM Theta_View ORDER BY Year DESC`
    const queryResult = await client.query(queryForDistinctYears, [])
    res.send(queryResult.rows).status(200)
    client.release()
})

app.get("/search/:countryName/:indicatorCode", async (req, res) => {
    const client = await worldBankPool.connect()
    const countryName = req.params.countryName
    const indicatorCode = req.params.indicatorCode
    const queryForCountryIndicator =
        "SELECT CountryName, IndicatorName, Year, Value FROM Theta_View WHERE CountryName = $1 AND IndicatorCode = $2 ORDER BY Year ASC"
    const queryResult = await client.query(queryForCountryIndicator, [
        countryName,
        indicatorCode,
    ])
    res.send(queryResult.rows).status(200)
    client.release()
})

app.get("/search/:countryName/:indicatorCode/:year", async (req, res) => {
    const client = await worldBankPool.connect()
    const countryName = req.params.countryName
    const indicatorCode = req.params.indicatorCode
    const year = req.params.year
    const queryForCountryIndicatorYear =
        "SELECT Year, Value FROM Theta_View WHERE countryName = $1 AND IndicatorCode = $2 AND Year = $3"
    const queryResult = await client.query(queryForCountryIndicatorYear, [
        countryName,
        indicatorCode,
        year,
    ])
    res.send(queryResult.rows).status(200)
    client.release()
})

app.get(
    "/search/:countryName/:indicatorCode/:lowerYear/:upperYear",
    async (req, res) => {
        const client = await worldBankPool.connect()
        const countryName = req.params.countryName
        const indicatorCode = req.params.indicatorCode
        const lowerYear = req.params.lowerYear
        const upperYear = req.params.upperYear
        const queryForCountryIndicatorYear =
            "SELECT CountryName, IndicatorName, Year, Value FROM Theta_View WHERE countryName = $1 AND IndicatorCode = $2 AND Year BETWEEN $3 AND $4"
        const queryResult = await client.query(queryForCountryIndicatorYear, [
            countryName,
            indicatorCode,
            lowerYear,
            upperYear,
        ])
        res.send(queryResult.rows)
        res.status(200)
        client.release()
    }
)

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
