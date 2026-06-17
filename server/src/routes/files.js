import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

const FILE_EXT_ICONS = {
  '.pdf': '📄',
  '.doc': '📝',
  '.docx': '📝',
  '.xls': '📊',
  '.xlsx': '📊',
  '.ppt': '📽️',
  '.pptx': '📽️',
  '.txt': '📃',
  '.zip': '📦',
  '.rar': '📦',
  '.7z': '📦',
  '.mp3': '🎵',
  '.wav': '🎵',
  '.mp4': '🎬',
  '.avi': '🎬',
  '.mov': '🎬',
  '.jpg': '🖼️',
  '.jpeg': '🖼️',
  '.png': '🖼️',
  '.gif': '🖼️',
  '.svg': '🖼️',
  '.webp': '🖼️'
}

const getFileIcon = (filename) => {
  const ext = path.extname(filename).toLowerCase()
  return FILE_EXT_ICONS[ext] || '📁'
}

const isImage = (mimeType) => {
  return mimeType.startsWith('image/')
}

const uploadPath = process.env.FILE_UPLOAD_PATH || './uploads'
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024
const fileExpireDays = parseInt(process.env.FILE_EXPIRE_DAYS) || 30

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize
  },
  fileFilter: (req, file, cb) => {
    cb(null, true)
  }
})

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' })
    }

    const userId = req.user.userId
    const { originalname, mimetype, size, filename } = req.file

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + fileExpireDays)

    const file = await prisma.file.create({
      data: {
        name: filename,
        originalName: originalname,
        mimeType: mimetype,
        size,
        url: `/api/files/download/${filename}`,
        thumbnail: isImage(mimetype) ? `/api/files/thumbnail/${filename}` : null,
        uploadedById: userId,
        expiresAt
      }
    })

    res.json({
      success: true,
      data: {
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        thumbnail: file.thumbnail,
        icon: getFileIcon(originalname),
        isImage: isImage(mimetype),
        expiresAt: file.expiresAt,
        createdAt: file.createdAt
      }
    })
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: `文件大小超过限制，最大支持 ${maxFileSize / 1024 / 1024}MB` })
    }
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/upload/multiple', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' })
    }

    const userId = req.user.userId
    const files = []

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + fileExpireDays)

    for (const file of req.files) {
      const { originalname, mimetype, size, filename } = file

      const createdFile = await prisma.file.create({
        data: {
          name: filename,
          originalName: originalname,
          mimeType: mimetype,
          size,
          url: `/api/files/download/${filename}`,
          thumbnail: isImage(mimetype) ? `/api/files/thumbnail/${filename}` : null,
          uploadedById: userId,
          expiresAt
        }
      })

      files.push({
        id: createdFile.id,
        name: createdFile.name,
        originalName: createdFile.originalName,
        mimeType: createdFile.mimeType,
        size: createdFile.size,
        url: createdFile.url,
        thumbnail: createdFile.thumbnail,
        icon: getFileIcon(originalname),
        isImage: isImage(mimetype),
        expiresAt: createdFile.expiresAt,
        createdAt: createdFile.createdAt
      })
    }

    res.json({ success: true, data: files })
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: `文件大小超过限制，最大支持 ${maxFileSize / 1024 / 1024}MB` })
    }
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(process.cwd(), uploadPath, filename)

    const fileRecord = await prisma.file.findFirst({
      where: { name: filename }
    })

    if (fileRecord) {
      if (fileRecord.expiresAt && new Date() > fileRecord.expiresAt) {
        return res.status(404).json({ success: false, message: '文件已过期' })
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '文件不存在' })
    }

    const originalName = fileRecord?.originalName || filename

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}`)

    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/thumbnail/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(process.cwd(), uploadPath, filename)

    const fileRecord = await prisma.file.findFirst({
      where: { name: filename }
    })

    if (!fileRecord || !isImage(fileRecord.mimeType)) {
      return res.status(404).json({ success: false, message: '文件不存在或不是图片' })
    }

    if (fileRecord.expiresAt && new Date() > fileRecord.expiresAt) {
      return res.status(404).json({ success: false, message: '文件已过期' })
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '文件不存在' })
    }

    res.setHeader('Content-Type', fileRecord.mimeType)

    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        message: {
          select: {
            id: true,
            conversationId: true,
            senderId: true
          }
        }
      }
    })

    if (!file) {
      return res.status(404).json({ success: false, message: '文件不存在' })
    }

    if (file.message) {
      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: file.message.conversationId,
            userId
          }
        }
      })

      if (!member && file.uploadedById !== userId) {
        return res.status(403).json({ success: false, message: '无权访问此文件' })
      }
    } else if (file.uploadedById !== userId) {
      return res.status(403).json({ success: false, message: '无权访问此文件' })
    }

    if (file.expiresAt && new Date() > file.expiresAt) {
      return res.status(404).json({ success: false, message: '文件已过期' })
    }

    res.json({
      success: true,
      data: {
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        thumbnail: file.thumbnail,
        icon: getFileIcon(file.originalName),
        isImage: isImage(file.mimeType),
        uploadedBy: file.uploadedBy,
        message: file.message,
        expiresAt: file.expiresAt,
        createdAt: file.createdAt
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const file = await prisma.file.findUnique({
      where: { id }
    })

    if (!file) {
      return res.status(404).json({ success: false, message: '文件不存在' })
    }

    if (file.uploadedById !== userId) {
      return res.status(403).json({ success: false, message: '无权删除此文件' })
    }

    const filePath = path.join(process.cwd(), uploadPath, file.name)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await prisma.file.delete({ where: { id } })

    res.json({ success: true, data: { message: '文件已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/icon/:filename', (req, res) => {
  const { filename } = req.params
  const icon = getFileIcon(filename)
  res.json({ success: true, data: { icon, filename } })
})

export default router
