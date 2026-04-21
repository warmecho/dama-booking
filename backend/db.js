import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'dama.db'))

// 启用外键约束
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 初始化数据库表
function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('parent', 'coach', 'root')),
      avatar TEXT DEFAULT 'default-avatar.png',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 教练设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS coach_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_phone TEXT NOT NULL UNIQUE,
      bg_image TEXT DEFAULT 'default-bg.jpg',
      coach_bg_image TEXT,
      title TEXT DEFAULT '大马课程预约',
      subtitle TEXT DEFAULT '以冰锻魂 双十必达',
      login_account TEXT,
      FOREIGN KEY (coach_phone) REFERENCES users(phone) ON DELETE CASCADE
    )
  `)

  // 上课地址表
  db.exec(`
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 时段计划表
  db.exec(`
    CREATE TABLE IF NOT EXISTS timeslot_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_phone TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('ice', 'land')),
      address_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_phone) REFERENCES users(phone) ON DELETE CASCADE,
      FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE,
      UNIQUE(coach_phone, date, start_time, end_time)
    )
  `)

  // 预约表
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_phone TEXT NOT NULL,
      timeslot_plan_id INTEGER NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_phone) REFERENCES users(phone) ON DELETE CASCADE,
      FOREIGN KEY (timeslot_plan_id) REFERENCES timeslot_plans(id) ON DELETE CASCADE,
      UNIQUE(parent_phone, timeslot_plan_id)
    )
  `)

  // 统计数据表（用于缓存统计，每日更新）
  db.exec(`
    CREATE TABLE IF NOT EXISTS statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_phone TEXT,
      parent_phone TEXT,
      period TEXT NOT NULL,
      period_value TEXT NOT NULL,
      total_hours REAL DEFAULT 0,
      completed_hours REAL DEFAULT 0,
      pending_hours REAL DEFAULT 0,
      booking_rate REAL DEFAULT 0,
      attendance_rate REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(coach_phone, period, period_value)
    )
  `)

  // 初始化默认教练和地址
  const initData = db.transaction(() => {
    // 检查是否已有数据
    const coach1 = db.prepare('SELECT phone FROM users WHERE phone = ?').get('dama')
    if (!coach1) {
      // 生成密码哈希 (默认密码 dama123456)
      const defaultPassword = bcrypt.hashSync('dama123456', 10)

      // 创建默认教练1
      db.prepare(`
        INSERT INTO users (phone, nickname, password, role) VALUES (?, ?, ?, ?)
      `).run('dama', '大马教练', defaultPassword, 'coach')

      // 创建默认教练2
      db.prepare(`
        INSERT INTO users (phone, nickname, password, role) VALUES (?, ?, ?, ?)
      `).run('jia', '马丽佳教练', defaultPassword, 'coach')

      // 创建教练设置
      db.prepare(`
        INSERT INTO coach_settings (coach_phone, login_account) VALUES (?, ?)
      `).run('dama', 'dama')
      db.prepare(`
        INSERT INTO coach_settings (coach_phone, login_account) VALUES (?, ?)
      `).run('jia', 'jia')

      // 创建默认地址
      db.prepare(`INSERT INTO addresses (name) VALUES (?)`).run('冰立方')
    }
  })

  // 数据库迁移：添加 coach_bg_image 列（如果不存在）
  try {
    const tableInfo = db.prepare("PRAGMA table_info(coach_settings)").all()
    const hasCoachBgImage = tableInfo.some(col => col.name === 'coach_bg_image')
    if (!hasCoachBgImage) {
      db.exec(`ALTER TABLE coach_settings ADD COLUMN coach_bg_image TEXT`)
      console.log('已添加 coach_bg_image 列')
    }
  } catch (error) {
    console.error('数据库迁移失败:', error)
  }

  // 数据库迁移：添加 addresses.deleted 列（如果不存在）
  try {
    const addressTableInfo = db.prepare("PRAGMA table_info(addresses)").all()
    const hasDeleted = addressTableInfo.some(col => col.name === 'deleted')
    if (!hasDeleted) {
      db.exec(`ALTER TABLE addresses ADD COLUMN deleted INTEGER DEFAULT 0`)
      console.log('已添加 addresses.deleted 列')
    }
  } catch (error) {
    console.error('数据库迁移失败:', error)
  }

  // 数据库迁移：添加 users 表字段（生日、冰龄、等级）
  try {
    const userTableInfo = db.prepare("PRAGMA table_info(users)").all()
    const columns = ['birthday', 'skating_age', 'free_skating_level', 'footwork_level']
    columns.forEach(col => {
      const hasCol = userTableInfo.some(c => c.name === col)
      if (!hasCol) {
        const defaultValue = col === 'birthday' ? 'NULL' : '0'
        db.exec(`ALTER TABLE users ADD COLUMN ${col} ${col === 'birthday' ? 'TEXT' : 'INTEGER'} DEFAULT ${defaultValue}`)
        console.log(`已添加 users.${col} 列`)
      }
    })
  } catch (error) {
    console.error('数据库迁移失败:', error)
  }

  // 数据库迁移：添加 bookings 表字段（start_time, end_time, type）
  try {
    const bookingTableInfo = db.prepare("PRAGMA table_info(bookings)").all()
    const bookingColumns = ['start_time', 'end_time', 'type']
    bookingColumns.forEach(col => {
      const hasCol = bookingTableInfo.some(c => c.name === col)
      if (!hasCol) {
        db.exec(`ALTER TABLE bookings ADD COLUMN ${col} TEXT`)
        console.log(`已添加 bookings.${col} 列`)
      }
    })
  } catch (error) {
    console.error('数据库迁移失败:', error)
  }

  initData()

  console.log('数据库初始化完成')
}

initDatabase()

export default db
