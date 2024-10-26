const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const https = require('https')

process.on('unhandleRejection', err => {
  console.log('UNHANLDER REJECTION! Shuttting down...')
  console.log(err.name, err.message)
  process.exit(1)
})

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! Shuttting down...')
  console.log(err.name, err.message)
  process.exit(1)
})

dotenv.config({
  path: path.join(__dirname, 'config.env')
})

const app = require('./app')

const DB = process.env.DATABASE_LOCAL

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'))
  .catch(err => {
    console.log('DB connect failed...')
    console.log(err.name, err.message)
    process.exit(1)
  })

// start server
const privateKey = fs.readFileSync(
  path.join(__dirname, 'ssl/9095694_www.laerpeek.top.key')
)
const privateCert = fs.readFileSync(
  path.join(__dirname, 'ssl/9095694_www.laerpeek.top.pem')
)
const httpsOptions = {
  key: privateKey,
  cert: privateCert
}

const port = process.env.PORT || 8000
const httpsServer = https.createServer(httpsOptions, app)
httpsServer.listen(port, () => {
  console.log('Server running on port ', port)
})
// app.listen(port, () => {
//   console.log(`App running on port ${port}`)
// })
