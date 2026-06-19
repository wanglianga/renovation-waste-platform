import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const user = req.user!

  let executions: any[]
  if (user.role === 'driver') {
    executions = db.prepare(
      `SELECT e.*, d.appointment_id, d.dispatch_time, d.status as dispatch_status,
              a.waste_type, a.scheduled_time, a.building_location
       FROM executions e
       LEFT JOIN dispatches d ON e.dispatch_id = d.id
       LEFT JOIN appointments a ON d.appointment_id = a.id
       WHERE e.driver_id = ?
       ORDER BY e.created_at DESC`
    ).all(user.id)
  } else if (user.role === 'transport') {
    executions = db.prepare(
      `SELECT e.*, d.appointment_id, d.dispatch_time, d.company_id, d.status as dispatch_status,
              a.waste_type, a.scheduled_time, a.building_location
       FROM executions e
       LEFT JOIN dispatches d ON e.dispatch_id = d.id
       LEFT JOIN appointments a ON d.appointment_id = a.id
       WHERE d.company_id = ?
       ORDER BY e.created_at DESC`
    ).all(user.company_id)
  } else {
    executions = db.prepare(
      `SELECT e.*, d.appointment_id, d.dispatch_time, d.status as dispatch_status,
              a.waste_type, a.scheduled_time, a.building_location
       FROM executions e
       LEFT JOIN dispatches d ON e.dispatch_id = d.id
       LEFT JOIN appointments a ON d.appointment_id = a.id
       ORDER BY e.created_at DESC`
    ).all()
  }

  res.json({ success: true, data: executions })
})

router.get('/:id', authMiddleware, (req: Request, res: Response): void => {
  const execution = db.prepare(
    `SELECT e.*, d.appointment_id, d.dispatch_time, d.status as dispatch_status,
            a.waste_type, a.scheduled_time, a.building_location,
            v.plate_number, v.vehicle_type
     FROM executions e
     LEFT JOIN dispatches d ON e.dispatch_id = d.id
     LEFT JOIN appointments a ON d.appointment_id = a.id
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     WHERE e.id = ?`
  ).get(req.params.id) as any

  if (!execution) {
    res.status(404).json({ success: false, error: '执行记录不存在' })
    return
  }

  const weights = db.prepare('SELECT * FROM execution_weights WHERE execution_id = ?').all(req.params.id)

  res.json({ success: true, data: { ...execution, weights } })
})

router.put('/:id/load', authMiddleware, requireRole('driver'), (req: Request, res: Response): void => {
  const { load_photos } = req.body

  const execution = db.prepare('SELECT * FROM executions WHERE id = ?').get(req.params.id) as any
  if (!execution) {
    res.status(404).json({ success: false, error: '执行记录不存在' })
    return
  }

  if (execution.status !== 'loading') {
    res.status(400).json({ success: false, error: '当前状态不允许装车操作' })
    return
  }

  db.prepare('UPDATE executions SET load_photos = ?, status = ? WHERE id = ?').run(load_photos || null, 'weighing', req.params.id)

  res.json({ success: true, data: { id: req.params.id, status: 'weighing' } })
})

router.put('/:id/weigh', authMiddleware, requireRole('driver'), (req: Request, res: Response): void => {
  const { weights, weigh_photos } = req.body

  if (!weights || !Array.isArray(weights) || weights.length === 0) {
    res.status(400).json({ success: false, error: '缺少称重数据' })
    return
  }

  const execution = db.prepare('SELECT * FROM executions WHERE id = ?').get(req.params.id) as any
  if (!execution) {
    res.status(404).json({ success: false, error: '执行记录不存在' })
    return
  }

  if (execution.status !== 'weighing') {
    res.status(400).json({ success: false, error: '当前状态不允许称重操作' })
    return
  }

  try {
    const transaction = db.transaction(() => {
      const insertWeight = db.prepare(
        'INSERT INTO execution_weights (execution_id, waste_type, gross_weight, tare_weight, net_weight) VALUES (?, ?, ?, ?, ?)'
      )

      let totalGross = 0
      let totalTare = 0
      let totalNet = 0

      for (const w of weights) {
        if (!w.waste_type || w.gross_weight == null || w.tare_weight == null) continue
        const netWeight = w.gross_weight - w.tare_weight
        insertWeight.run(req.params.id, w.waste_type, w.gross_weight, w.tare_weight, netWeight)
        totalGross += w.gross_weight
        totalTare += w.tare_weight
        totalNet += netWeight
      }

      db.prepare(
        'UPDATE executions SET gross_weight = ?, tare_weight = ?, net_weight = ?, weigh_photos = ?, status = ? WHERE id = ?'
      ).run(totalGross, totalTare, totalNet, weigh_photos || null, 'transporting', req.params.id)

      const dispatch = db.prepare('SELECT appointment_id FROM dispatches WHERE id = ?').get(execution.dispatch_id) as any
      if (dispatch) {
        db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('executing', dispatch.appointment_id)
      }
    })

    transaction()
    res.json({ success: true, data: { id: req.params.id, status: 'transporting' } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/unload', authMiddleware, requireRole('driver'), (req: Request, res: Response): void => {
  const execution = db.prepare('SELECT * FROM executions WHERE id = ?').get(req.params.id) as any
  if (!execution) {
    res.status(404).json({ success: false, error: '执行记录不存在' })
    return
  }

  if (execution.status !== 'transporting') {
    res.status(400).json({ success: false, error: '当前状态不允许卸货操作' })
    return
  }

  try {
    const transaction = db.transaction(() => {
      db.prepare('UPDATE executions SET unload_time = datetime("now"), status = ? WHERE id = ?').run('unloaded', req.params.id)

      const dispatch = db.prepare('SELECT * FROM dispatches WHERE id = ?').get(execution.dispatch_id) as any
      if (dispatch) {
        const disposalSite = db.prepare("SELECT u.id FROM users u WHERE u.role = 'disposal' LIMIT 1").get() as any
        if (disposalSite) {
          db.prepare(
            'INSERT INTO disposals (execution_id, disposal_site_id) VALUES (?, ?)'
          ).run(execution.id, disposalSite.id)
        }
      }
    })

    transaction()
    res.json({ success: true, data: { id: req.params.id, status: 'unloaded' } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
