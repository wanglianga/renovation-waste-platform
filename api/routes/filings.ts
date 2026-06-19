import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const user = req.user!

  let filings: any[]
  if (user.role === 'owner') {
    filings = db.prepare(
      `SELECT f.*, b.name as building_name, e.name as elevator_name, u.name as owner_name
       FROM filings f
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN elevators e ON f.elevator_id = e.id
       LEFT JOIN users u ON f.owner_id = u.id
       WHERE f.owner_id = ?
       ORDER BY f.created_at DESC`
    ).all(user.id)
  } else if (user.role === 'property') {
    filings = db.prepare(
      `SELECT f.*, b.name as building_name, e.name as elevator_name, u.name as owner_name
       FROM filings f
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN elevators e ON f.elevator_id = e.id
       LEFT JOIN users u ON f.owner_id = u.id
       ORDER BY f.created_at DESC`
    ).all()
  } else {
    filings = db.prepare(
      `SELECT f.*, b.name as building_name, e.name as elevator_name, u.name as owner_name
       FROM filings f
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN elevators e ON f.elevator_id = e.id
       LEFT JOIN users u ON f.owner_id = u.id
       ORDER BY f.created_at DESC`
    ).all()
  }

  res.json({ success: true, data: filings })
})

router.get('/:id', authMiddleware, (req: Request, res: Response): void => {
  const filing = db.prepare(
    `SELECT f.*, b.name as building_name, b.address as building_address, e.name as elevator_name, e.available_hours as elevator_hours_default, u.name as owner_name, u.phone as owner_phone, a.name as approver_name
     FROM filings f
     LEFT JOIN buildings b ON f.building_id = b.id
     LEFT JOIN elevators e ON f.elevator_id = e.id
     LEFT JOIN users u ON f.owner_id = u.id
     LEFT JOIN users a ON f.approved_by = a.id
     WHERE f.id = ?`
  ).get(req.params.id)

  if (!filing) {
    res.status(404).json({ success: false, error: '备案不存在' })
    return
  }

  res.json({ success: true, data: filing })
})

router.post('/', authMiddleware, requireRole('owner'), (req: Request, res: Response): void => {
  const { building_id, elevator_id, renovation_start, renovation_end, waste_types } = req.body

  if (!building_id || !renovation_start || !renovation_end || !waste_types) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  try {
    const result = db.prepare(
      'INSERT INTO filings (owner_id, building_id, elevator_id, renovation_start, renovation_end, waste_types) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user!.id, building_id, elevator_id || null, renovation_start, renovation_end, waste_types)

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/approve', authMiddleware, requireRole('property'), (req: Request, res: Response): void => {
  const { approved_route, elevator_hours } = req.body

  if (!approved_route) {
    res.status(400).json({ success: false, error: '缺少审批路线' })
    return
  }

  const filing = db.prepare('SELECT * FROM filings WHERE id = ?').get(req.params.id) as any
  if (!filing) {
    res.status(404).json({ success: false, error: '备案不存在' })
    return
  }

  if (filing.status !== 'pending') {
    res.status(400).json({ success: false, error: '该备案已处理' })
    return
  }

  db.prepare(
    'UPDATE filings SET status = ?, approved_route = ?, elevator_hours = ?, approved_by = ? WHERE id = ?'
  ).run('approved', approved_route, elevator_hours || null, req.user!.id, req.params.id)

  res.json({ success: true, data: { id: req.params.id, status: 'approved' } })
})

router.put('/:id/reject', authMiddleware, requireRole('property'), (req: Request, res: Response): void => {
  const filing = db.prepare('SELECT * FROM filings WHERE id = ?').get(req.params.id) as any
  if (!filing) {
    res.status(404).json({ success: false, error: '备案不存在' })
    return
  }

  if (filing.status !== 'pending') {
    res.status(400).json({ success: false, error: '该备案已处理' })
    return
  }

  db.prepare('UPDATE filings SET status = ?, approved_by = ? WHERE id = ?').run('rejected', req.user!.id, req.params.id)

  res.json({ success: true, data: { id: req.params.id, status: 'rejected' } })
})

export default router
