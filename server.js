const dotenv = require('dotenv')
const mongoose = require('mongoose')

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
  path: './config.env'
})

const app = require('./app')

const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD
)

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
    console.log(DB)
    console.log(err)
    console.log(err.name, err.message)
    process.exit(1)
  })

// start server
const port = process.env.PORT || 8000
app.listen(port, () => {
  console.log(`App running on port ${port}`)
})
//DATABASE=mongodb+srv://laerpeek:<password>@cluster0.j2kd4pb.mongodb.net/natours?retryWrites=true&w=majority
