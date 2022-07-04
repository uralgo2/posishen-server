let createError = require('http-errors')
let express = require('express')
let path = require('path')
let cookieParser = require('cookie-parser')
let logger = require('morgan')

let indexRouter = require('./routes/index')
let usersRouter = require('./routes/users')
let apiRouter = require('./routes/api')

let app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/users', usersRouter)
app.use('/api', apiRouter)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})
// error handler
app.use(
    (req, res,next, err) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.send('error')
})

module.exports = app;
