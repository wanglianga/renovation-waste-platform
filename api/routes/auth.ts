import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import db from '../database.js'
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req: Request, res: Response): void => {
  const { phone, password, name, role, company_id } = req.body

  if (!phone || !password || !name || !role) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const validRoles = ['owner', 'property', 'transport', 'driver', 'disposal']
  if (!validRoles.includes(role)) {
    res.status(400).json({ success: false, error: '无效的角色类型' })
    return
  }

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
  if (existing) {
    res.status(400).json({ success: false, error: '该手机号已注册' })
    return
  }

  try {
    const result = db.prepare(
      'INSERT INTO users (phone, password, name, role, company_id) VALUES (?, ?, ?, ?, ?)'
    ).run(phone, password, name, role, company_id || null)

    const token = jwt.sign(
      { id: result.lastInsertRowid, phone, name, role, company_id: company_id || null },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: result.lastInsertRowid, phone, name, role, company_id: company_id || null },
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/login', (req: Request, res: Response): void => {
  const { phone, password } = req.body

  if (!phone || !password) {
    res.status(400).json({ success: false, error: '缺少手机号或密码' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any
  if (!user) {
    res.status(401).json({ success: false, error: '手机号或密码错误' })
    return
  }

  if (user.password !== password) {
    res.status(401).json({ success: false, error: '手机号或密码错误' })
    return
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone, name: user.name, role: user.role, company_id: user.company_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
      },
    },
  })
})

router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  const user = db.prepare('SELECT id, phone, name, role, company_id FROM users WHERE id = ?').get(req.user!.id) as any

  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }

  res.json({ success: true, data: user })
})

export default router
