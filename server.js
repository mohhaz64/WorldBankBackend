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

app.get("/all", async (req, res) => {
    const sqlQ = `SELECT CountryCode, ShortName FROM Theta_Countries LIMIT 3`
    const queryResult = await client.query(sqlQ, [])
    console.log(queryResult.rows)
    res.send("Working...")
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

async function createCountriesView() {
    const createCountriesView = `CREATE VIEW Theta_Countries AS SELECT CountryCode, ShortName FROM countries`
    await client.query(createCountriesView, [])
}

// function get(sql, params = []) {
//     return new Promise((resolve, reject) => {
//         db.get(sql, params, (err, result) => {
//             if (err) {
//                 console.log("Error running sql: " + sql)
//                 console.log(err)
//                 reject(err)
//             } else {
//                 resolve(result)
//             }
//         })
//     })
// }

// function all(sql, params = []) {
//     return new Promise((resolve, reject) => {
//         db.all(sql, params, (err, rows) => {
//             if (err) {
//                 console.log("Error running sql: " + sql)
//                 console.log(err)
//                 reject(err)
//             } else {
//                 resolve(rows)
//             }
//         })
//     })
// }

// function run(sql, params = []) {
//     return new Promise((resolve, reject) => {
//         db.run(sql, params, function (err) {
//             if (err) {
//                 console.log("Error running sql " + sql)
//                 console.log(err)
//                 reject(err)
//             } else {
//                 resolve({ id: this.lastID })
//             }
//         })
//     })
// }
