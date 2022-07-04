let express = require('express')
let router = express.Router()
let crypto = require('crypto')
let sql = require('../db');

(async () => sql = await sql)()

let nodemailer = require('nodemailer')
const {isProduction, ApiError} = require("../utils");

let testAccount
let transporter

nodemailer.createTestAccount().then(acc => {
    testAccount = acc

    if(isProduction())
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            auth: {
                user: "",
                pass: "",
            },
            secure: true
        })
    else
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        })

    transporter.verify((error) => {
        if (error)
            console.log(error);
        else
            console.log("Почтовый сервер прошел верификацию");
    });
});

router.get('/signup', async (req, res) => {
    let email = req.query['email']
    let password = req.query['password']

    try
    {
        let [users] = await sql.query('SELECT * FROM users WHERE email = ?', [email])

        if (!users.length) {
            let hash = crypto.createHash("md5").update(email + '|' + password).digest("hex")

            let [result] = await sql.query('INSERT INTO users(email, hashedPassword) VALUES(?, ?)', [email, hash])

            let secret = crypto.createHash("md5").update(Date.now().toString()).digest("hex")

            await sql.query('INSERT INTO sessions(userId, secret) VALUES(?, ?)', [result.insertId, secret])

            return res.send({successful: true, c: secret})
        } else throw new ApiError("Этот адрес электронной почты уже используется")
    }
    catch (e){
        if(!(e instanceof ApiError)) console.log(e)

        return res.send({
            successful: false,
            message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
        })
    }
})

router.get('/login', async (req, res) => {
    let email = req.query['email']
    let password = req.query['password']

    try {
        let [users] = await sql.query(`SELECT * FROM users WHERE email = ?`,  [email])

        if (users.length) {
            /**
             * @type {User}
             */
            let user = users[0]

            let hash = crypto.createHash("md5").update(email + '|' + password).digest("hex")

            if (user.hashedPassword !== hash)
                throw new ApiError("Неверный адрес электронной почты или пароль")
            else {
                let secret = crypto.createHash("md5").update(Date.now().toString()).digest("hex")

                sql.query(`INSERT INTO sessions(userId, secret) VALUES(?, ?)`, [user.id, secret])

                return res.send({successful: true, c: secret})
            }
        }
        else
            throw new ApiError("Неверный адрес электронной почты или пароль")
    }
    catch (e){
        if(!(e instanceof ApiError)) console.log(e)

        return res.send({
            successful: false,
            message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
        })
    }
})

router.get('/logout', async (req, res) => {
    let secret = req.query['c']

    try {
        let [sessions] = sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            /**
             * @type {UserSession}
             */
            let session = sessions[0]

            await sql.query('DELETE FROM sessions WHERE id = ?', [session.id])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        if(!(e instanceof ApiError)) console.log(e)

        return res.send({
            successful: false,
            message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
        })
    }
})

router.get('/getProjects', async (req, res) => {
    let secret = req.query['c']

    try {
        let [sessions] = sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE userId = ?', [session.userId])

            return res.send({successful: true, data: projects})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        if(!(e instanceof ApiError)) console.log(e)

        return res.send({
            successful: false,
            message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
        })
    }
})

router.get('/restore/check', async (req, res) => {
    let hash = req.query['s']

    try {
        let [users] = await sql.query('SELECT * FROM users WHERE restoreHash = ?', [hash])

        if (users.length) {
            let secret = crypto.createHash("md5").update(Date.now().toString()).digest("hex")

            /**
             * @type {User}
             */
            let user = users[0]

            await sql.query('INSERT INTO sessions(userId, secret) VALUES(?, ?)', [user.id, secret])

            await sql.query('UPDATE users SET restoreHash = NULL WHERE id = ?', [user.id])

            return res.send({successful: true, c: secret})
        }
        else
            throw new ApiError("Ссылка недействительна")
    }
    catch (e){
        if(!(e instanceof ApiError)) console.log(e)

        return res.send({
            successful: false,
            message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
        })
    }
})

router.get('/restore', async (req, res) => {
    let email = req.query['email']

    try {
        let [users] = await sql.query('SELECT * FROM users WHERE email = ?', [email])

        if (!users.length) throw new ApiError("Пользователя с таким адресом электронной почты не существует")
        else {
            let restoreHash = crypto.createHash("md5").update(Date.now().toString()).digest("hex")
            /**
             * @type {User}
             */
            let user = users[0]

            await sql.query('UPDATE users SET restoreHash = ? WHERE id = ?', [restoreHash, user.id])

            let info = await transporter.sendMail({
                from: '"Позишен" <noreply@posishen.ru>',
                to: "test@email.com",
                subject: "Восстановление пароля",
                text: "Если вы не запрашивали восстановление пароля, проигнорируйте письмо",
                html: `<a href='http://localhost:3000/api/restore/check?s=${restoreHash}'>
                        Перейдите по ссылке, чтобы восстановить пароль</a>`,
            })

            console.log("Message sent: %s", info.messageId)

            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))

            return res.send({successful: true})
        }
    }
    catch (e){
        if(!(e instanceof ApiError)) console.log(e)
        return res.send({
            successful: false,
            message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
        })
    }
})

router.get('/changePassword', async (req, res) => {
    let secret = req.query['c']
    let currentPassword = req.query['currentPassword']
    let newPassword = req.query['newPassword']
    try{
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            /**
             * @type {UserSession}
             */
            let session = sessions[0]

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            let user = users[0]

            let hash = crypto.createHash("md5").update(user.email + '|' + currentPassword).digest("hex")

            if (user.hashedPassword !== hash) throw new ApiError("Неверный пароль")

            let newHash = crypto.createHash("md5").update(user.email + '|' + newPassword).digest("hex")

            await sql.query("UPDATE users SET hashedPassword = ? WHERE id = ?", [newHash, user.id])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        if(!(e instanceof ApiError)) console.log(e)

        return res.send({
            successful: false,
            message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
        })
    }
})

router.post('/addProject', async (req, res) => {
    if (!req.body) return res.sendStatus(400);

    let secret = req.body['c']
    /**
     * @type {ProjectJson}
     */
    let project = req.body['project']
    try{
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            /**
             * @type {UserSession}
             */
            let session = sessions[0]

            let queriesCount = project.groups.reduce((prev, group) => prev + group.queries.length, 0)

            let [projectResult] = await sql.query(`INSERT INTO projects(userId, siteAddress,
                                                searchEngine, searchingRange,
                                                parsingTime, parsingDays,
                                                queriesCount)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                    session.userId, project.siteAddress,
                    project.searchEngine.join(','),
                    project.searchingRange,
                    project.parsingTime,
                    project.parsingDays.join(','),
                    queriesCount
                ])


            for (let gi = 0; gi < project.groups.length; gi++) {
                let group = project.groups[gi]

                let [groupResult] = await sql.query("INSERT INTO _groups(projectId, groupName) VALUES (?, ?)",[projectResult.insertId, group.groupName])

                for (let i = 0; i < group.queries.length; i++) {
                    let query = group.queries[i]

                    await sql.query("INSERT INTO queries(groupId, queryText) VALUES(?, ?)", [groupResult.insertId, query])
                }

                for (let i = 0; i < project.cities.length; i++) {
                    let city = project.cities[i]

                    await sql.query("INSERT INTO cities(projectId, cityName) VALUES(?, ?)", [projectResult.insertId, city])
                }
            }

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")

    }
    catch (e){
        if(!(e instanceof ApiError)) console.log(e)

        return res.send({
                successful: false,
                message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
            })
    }
})

module.exports = router