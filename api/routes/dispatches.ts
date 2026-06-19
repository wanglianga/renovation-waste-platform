import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const user = req.user!

  let dispatches: any[]
  if (user.role === 'transport') {
    dispatches = db.prepare(
      `SELECT d.*, a.waste_type, a.scheduled_time, a.building_location, a.status as appointment_status,
              v.plate_number, v.vehicle_type, dr.name as driver_name, dr.phone as driver_phone,
              u.name as owner_name
       FROM dispatches d
       LEFT JOIN appointments a ON d.appointment_id = a.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN users dr ON d.driver_id = dr.id
       LEFT JOIN users u ON a.owner_id = u.id
       WHERE d.company_id = ?
       ORDER BY d.created_at DESC`
    ).all(user.company_id)
  } else if (user.role === 'driver') {
    dispatches = db.prepare(
      `SELECT d.*, a.waste_type, a.scheduled_time, a.building_location, a.status as appointment_status,
              v.plate_number, v.vehicle_type, dr.name as driver_name, dr.phone as driver_phone,
              u.name as owner_name
       FROM dispatches d
       LEFT JOIN appointments a ON d.appointment_id = a.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN users dr ON d.driver_id = dr.id
       LEFT JOIN users u ON a.owner_id = u.id
       WHERE d.driver_id = ?
       ORDER BY d.created_at DESC`
    ).all(user.id)
  } else {
    dispatches = db.prepare(
      `SELECT d.*, a.waste_type, a.scheduled_time, a.building_location, a.status as appointment_status,
              v.plate_number, v.vehicle_type, dr.name as driver_name, dr.phone as driver_phone,
              u.name as owner_name
       FROM dispatches d
       LEFT JOIN appointments a ON d.appointment_id = a.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN users dr ON d.driver_id = dr.id
       LEFT JOIN users u ON a.owner_id = u.id
       ORDER BY d.created_at DESC`
    ).all()
  }

  res.json({ success: true, data: dispatches })
})

router.get('/:id', authMiddleware, (req: Request, res: Response): void => {
  const dispatch = db.prepare(
    `SELECT d.*, a.waste_type, a.scheduled_time, a.building_location, a.status as appointment_status,
            v.plate_number, v.vehicle_type, v.max_weight, dr.name as driver_name, dr.phone as driver_phone,
            u.name as owner_name, u.phone as owner_phone
     FROM dispatches d
     LEFT JOIN appointments a ON d.appointment_id = a.id
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     LEFT JOIN users dr ON d.driver_id = dr.id
     LEFT JOIN users u ON a.owner_id = u.id
     WHERE d.id = ?`
  ).get(req.params.id)

  if (!dispatch) {
    res.status(404).json({ success: false, error: '调度不存在' })
    return
  }

  res.json({ success: true, data: dispatch })
})

router.post('/', authMiddleware, requireRole('transport'), (req: Request, res: Response): void => {
  const { appointment_id, vehicle_id, driver_id, dispatch_time } = req.body

  if (!appointment_id || !vehicle_id || !driver_id || !dispatch_time) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment_id) as any
  if (!appointment) {
    res.status(404).json({ success: false, error: '预约不存在' })
    return
  }

  if (appointment.status !== 'approved') {
    res.status(400).json({ success: false, error: '预约未审批通过，无法调度' })
    return
  }

  try {
    const transaction = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO dispatches (appointment_id, company_id, vehicle_id, driver_id, dispatch_time) VALUES (?, ?, ?, ?, ?)'
      ).run(appointment_id, req.user!.company_id, vehicle_id, driver_id, dispatch_time)

      db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('dispatched', appointment_id)

      db.prepare(
        'INSERT INTO executions (dispatch_id, driver_id) VALUES (?, ?)'
      ).run(result.lastInsertRowid, driver_id)

      return result
    })

    const result = transaction()
    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id', authMiddleware, requireRole('transport'), (req: Request, res: Response): void => {
  const { vehicle_id, driver_id, dispatch_time, status } = req.body

  const dispatch = db.prepare('SELECT * FROM dispatches WHERE id = ?').get(req.params.id) as any
  if (!dispatch) {
    res.status(404).json({ success: false, error: '调度不存在' })
    return
  }

  try {
    db.prepare(
      'UPDATE dispatches SET vehicle_id = ?, driver_id = ?, dispatch_time = ?, status = ? WHERE id = ?'
    ).run(vehicle_id || dispatch.vehicle_id, driver_id || dispatch.driver_id, dispatch_time || dispatch.dispatch_time, status || dispatch.status, req.params.id)

    res.json({ success: true, data: { id: req.params.id } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
