const fs = require('fs')
let key_path = '' // путь для приватного dkim ключа

let key = fs.readFileSync(key_path).toString('utf8')

module.exports = {
    dbName: 'pozishen', // имя базы данных
    dbUsername: 'root', // имя пользователя
    dbPort: 3306, // порт сервера базы данных
    dbPassword: '', // пароль пользователя
    dbHost: '', // хост сервера базы данных

    smtpHost: '', // хост почтового сервера
    smtpPort: 0, // порт почтового сервера
    smtpSecure: false, // защищенное соединение? да - true, нет - false
    smtpEmail: '', // электронная почта
    smtpPassword: '', // пароль почты
    clientPath: '', // путь к клиенту
    /*dkim: {
        domainName: "pozishen.ru", // имя домена сервера почты
        keySelector: "default", // селектор
        privateKey: key // ключ
    },*/
    // in seconds
    taskWaitTimeout: 5 * 60, // время ожидания завершения задачи
    programOfflineTimeout: 6 * 60, // время ожидания следущего запроса от клиента
    keyOffset: 0x2eb190 // смещение для записи ключа
}