import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const settlements = db.prepare(
    `SELECT s.*, dp.confirm_time, dp.weighbill_photo, dp.receipt_photo, dp.disposal_fee as disposal_confirm_fee,
            e.net_weight as execution_net_weight,
            a.waste_type as appointment_waste_type, a.scheduled_time, a.building_location,
            v.plate_number, dr.name as driver_name, u.name as owner_name
     FROM settlements s
     LEFT JOIN disposals dp ON s.disposal_id = dp.id
     LEFT JOIN executions e ON dp.execution_id = e.id
     LEFT JOIN dispatches d ON e.dispatch_id = d.id
     LEFT JOIN appointments a ON d.appointment_id = a.id
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     LEFT JOIN users dr ON d.driver_id = dr.id
     LEFT JOIN users u ON a.owner_id = u.id
     ORDER BY s.created_at DESC`
  ).all()

  res.json({ success: true, data: settlements })
})

router.get('/:id', authMiddleware, (req: Request, res: Response): void => {
  const settlement = db.prepare(
    `SELECT s.*, dp.confirm_time, dp.weighbill_photo, dp.receipt_photo, dp.disposal_fee as disposal_confirm_fee,
            e.gross_weight, e.tare_weight, e.net_weight as execution_net_weight,
            a.waste_type as appointment_waste_type, a.scheduled_time, a.building_location,
            v.plate_number, v.vehicle_type, dr.name as driver_name, dr.phone as driver_phone,
            u.name as owner_name, u.phone as owner_phone
     FROM settlements s
     LEFT JOIN disposals dp ON s.disposal_id = dp.id
     LEFT JOIN executions e ON dp.execution_id = e.id
     LEFT JOIN dispatches d ON e.dispatch_id = d.id
     LEFT JOIN appointments a ON d.appointment_id = a.id
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     LEFT JOIN users dr ON d.driver_id = dr.id
     LEFT JOIN users u ON a.owner_id = u.id
     WHERE s.id = ?`
  ).get(req.params.id)

  if (!settlement) {
    res.status(404).json({ success: false, error: '结算记录不存在' })
    return
  }

  res.json({ success: true, data: settlement })
})

export default router
