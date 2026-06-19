import { Router, type Request, type Response } from 'express'
import upload from '../middleware/upload.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/', authMiddleware, upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '请选择要上传的文件' })
    return
  }

  const filePath = `/uploads/${req.file.filename}`

  res.json({ success: true, data: { path: filePath, originalName: req.file.originalname } })
})

router.post('/multiple', authMiddleware, upload.array('files', 10), (req: Request, res: Response): void => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({ success: false, error: '请选择要上传的文件' })
    return
  }

  const files = (req.files as Express.Multer.File[]).map(f => ({
    path: `/uploads/${f.filename}`,
    originalName: f.originalname,
  }))

  res.json({ success: true, data: files })
})

export default router
