import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/overview', authMiddleware, (req: Request, res: Response): void => {
  const filingCount = db.prepare('SELECT COUNT(*) as count FROM filings').get() as any
  const filingByStatus = db.prepare("SELECT status, COUNT(*) as count FROM filings GROUP BY status").all()

  const appointmentCount = db.prepare('SELECT COUNT(*) as count FROM appointments').get() as any
  const appointmentByStatus = db.prepare("SELECT status, COUNT(*) as count FROM appointments GROUP BY status").all()

  const dispatchCount = db.prepare('SELECT COUNT(*) as count FROM dispatches').get() as any

  const executionCount = db.prepare('SELECT COUNT(*) as count FROM executions').get() as any
  const totalWeight = db.prepare('SELECT COALESCE(SUM(net_weight), 0) as total FROM executions').get() as any

  const disposalCount = db.prepare('SELECT COUNT(*) as count FROM disposals').get() as any

  const settlementTotal = db.prepare('SELECT COALESCE(SUM(total_fee), 0) as total FROM settlements').get() as any
  const settlementByStatus = db.prepare("SELECT status, COUNT(*) as count, COALESCE(SUM(total_fee), 0) as total FROM settlements GROUP BY status").all()

  res.json({
    success: true,
    data: {
      filings: { total: filingCount.count, byStatus: filingByStatus },
      appointments: { total: appointmentCount.count, byStatus: appointmentByStatus },
      dispatches: { total: dispatchCount.count },
      executions: { total: executionCount.count, totalWeight: totalWeight.total },
      disposals: { total: disposalCount.count },
      settlements: { total: settlementTotal.total, byStatus: settlementByStatus },
    },
  })
})

router.get('/trend', authMiddleware, (req: Request, res: Response): void => {
  const { type = 'daily', days = '30' } = req.query

  const daysNum = Math.min(parseInt(days as string) || 30, 90)

  let dateFormat = '%Y-%m-%d'
  if (type === 'weekly') {
    dateFormat = '%Y-W%W'
  }

  const filingsTrend = db.prepare(
    `SELECT strftime('${dateFormat}', created_at) as period, COUNT(*) as count
     FROM filings
     WHERE created_at >= datetime('now', '-${daysNum} days')
     GROUP BY period ORDER BY period`
  ).all()

  const appointmentsTrend = db.prepare(
    `SELECT strftime('${dateFormat}', created_at) as period, COUNT(*) as count
     FROM appointments
     WHERE created_at >= datetime('now', '-${daysNum} days')
     GROUP BY period ORDER BY period`
  ).all()

  const executionsTrend = db.prepare(
    `SELECT strftime('${dateFormat}', e.created_at) as period, COUNT(*) as count, COALESCE(SUM(e.net_weight), 0) as weight
     FROM executions e
     WHERE e.created_at >= datetime('now', '-${daysNum} days')
     GROUP BY period ORDER BY period`
  ).all()

  res.json({
    success: true,
    data: {
      filings: filingsTrend,
      appointments: appointmentsTrend,
      executions: executionsTrend,
    },
  })
})

export default router
