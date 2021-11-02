require("dotenv").config()
const { Pool } = require("pg")
const express = require("express")
const bcrypt = require("bcryptjs")
const cors = require("cors")
const { v4: uuidv4 } = require("uuid")
const cookieParser = require("cookie-parser")

const validation = require("./Middleware/validation")
const userLoginSchema = require("./Validation/userLoginValidation")
const userSignUpSchema = require("./Validation/userSignUpValidation")

const { PORT, USERSDB_CONN_STR, WBDB_CONN_STR } = process.env

const usersPool = new Pool({
    connectionString: USERSDB_CONN_STR,
})

const worldBankPool = new Pool({
    connectionString: WBDB_CONN_STR,
})

createThetaView()

const whitelist = [
    "http://localhost:3000",
    "https://world-bank-indicators.netlify.app",
    "https://world-development-indicators.netlify.app",
    "https://world-bank-indicators.com/",
]
const corsOptions = {
    credentials: true, // This is important.
    origin: (origin, callback) => {
        if (whitelist.includes(origin)) return callback(null, true)

        callback(new Error("Not allowed by CORS"))
    },
}

const app = express()
app.use(express.json())
app.use(cors(corsOptions))
app.use(cookieParser())

app.get("/sessions", (req, res) => {
    if (req.cookies.worldBankAppSessionID) {
        res.status(200).send("success")
    }
})

app.get("/distinctCountries", async (req, res) => {
    const client = await worldBankPool.connect()
    const queryForDistinctCountries = `SELECT DISTINCT CountryName FROM Theta_View ORDER BY CountryName ASC`
    const queryResult = await client.query(queryForDistinctCountries, [])
    res.status(200).send(queryResult.rows)
    client.release()
})

app.get("/distinctIndicators", async (req, res) => {
    const client = await worldBankPool.connect()
    const queryForDistinctIndicators = `SELECT DISTINCT IndicatorName, IndicatorCode FROM Theta_View ORDER BY IndicatorName ASC`
    const queryResult = await client.query(queryForDistinctIndicators, [])
    res.status(200).send(queryResult.rows)
    client.release()
})

app.get("/distinctYears", async (req, res) => {
    const client = await worldBankPool.connect()
    const queryForDistinctYears = `SELECT DISTINCT Year FROM Theta_View ORDER BY Year DESC`
    const queryResult = await client.query(queryForDistinctYears, [])
    res.status(200).send(queryResult.rows)
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
    res.status(200).send(queryResult.rows)
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
    res.status(200).send(queryResult.rows)
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
        res.status(200).send(queryResult.rows)
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
            res.status(200).send("Successfully created user")
        })
        .catch((error) => {
            res.status(500).send(error)
        })
    client.release()
})

app.post("/login", validation(userLoginSchema), async (req, res) => {
    const { email, password } = req.body

    const client = await usersPool.connect()
    const getAllData =
        "SELECT user_id, hashed_password FROM users WHERE email = $1"
    client
        .query(getAllData, [email])
        .then(async (queryResult) => {
            const [userInfo] = queryResult.rows
            if (userInfo.length === 0) {
                return res.status(400).send("Email is invalid")
            }
            const hashedPass = userInfo.hashed_password
            const userID = userInfo.user_id
            const passwordsAreEqual = await bcrypt.compare(password, hashedPass)
            if (passwordsAreEqual) {
                const newSessionID = uuidv4()
                client.query(
                    "INSERT INTO sessions (uuid, user_id) VALUES ($1, $2)",
                    [newSessionID, userID]
                )
                res.cookie("worldBankAppSessionID", newSessionID, {
                    maxAge: 120000,
                })
                    .status(200)
                    .send("success")
            } else {
                res.status(400).send("Password is invalid")
            }
        })
        .catch((error) => {
            console.log(error)
            res.status(500).send({ error })
        })
    client.release()
})

app.get("/history", async (req, res) => {
    const { user_id } = req.body
    const client = await usersPool.connect()
    let getAllHistory
    user_id === undefined //or admin ID no.
        ? (getAllHistory = "SELECT * FROM history ORDER BY date_time DESC") //May need to limit this later
        : (getAllHistory =
              "SELECT * FROM history WHERE user_id= $1 ORDER BY date_time DESC")
    const queryResult = await client
        .query(getAllHistory)
        .catch((error) => console.log("ERROR BRO! " + error))
    res.status(200).send(queryResult.rows)
    client.release()
})

app.post("/postHistory", async (req, res) => {
    const { countryOne, countryTwo, indicatorCode, yearOne, yearTwo, user_id } =
        req.body
    const client = await usersPool.connect()
    const clientWorldBank = await worldBankPool.connect()
    const queryIndicatorName = await clientWorldBank.query(
        "SELECT DISTINCT indicatorName FROM Theta_View WHERE indicatorCode = $1",
        [indicatorCode]
    )
    const indicatorName = queryIndicatorName.rows[0].indicatorname
    clientWorldBank.release()
    const postHistory =
        "INSERT INTO history (country_1, country_2, indicator, year_1, year_2, user_id) VALUES ($1, $2, $3, $4, $5, $6)"
    const queryResult = await client
        .query(postHistory, [
            countryOne,
            countryTwo,
            indicatorName,
            yearOne,
            yearTwo,
            user_id,
        ])
        .catch((error) => console.log("ERROR BRO! " + error))
    res.status(200).send("success")
    client.release()
})

app.get("/username/:userId", async (req, res) => {
    const user_id = req.params.userId
    if (user_id === "undefined" || undefined) {
        res.status(400).send("Error")
    }
    const client = await usersPool.connect()
    const getUsername = "SELECT email FROM users WHERE user_id = $1"
    const queryResult = await client
        .query(getUsername, [user_id])
        .catch((error) => console.log("ERROR BRO! " + error))
    if (user_id !== undefined || "undefined") {
        res.status(200).send(queryResult.rows)
    }
    client.release()
})

app.listen(PORT, () => {
    console.log(`Server started!`)
})

async function createThetaView() {
    const client = await worldBankPool.connect()
    const generateThetaView = `CREATE OR REPLACE VIEW Theta_View AS SELECT CountryCode, CountryName, IndicatorCode, IndicatorName, Year, Value FROM indicators`
    await client.query(generateThetaView, [])
    client.release()
}
