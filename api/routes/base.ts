import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/buildings', authMiddleware, (req: Request, res: Response): void => {
  const buildings = db.prepare(
    `SELECT b.*, c.name as property_company_name
     FROM buildings b
     LEFT JOIN companies c ON b.property_company_id = c.id
     ORDER BY b.id`
  ).all()

  res.json({ success: true, data: buildings })
})

router.get('/elevators', authMiddleware, (req: Request, res: Response): void => {
  const { building_id } = req.query

  let elevators: any[]
  if (building_id) {
    elevators = db.prepare(
      `SELECT e.*, b.name as building_name
       FROM elevators e
       LEFT JOIN buildings b ON e.building_id = b.id
       WHERE e.building_id = ?
       ORDER BY e.id`
    ).all(building_id)
  } else {
    elevators = db.prepare(
      `SELECT e.*, b.name as building_name
       FROM elevators e
       LEFT JOIN buildings b ON e.building_id = b.id
       ORDER BY e.id`
    ).all()
  }

  res.json({ success: true, data: elevators })
})

router.get('/vehicles', authMiddleware, requireRole('transport'), (req: Request, res: Response): void => {
  const vehicles = db.prepare(
    'SELECT * FROM vehicles WHERE company_id = ? ORDER BY id'
  ).all(req.user!.company_id)

  res.json({ success: true, data: vehicles })
})

router.get('/drivers', authMiddleware, requireRole('transport'), (req: Request, res: Response): void => {
  const drivers = db.prepare(
    "SELECT id, phone, name, role, company_id FROM users WHERE role = 'driver' AND company_id = ?"
  ).all(req.user!.company_id)

  res.json({ success: true, data: drivers })
})

export default router
