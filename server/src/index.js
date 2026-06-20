import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'

import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import contactsRouter from './routes/contacts.js'
import conversationsRouter from './routes/conversations.js'
import teamsRouter from './routes/teams.js'
import departmentsRouter from './routes/departments.js'
import filesRouter from './routes/files.js'
import documentsRouter from './routes/documents.js'
import docCommentsRouter from './routes/doc-comments.js'
import docShareRouter from './routes/doc-share.js'
import formTemplatesRouter from './routes/form-templates.js'
import approvalInstancesRouter from './routes/approval-instances.js'
import approvalTemplatesRouter from './routes/approval-templates.js'
import approvalNotificationsRouter from './routes/approval-notifications.js'

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
app.use('/api/teams', teamsRouter)
app.use('/api/departments', departmentsRouter)
app.use('/api/files', filesRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/doc-comments', docCommentsRouter)
app.use('/api/doc-share', docShareRouter)
app.use('/api/form-templates', formTemplatesRouter)
app.use('/api/approval-instances', approvalInstancesRouter)
app.use('/api/approval-notifications', approvalNotificationsRouter)
app.use('/api/approval-templates', approvalTemplatesRouter)

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
