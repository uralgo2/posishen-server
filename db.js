const mysql = require("mysql2/promise")

const config = require('./config')

let connection = mysql.createConnection({
    host: config.dbHost,
    user: config.dbUsername,
    database: config.dbName,
    password: config.dbPassword,
    port: config.dbPort
})

module.exports = connection

