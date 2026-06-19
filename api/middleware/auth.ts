import jwt from 'jsonwebtoken'
import { type Request, type Response, type NextFunction } from 'express'

const JWT_SECRET = process.env.JWT_SECRET || 'waste-platform-secret-key'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        phone: string
        name: string
        role: string
        company_id: number | null
      }
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number
      phone: string
      name: string
      role: string
      company_id: number | null
    }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, error: '认证令牌无效或已过期' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '无权限访问' })
      return
    }
    next()
  }
}

export { JWT_SECRET }
