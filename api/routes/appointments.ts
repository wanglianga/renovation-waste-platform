import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const user = req.user!

  let appointments: any[]
  if (user.role === 'owner') {
    appointments = db.prepare(
      `SELECT a.*, f.waste_types as filing_waste_types, f.status as filing_status, f.approved_route,
              b.name as building_name, u.name as owner_name, d.id as dispatch_id
       FROM appointments a
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users u ON a.owner_id = u.id
       LEFT JOIN dispatches d ON d.appointment_id = a.id
       WHERE a.owner_id = ?
       ORDER BY a.created_at DESC`
    ).all(user.id)
  } else if (user.role === 'property') {
    appointments = db.prepare(
      `SELECT a.*, f.waste_types as filing_waste_types, f.status as filing_status, f.approved_route,
              b.name as building_name, u.name as owner_name, d.id as dispatch_id
       FROM appointments a
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users u ON a.owner_id = u.id
       LEFT JOIN dispatches d ON d.appointment_id = a.id
       ORDER BY a.created_at DESC`
    ).all()
  } else if (user.role === 'transport' || user.role === 'driver') {
    appointments = db.prepare(
      `SELECT a.*, f.waste_types as filing_waste_types, f.status as filing_status, f.approved_route,
              b.name as building_name, u.name as owner_name, d.id as dispatch_id
       FROM appointments a
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users u ON a.owner_id = u.id
       LEFT JOIN dispatches d ON d.appointment_id = a.id
       WHERE a.status IN ('approved', 'dispatched', 'executing', 'completed')
       ORDER BY a.created_at DESC`
    ).all()
  } else {
    appointments = db.prepare(
      `SELECT a.*, f.waste_types as filing_waste_types, f.status as filing_status, f.approved_route,
              b.name as building_name, u.name as owner_name, d.id as dispatch_id
       FROM appointments a
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users u ON a.owner_id = u.id
       LEFT JOIN dispatches d ON d.appointment_id = a.id
       ORDER BY a.created_at DESC`
    ).all()
  }

  res.json({ success: true, data: appointments })
})

router.get('/:id', authMiddleware, (req: Request, res: Response): void => {
  const appointment = db.prepare(
    `SELECT a.*, f.waste_types as filing_waste_types, f.renovation_start, f.renovation_end,
            f.approved_route, f.elevator_hours,
            b.name as building_name, b.address as building_address,
            e.name as elevator_name,
            u.name as owner_name, u.phone as owner_phone
     FROM appointments a
     LEFT JOIN filings f ON a.filing_id = f.id
     LEFT JOIN buildings b ON f.building_id = b.id
     LEFT JOIN elevators e ON f.elevator_id = e.id
     LEFT JOIN users u ON a.owner_id = u.id
     WHERE a.id = ?`
  ).get(req.params.id) as any

  if (!appointment) {
    res.status(404).json({ success: false, error: '预约不存在' })
    return
  }

  const dispatch = db.prepare(
    `SELECT d.*, v.plate_number, v.vehicle_type, dr.name as driver_name, dr.phone as driver_phone
     FROM dispatches d
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     LEFT JOIN users dr ON d.driver_id = dr.id
     WHERE d.appointment_id = ?`
  ).get(appointment.id) as any

  res.json({ success: true, data: { ...appointment, dispatch } })
})

router.post('/', authMiddleware, requireRole('owner'), (req: Request, res: Response): void => {
  const { filing_id, waste_type, bag_count, furniture_count, scheduled_time, building_location } = req.body

  if (!filing_id || !waste_type || !scheduled_time || !building_location) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const validWasteTypes = ['construction', 'furniture', 'hazardous']
  if (!validWasteTypes.includes(waste_type)) {
    res.status(400).json({ success: false, error: '无效的垃圾类型' })
    return
  }

  const filing = db.prepare('SELECT * FROM filings WHERE id = ?').get(filing_id) as any
  if (!filing) {
    res.status(404).json({ success: false, error: '备案不存在' })
    return
  }

  if (filing.status !== 'approved') {
    res.status(400).json({ success: false, error: '备案未审批通过' })
    return
  }

  try {
    const result = db.prepare(
      'INSERT INTO appointments (filing_id, owner_id, waste_type, bag_count, furniture_count, scheduled_time, building_location) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(filing_id, req.user!.id, waste_type, bag_count || 0, furniture_count || 0, scheduled_time, building_location)

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/approve', authMiddleware, requireRole('property'), (req: Request, res: Response): void => {
  const { route_approved, elevator_approved } = req.body

  if (!route_approved) {
    res.status(400).json({ success: false, error: '缺少审批路线' })
    return
  }

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as any
  if (!appointment) {
    res.status(404).json({ success: false, error: '预约不存在' })
    return
  }

  if (appointment.status !== 'pending') {
    res.status(400).json({ success: false, error: '该预约已处理' })
    return
  }

  db.prepare(
    'UPDATE appointments SET status = ?, route_approved = ?, elevator_approved = ?, approved_by = ? WHERE id = ?'
  ).run('approved', route_approved, elevator_approved || null, req.user!.id, req.params.id)

  res.json({ success: true, data: { id: req.params.id, status: 'approved' } })
})

router.put('/:id/reject', authMiddleware, requireRole('property'), (req: Request, res: Response): void => {
  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as any
  if (!appointment) {
    res.status(404).json({ success: false, error: '预约不存在' })
    return
  }

  if (appointment.status !== 'pending') {
    res.status(400).json({ success: false, error: '该预约已处理' })
    return
  }

  db.prepare('UPDATE appointments SET status = ?, approved_by = ? WHERE id = ?').run('rejected', req.user!.id, req.params.id)

  res.json({ success: true, data: { id: req.params.id, status: 'rejected' } })
})

export default router
