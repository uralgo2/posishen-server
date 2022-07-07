const mysql = require("mysql2/promise")

const databaseName = "pozishen"
const databaseUsername = "root1"
const databaseUserPassword = "aP9kO0uK"

let connection = mysql.createConnection({
    host: "5.44.40.177",
    user: databaseUsername,
    database: databaseName,
    password: databaseUserPassword,
    port: 3310
})

module.exports = connection

