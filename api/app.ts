import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDatabase } from './database.js'
import authRoutes from './routes/auth.js'
import filingRoutes from './routes/filings.js'
import appointmentRoutes from './routes/appointments.js'
import dispatchRoutes from './routes/dispatches.js'
import executionRoutes from './routes/executions.js'
import disposalRoutes from './routes/disposals.js'
import settlementRoutes from './routes/settlements.js'
import statisticsRoutes from './routes/statistics.js'
import uploadRoutes from './routes/upload.js'
import baseRoutes from './routes/base.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/filings', filingRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/dispatches', dispatchRoutes)
app.use('/api/executions', executionRoutes)
app.use('/api/disposals', disposalRoutes)
app.use('/api/settlements', settlementRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/base', baseRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
