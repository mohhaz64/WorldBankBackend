require("dotenv").config()
const express = require("express")
const bcrypt = require("bcryptjs")
const sqlite3 = require("sqlite3")

const db = new sqlite3.Database(process.env.DB_HOST)
const port = process.env.PORT

const app = express()
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Hello world...")
})

app.get("/all", async (req, res) => {
    const sqlQ = `SELECT CountryCode, IndicatorName, Year, Value FROM Indicators LIMIT 3`
    const queryResult = await all(sqlQ, [])
    console.log(queryResult)
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

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) {
                console.log("Error running sql: " + sql)
                console.log(err)
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.log("Error running sql: " + sql)
                console.log(err)
                reject(err)
            } else {
                resolve(rows)
            }
        })
    })
}
