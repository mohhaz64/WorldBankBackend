require("dotenv").config()
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
const { Pool, Client } = require("pg")
const express = require("express")
const bcrypt = require("bcryptjs")
const sqlite3 = require("sqlite3")
const cors = require("cors")

const db = new sqlite3.Database(process.env.DB_HOST)
const port = process.env.PORT
const connectionString =
    "postgresql://doadmin:mEW3kfIjm7w9dnDG@db-postgresql-lon1-54384-do-user-10062307-0.b.db.ondigitalocean.com:25060/data?sslmode=require"
const client = new Client({
    connectionString,
})
client.connect()

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

app.listen(port, () => {
    console.log(`Server started (http://localhost:${port}/) !`)
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
