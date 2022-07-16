const mysql = require("mysql2/promise")

const config = require('./config')
const logger = require('log4js').getLogger('pozishen')
let connection = null

function handleDisconnect() {
    connection = mysql.createConnection({
        host: config.dbHost,
        user: config.dbUsername,
        database: config.dbName,
        password: config.dbPassword,
        port: config.dbPort
    })
    connection.connect((e) => {
        if(e){
            logger.error("Не удалось подключиться к серверу mysql: %s", e)
            setTimeout(handleDisconnect, 2000)
        }
    })
    connection.on('error', (e) => {
        logger.error("Ошибка базы данных: %s", e)
        if(e.code === 'PROTOCOL_CONNECTION_LOST')
            handleDisconnect()
        else
            throw e
    })
}

handleDisconnect()

setInterval(()=>{
    connection.query('SELECT 1')
}, 10000)

module.exports = connection

