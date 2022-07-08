let express = require('express')
let router = express.Router()
let crypto = require('crypto')
let sql = require('../db')
let nodemailer = require('nodemailer')
const {isProduction, ApiError} = require("../utils")
const PAGE_COUNT = 25
const fs = require("fs")
const logger = require('log4js').getLogger('pozishen');
(async () => {
    sql = await sql
    logger.info("Успешное подлкючение к серверу MySQL")
})()


let testAccount
let transporter

nodemailer.createTestAccount().then(acc => {
    testAccount = acc

    //if(isProduction())
        transporter = nodemailer.createTransport({
            host: '5.44.40.177',
            port: 25,
            auth: {
                user: "noreply@pozishen.ru",
                pass: "xJ7yC2wI",
            },
            secure: false,
            tls: { rejectUnauthorized: false }
        })
    /*else
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        })
    */
    transporter.verify((error) => {
        if (error)
            logger.error(error);
        else
            logger.info("Почтовый сервер прошел верификацию");
    });
});

router.get('/signup', async (req, res, next) => {
    let email = req.query['email']
    let password = req.query['password']

    try
    {
        let [users] = await sql.query('SELECT * FROM users WHERE email = ?', [email])

        if (!users.length) {
            let hash = crypto.createHash("md5").update(email + '|' + password).digest("hex")
            let programHash = crypto.createHash("md5").update(Date.now().toString()).digest("hex")
            let [result] = await sql.query('INSERT INTO users(email, hashedPassword, programHash) VALUES(?, ?, ?)', [email, hash, programHash])

            let secret = crypto.createHash("md5").update(Date.now().toString()).digest("hex")

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

            let hash = crypto.createHash("md5").update(email + '|' + password).digest("hex")

            if (user.hashedPassword !== hash)
                throw new ApiError("Неверный адрес электронной почты или пароль")
            else {
                let secret = crypto.createHash("md5").update(Date.now().toString()).digest("hex")

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
        return next(e)
    }
})

router.get('/getProjects', async (req, res, next) => {
    let secret = req.query['c']

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let [projects] = await sql.query('SELECT * FROM projects WHERE userId = ?', [session.userId])

            return res.send({successful: true, data: projects})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

router.get('/restore/check', async (req, res, next) => {
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
            let restoreHash = crypto.createHash("md5").update(Date.now().toString()).digest("hex")
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
                from: 'noreply@pozishen.ru',
                to: email,
                subject: "Восстановление пароля",
                text: "Если вы не запрашивали восстановление пароля, проигнорируйте письмо",
                html: `<a href='http://pozishen.ru/api/restore/check?s=${restoreHash}'>
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

router.get('/getClient', async (req, res) => {
    res.download(`${__dirname}/../files/pozishen_client.exe`)
})

router.get('/getConfig', async (req, res, next) => {
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
            let config = `${__dirname}/../files/config.key`
            fs.writeFileSync(config, user.programHash)
            res.download(config)
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

            await sql.query("INSERT INTO queries(groupId, queryText) VALUES (?, ?)", [groupId, queryText])
            await sql.query("UPDATE projects SET queriesCount = queriesCount + 1 WHERE id = ?", [projectId])
            return res.send({successful: true})
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

            await sql.query("INSERT INTO _groups(projectId, groupName) VALUES (?, ?)", [projectId, groupName])

            return res.send({successful: true})
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

            let [queries] = await sql.query('SELECT * FROM queries WHERE groupId = ? LIMIT ?, ?', [groupId, page, 25 ])

            return res.send({successful: true, data: queries})
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

            let [groups] = await sql.query('SELECT * FROM _groups WHERE projectId = ?', [projectId])

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

    try {
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            let session = sessions[0]

            let groups, group
            if(groupId !== 0) {
                [groups] = await sql.query('SELECT * FROM _groups WHERE id = ?', [groupId])

                if (!groups.length)
                    throw new ApiError("Группы не существует")

                /**
                 * @type {Group}
                 */
                group = groups[0]
            }

            let [projects] = await sql.query('SELECT * FROM projects WHERE id = ?', [projectId])

            if(!projects.length)
                throw new ApiError("Проекта не существует")

            /**
             * @type {Project}
             */
            let project = projects[0]

            if(groupId !== 0 && group.projectId !== projectId)
                throw new ApiError("Айди проекта и айди проекта группы не совпадают")

            let [users] = await sql.query('SELECT * FROM users WHERE id = ?', [session.userId])

            /**
             * @type {User}
             */
            let user = users[0]

            if(user.id !== project.userId)
                throw new ApiError("Вы не владелец проекта")


            let positions;

            if(groupId === 0)
                [positions] = await sql.query('SELECT * FROM results WHERE projectId = ? AND cityCollection = ? AND engineCollection = ? LIMIT ?, ?',
                    [projectId, city, engine, page, page + 25 ])
            else
                [positions] = await sql.query('SELECT * FROM results WHERE groupId = ? AND projectId = ? AND cityCollection = ? AND engineCollection = ? LIMIT ?, ?',
                    [groupId, projectId, city, engine, page, page + 25 ])

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

            let [tasks] = await sql.query(`SELECT * FROM tasks 
              WHERE executing = FALSE
              AND TIMEDIFF(tasks.parsingTime, CURRENT_TIME) <= 0  
              LIMIT 1`)

            if(!tasks.length) throw new ApiError("Нет свободных запросов")

            /**
             * @type {Task}
             */
            let task = tasks[0]


            await sql.query(`UPDATE tasks SET executing = TRUE, city = ? WHERE id = ?`, [city, task.id])
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

            await sql.query(`INSERT INTO results(queryId, queryText, groupId, projectId, place, lastCollection, cityCollection, engineCollection) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [task.queryId,task.queryText, task.groupId, task.projectId, place, new Date(Date.now()).toISOString().slice(0, 10), task.city, task.searchingEngine])

            await sql.query(`UPDATE users SET executedTasksForDay = executedTasksForDay + 1 WHERE id = ?`, [user.id])

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

            for (let i = 0; i < project.cities.length; i++) {
                let city = project.cities[i]

                await sql.query("INSERT INTO cities(projectId, cityName) VALUES(?, ?)", [projectResult.insertId, city])
            }

            return res.send({successful: true})
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
    if(!req.body) return res.sendStatus(400)

    let secret = req.body['c']
    let loadLimit = req.body['loadLimit']
    let maxResourceLimit = req.body['maxResourceLimit']

    try{
        let [sessions] = await sql.query('SELECT * FROM sessions WHERE secret = ?', [secret])

        if (sessions.length) {
            /**
             * @type {UserSession}
             */
            let session = sessions[0]

            await sql.query(`UPDATE users SET loadLimit = ?, maxResourceLimit = ? WHERE id = ?`, [
                loadLimit, maxResourceLimit,
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

            let [queries] = await sql.query('SELECT COUNT(*) FROM queries WHERE groupId = ? LIMIT ?, ?', [groupId, page, 25 ])

            return res.send({successful: true, data: queries[0]})
        }
        else
            throw new ApiError("Сессии не существует")
    }
    catch (e){
        return next(e)
    }
})

module.exports = router