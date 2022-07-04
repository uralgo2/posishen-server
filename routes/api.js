let express = require('express')
let router = express.Router()
let crypto = require('crypto');
let sql = require('../db')
let nodemailer = require('nodemailer')
const {isProduction} = require("../utils");

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

    sql.query('SELECT * FROM users WHERE email = ?', [email],async (error, results) => {
        if(error) {
            console.log(error)
            return res.send({successful: false, message: error.message})
        }

        if(!results.length) {
            let hash = crypto.createHash("md5").update(email + '|'+ password).digest("hex")

            sql.query('INSERT INTO users(email, hashedPassword) VALUES(?, ?)',
                [email, hash],
                async (e, result) => {
                    if(e) {
                        console.log(e)
                        return res.send({successful: false, message: e.message})
                    }

                    let secret = crypto.createHash("md5").update(Date.now().toString()).digest("hex")

                    sql.query('INSERT INTO sessions(userId, secret) VALUES(?, ?)', [result.insertId, secret], async(e) => {
                        if(e) {
                            console.log(e)
                            return res.send({successful: false, message: e.message})
                        }
                        res.send({successful: true, c: secret})
                    })
                })
        }
        else
            return res.send({
                successful: false,
                message: "Этот адрес электронной почты уже используется"
            })
    })
})

router.get('/login', async (req, res) => {
    let email = req.query['email']
    let password = req.query['password']

    sql.query(`SELECT * FROM users WHERE email = '${email}'`, async (error, results) => {
        if(error) {
            console.log(error)
            return res.send({successful: false, message: error.message})
        }

        if(results.length) {
            /**
             * @type {User}
             */
            let user = results[0]

            let hash = crypto.createHash("md5").update(email + '|'+ password).digest("hex")

            if(user.hashedPassword !== hash){
                return res.send({
                    successful: false,
                    message: "Неверный адрес электронной почты или пароль"
                })
            }
            else {
                let secret = crypto.createHash("md5").update(Date.now().toString()).digest("hex")

                sql.query(`INSERT INTO sessions(userId, secret) 
                    VALUES(${user.id}, '${secret}')`, async (e) => {
                    if(e) {
                        console.log(e)
                        return res.send({successful: false, message: e.message})
                    }
                    res.send({successful: true, c: secret})
                })
            }
        }
        else
            return res.send({
                successful: false,
                message: "Неверный адрес электронной почты или пароль"
            })

    })
})

router.get('/logout', async (req, res) => {
    let secret = req.query['c']

    sql.query('SELECT * FROM sessions WHERE secret = ?', [secret],async (error, results) => {
        if(error) {
            console.log(error)
            return res.send({successful: false, message: error.message})
        }

        if(results.length) {
            let session = results[0]
            sql.query('DELETE FROM sessions WHERE id = ?',[session.id], async () => {
                if(error) {
                    console.log(error)
                    return res.send({successful: false, message: error.message})
                }

                res.send({successful: true})
            })
        }
        else
            return res.send({
                successful: false,
                message: "Сессии не существует"
            })
    })
})

router.get('/getProjects', async (req, res) => {
    let secret = req.query['c']

    sql.query('SELECT * FROM sessions WHERE secret = ?',[secret], async (error, results) => {
        if(error) {
            console.log(error)
            return res.send({successful: false, message: error.message})
        }

        if(results.length) {
            let session = results[0]

            sql.query('SELECT * FROM projects WHERE userId = ?', [session.userId],
                async (e, results) => {
                    if(e) {
                        console.log(e)
                        return res.send({successful: false, message: e.message})
                    }

                    return res.send({successful: true, data: results})
            })
        }
        else
            return res.send({
                successful: false,
                message: "Сессии не существует"
            })

    })
})

router.get('/restore/check', async (req, res) => {
    let hash = req.query['s']

    sql.query('SELECT * FROM users WHERE restoreHash = ?', [hash],
        async (e, users) => {
            if(e) {
                console.log(e)
                return res.send({successful: false, message: e})
            }
            if(users.length){
                let secret = crypto.createHash("md5").update(Date.now().toString()).digest("hex")
                /**
                 * @type {User}
                 */
                let user = users[0]

                sql.query('INSERT INTO sessions(userId, secret) VALUES(?, ?)', [user.id, secret], async (e) => {
                    if(e) {
                        console.log(e)
                        return res.send({successful: false, message: e.message})
                    }
                    sql.query('UPDATE users SET restoreHash = NULL WHERE id = ?',[user.id], async (e) => {
                        if(e) {
                            console.log(e)
                            return res.send({successful: false, message: e.message})
                        }
                        res.send({successful: true, c: secret})
                    })
                })
            }
            else
                return res.send({successful: false, message: "Ссылка недейтсвительна"})
        })
})

router.get('/restore', async (req, res) => {
    let email = req.query['email']

    sql.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if(error) {
            console.log(error)
            return res.send({successful: false, message: error})
        }

        if(!results.length) return res.send({
                successful: false,
                message: "Пользователя с таким адресом электронной почты не существует"
            })
        else{
            let restoreHash = crypto.createHash("md5").update(Date.now().toString()).digest("hex")
            let user = results[0]
            sql.query('UPDATE users SET restoreHash = ? WHERE id = ?', [restoreHash, user.id],
                async (e) => {
                    if(e)
                    {
                        console.log(e)
                        return res.send({successful: false, message: e})
                    }
                    try {
                        let info = await transporter.sendMail({
                            from: '"Позишен" <noreply@posishen.ru>',
                            to: "test@email.com",
                            subject: "Восстановление пароля",
                            text: "Если вы не запрашивали восстановление пароля, проигнорируйте письмо",
                            html: `<a href='http://localhost:3000/api/restore/check?s=${restoreHash}'>Перейдите по ссылке, чтобы восстановить пароль</a>`,
                        })

                        console.log("Message sent: %s", info.messageId)

                        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))

                        return res.send({successful: true})

                    }
                    catch (err) {
                        console.log(err)
                        return res.send({successful: false, message: err})
                    }
                })
        }
    })
})

router.get('/changePassword', async (req, res) => {
    let secret = req.query['c']
    let currentPassword = req.query['currentPassword']
    let newPassword = req.query['newPassword']

    sql.query('SELECT * FROM sessions WHERE secret = ?',[secret], async (error, results) => {
        if(error) {
            console.log(error)
            return res.send({successful: false, message: error.message})
        }

        if(results.length) {
            /**
             * @type {UserSession}
             */
            let session = results[0]

            sql.query('SELECT * FROM users WHERE id = ?', [session.userId],
                async (e, results) => {
                    if(e) {
                        console.log(e)
                        return res.send({successful: false, message: e.message})
                    }

                    let user = results[0]

                    let hash = crypto.createHash("md5").update(user.email + '|'+ currentPassword).digest("hex")

                    if(user.hashedPassword !== hash)
                        return res.send({successful: false, message: 'Неверный пароль'})

                    let newHash = crypto.createHash("md5").update(user.email + '|'+ newPassword).digest("hex")

                    sql.query("UPDATE users SET hashedPassword = ? WHERE id = ?", [newHash, user.id],
                        async(e) => {
                            if(e) {
                                console.log(e)
                                return res.send({successful: false, message: e.message})
                            }
                            return res.send({successful: true})
                        })
            })
        }
        else
            return res.send({
                successful: false,
                message: "Сессии не существует"
            })

    })
})

router.get('/addProject', async () => {
    
})
module.exports = router