import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'

import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import contactsRouter from './routes/contacts.js'
import conversationsRouter from './routes/conversations.js'

import { setupSocketHandlers } from './socket/handler.js'

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST'],
    credentials: true
  }
})

const onlineUsers = setupSocketHandlers(io)

app.set('io', io)
app.set('onlineUsers', onlineUsers)

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { message: 'Fly Book Server is running', timestamp: new Date().toISOString() } })
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/conversations', conversationsRouter)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: '服务器内部错误' })
})

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║   🚀 Fly Book Server Started!            ║
  ║                                          ║
  ║   📡 HTTP:   http://localhost:${PORT}          ║
  ║   🔌 Socket: ws://localhost:${PORT}            ║
  ║   🌐 CORS:   http://localhost:5173       ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
  `)
})
