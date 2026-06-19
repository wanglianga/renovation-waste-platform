import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const user = req.user!

  let disposals: any[]
  if (user.role === 'disposal') {
    disposals = db.prepare(
      `SELECT dp.*, e.gross_weight, e.net_weight, e.status as execution_status, e.load_photos, e.weigh_photos,
              d.appointment_id, a.waste_type, a.scheduled_time, a.building_location,
              v.plate_number, dr.name as driver_name
       FROM disposals dp
       LEFT JOIN executions e ON dp.execution_id = e.id
       LEFT JOIN dispatches d ON e.dispatch_id = d.id
       LEFT JOIN appointments a ON d.appointment_id = a.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN users dr ON d.driver_id = dr.id
       WHERE dp.disposal_site_id = ?
       ORDER BY dp.created_at DESC`
    ).all(user.id)
  } else {
    disposals = db.prepare(
      `SELECT dp.*, e.gross_weight, e.net_weight, e.status as execution_status, e.load_photos, e.weigh_photos,
              d.appointment_id, a.waste_type, a.scheduled_time, a.building_location,
              v.plate_number, dr.name as driver_name
       FROM disposals dp
       LEFT JOIN executions e ON dp.execution_id = e.id
       LEFT JOIN dispatches d ON e.dispatch_id = d.id
       LEFT JOIN appointments a ON d.appointment_id = a.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN users dr ON d.driver_id = dr.id
       ORDER BY dp.created_at DESC`
    ).all()
  }

  res.json({ success: true, data: disposals })
})

router.get('/:id', authMiddleware, (req: Request, res: Response): void => {
  const disposal = db.prepare(
    `SELECT dp.*, e.gross_weight, e.tare_weight, e.net_weight, e.status as execution_status,
            e.load_photos, e.weigh_photos, e.unload_time,
            d.appointment_id, d.dispatch_time,
            a.waste_type, a.scheduled_time, a.building_location,
            v.plate_number, v.vehicle_type, dr.name as driver_name, dr.phone as driver_phone
     FROM disposals dp
     LEFT JOIN executions e ON dp.execution_id = e.id
     LEFT JOIN dispatches d ON e.dispatch_id = d.id
     LEFT JOIN appointments a ON d.appointment_id = a.id
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     LEFT JOIN users dr ON d.driver_id = dr.id
     WHERE dp.id = ?`
  ).get(req.params.id) as any

  if (!disposal) {
    res.status(404).json({ success: false, error: '消纳记录不存在' })
    return
  }

  const weights = db.prepare('SELECT * FROM execution_weights WHERE execution_id = ?').all(disposal.execution_id)

  res.json({ success: true, data: { ...disposal, weights } })
})

router.put('/:id/confirm', authMiddleware, requireRole('disposal'), (req: Request, res: Response): void => {
  const disposal = db.prepare('SELECT * FROM disposals WHERE id = ?').get(req.params.id) as any
  if (!disposal) {
    res.status(404).json({ success: false, error: '消纳记录不存在' })
    return
  }

  if (disposal.status !== 'pending') {
    res.status(400).json({ success: false, error: '该消纳记录已处理' })
    return
  }

  try {
    const transaction = db.transaction(() => {
      db.prepare('UPDATE disposals SET confirm_time = datetime("now"), status = ? WHERE id = ?').run('confirmed', req.params.id)

      db.prepare('UPDATE executions SET status = ? WHERE id = ?').run('completed', disposal.execution_id)

      const dispatch = db.prepare('SELECT appointment_id FROM dispatches d INNER JOIN executions e ON e.dispatch_id = d.id WHERE e.id = ?').get(disposal.execution_id) as any
      if (dispatch) {
        db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('completed', dispatch.appointment_id)
      }
    })

    transaction()
    res.json({ success: true, data: { id: req.params.id, status: 'confirmed' } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/weighbill', authMiddleware, requireRole('disposal'), (req: Request, res: Response): void => {
  const { weighbill_photo } = req.body

  if (!weighbill_photo) {
    res.status(400).json({ success: false, error: '缺少磅单照片' })
    return
  }

  const disposal = db.prepare('SELECT * FROM disposals WHERE id = ?').get(req.params.id) as any
  if (!disposal) {
    res.status(404).json({ success: false, error: '消纳记录不存在' })
    return
  }

  db.prepare('UPDATE disposals SET weighbill_photo = ? WHERE id = ?').run(weighbill_photo, req.params.id)

  res.json({ success: true, data: { id: req.params.id } })
})

router.put('/:id/receipt', authMiddleware, requireRole('disposal'), (req: Request, res: Response): void => {
  const { receipt_photo } = req.body

  if (!receipt_photo) {
    res.status(400).json({ success: false, error: '缺少回执照片' })
    return
  }

  const disposal = db.prepare('SELECT * FROM disposals WHERE id = ?').get(req.params.id) as any
  if (!disposal) {
    res.status(404).json({ success: false, error: '消纳记录不存在' })
    return
  }

  db.prepare('UPDATE disposals SET receipt_photo = ? WHERE id = ?').run(receipt_photo, req.params.id)

  res.json({ success: true, data: { id: req.params.id } })
})

router.put('/:id/settle', authMiddleware, requireRole('disposal'), (req: Request, res: Response): void => {
  const { items } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: '缺少结算明细' })
    return
  }

  const disposal = db.prepare('SELECT * FROM disposals WHERE id = ?').get(req.params.id) as any
  if (!disposal) {
    res.status(404).json({ success: false, error: '消纳记录不存在' })
    return
  }

  if (disposal.status !== 'confirmed') {
    res.status(400).json({ success: false, error: '消纳记录未确认，无法结算' })
    return
  }

  try {
    const transaction = db.transaction(() => {
      const insertSettlement = db.prepare(
        'INSERT INTO settlements (disposal_id, transport_fee, disposal_fee, total_fee, waste_type, weight) VALUES (?, ?, ?, ?, ?, ?)'
      )

      let totalDisposalFee = 0
      for (const item of items) {
        const transportFee = item.transport_fee || 0
        const disposalFee = item.disposal_fee || 0
        const totalFee = transportFee + disposalFee
        totalDisposalFee += disposalFee
        insertSettlement.run(req.params.id, transportFee, disposalFee, totalFee, item.waste_type, item.weight || 0)
      }

      db.prepare('UPDATE disposals SET disposal_fee = ?, status = ? WHERE id = ?').run(totalDisposalFee, 'settled', req.params.id)
    })

    transaction()
    res.json({ success: true, data: { id: req.params.id, status: 'settled' } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
