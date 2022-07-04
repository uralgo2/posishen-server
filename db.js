const mysql = require("mysql2/promise")

const databaseName = "test"
const databaseUsername = "root"
const databaseUserPassword = "19721948Ass%$"

let connection = mysql.createConnection({
    host: "localhost",
    user: databaseUsername,
    database: databaseName,
    password: databaseUserPassword
})

module.exports = connection

