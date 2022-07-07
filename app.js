let createError = require('http-errors')
let express = require('express')
let path = require('path')
let cookieParser = require('cookie-parser')
let log4js = require('log4js')
let logger = log4js.getLogger('pozishen')

let apiRouter = require('./routes/api')
const {ApiError} = require("./utils");

let app = express()

app.use(log4js.connectLogger(logger, {level: 'info'}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/api', apiRouter)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})
// error handler
// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
app.use((e, req, res, next) => {
      if(!(e instanceof ApiError)) logger.error(e)

      // noinspection JSUnresolvedFunction
    return res.status(500).send({
        successful: false,
        message: e instanceof ApiError ? e.message : "Произошла ошибка на стороне сервера"
      })
})

module.exports = app;
