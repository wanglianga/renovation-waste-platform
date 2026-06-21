import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/prohibited-items', authMiddleware, (req: Request, res: Response): void => {
  const user = req.user!

  let items: any[]
  if (user.role === 'driver') {
    items = db.prepare(
      `SELECT pi.*, a.waste_type, a.scheduled_time, a.building_location,
              u.name as driver_name, u.phone as driver_phone,
              b.name as building_name,
              pu.name as confirm_user_name
       FROM prohibited_items pi
       LEFT JOIN appointments a ON pi.appointment_id = a.id
       LEFT JOIN users u ON pi.driver_id = u.id
       LEFT JOIN dispatches d ON (SELECT dispatch_id FROM executions WHERE id = pi.execution_id) = d.id
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users pu ON pi.property_confirmed_by = pu.id
       WHERE pi.driver_id = ?
       ORDER BY pi.created_at DESC`
    ).all(user.id)
  } else if (user.role === 'owner') {
    items = db.prepare(
      `SELECT pi.*, a.waste_type, a.scheduled_time, a.building_location,
              u.name as driver_name, u.phone as driver_phone,
              b.name as building_name,
              pu.name as confirm_user_name
       FROM prohibited_items pi
       LEFT JOIN appointments a ON pi.appointment_id = a.id
       LEFT JOIN users u ON pi.driver_id = u.id
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users pu ON pi.property_confirmed_by = pu.id
       WHERE a.owner_id = ?
       ORDER BY pi.created_at DESC`
    ).all(user.id)
  } else {
    items = db.prepare(
      `SELECT pi.*, a.waste_type, a.scheduled_time, a.building_location,
              u.name as driver_name, u.phone as driver_phone,
              b.name as building_name,
              pu.name as confirm_user_name
       FROM prohibited_items pi
       LEFT JOIN appointments a ON pi.appointment_id = a.id
       LEFT JOIN users u ON pi.driver_id = u.id
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users pu ON pi.property_confirmed_by = pu.id
       ORDER BY pi.created_at DESC`
    ).all()
  }

  res.json({ success: true, data: items })
})

router.get('/prohibited-items/:id', authMiddleware, (req: Request, res: Response): void => {
  const item = db.prepare(
    `SELECT pi.*, a.waste_type, a.scheduled_time, a.building_location, a.owner_id,
            u.name as driver_name, u.phone as driver_phone,
            b.name as building_name, b.address as building_address,
            pu.name as confirm_user_name,
            v.plate_number, v.vehicle_type
     FROM prohibited_items pi
     LEFT JOIN appointments a ON pi.appointment_id = a.id
     LEFT JOIN users u ON pi.driver_id = u.id
     LEFT JOIN filings f ON a.filing_id = f.id
     LEFT JOIN buildings b ON f.building_id = b.id
     LEFT JOIN users pu ON pi.property_confirmed_by = pu.id
     LEFT JOIN executions e ON pi.execution_id = e.id
     LEFT JOIN dispatches d ON e.dispatch_id = d.id
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     WHERE pi.id = ?`
  ).get(req.params.id) as any

  if (!item) {
    res.status(404).json({ success: false, error: '禁收物记录不存在' })
    return
  }

  res.json({ success: true, data: item })
})

router.post('/prohibited-items', authMiddleware, requireRole('driver'), (req: Request, res: Response): void => {
  const { execution_id, item_type, description, photos } = req.body

  if (!execution_id || !item_type) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const validItemTypes = ['paint', 'battery', 'glue', 'other']
  if (!validItemTypes.includes(item_type)) {
    res.status(400).json({ success: false, error: '无效的禁收物类型' })
    return
  }

  const execution = db.prepare('SELECT * FROM executions WHERE id = ?').get(execution_id) as any
  if (!execution) {
    res.status(404).json({ success: false, error: '执行记录不存在' })
    return
  }

  const dispatch = db.prepare('SELECT * FROM dispatches WHERE id = ?').get(execution.dispatch_id) as any
  if (!dispatch) {
    res.status(400).json({ success: false, error: '关联调度不存在' })
    return
  }

  try {
    const result = db.prepare(
      'INSERT INTO prohibited_items (execution_id, appointment_id, driver_id, item_type, description, photos) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(execution_id, dispatch.appointment_id, req.user!.id, item_type, description || null, photos || null)

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/prohibited-items/:id/confirm', authMiddleware, requireRole('property'), (req: Request, res: Response): void => {
  const { handler_type, fee_impact, additional_fee, description } = req.body

  if (!handler_type) {
    res.status(400).json({ success: false, error: '缺少处理方式' })
    return
  }

  const validHandlerTypes = ['return', 'surcharge', 'special']
  if (!validHandlerTypes.includes(handler_type)) {
    res.status(400).json({ success: false, error: '无效的处理方式' })
    return
  }

  const item = db.prepare('SELECT * FROM prohibited_items WHERE id = ?').get(req.params.id) as any
  if (!item) {
    res.status(404).json({ success: false, error: '禁收物记录不存在' })
    return
  }

  if (item.status !== 'reported') {
    res.status(400).json({ success: false, error: '该记录已处理' })
    return
  }

  try {
    const statusMap: Record<string, string> = {
      return: 'returned',
      surcharge: 'surcharged',
      special: 'special_handled',
    }

    db.prepare(
      `UPDATE prohibited_items
       SET status = ?, handler_type = ?, fee_impact = ?, additional_fee = ?,
           property_confirmed_by = ?, property_confirmed_at = datetime('now'),
           owner_notified = 1, description = COALESCE(?, description)
       WHERE id = ?`
    ).run(
      statusMap[handler_type],
      handler_type,
      fee_impact || 'none',
      additional_fee || 0,
      req.user!.id,
      description || null,
      req.params.id
    )

    res.json({ success: true, data: { id: req.params.id, status: statusMap[handler_type] } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/entry-blockages', authMiddleware, (req: Request, res: Response): void => {
  const user = req.user!

  let items: any[]
  if (user.role === 'driver') {
    items = db.prepare(
      `SELECT eb.*, a.waste_type, a.scheduled_time, a.building_location,
              u.name as driver_name, u.phone as driver_phone,
              b.name as building_name,
              ptu.name as trace_user_name
       FROM entry_blockages eb
       LEFT JOIN appointments a ON eb.appointment_id = a.id
       LEFT JOIN users u ON eb.driver_id = u.id
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users ptu ON eb.property_traced_by = ptu.id
       WHERE eb.driver_id = ?
       ORDER BY eb.created_at DESC`
    ).all(user.id)
  } else if (user.role === 'owner') {
    items = db.prepare(
      `SELECT eb.*, a.waste_type, a.scheduled_time, a.building_location,
              u.name as driver_name, u.phone as driver_phone,
              b.name as building_name,
              ptu.name as trace_user_name
       FROM entry_blockages eb
       LEFT JOIN appointments a ON eb.appointment_id = a.id
       LEFT JOIN users u ON eb.driver_id = u.id
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users ptu ON eb.property_traced_by = ptu.id
       WHERE a.owner_id = ?
       ORDER BY eb.created_at DESC`
    ).all(user.id)
  } else if (user.role === 'transport') {
    items = db.prepare(
      `SELECT eb.*, a.waste_type, a.scheduled_time, a.building_location,
              u.name as driver_name, u.phone as driver_phone,
              b.name as building_name,
              ptu.name as trace_user_name
       FROM entry_blockages eb
       LEFT JOIN appointments a ON eb.appointment_id = a.id
       LEFT JOIN users u ON eb.driver_id = u.id
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users ptu ON eb.property_traced_by = ptu.id
       LEFT JOIN executions e ON eb.execution_id = e.id
       LEFT JOIN dispatches d ON e.dispatch_id = d.id
       WHERE d.company_id = ?
       ORDER BY eb.created_at DESC`
    ).all(user.company_id)
  } else {
    items = db.prepare(
      `SELECT eb.*, a.waste_type, a.scheduled_time, a.building_location,
              u.name as driver_name, u.phone as driver_phone,
              b.name as building_name,
              ptu.name as trace_user_name
       FROM entry_blockages eb
       LEFT JOIN appointments a ON eb.appointment_id = a.id
       LEFT JOIN users u ON eb.driver_id = u.id
       LEFT JOIN filings f ON a.filing_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       LEFT JOIN users ptu ON eb.property_traced_by = ptu.id
       ORDER BY eb.created_at DESC`
    ).all()
  }

  res.json({ success: true, data: items })
})

router.get('/entry-blockages/:id', authMiddleware, (req: Request, res: Response): void => {
  const item = db.prepare(
    `SELECT eb.*, a.waste_type, a.scheduled_time, a.building_location, a.owner_id,
            u.name as driver_name, u.phone as driver_phone,
            b.name as building_name, b.address as building_address,
            ptu.name as trace_user_name,
            v.plate_number, v.vehicle_type
     FROM entry_blockages eb
     LEFT JOIN appointments a ON eb.appointment_id = a.id
     LEFT JOIN users u ON eb.driver_id = u.id
     LEFT JOIN filings f ON a.filing_id = f.id
     LEFT JOIN buildings b ON f.building_id = b.id
     LEFT JOIN users ptu ON eb.property_traced_by = ptu.id
     LEFT JOIN executions e ON eb.execution_id = e.id
     LEFT JOIN dispatches d ON e.dispatch_id = d.id
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     WHERE eb.id = ?`
  ).get(req.params.id) as any

  if (!item) {
    res.status(404).json({ success: false, error: '进场受阻记录不存在' })
    return
  }

  res.json({ success: true, data: item })
})

router.post('/entry-blockages', authMiddleware, requireRole('driver'), (req: Request, res: Response): void => {
  const { execution_id, blockage_type, description, arrival_time, photos } = req.body

  if (!execution_id || !blockage_type || !arrival_time) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const validBlockageTypes = ['elevator_repair', 'garage_height', 'road_restriction', 'owner_absent', 'other']
  if (!validBlockageTypes.includes(blockage_type)) {
    res.status(400).json({ success: false, error: '无效的受阻类型' })
    return
  }

  const execution = db.prepare('SELECT * FROM executions WHERE id = ?').get(execution_id) as any
  if (!execution) {
    res.status(404).json({ success: false, error: '执行记录不存在' })
    return
  }

  const dispatch = db.prepare('SELECT * FROM dispatches WHERE id = ?').get(execution.dispatch_id) as any
  if (!dispatch) {
    res.status(400).json({ success: false, error: '关联调度不存在' })
    return
  }

  try {
    const result = db.prepare(
      'INSERT INTO entry_blockages (execution_id, appointment_id, driver_id, blockage_type, description, arrival_time, photos) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(execution_id, dispatch.appointment_id, req.user!.id, blockage_type, description || null, arrival_time, photos || null)

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/entry-blockages/:id/rearrange', authMiddleware, requireRole('transport'), (req: Request, res: Response): void => {
  const { vehicle_id, driver_id, dispatch_time, property_responsibility } = req.body

  if (!vehicle_id || !driver_id || !dispatch_time) {
    res.status(400).json({ success: false, error: '缺少重新调度必填字段' })
    return
  }

  const blockage = db.prepare('SELECT * FROM entry_blockages WHERE id = ?').get(req.params.id) as any
  if (!blockage) {
    res.status(404).json({ success: false, error: '进场受阻记录不存在' })
    return
  }

  if (blockage.status !== 'reported') {
    res.status(400).json({ success: false, error: '该记录已处理' })
    return
  }

  try {
    const transaction = db.transaction(() => {
      const dispatchResult = db.prepare(
        'INSERT INTO dispatches (appointment_id, company_id, vehicle_id, driver_id, dispatch_time) VALUES (?, ?, ?, ?, ?)'
      ).run(blockage.appointment_id, req.user!.company_id, vehicle_id, driver_id, dispatch_time)

      db.prepare(
        'INSERT INTO executions (dispatch_id, driver_id) VALUES (?, ?)'
      ).run(dispatchResult.lastInsertRowid, driver_id)

      db.prepare(
        `UPDATE entry_blockages
         SET status = 'rearranged', rearranged_dispatch_id = ?, rearranged_time = ?,
             property_responsibility = ?, property_traced_by = ?, owner_notified = 1
         WHERE id = ?`
      ).run(dispatchResult.lastInsertRowid, dispatch_time, property_responsibility || 'none', req.user!.id, req.params.id)
    })

    transaction()
    res.json({ success: true, data: { id: req.params.id, status: 'rearranged' } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/entry-blockages/:id/settle-empty-run', authMiddleware, requireRole('transport'), (req: Request, res: Response): void => {
  const { empty_run_fee } = req.body

  if (empty_run_fee == null || empty_run_fee < 0) {
    res.status(400).json({ success: false, error: '请输入有效的空跑费用' })
    return
  }

  const blockage = db.prepare('SELECT * FROM entry_blockages WHERE id = ?').get(req.params.id) as any
  if (!blockage) {
    res.status(404).json({ success: false, error: '进场受阻记录不存在' })
    return
  }

  if (blockage.status !== 'rearranged') {
    res.status(400).json({ success: false, error: '只有已重新安排的记录才能结算空跑费用' })
    return
  }

  try {
    db.prepare(
      'UPDATE entry_blockages SET empty_run_fee = ?, empty_run_settled = 1, status = ? WHERE id = ?'
    ).run(empty_run_fee, 'settled', req.params.id)

    res.json({ success: true, data: { id: req.params.id, status: 'settled' } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/entry-blockages/:id/trace', authMiddleware, requireRole('property'), (req: Request, res: Response): void => {
  const { property_responsibility } = req.body

  if (!property_responsibility) {
    res.status(400).json({ success: false, error: '缺少责任归属' })
    return
  }

  const validResponsibilities = ['none', 'property', 'owner', 'third_party']
  if (!validResponsibilities.includes(property_responsibility)) {
    res.status(400).json({ success: false, error: '无效的责任归属' })
    return
  }

  const blockage = db.prepare('SELECT * FROM entry_blockages WHERE id = ?').get(req.params.id) as any
  if (!blockage) {
    res.status(404).json({ success: false, error: '进场受阻记录不存在' })
    return
  }

  try {
    db.prepare(
      'UPDATE entry_blockages SET property_responsibility = ?, property_traced_by = ? WHERE id = ?'
    ).run(property_responsibility, req.user!.id, req.params.id)

    res.json({ success: true, data: { id: req.params.id } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
