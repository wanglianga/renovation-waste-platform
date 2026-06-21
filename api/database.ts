import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.resolve(__dirname, '../data.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('property','transport','disposal')),
      contact_phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','property','transport','driver','disposal')),
      company_id INTEGER,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      property_company_id INTEGER,
      FOREIGN KEY (property_company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS elevators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      building_id INTEGER NOT NULL,
      available_hours TEXT DEFAULT '08:00-20:00',
      FOREIGN KEY (building_id) REFERENCES buildings(id)
    );

    CREATE TABLE IF NOT EXISTS filings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      building_id INTEGER NOT NULL,
      elevator_id INTEGER,
      renovation_start TEXT NOT NULL,
      renovation_end TEXT NOT NULL,
      waste_types TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      approved_route TEXT,
      elevator_hours TEXT,
      approved_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (building_id) REFERENCES buildings(id),
      FOREIGN KEY (elevator_id) REFERENCES elevators(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filing_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      waste_type TEXT NOT NULL CHECK(waste_type IN ('construction','furniture','hazardous')),
      bag_count INTEGER DEFAULT 0,
      furniture_count INTEGER DEFAULT 0,
      scheduled_time TEXT NOT NULL,
      building_location TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','dispatched','executing','completed','cancelled')),
      route_approved TEXT,
      elevator_approved TEXT,
      approved_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (filing_id) REFERENCES filings(id),
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      max_weight REAL NOT NULL,
      company_id INTEGER NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      dispatch_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','cancelled')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      load_photos TEXT,
      gross_weight REAL DEFAULT 0,
      tare_weight REAL DEFAULT 0,
      net_weight REAL DEFAULT 0,
      weigh_photos TEXT,
      unload_time TEXT,
      status TEXT DEFAULT 'loading' CHECK(status IN ('loading','weighing','transporting','unloaded','completed')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (dispatch_id) REFERENCES dispatches(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS execution_weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id INTEGER NOT NULL,
      waste_type TEXT NOT NULL CHECK(waste_type IN ('construction','furniture','hazardous')),
      gross_weight REAL NOT NULL,
      tare_weight REAL NOT NULL,
      net_weight REAL NOT NULL,
      FOREIGN KEY (execution_id) REFERENCES executions(id)
    );

    CREATE TABLE IF NOT EXISTS disposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id INTEGER NOT NULL,
      disposal_site_id INTEGER NOT NULL,
      confirm_time TEXT,
      weighbill_photo TEXT,
      receipt_photo TEXT,
      disposal_fee REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','settled')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (execution_id) REFERENCES executions(id),
      FOREIGN KEY (disposal_site_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS prohibited_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id INTEGER NOT NULL,
      appointment_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('paint','battery','glue','other')),
      description TEXT,
      photos TEXT,
      status TEXT DEFAULT 'reported' CHECK(status IN ('reported','confirmed','returned','surcharged','special_handled')),
      handler_type TEXT CHECK(handler_type IN ('return','surcharge','special')),
      property_confirmed_by INTEGER,
      property_confirmed_at TEXT,
      fee_impact TEXT DEFAULT 'none' CHECK(fee_impact IN ('none','increased')),
      additional_fee REAL DEFAULT 0,
      owner_notified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (execution_id) REFERENCES executions(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (driver_id) REFERENCES users(id),
      FOREIGN KEY (property_confirmed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS entry_blockages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id INTEGER NOT NULL,
      appointment_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      blockage_type TEXT NOT NULL CHECK(blockage_type IN ('elevator_repair','garage_height','road_restriction','owner_absent','other')),
      description TEXT,
      arrival_time TEXT NOT NULL,
      photos TEXT,
      status TEXT DEFAULT 'reported' CHECK(status IN ('reported','rearranged','settled')),
      rearranged_dispatch_id INTEGER,
      rearranged_time TEXT,
      empty_run_fee REAL DEFAULT 0,
      empty_run_settled INTEGER DEFAULT 0,
      property_responsibility TEXT CHECK(property_responsibility IN ('none','property','owner','third_party')),
      property_traced_by INTEGER,
      owner_notified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (execution_id) REFERENCES executions(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (driver_id) REFERENCES users(id),
      FOREIGN KEY (rearranged_dispatch_id) REFERENCES dispatches(id),
      FOREIGN KEY (property_traced_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disposal_id INTEGER NOT NULL,
      transport_fee REAL NOT NULL DEFAULT 0,
      disposal_fee REAL NOT NULL DEFAULT 0,
      total_fee REAL NOT NULL DEFAULT 0,
      waste_type TEXT NOT NULL CHECK(waste_type IN ('construction','furniture','hazardous')),
      weight REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','completed')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (disposal_id) REFERENCES disposals(id)
    );
  `)

  seedData()
}

function seedData() {
  const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number }
  if (companyCount.count > 0) return

  const insertCompany = db.prepare('INSERT INTO companies (name, type, contact_phone) VALUES (?, ?, ?)')
  const insertUser = db.prepare('INSERT INTO users (phone, password, name, role, company_id) VALUES (?, ?, ?, ?, ?)')
  const insertBuilding = db.prepare('INSERT INTO buildings (name, address, property_company_id) VALUES (?, ?, ?)')
  const insertElevator = db.prepare('INSERT INTO elevators (name, building_id, available_hours) VALUES (?, ?, ?)')
  const insertVehicle = db.prepare('INSERT INTO vehicles (plate_number, vehicle_type, max_weight, company_id) VALUES (?, ?, ?, ?)')

  const transaction = db.transaction(() => {
    const c1 = insertCompany.run('阳光物业', 'property', '010-12345678')
    const c2 = insertCompany.run('绿洁清运公司', 'transport', '010-87654321')
    const c3 = insertCompany.run('城西消纳场', 'disposal', '010-11112222')

    insertUser.run('13800000001', '123456', '张三', 'owner', null)
    insertUser.run('13800000002', '123456', '李经理', 'property', c1.lastInsertRowid as number)
    insertUser.run('13800000003', '123456', '王总', 'transport', c2.lastInsertRowid as number)
    insertUser.run('13800000004', '123456', '赵师傅', 'driver', c2.lastInsertRowid as number)
    insertUser.run('13800000005', '123456', '陈场长', 'disposal', c3.lastInsertRowid as number)

    const b1 = insertBuilding.run('阳光花园1号楼', '阳光花园小区1号楼', c1.lastInsertRowid as number)
    const b2 = insertBuilding.run('阳光花园2号楼', '阳光花园小区2号楼', c1.lastInsertRowid as number)

    insertElevator.run('1号楼客梯', b1.lastInsertRowid as number, '08:00-20:00')
    insertElevator.run('2号楼货梯', b2.lastInsertRowid as number, '08:00-18:00')

    insertVehicle.run('京A12345', '轻型货车', 2.0, c2.lastInsertRowid as number)
    insertVehicle.run('京B67890', '中型货车', 5.0, c2.lastInsertRowid as number)
  })

  transaction()
}

export default db
