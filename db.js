const mysql = require("mysql2")

const databaseName = "test"
const databaseUsername = "root"
const databaseUserPassword = "19721948Ass%$"

const connection = mysql.createConnection({
    host: "localhost",
    user: databaseUsername,
    database: databaseName,
    password: databaseUserPassword
})

connection.connect(function(err){
    if (err)
        return console.error("Ошибка: " + err.message)

    else
        console.log("Подключение к серверу MySQL успешно установлено")

})

module.exports = connection
