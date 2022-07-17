let express = require('express')
let router = express.Router()
let crypto = require('crypto')
let nodemailer = require('nodemailer')
const {ApiError} = require("../utils")
const PAGE_COUNT = 25
const fs = require("fs/promises")
const config = require("../config");
const logger = require('log4js').getLogger('pozishen')

const mysql = require("mysql2/promise")

let sql = null

async function handleDisconnect() {
    sql = await mysql.createConnection({
        host: config.dbHost,
        user: config.dbUsername,
        database: config.dbName,
        password: config.dbPassword,
        port: config.dbPort
    })
    sql.connect((e) => {
        if(e){
            logger.error("Не удалось подключиться к серверу MySql: %s", e)
            setTimeout(handleDisconnect, 2000)
        }
    })
    sql.on('error', (e) => {
        logger.error("Ошибка базы данных: %s", e)
        if(e.code === 'PROTOCOL_CONNECTION_LOST')
            handleDisconnect()
        else
            throw e
    })
}

handleDisconnect().then(()=>logger.info("Успешное подключение к серверу MySql"))

setInterval(()=>{
    sql.query('SELECT 1')
}, 10000)


let transporter
transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    auth: {
        user: config.smtpEmail,
        pass: config.smtpPassword,
    },
    secure: config.smtpSecure,
    tls: { rejectUnauthorized: false }
})
transporter.verify((error) => {
    if (error)
        logger.error(error);
    else
        logger.info("Почтовый сервер прошел верификацию");
});

router.get('/signup', async (req, res, next) => {
    let email = req.query['email']
    let password = req.query['password']

    try
    {
        let [users] = await sql.query('SELECT * FROM users WHERE email = ?', [email])

        if (!users.length) {
            let hash = crypto.createHash("sha256").update(email + '|' + password).digest("hex")
            let programHash = crypto.createHash("sha256").update(Date.now().toString()).digest("hex")
            let [result] = await sql.query('INSERT INTO users(email, hashedPassword, programHash) VALUES(?, ?, ?)', [email, hash, programHash])

            let secret = crypto.createHash("sha256").update(Date.now().toString()).digest("hex")

            await sql.query('INSERT INTO sessions(userId, secret) VALUES(?, ?)', [result.insertId, secret])

            return res.send({successful: true, data: {c: secret}})
        } else throw new ApiError("Этот адрес электронной почты уже используется")
    }
    catch (e){
        return next(e)
    }
})

router.get('/login', async (req, res, next) => {
    let email = req.query['email']
    let password = req.query['password']

    try {
        let [users] = await sql.query(`SELECT * FROM users WHERE email = ?`,  [email])

        if (users.length) {
            /**
             * @type {User}
             */
            let user = users[0]

            let hash = crypto.createHash("sha256").update(email + '|' + password).digest("hex")

            if (user.hashedPassword !== hash)
                throw new ApiError("Неверный адрес электронной почты или пароль")
            else {
                let secret = crypto.createHash("sha256").update(Date.now().toString()).digest("hex")

                sql.query(`INSERT INTO sessions(userId, secret) VALUES(?, ?)`, [user.id, secret])

                return res.send({successful: true, data: {c: secret}})
            }
        }
        else
            throw new ApiError("Неверный адрес электронной почты или пароль")
    }
    catch (e){
        return next(e)
    }
})

router.get('/logout', async (req, res, next) => {
    let secret = req.query['c']

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

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
        return next(e)
    }
})

router.get('/getProjects', async (req, res, next) => {
    let secret = req.query['c']

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE userId = ? ORDER BY id', [session.userId])

            return res.send({successful: true, data: projects})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/restoreChange', async (req, res, next) => {
    let hash = req.query['s']
    let password = req.query['password']

    try {
        let [users] = await sql.query('SELECT * FROM users WHERE restoreHash = ?', [hash])

        if (users.length) {
            let secret = crypto.createHash("sha256").update(Date.now().toString()).digest("hex")

            /**
             * @type {User}
             */
            let user = users[0]

            let hashedPassword = crypto.createHash("sha256").update(user.email + '|' + password).digest("hex")
            await sql.query('INSERT INTO sessions(userId, secret) VALUES(?, ?)', [user.id, secret])

            await sql.query('UPDATE users SET restoreHash = NULL, hashedPassword = ? WHERE id = ?', [hashedPassword, user.id])

            return res.send({successful: true, data:{c: secret}})
        }
        else
            throw new ApiError("Ссылка недействительна")
    }
    catch (e){
        return next(e)
    }
})

router.get('/restore', async (req, res, next) => {
    let email = req.query['email']

    try {
        let [users] = await sql.query('SELECT * FROM users WHERE email = ?', [email])

        if (!users.length) throw new ApiError("Пользователя с таким адресом электронной почты не существует")
        else {
            let restoreHash = crypto.createHash("sha256").update(Date.now().toString()).digest("hex")
            /**
             * @type {User}
             */
            let user = users[0]

            await sql.query('UPDATE users SET restoreHash = ? WHERE id = ?', [restoreHash, user.id])
            await sql.query(`CREATE EVENT delete_restore_hash${Date.now().toString()}
                                    ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 8 HOUR
                                    ON COMPLETION NOT PRESERVE
                                    DO
                                      UPDATE users SET restoreHash = NULL WHERE id = ?`, [user.id])

            let info = await transporter.sendMail({
                from: config.smtpEmail,
                to: email,
                subject: "Восстановление пароля",
                text: "Если вы не запрашивали восстановление пароля, проигнорируйте письмо",
                html: `<a href='https://pozishen.ru/restore.html?hash=${restoreHash}'>
                        Перейдите по ссылке, чтобы восстановить пароль</a>`,
            })

            logger.info("Message sent: %s", info.messageId)

            return res.send({successful: true})
        }
    }
    catch (e){
        return next(e)
    }
})

router.get('/changePassword', async (req, res, next) => {
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

            let hash = crypto.createHash("sha256").update(user.email + '|' + currentPassword).digest("hex")

            if (user.hashedPassword !== hash) throw new ApiError("Неверный пароль")

            let newHash = crypto.createHash("sha256").update(user.email + '|' + newPassword).digest("hex")

            if(newHash === user.hashedPassword)
                throw new ApiError("Новый пароль не может совпадать с текущим")
            await sql.query("UPDATE users SET hashedPassword = ? WHERE id = ?", [newHash, user.id])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getMe', async (req, res, next) => {
    let secret = req.query['c']

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            delete user.restoreHash
            delete user.hashedPassword
            delete user.programHash

            return res.send({
                successful: true,
                data: user
            })
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getClient', async (req, res, next) => {
    let secret = req.query['c']

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]
            let path = config.clientPath


            let file = await fs.readFile(path)

            file.write(user.programHash, 0x30a960, 128, 'utf16le')

            await fs.writeFile(path, file)

            await sql.query('UPDATE users SET programInstalled = TRUE WHERE id = ?', user.id)

            res.download(path)
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/addQuery', async (req, res, next) => {
    let secret = req.query['c']
    let queryText = req.query['text']
    let groupId = Number(req.query['groupId'])
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [groups] = await sql.query('SELECT * FROM _groups WHERE id = ?', [groupId])

            if(!groups.length)
                throw new ApiError("Группы не существует")

            /**
             * @type {Group}
             */
            let group = groups[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            if(group.projectId !== projectId)
                throw new ApiError("Айди проекта и айди проекта группы не совпадают")

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            let [info] = await sql.query("INSERT INTO queries(groupId, queryText) VALUES (?, ?)", [groupId, queryText])
            await sql.query("UPDATE projects SET queriesCount = queriesCount + 1 WHERE id = ?", [projectId])
            await sql.query("UPDATE _groups SET queriesCount = queriesCount + 1 WHERE id = ?", [groupId])
            return res.send({successful: true, data: {
                    groupId: groupId,
                    id: info.insertId,
                    queryText: queryText
                }})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.post('/addQueries', async (req, res, next) => {
    let secret = req.body['c']
    let texts = req.body['texts']
    let groupId = Number(req.body['groupId'])
    let projectId = Number(req.body['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [groups] = await sql.query('SELECT * FROM _groups WHERE id = ?', [groupId])

            if(!groups.length)
                throw new ApiError("Группы не существует")

            /**
             * @type {Group}
             */
            let group = groups[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            if(group.projectId !== projectId)
                throw new ApiError("Айди проекта и айди проекта группы не совпадают")

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            let infos = []
            for(let q of texts){
                let [info] = await sql.query("INSERT INTO queries(groupId, queryText) VALUES (?, ?)", [groupId, q])
                infos.push({id:info.insertId})
            }

            await sql.query("UPDATE projects SET queriesCount = queriesCount + ? WHERE id = ?", [infos.length, projectId])
            await sql.query("UPDATE _groups SET queriesCount = queriesCount + ? WHERE id = ?", [infos.length,groupId])
            return res.send({successful: true, data: infos})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/addGroup', async (req, res, next) => {
    let secret = req.query['c']
    let groupName = req.query['name']
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            let [info] = await sql.query("INSERT INTO _groups(projectId, groupName) VALUES (?, ?)", [projectId, groupName])

            return res.send({successful: true, data: {
                    projectId: projectId,
                    id: info.insertId,
                    groupName: groupName,
                    queriesCount: 0
                }})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/deleteQuery', async (req, res, next) => {
    let secret = req.query['c']
    let groupId = Number(req.query['groupId'])
    let projectId = Number(req.query['projectId'])
    let queryId = Number(req.query['queryId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [queries] = await sql.query('SELECT * FROM queries WHERE id = ?', [queryId])

            if(!queries.length)
                throw new ApiError("Запроса не существует")

            /**
             * @type {SearchingQuery}
             */
            let query = queries[0]

            let [groups] = await sql.query('SELECT * FROM _groups WHERE id = ?', [groupId])

            if(!groups.length)
                throw new ApiError("Группы не существует")

            /**
             * @type {Group}
             */
            let group = groups[0]

            if(query.groupId !== groupId)
                throw new ApiError("Айди группы и айди группы запроса не совпадают")

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            if(group.projectId !== projectId)
                throw new ApiError("Айди проекта и айди проекта группы не совпадают")

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            await sql.query("DELETE FROM queries WHERE id = ?", [queryId])

            await sql.query("UPDATE projects SET queriesCount = queriesCount - 1 WHERE id = ?", [projectId])
            await sql.query("UPDATE _groups SET queriesCount = queriesCount - 1 WHERE id = ?", [groupId])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/deleteGroup', async (req, res, next) => {
    let secret = req.query['c']
    let groupId = Number(req.query['groupId'])
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [groups] = await sql.query('SELECT * FROM _groups WHERE id = ?', [groupId])

            if(!groups.length)
                throw new ApiError("Группы не существует")

            /**
             * @type {Group}
             */
            let group = groups[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            if(group.projectId !== projectId)
                throw new ApiError("Айди проекта и айди проекта группы не совпадают")

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            await sql.query("DELETE FROM _groups WHERE id = ?", [groupId])
            await sql.query("UPDATE projects SET queriesCount = queriesCount - 1 WHERE id = ?", [projectId])
            await sql.query("UPDATE _groups SET queriesCount = queriesCount - 1 WHERE id = ?", [groupId])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/deleteProject', async (req, res, next) => {
    let secret = req.query['c']
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            await sql.query("DELETE FROM projects WHERE id = ?", [projectId])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getQueries', async(req, res, next) => {
    let secret = req.query['c']
    let page = (Number(req.query['p']) || 0)  * PAGE_COUNT
    let groupId = Number(req.query['groupId'])
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            if(groupId === 0){
                let [groups] = await sql.query('SELECT * FROM _groups WHERE projectId = ?', [projectId])

                let queries = []

                for(let i = 0; i < groups.length; i++){
                    let [q] = await sql.query('SELECT * FROM queries WHERE groupId = ? ORDER BY id LIMIT ?, ?', [groups[i].id, page, 25])
                    queries = queries.concat(q)
                }

                return res.send({successful: true, data: queries})
            }


            else {
                let [queries] = await sql.query('SELECT * FROM queries WHERE groupId = ? ORDER BY id LIMIT ?, ?', [groupId, page, 25])

                return res.send({successful: true, data: queries})
            }
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getGroups', async (req, res, next) => {
    let secret = req.query['c']
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]


            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            let [groups] = await sql.query('SELECT * FROM _groups WHERE projectId = ? ORDER BY id', [projectId])

            return res.send({successful: true, data: groups})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getProject', async (req, res, next) => {
    let secret = req.query['c']
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            /**
             * @type {UserSession}
             */
            let session = sessions[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")
            /**
             * @type {Project}
             */
            let project = projects[0]

            if(project.userId !== session.userId)
                throw new ApiError("Вы не владелец проекта")


            return res.send({successful: true, data: project})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getSettings', async (req, res, next) => {
    let programHash = req.query['p']

    try {
        let [users] = await sql.query('SELECT * FROM users WHERE programHash = ?', [programHash])

        if (users.length) {
            /**
             * @type {User}
             */
            let user = users[0]

            return res.send({
                successful: true,
                data: {
                    loadLimit: user.loadLimit,
                    maxResourceLimit: user.maxResourceLimit
                }
            })
        } else
            throw new ApiError("Неверный программный хэш")
    }
    catch (e) {
        return next(e)
    }
})

router.get('/getPositions', async (req, res, next) => {
    let secret = req.query['c']
    let page = (Number(req.query['p']) || 0)  * PAGE_COUNT
    let groupId = Number(req.query['groupId'] || 0)
    let projectId = Number(req.query['projectId'])
    let city = req.query['city']
    let engine = req.query['engine']
    let from = new Date(req.query['from'])
    let to = new Date(req.query['to'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let positions;

            if(groupId === 0)
                [positions] = await sql.query('SELECT * FROM results WHERE projectId = ? AND cityCollection = ? AND engineCollection = ? AND DATE(lastCollection) BETWEEN ? AND ? ORDER BY lastCollection LIMIT ?, ?',
                    [projectId, city, engine, from.toISOString().slice(0, 19).replace('T', ' '), to.toISOString().slice(0, 19).replace('T', ' '), page, 25 ])
            else
                [positions] = await sql.query('SELECT * FROM results WHERE groupId = ? AND projectId = ? AND cityCollection = ? AND engineCollection = ? AND DATE(lastCollection) BETWEEN ? AND ? ORDER BY lastCollection LIMIT ?, ?',
                    [groupId, projectId, city, engine, from.toISOString().slice(0, 19).replace('T', ' '), to.toISOString().slice(0, 19).replace('T', ' '), page, 25 ])

            return res.send({successful: true, data: positions})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getTask', async (req, res, next) => {
    let programHash = req.query['p']

    try {
        let [users] = await sql.query('SELECT * FROM users WHERE programHash = ?', [programHash])

        if (users.length) {
            /**
             * @type {User}
             */
            let user = users[0]

            let [tasks] = await sql.query(`SELECT * FROM tasks
                                              WHERE executing = FALSE
                                                AND TIMEDIFF(tasks.parsingTime, CURRENT_TIMESTAMP) <= 0
                                                AND userId = ?
                                              ORDER BY id
                                              LIMIT 1
                `, [user.id])
            if(!tasks.length)
                [tasks] = await sql.query(`SELECT * FROM tasks 
                                          WHERE executing = FALSE
                                          AND TIMEDIFF(tasks.parsingTime, CURRENT_TIMESTAMP) <= 0
                                          ORDER BY id
                                          LIMIT 1
                                          `)

            if(!tasks.length) throw new ApiError("Нет свободных запросов")

            /**
             * @type {Task}
             */
            let task = tasks[0]


            await sql.query(`UPDATE tasks SET executing = TRUE WHERE id = ?`, [task.id])
            await sql.query(`CREATE EVENT set_not_executing${Date.now().toString()}
                                    ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 10 MINUTE
                                    ON COMPLETION NOT PRESERVE
                                    DO
                                      UPDATE tasks SET executing = FALSE WHERE id = ?`, [task.id])

            return res.send({successful: true, data: task})
        }
        else
            throw new ApiError("Неверный программный хэш")
    }
    catch (e) {
        return next(e)
    }
})

router.get('/endTask', async (req, res, next) => {
    let programHash = req.query['p']
    let place = Number(req.query['place'])
    let taskId = req.query['taskId']
    let foundAddress = req.query['foundAddress']

    try {
        let [users] = await sql.query('SELECT * FROM users WHERE programHash = ?', [programHash])

        if (users.length) {
            /**
             * @type {User}
             */
            let user = users[0]

            let [tasks] = await sql.query(`SELECT * FROM tasks WHERE id = ?`,
                [taskId])

            if(!tasks.length)
                throw new ApiError("Задачи не существует")

            /**
             * @type {Task}
             */
            let task = tasks[0]

            if(!task.executing)
                throw new ApiError("Неверный айди задачи или превышенно время выполнения")

            await sql.query(`DELETE FROM tasks WHERE id = ?`, [task.id])

            await sql.query(`INSERT INTO results(queryId, queryText, groupId, projectId, place, cityCollection, engineCollection, foundAddress) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [task.queryId,task.queryText, task.groupId, task.projectId, place, task.city, task.searchingEngine, foundAddress])

            await sql.query(`UPDATE users SET executedTasksForDay = executedTasksForDay + 1 WHERE id = ?`, [user.id])
            await sql.query(`UPDATE projects SET lastCollection = CURRENT_TIMESTAMP WHERE id = ?`, [task.projectId])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Неверный программный хэш")
    }
    catch (e){
        return next(e)
    }
})

router.post('/addProject', async (req, res, next) => {
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


            let [projectResult] = await sql.query(`INSERT INTO projects(userId, siteAddress,
                                                searchEngine, searchingRange,
                                                parsingTime, parsingDays)
                           VALUES (?, ?, ?, ?, ?, ?)`, [
                session.userId, project.siteAddress,
                project.searchEngine.join(','),
                project.searchingRange,
                project.parsingTime,
                project.parsingDays.join(',')
            ])
            await sql.query(`
                CREATE EVENT e_project_create_tasks_id${projectResult.insertId}
                ON SCHEDULE EVERY 1 DAY
                    STARTS CONCAT(DATE(NOW()), ?)
                DO call collectProject(?);
            `, [' ' + project.parsingTime, projectResult.insertId])

            for (let i = 0; i < project.cities.length; i++) {
                let city = project.cities[i]

                await sql.query("INSERT INTO cities(projectId, cityName) VALUES(?, ?)", [projectResult.insertId, city])
            }

            return res.send({successful: true, data: {
                    userId: session.userId,
                    id: projectResult.insertId,
                    searchEngine: project.searchEngine.join(','),
                    searchingRange: project.searchingRange,
                    parsingTime: project.parsingTime,
                    parsingDays: project.parsingDays.join(','),
                    siteAddress: project.siteAddress,
                    lastCollection: project.lastCollection,
                    queriesCount: 0
                }})
        }
        else
            throw new ApiError("Сессии не существует")

    }
    catch (e){
        return next(e)
    }
})

router.post('/updateProject', async (req, res, next) => {
    if(!req.body) return res.sendStatus(400)

    let secret = req.body['c']
    let projectId = req.body['projectId']

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

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")
            /**
             * @type {Project}
             */
            let _project = projects[0]

            if(_project.userId !== session.userId)
                throw new ApiError("Вы не владелец проекта")

            await sql.query(`UPDATE projects SET userId = ?, siteAddress = ?,
                                                searchEngine = ?, searchingRange = ?,
                                                parsingTime = ?, parsingDays = ? WHERE id = ?`, [
                session.userId, project.siteAddress,
                project.searchEngine.join(','),
                project.searchingRange,
                project.parsingTime,
                project.parsingDays.join(','),
                projectId
            ])

            await sql.query(`DROP EVENT IF EXISTS e_project_create_tasks_id${projectId}`)
            await sql.query(`
                CREATE EVENT e_project_create_tasks_id${projectId}
                ON SCHEDULE EVERY 1 DAY
                    STARTS CONCAT(DATE(NOW()), ?)
                DO call collectProject(?);
            `, [' ' + project.parsingTime, projectId])

            await sql.query('DELETE FROM cities WHERE projectId = ?', [projectId])

            for (let i = 0; i < project.cities.length; i++) {
                let city = project.cities[i]

                await sql.query("INSERT INTO cities(projectId, cityName) VALUES(?, ?)", [projectId, city])
            }

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e)
    {
        return next(e)
    }

})

router.get('/updateSettings', async (req, res, next) => {
    let secret = req.query['c']
    let maxResourceLimit = req.query['maxResourceLimit']

    try{
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            /**
             * @type {UserSession}
             */
            let session = sessions[0]

            await sql.query(`UPDATE users SET maxResourceLimit = ? WHERE id = ?`, [
                maxResourceLimit,
                session.userId
            ])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e)
    {
        return next(e)
    }

})

router.get('/getQueriesCount', async(req, res, next) => {
    let secret = req.query['c']
    let groupId = Number(req.query['groupId'])
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [groups] = await sql.query('SELECT * FROM _groups WHERE id = ?', [groupId])

            if(!groups.length)
                throw new ApiError("Группы не существует")

            /**
             * @type {Group}
             */
            let group = groups[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            if(group.projectId !== projectId)
                throw new ApiError("Айди проекта и айди проекта группы не совпадают")

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            let [queries] = await sql.query('SELECT COUNT(*) FROM queries WHERE groupId = ?', [groupId])

            return res.send({successful: true, data: queries[0]['COUNT(*)']})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getCities', async (req, res, next) => {
    let secret = req.query['c']
    let projectId = Number(req.query['projectId'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]


            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")

            let [cities] = await sql.query('SELECT * FROM cities WHERE projectId = ? ORDER BY id', [projectId])

            return res.send({successful: true, data: cities})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getPositionsCount', async (req, res, next) => {
    let secret = req.query['c']
    let groupId = Number(req.query['groupId'] || 0)
    let projectId = Number(req.query['projectId'])
    let city = req.query['city']
    let engine = req.query['engine']
    let from = new Date(req.query['from'])
    let to = new Date(req.query['to'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let count;

            if(groupId === 0)
                [count] = await sql.query('SELECT COUNT(*) FROM results WHERE projectId = ? AND cityCollection = ? AND engineCollection = ? AND DATE(lastCollection) BETWEEN ? AND ? ORDER BY id',
                    [projectId, city, engine, from.toISOString().slice(0, 19).replace('T', ' '), to.toISOString().slice(0, 19).replace('T', ' ')])
            else
                [count] = await sql.query('SELECT COUNT(*) FROM results WHERE groupId = ? AND projectId = ? AND cityCollection = ? AND engineCollection = ? AND DATE(lastCollection) BETWEEN ? AND ? ORDER BY id',
                    [groupId, projectId, city, engine, from.toISOString().slice(0, 19).replace('T', ' '), to.toISOString().slice(0, 19).replace('T', ' ')])

            return res.send({successful: true, data: count[0]['COUNT(*)']})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getPositionsQuery', async (req, res, next) => {
    let secret = req.query['c']
    let queryId = Number(req.query['queryId'])
    let projectId = Number(req.query['projectId'])
    let city = req.query['city']
    let engine = req.query['engine']
    let from = new Date(req.query['from'])
    let to = new Date(req.query['to'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {

            let [positions] = await sql.query('SELECT * FROM results WHERE queryId = ? AND projectId = ? AND cityCollection = ? AND engineCollection = ? AND DATE(lastCollection) BETWEEN ? AND ? ORDER BY lastCollection',
                    [queryId, projectId, city, engine, from.toISOString().slice(0, 19).replace('T', ' '), to.toISOString().slice(0, 19).replace('T', ' ')])

            return res.send({successful: true, data: positions})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getExpenses', async (req, res, next) => {
    let secret = req.query['c']
    let page = (Number(req.query['p']) || 0)  * PAGE_COUNT
    let from = new Date(req.query['from'])
    let to = new Date(req.query['to'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let [expenses] = await sql.query('SELECT * FROM pozishen.expenses WHERE userId = ? AND DATE(date) BETWEEN ? AND ? ORDER BY date DESC LIMIT ?, ?',
                    [sessions[0].userId, from.toISOString().slice(0, 19).replace('T', ' '), to.toISOString().slice(0, 19).replace('T', ' '), page, 25])

            return res.send({successful: true, data: expenses})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/getExpensesCount', async (req, res, next) => {
    let secret = req.query['c']
    let from = new Date(req.query['from'])
    let to = new Date(req.query['to'])

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let [expenses] = await sql.query('SELECT COUNT(*) FROM expenses WHERE userId = ? AND DATE(date) BETWEEN ? AND ?',
                [sessions[0].userId, from.toISOString().slice(0, 19).replace('T', ' '), to.toISOString().slice(0, 19).replace('T', ' ')])

            return res.send({successful: true, data: expenses[0]['COUNT(*)']})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/searchCities', async (req, res, next) => {
    let secret = req.query['c']
    let search = req.query['search']
    let count = Number(req.query['count'])
    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let [cities] = await sql.query("SELECT name FROM cityNames WHERE name LIKE ? OR name LIKE ? LIMIT ?", [search + '%','%' + search + '%', count])
            return res.send({successful: true, data: cities})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/collect', async (req, res, next) => {
    let secret = req.query['c']
    let projectId = Number(req.query['projectId'])
    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length) throw new ApiError('Проекта не существует')
            await sql.query('CALL collect(?)', [projectId])

            return res.send({successful: true})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})
module.exports = router