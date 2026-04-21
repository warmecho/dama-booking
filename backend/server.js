import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import db from './db.js'
import dayjs from 'dayjs'
import cron from 'node-cron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3000
const JWT_SECRET = 'dama-booking-secret-key'

// 中间件
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 确保上传目录存在
import fs from 'fs'
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// JWT认证中间件
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ code: 401, message: '登录已过期' })
  }
}

// 角色权限中间件
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足' })
    }
    next()
  }
}

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }) // 5MB限制

// ==================== 认证路由 ====================

// 登录
app.post('/api/auth/login', async (req, res) => {
  const { phone, password, role } = req.body

  try {
    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone)

    if (!user) {
      // 家长首次登录，自动注册
      if (role === 'parent') {
        const nickname = req.body.nickname || phone
        const hashedPassword = await bcrypt.hash('123456', 10)

        db.prepare(`
          INSERT INTO users (phone, nickname, password, role) VALUES (?, ?, ?, ?)
        `).run(phone, nickname, hashedPassword, 'parent')

        const token = jwt.sign({ phone, role: 'parent' }, JWT_SECRET, { expiresIn: '7d' })

        return res.json({
          code: 200,
          message: '注册成功',
          data: {
            token,
            user: { phone, nickname, role: 'parent', avatar: 'default-avatar.png' }
          }
        })
      }

      return res.status(400).json({ code: 400, message: '用户不存在' })
    }

    // 验证角色
    if (role && user.role !== role) {
      return res.status(400).json({ code: 400, message: '角色不匹配' })
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ code: 400, message: '密码错误' })
    }

    const token = jwt.sign(
      { phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          phone: user.phone,
          nickname: user.nickname,
          role: user.role,
          avatar: user.avatar,
          birthday: user.birthday
        }
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 获取用户信息
app.get('/api/auth/userinfo', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT phone, nickname, role, avatar, birthday FROM users WHERE phone = ?').get(req.user.phone)

  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' })
  }

  res.json({ code: 200, data: user })
})

// 更新个人信息
app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const { nickname, password, avatar, birthday } = req.body
  const phone = req.user.phone

  try {
    if (nickname) {
      db.prepare('UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?')
        .run(nickname, phone)
    }

    if (avatar) {
      db.prepare('UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?')
        .run(avatar, phone)
    }

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10)
      db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?')
        .run(hashedPassword, phone)
    }

    if (birthday !== undefined) {
      db.prepare('UPDATE users SET birthday = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?')
        .run(birthday, phone)
    }

    const user = db.prepare('SELECT phone, nickname, role, avatar, birthday FROM users WHERE phone = ?').get(phone)
    res.json({ code: 200, message: '更新成功', data: user })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 上传头像
app.post('/api/auth/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, message: '没有上传文件' })
  }

  const avatarUrl = `/uploads/${req.file.filename}`
  db.prepare('UPDATE users SET avatar = ? WHERE phone = ?').run(avatarUrl, req.user.phone)

  res.json({ code: 200, message: '上传成功', data: { url: avatarUrl } })
})

// Root重置密码
app.post('/api/auth/root-reset-password', (req, res) => {
  const { rootPassword, phone, coachPhone, newPassword } = req.body

  if (rootPassword !== 'cyberci') {
    return res.status(403).json({ code: 403, message: 'Root密码错误' })
  }

  try {
    // 重置指定教练密码（新功能）
    if (coachPhone) {
      const password = newPassword || '123456'
      const hashedPassword = bcrypt.hashSync(password, 10)
      const result = db.prepare("UPDATE users SET password = ? WHERE phone = ? AND role = 'coach'").run(hashedPassword, coachPhone)
      if (result.changes === 0) {
        return res.status(404).json({ code: 404, message: '教练不存在' })
      }
      return res.json({ code: 200, message: `教练 ${coachPhone} 密码已重置为 ${password}` })
    }

    // 重置指定用户密码
    if (phone) {
      const hashedPassword = bcrypt.hashSync('123456', 10)
      db.prepare('UPDATE users SET password = ? WHERE phone = ?').run(hashedPassword, phone)
      return res.json({ code: 200, message: `用户 ${phone} 密码已重置为 123456` })
    }

    // 重置所有教练密码
    const hashedPassword = bcrypt.hashSync('dama123456', 10)
    db.prepare("UPDATE users SET password = ? WHERE role = 'coach'").run(hashedPassword)

    res.json({ code: 200, message: '所有教练密码已重置为 dama123456' })
  } catch (error) {
    console.error('重置密码错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// Root获取教练列表
app.get('/api/coaches', (req, res) => {
  try {
    const coaches = db.prepare("SELECT phone, nickname, avatar FROM users WHERE role = 'coach' ORDER BY nickname").all()
    res.json({ code: 200, data: coaches })
  } catch (error) {
    console.error('获取教练列表错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// Root新增教练
app.post('/api/coaches', (req, res) => {
  const { rootPassword, phone, nickname } = req.body

  if (rootPassword !== 'cyberci') {
    return res.status(403).json({ code: 403, message: 'Root密码错误' })
  }

  if (!phone || !nickname) {
    return res.status(400).json({ code: 400, message: '请提供教练手机号和昵称' })
  }

  try {
    // 检查手机号是否已存在
    const existing = db.prepare('SELECT phone FROM users WHERE phone = ?').get(phone)
    if (existing) {
      return res.status(400).json({ code: 400, message: '该手机号已存在' })
    }

    // 创建教练账号，默认密码 123456
    const hashedPassword = bcrypt.hashSync('123456', 10)
    db.prepare("INSERT INTO users (phone, nickname, password, role) VALUES (?, ?, ?, 'coach')").run(phone, nickname, hashedPassword)

    // 创建教练设置
    db.prepare('INSERT INTO coach_settings (coach_phone, login_account) VALUES (?, ?)').run(phone, phone)

    res.json({ code: 200, message: `已新增教练 ${nickname}，初始密码 123456` })
  } catch (error) {
    console.error('新增教练错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// ==================== 时段管理路由 ====================

// 获取指定日期和教练的时段
app.get('/api/timeslots', authMiddleware, (req, res) => {
  const { date, month, coach } = req.query

  console.log('[DEBUG Backend] timeslots query:', { date, month, coach, userPhone: req.user?.phone })

  try {
    let timeslots

    if (month) {
      // 按月查询 - 用于日历显示
      const parentPhone = req.user?.phone || ''
      timeslots = db.prepare(`
        SELECT tp.*, a.name as address_name,
          (SELECT COUNT(*) FROM bookings b WHERE b.timeslot_plan_id = tp.id AND b.status != 'cancelled') as booked_count,
          (SELECT COUNT(*) FROM bookings b2 WHERE b2.timeslot_plan_id = tp.id AND b2.parent_phone = ? AND b2.status != 'cancelled') as my_booking_count
        FROM timeslot_plans tp
        JOIN addresses a ON tp.address_id = a.id
        WHERE tp.date LIKE ? AND tp.coach_phone = ?
        ORDER BY tp.date, tp.start_time
      `).all(parentPhone, `${month}%`, coach)
    } else {
      // 按日期查询
      const parentPhone = req.user?.phone || ''
      timeslots = db.prepare(`
        SELECT tp.*, a.name as address_name,
          (SELECT COUNT(*) FROM bookings b WHERE b.timeslot_plan_id = tp.id AND b.status != 'cancelled') as booked_count,
          (SELECT GROUP_CONCAT(u.nickname) FROM bookings b
           JOIN users u ON b.parent_phone = u.phone
           WHERE b.timeslot_plan_id = tp.id AND b.status != 'cancelled') as booked_users,
          (SELECT COUNT(*) FROM bookings b2 WHERE b2.timeslot_plan_id = tp.id AND b2.parent_phone = ? AND b2.status != 'cancelled') as my_booking_count
        FROM timeslot_plans tp
        JOIN addresses a ON tp.address_id = a.id
        WHERE tp.date = ? AND tp.coach_phone = ?
        ORDER BY tp.start_time
      `).all(parentPhone, date, coach)

      // 为每个时段获取预约用户列表（头像和昵称）
      timeslots.forEach(slot => {
        const bookedUsers = db.prepare(`
          SELECT u.nickname, u.avatar
          FROM bookings b
          JOIN users u ON b.parent_phone = u.phone
          WHERE b.timeslot_plan_id = ? AND b.status != 'cancelled'
        `).all(slot.id)
        slot.booked_users_list = bookedUsers || []
      })
    }

    console.log('[DEBUG Backend] returning timeslots count:', timeslots?.length)
    res.json({ code: 200, data: timeslots })
  } catch (error) {
    console.error('获取时段错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// ==================== 预约管理路由 ====================

// 创建预约
app.post('/api/bookings', authMiddleware, roleMiddleware(['parent']), (req, res) => {
  const { slots, location } = req.body
  const parentPhone = req.user.phone

  console.log('=== 创建预约请求 ===')
  console.log('Parent:', parentPhone)
  console.log('Location:', location)
  console.log('Slots:', JSON.stringify(slots, null, 2))

  try {
    const results = { success: [], failed: [] }

    // 开始事务
    const transaction = db.transaction(() => {
      for (const slot of slots) {
        console.log('处理时段:', slot.id, slot.date, slot.start_time, slot.end_time)

        // 检查时段是否存在
        const timeslot = db.prepare('SELECT id FROM timeslot_plans WHERE id = ?').get(slot.id)
        if (!timeslot) {
          console.log('时段不存在:', slot.id)
          results.failed.push({ slot, reason: '时段不存在' })
          continue
        }

        // 检查是否已有活跃预约 (pending 或 completed)
        const existingActive = db.prepare(`
          SELECT b.id, b.status FROM bookings b
          WHERE b.parent_phone = ? AND b.timeslot_plan_id = ?
          AND b.status IN ('pending', 'completed')
        `).get(parentPhone, slot.id)

        if (existingActive) {
          console.log('已存在活跃预约:', existingActive)
          results.failed.push({ slot, reason: '该时段已预约' })
          continue
        }

        // 检查是否之前有取消的预约，如果有则恢复
        const existingCancelled = db.prepare(`
          SELECT b.id FROM bookings b
          WHERE b.parent_phone = ? AND b.timeslot_plan_id = ?
          AND b.status = 'cancelled'
        `).get(parentPhone, slot.id)

        if (existingCancelled) {
          // 恢复取消的预约
          db.prepare(`
            UPDATE bookings
            SET status = 'pending', location = ?, created_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(location, existingCancelled.id)
          console.log('恢复取消的预约:', existingCancelled.id)
          results.success.push(slot)
          continue
        }

        // 创建新预约
        try {
          db.prepare(`
            INSERT INTO bookings (parent_phone, timeslot_plan_id, location, status)
            VALUES (?, ?, ?, 'pending')
          `).run(parentPhone, slot.id, location)
          console.log('预约创建成功:', slot.id)
          results.success.push(slot)
        } catch (insertError) {
          console.error('插入失败:', insertError.message)
          results.failed.push({ slot, reason: insertError.message })
        }
      }
    })

    transaction()

    console.log('结果:', { success: results.success.length, failed: results.failed.length })

    res.json({
      code: 200,
      message: results.failed.length > 0 ? '部分预约成功' : '预约成功',
      data: results
    })
  } catch (error) {
    console.error('创建预约错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message })
  }
})

// 取消预约
app.delete('/api/bookings/:id', authMiddleware, roleMiddleware(['parent']), (req, res) => {
  const { id } = req.params
  const parentPhone = req.user.phone

  console.log('取消预约请求:', { id, parentPhone })

  try {
    // 验证预约属于当前用户且状态为pending
    // 优先使用 bookings 表中的时间字段，如果没有则使用 timeslot_plans 的
    const booking = db.prepare(`
      SELECT b.*, tp.date,
        COALESCE(b.start_time, tp.start_time) as start_time
      FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      WHERE b.id = ? AND b.parent_phone = ?
    `).get(id, parentPhone)

    console.log('查询到的预约:', booking)

    if (!booking) {
      return res.status(404).json({ code: 404, message: '预约不存在' })
    }

    if (booking.status !== 'pending') {
      console.log('取消失败：状态不是pending，当前状态:', booking.status)
      return res.status(400).json({ code: 400, message: `只能取消待上课的预约，当前状态: ${booking.status}` })
    }

    // 检查是否过期
    const slotDateTime = dayjs(`${booking.date} ${booking.start_time}`)
    if (slotDateTime.isBefore(dayjs())) {
      return res.status(400).json({ code: 400, message: '已过期的预约无法取消' })
    }

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id)

    res.json({ code: 200, message: '取消成功' })
  } catch (error) {
    console.error('取消预约错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 获取我的课程
app.get('/api/bookings/my', authMiddleware, roleMiddleware(['parent']), (req, res) => {
  const { view } = req.query
  const parentPhone = req.user.phone

  try {
    let dateFilter = ''

    if (view === 'week') {
      const weekStart = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD')
      const weekEnd = dayjs().endOf('week').add(1, 'day').format('YYYY-MM-DD')
      dateFilter = `AND tp.date BETWEEN '${weekStart}' AND '${weekEnd}'`
    } else if (view === 'month') {
      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
      const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD')
      dateFilter = `AND tp.date BETWEEN '${monthStart}' AND '${monthEnd}'`
    }

    const bookings = db.prepare(`
      SELECT b.*, tp.date,
        COALESCE(b.start_time, tp.start_time) as start_time,
        COALESCE(b.end_time, tp.end_time) as end_time,
        COALESCE(b.type, tp.type) as type,
        a.name as address_name,
        u.nickname as coach_nickname
      FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      JOIN addresses a ON tp.address_id = a.id
      JOIN users u ON tp.coach_phone = u.phone
      WHERE b.parent_phone = ? AND b.status != 'cancelled' ${dateFilter}
      ORDER BY tp.date, COALESCE(b.start_time, tp.start_time)
    `).all(parentPhone)

    // 计算统计
    const stats = {
      total: 0,
      completed: 0,
      pending: 0
    }

    bookings.forEach(b => {
      const start = b.start_time.split(':').map(Number)
      const end = b.end_time.split(':').map(Number)
      const hours = (end[0] - start[0]) + (end[1] - start[1]) / 60

      stats.total += hours
      if (b.status === 'completed') {
        stats.completed += hours
      } else {
        stats.pending += hours
      }
    })

    // 保留一位小数
    stats.total = Math.round(stats.total * 10) / 10
    stats.completed = Math.round(stats.completed * 10) / 10
    stats.pending = Math.round(stats.pending * 10) / 10

    res.json({
      code: 200,
      data: { bookings, stats }
    })
  } catch (error) {
    console.error('获取我的课程错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 获取课程统计
app.get('/api/bookings/stats', authMiddleware, roleMiddleware(['parent']), (req, res) => {
  const parentPhone = req.user.phone

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings
      FROM bookings b
      WHERE b.parent_phone = ? AND b.status != 'cancelled'
    `).get(parentPhone)

    res.json({ code: 200, data: stats })
  } catch (error) {
    console.error('获取统计错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 获取月度统计（历史）
app.get('/api/bookings/monthly-stats', authMiddleware, roleMiddleware(['parent']), (req, res) => {
  const parentPhone = req.user.phone

  try {
    const monthlyData = db.prepare(`
      SELECT
        strftime('%Y-%m', tp.date) as month,
        tp.type,
        SUM(
          (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
          (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
        ) as hours
      FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      WHERE b.parent_phone = ? AND b.status = 'completed'
      AND tp.date >= date('now', '-1 year')
      GROUP BY strftime('%Y-%m', tp.date), tp.type
      ORDER BY month DESC
      LIMIT 12
    `).all(parentPhone)

    res.json({ code: 200, data: monthlyData })
  } catch (error) {
    console.error('获取月度统计错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// ==================== 教练端路由 ====================

// 获取排期
app.get('/api/coach/schedule', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { month, coach } = req.query
  const coachPhone = coach || req.user.phone

  try {
    const schedules = db.prepare(`
      SELECT tp.*, a.name as address_name,
        (SELECT COUNT(*) FROM bookings b WHERE b.timeslot_plan_id = tp.id AND b.status != 'cancelled') as booked_count
      FROM timeslot_plans tp
      JOIN addresses a ON tp.address_id = a.id
      WHERE tp.coach_phone = ? AND strftime('%Y-%m', tp.date) = ?
      ORDER BY tp.date, tp.start_time
    `).all(coachPhone, month)

    res.json({ code: 200, data: schedules })
  } catch (error) {
    console.error('获取排期错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 创建排期
app.post('/api/coach/schedule', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { date, slots } = req.body
  const coachPhone = req.user.phone

  try {
    let addedCount = 0
    let skippedCount = 0

    const transaction = db.transaction(() => {
      for (const slot of slots) {
        // 检查是否已存在完全相同的时段（相同时间、类型、地址）
        const exactMatch = db.prepare(`
          SELECT id FROM timeslot_plans
          WHERE coach_phone = ? AND date = ? AND start_time = ? AND end_time = ?
        `).get(coachPhone, date, slot.start_time, slot.end_time)

        if (exactMatch) {
          // 完全相同的时段已存在，跳过
          skippedCount++
          continue
        }

        // 检查是否有时间冲突（不同时间但重叠）
        const conflict = db.prepare(`
          SELECT id FROM timeslot_plans
          WHERE coach_phone = ? AND date = ?
          AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
        `).get(coachPhone, date, slot.end_time, slot.start_time, slot.end_time, slot.start_time)

        if (conflict) {
          // 时间冲突，跳过该时段
          skippedCount++
          continue
        }

        // 创建新时段
        db.prepare(`
          INSERT INTO timeslot_plans (coach_phone, date, start_time, end_time, type, address_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(coachPhone, date, slot.start_time, slot.end_time, slot.type, slot.address_id)
        addedCount++
      }
    })

    transaction()

    let message = '排期创建成功'
    if (addedCount > 0 && skippedCount > 0) {
      message = `新增 ${addedCount} 个时段，跳过 ${skippedCount} 个已存在/冲突时段`
    } else if (skippedCount > 0 && addedCount === 0) {
      message = '所有时段已存在或冲突'
    }

    res.json({ code: 200, message, data: { added: addedCount, skipped: skippedCount } })
  } catch (error) {
    console.error('创建排期错误:', error)
    res.status(400).json({ code: 400, message: error.message })
  }
})

// 更新排期
app.put('/api/coach/schedule/:id', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { id } = req.params
  const { start_time, end_time, type, address_id } = req.body

  try {
    // 验证排期属于当前教练
    const schedule = db.prepare('SELECT * FROM timeslot_plans WHERE id = ? AND coach_phone = ?')
      .get(id, req.user.phone)

    if (!schedule) {
      return res.status(404).json({ code: 404, message: '排期不存在' })
    }

    // 检查是否有预约
    const hasBooking = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE timeslot_plan_id = ? AND status != 'cancelled'")
      .get(id)

    if (hasBooking.count > 0) {
      return res.status(400).json({ code: 400, message: '该时段已有预约，无法修改' })
    }

    db.prepare(`
      UPDATE timeslot_plans
      SET start_time = ?, end_time = ?, type = ?, address_id = ?
      WHERE id = ?
    `).run(start_time, end_time, type, address_id, id)

    res.json({ code: 200, message: '排期更新成功' })
  } catch (error) {
    console.error('更新排期错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 删除排期
app.delete('/api/coach/schedule/:id', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { id } = req.params

  try {
    // 验证排期属于当前教练
    const schedule = db.prepare('SELECT * FROM timeslot_plans WHERE id = ? AND coach_phone = ?')
      .get(id, req.user.phone)

    if (!schedule) {
      return res.status(404).json({ code: 404, message: '排期不存在' })
    }

    // 检查是否有过期预约（已完成或已过期）
    const expiredBookings = db.prepare(`
      SELECT COUNT(*) as count FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      WHERE tp.id = ? AND (b.status = 'completed' OR (tp.date < date('now')))
    `).get(id)

    if (expiredBookings.count > 0) {
      return res.status(400).json({
        code: 400,
        message: '历史记录不可删除，仅可删除未发生的排期'
      })
    }

    // 删除相关预约
    db.prepare('DELETE FROM bookings WHERE timeslot_plan_id = ?').run(id)

    // 删除排期
    db.prepare('DELETE FROM timeslot_plans WHERE id = ?').run(id)

    res.json({ code: 200, message: '排期删除成功' })
  } catch (error) {
    console.error('删除排期错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 复制上月计划
app.post('/api/coach/schedule/copy', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { from_month, to_month } = req.query
  const coachPhone = req.user.phone

  try {
    const sourceSchedules = db.prepare(`
      SELECT * FROM timeslot_plans
      WHERE coach_phone = ? AND strftime('%Y-%m', date) = ?
    `).all(coachPhone, from_month)

    const transaction = db.transaction(() => {
      for (const schedule of sourceSchedules) {
        const day = schedule.date.split('-')[2]
        const newDate = `${to_month}-${day}`

        // 检查目标日期是否已有排期
        const existing = db.prepare(`
          SELECT id FROM timeslot_plans
          WHERE coach_phone = ? AND date = ? AND start_time = ? AND end_time = ?
        `).get(coachPhone, newDate, schedule.start_time, schedule.end_time)

        if (!existing) {
          db.prepare(`
            INSERT INTO timeslot_plans (coach_phone, date, start_time, end_time, type, address_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(coachPhone, newDate, schedule.start_time, schedule.end_time,
               schedule.type, schedule.address_id)
        }
      }
    })

    transaction()

    res.json({ code: 200, message: '复制成功', data: { copied: sourceSchedules.length } })
  } catch (error) {
    console.error('复制排期错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 地址管理
app.get('/api/coach/addresses', authMiddleware, (req, res) => {
  try {
    const addresses = db.prepare('SELECT * FROM addresses WHERE deleted = 0 OR deleted IS NULL ORDER BY id').all()
    res.json({ code: 200, data: addresses })
  } catch (error) {
    console.error('获取地址错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

app.post('/api/coach/addresses', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { name } = req.body

  if (!name || name.length > 20) {
    return res.status(400).json({ code: 400, message: '地址名称不能为空且不能超过20字符' })
  }

  try {
    const result = db.prepare('INSERT INTO addresses (name) VALUES (?)').run(name)
    res.json({ code: 200, message: '地址创建成功', data: { id: result.lastInsertRowid } })
  } catch (error) {
    console.error('创建地址错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

app.put('/api/coach/addresses/:id', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { id } = req.params
  const { name } = req.body

  if (!name || name.length > 20) {
    return res.status(400).json({ code: 400, message: '地址名称不能为空且不能超过20字符' })
  }

  try {
    db.prepare('UPDATE addresses SET name = ? WHERE id = ?').run(name, id)
    res.json({ code: 200, message: '地址更新成功' })
  } catch (error) {
    console.error('更新地址错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 软删除地址
app.delete('/api/coach/addresses/:id', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { id } = req.params

  try {
    // 检查地址是否存在
    const address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(id)
    if (!address) {
      return res.status(404).json({ code: 404, message: '地址不存在' })
    }

    // 软删除：设置 deleted = 1
    db.prepare('UPDATE addresses SET deleted = 1 WHERE id = ?').run(id)
    res.json({ code: 200, message: '地址删除成功' })
  } catch (error) {
    console.error('删除地址错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 教练端预约管理
app.get('/api/coach/bookings', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { view } = req.query
  const coachPhone = req.user.phone

  try {
    let dateFilter = ''

    if (view === 'today_tomorrow') {
      // 今明两天
      const today = dayjs().format('YYYY-MM-DD')
      const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
      dateFilter = `AND tp.date IN ('${today}', '${tomorrow}')`
    } else if (view === 'week') {
      // 本周：周一到周日（基于中国习惯）
      const today = dayjs()
      const dayOfWeek = today.day() || 7 // 周日转为7
      const weekStart = today.subtract(dayOfWeek - 1, 'day').format('YYYY-MM-DD')
      const weekEnd = today.add(7 - dayOfWeek, 'day').format('YYYY-MM-DD')
      console.log(`[DEBUG] ${view} 日期范围:`, weekStart, '到', weekEnd)
      dateFilter = `AND tp.date BETWEEN '${weekStart}' AND '${weekEnd}'`
    } else if (view === 'month') {
      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
      const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD')
      dateFilter = `AND tp.date BETWEEN '${monthStart}' AND '${monthEnd}'`
    } else if (view === 'year') {
      const yearStart = dayjs().startOf('year').format('YYYY-MM-DD')
      const yearEnd = dayjs().endOf('year').format('YYYY-MM-DD')
      dateFilter = `AND tp.date BETWEEN '${yearStart}' AND '${yearEnd}'`
    }

    const bookings = db.prepare(`
      SELECT b.*, tp.date,
        COALESCE(b.start_time, tp.start_time) as start_time,
        COALESCE(b.end_time, tp.end_time) as end_time,
        COALESCE(b.type, tp.type) as type,
        u.nickname, u.phone as parent_phone, u.avatar,
        a.name as address_name
      FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      JOIN users u ON b.parent_phone = u.phone
      JOIN addresses a ON tp.address_id = a.id
      WHERE tp.coach_phone = ? AND b.status != 'cancelled' ${dateFilter}
      ORDER BY u.nickname, tp.date, COALESCE(b.start_time, tp.start_time)
    `).all(coachPhone)

    res.json({ code: 200, data: bookings })
  } catch (error) {
    console.error('获取预约列表错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 确认上课
app.post('/api/coach/bookings/:id/confirm', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { id } = req.params

  try {
    const booking = db.prepare(`
      SELECT b.* FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      WHERE b.id = ? AND tp.coach_phone = ?
    `).get(id, req.user.phone)

    if (!booking) {
      return res.status(404).json({ code: 404, message: '预约不存在' })
    }

    db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(id)

    res.json({ code: 200, message: '确认上课成功' })
  } catch (error) {
    console.error('确认上课错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 批量确认上课
app.post('/api/coach/bookings/batch-confirm', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { ids } = req.body

  try {
    const transaction = db.transaction(() => {
      for (const id of ids) {
        const booking = db.prepare(`
          SELECT b.* FROM bookings b
          JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
          WHERE b.id = ? AND tp.coach_phone = ?
        `).get(id, req.user.phone)

        if (booking) {
          db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(id)
        }
      }
    })

    transaction()

    res.json({ code: 200, message: '批量确认成功' })
  } catch (error) {
    console.error('批量确认错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 批量取消确认上课
app.post('/api/coach/bookings/batch-cancel-confirm', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  console.log('收到批量取消确认请求:', req.body)
  console.log('当前教练:', req.user?.phone)

  const { ids } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ code: 400, message: '缺少必要的参数 ids' })
  }

  try {
    let updatedCount = 0

    const transaction = db.transaction(() => {
      for (const id of ids) {
        console.log('处理 ID:', id)
        const booking = db.prepare(`
          SELECT b.*, tp.coach_phone FROM bookings b
          JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
          WHERE b.id = ? AND tp.coach_phone = ?
        `).get(id, req.user.phone)

        console.log('查询结果:', booking)

        if (booking) {
          const result = db.prepare("UPDATE bookings SET status = 'pending' WHERE id = ?").run(id)
          console.log('更新结果:', result)
          updatedCount++
        } else {
          console.log('未找到预约或权限不足, ID:', id)
        }
      }
    })

    transaction()

    console.log(`成功更新 ${updatedCount}/${ids.length} 条记录`)
    res.json({ code: 200, message: '批量取消确认成功', data: { updatedCount } })
  } catch (error) {
    console.error('批量取消确认错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误', error: error.message })
  }
})

// 修改预约时间
app.put('/api/coach/bookings/:id/time', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { id } = req.params
  const { start_time, end_time } = req.body

  try {
    const booking = db.prepare(`
      SELECT b.*, tp.coach_phone FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      WHERE b.id = ? AND tp.coach_phone = ?
    `).get(id, req.user.phone)

    if (!booking) {
      return res.status(404).json({ code: 404, message: '预约不存在' })
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '只能修改待上课的预约' })
    }

    // 更新关联的timeslot_plan
    db.prepare(`
      UPDATE timeslot_plans SET start_time = ?, end_time = ?
      WHERE id = (SELECT timeslot_plan_id FROM bookings WHERE id = ?)
    `).run(start_time, end_time, id)

    res.json({ code: 200, message: '时间修改成功' })
  } catch (error) {
    console.error('修改时间错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 修改预约（支持修改时间、类型、地点，不做任何校验）
// 只修改本次本条 booking 的时段，不改动 timeslot_plans 表的开放预约时段
app.put('/api/coach/bookings/:id', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { id } = req.params
  const { start_time, end_time, type, address_name } = req.body

  try {
    // 获取预约信息
    const booking = db.prepare(`
      SELECT b.*, tp.coach_phone
      FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      WHERE b.id = ?
    `).get(id)

    if (!booking) {
      return res.status(404).json({ code: 404, message: '预约不存在' })
    }

    // 只更新 bookings 表，不改动 timeslot_plans 表
    const updates = []
    const params = []

    if (start_time !== undefined) {
      updates.push('start_time = ?')
      params.push(start_time)
    }
    if (end_time !== undefined) {
      updates.push('end_time = ?')
      params.push(end_time)
    }
    if (type !== undefined) {
      updates.push('type = ?')
      params.push(type)
    }
    if (address_name !== undefined) {
      updates.push('location = ?')
      params.push(address_name)
    }

    if (updates.length > 0) {
      params.push(id)
      db.prepare(`
        UPDATE bookings SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...params)
    }

    res.json({ code: 200, message: '修改成功' })
  } catch (error) {
    console.error('修改预约错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 教练取消预约
app.delete('/api/coach/bookings/:id', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { id } = req.params
  console.log('取消预约请求:', { id, coachPhone: req.user?.phone, idType: typeof id })

  try {
    // 先检查预约是否存在（不考虑教练）
    const bookingCheck = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id)
    console.log('预约检查结果:', bookingCheck)

    const booking = db.prepare(`
      SELECT b.*, tp.date, tp.start_time, tp.coach_phone FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      WHERE b.id = ? AND tp.coach_phone = ?
    `).get(id, req.user.phone)

    console.log('带教练过滤的查询结果:', booking)

    if (!booking) {
      return res.status(404).json({ code: 404, message: '预约不存在或不属于当前教练' })
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '只能取消待上课的预约' })
    }

    // 检查是否本周或下周
    const bookingDate = dayjs(booking.date)
    const thisWeekStart = dayjs().startOf('week').add(1, 'day')
    const nextWeekEnd = dayjs().add(1, 'week').endOf('week').add(1, 'day')

    if (bookingDate.isBefore(thisWeekStart) || bookingDate.isAfter(nextWeekEnd)) {
      return res.status(400).json({ code: 400, message: '只能调整本周或下周的预约' })
    }

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id)

    res.json({ code: 200, message: '取消成功' })
  } catch (error) {
    console.error('取消预约错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 统计数据
app.get('/api/coach/stats', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { view } = req.query
  const coachPhone = req.user.phone

  try {
    let stats = []

    if (view === 'week' || view === 'next_week') {
      // 使用中国习惯：周一为一周开始
      const today = dayjs()
      const dayOfWeek = today.day() || 7 // 周日转为7
      const offset = view === 'next_week' ? 7 : 0
      const weekStart = today.subtract(dayOfWeek - 1 - offset, 'day')

      for (let i = 0; i < 7; i++) {
        const date = weekStart.add(i, 'day').format('YYYY-MM-DD')
        const dayStats = db.prepare(`
          SELECT
            -- 预约课时数 = 当天所有成功预约的课时数加总
            SUM(CASE WHEN b.status IN ('pending', 'completed') THEN
              (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
              (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
            ELSE 0 END) as booked_hours,
            -- 已被确认上课的课时数
            SUM(CASE WHEN b.status = 'completed' THEN
              (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
              (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
            ELSE 0 END) as attended_hours
          FROM timeslot_plans tp
          LEFT JOIN bookings b ON tp.id = b.timeslot_plan_id AND b.status != 'cancelled'
          WHERE tp.coach_phone = ? AND tp.date = ?
        `).get(coachPhone, date)

        // 上课率 = 已被确认上课的课时数 / 当天所有成功预约的课时数
        const attendanceRate = dayStats.booked_hours > 0
          ? (dayStats.attended_hours / dayStats.booked_hours * 100).toFixed(1)
          : 0

        stats.push({
          label: weekStart.add(i, 'day').format('MM-DD'),
          date,
          bookingHours: dayStats.booked_hours ? dayStats.booked_hours.toFixed(1) : 0,
          attendanceRate: attendanceRate
        })
      }
    } else if (view === 'month' || view === 'next_month') {
      const month = view === 'next_month'
        ? dayjs().add(1, 'month').format('YYYY-MM')
        : dayjs().format('YYYY-MM')

      const daysInMonth = dayjs(month).daysInMonth()
      const monthStart = dayjs(`${month}-01`)

      for (let i = 0; i < daysInMonth; i += 3) {
        const startDate = monthStart.add(i, 'day').format('YYYY-MM-DD')
        const endDate = monthStart.add(Math.min(i + 2, daysInMonth - 1), 'day').format('YYYY-MM-DD')

        const dayStats = db.prepare(`
          SELECT
            -- 预约课时数 = 统计时间内预约课时数加总
            SUM(CASE WHEN b.status IN ('pending', 'completed') THEN
              (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
              (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
            ELSE 0 END) as booked_hours,
            -- 已被确认上课的课时数
            SUM(CASE WHEN b.status = 'completed' THEN
              (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
              (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
            ELSE 0 END) as attended_hours
          FROM timeslot_plans tp
          LEFT JOIN bookings b ON tp.id = b.timeslot_plan_id AND b.status != 'cancelled'
          WHERE tp.coach_phone = ? AND tp.date BETWEEN ? AND ?
        `).get(coachPhone, startDate, endDate)

        // 上课率 = 已被确认上课的课时数 / 统计时间内所有成功预约的课时数
        const attendanceRate = dayStats.booked_hours > 0
          ? (dayStats.attended_hours / dayStats.booked_hours * 100).toFixed(1)
          : 0

        stats.push({
          label: `${i + 1}-${Math.min(i + 3, daysInMonth)}日`,
          bookingHours: dayStats.booked_hours ? dayStats.booked_hours.toFixed(1) : 0,
          attendanceRate: attendanceRate
        })
      }
    } else if (view === 'year') {
      for (let i = 1; i <= 12; i++) {
        const month = dayjs().month(i - 1).format('YYYY-MM')
        const monthStats = db.prepare(`
          SELECT
            -- 预约课时数 = 统计时间内预约课时数加总
            SUM(CASE WHEN b.status IN ('pending', 'completed') THEN
              (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
              (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
            ELSE 0 END) as booked_hours,
            -- 已被确认上课的课时数
            SUM(CASE WHEN b.status = 'completed' THEN
              (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
              (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
            ELSE 0 END) as attended_hours
          FROM timeslot_plans tp
          LEFT JOIN bookings b ON tp.id = b.timeslot_plan_id AND b.status != 'cancelled'
          WHERE tp.coach_phone = ? AND strftime('%Y-%m', tp.date) = ?
        `).get(coachPhone, month)

        // 上课率 = 已被确认上课的课时数 / 统计时间内所有成功预约的课时数
        const attendanceRate = monthStats.booked_hours > 0
          ? (monthStats.attended_hours / monthStats.booked_hours * 100).toFixed(1)
          : 0

        stats.push({
          label: `${i}月`,
          bookingHours: monthStats.booked_hours ? monthStats.booked_hours.toFixed(1) : 0,
          attendanceRate: attendanceRate
        })
      }
    }

    res.json({ code: 200, data: stats })
  } catch (error) {
    console.error('获取统计数据错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 学员管理
app.get('/api/coach/students', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { search } = req.query
  const coachPhone = req.user.phone

  try {
    let query = `
      SELECT
        u.phone,
        u.nickname,
        u.avatar,
        u.birthday,
        u.free_skating_level,
        u.footwork_level,
        COUNT(DISTINCT b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN
          (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
          (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
        ELSE 0 END) as completed_hours
      FROM users u
      LEFT JOIN bookings b ON u.phone = b.parent_phone
      LEFT JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id AND tp.coach_phone = ?
      WHERE u.role = 'parent'
    `

    const params = [coachPhone]

    if (search) {
      query += ' AND (u.phone LIKE ? OR u.nickname LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' GROUP BY u.phone ORDER BY completed_hours DESC'

    const students = db.prepare(query).all(...params)

    res.json({ code: 200, data: students })
  } catch (error) {
    console.error('获取学员列表错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 获取学员详情
app.get('/api/coach/students/:phone', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { phone } = req.params
  const coachPhone = req.user.phone

  try {
    const student = db.prepare(`
      SELECT phone, nickname, avatar, birthday, skating_age, free_skating_level, footwork_level
      FROM users WHERE phone = ? AND role = 'parent'
    `).get(phone)

    if (!student) {
      return res.status(404).json({ code: 404, message: '学员不存在' })
    }

    // 计算累计约课课时和累计上课课时
    const hoursStats = db.prepare(`
      SELECT
        SUM(
          (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
          (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
        ) as total_hours,
        SUM(CASE WHEN b.status = 'completed' THEN
          (CAST(substr(tp.end_time, 1, 2) AS INTEGER) - CAST(substr(tp.start_time, 1, 2) AS INTEGER)) +
          (CAST(substr(tp.end_time, 4, 2) AS INTEGER) - CAST(substr(tp.start_time, 4, 2) AS INTEGER)) / 60.0
        ELSE 0 END) as completed_hours
      FROM bookings b
      JOIN timeslot_plans tp ON b.timeslot_plan_id = tp.id
      WHERE b.parent_phone = ? AND tp.coach_phone = ? AND b.status != 'cancelled'
    `).get(phone, coachPhone)

    res.json({
      code: 200,
      data: {
        nickname: student.nickname,
        avatar: student.avatar,
        birthday: student.birthday,
        free_skating_level: student.free_skating_level || 0,
        footwork_level: student.footwork_level || 0,
        total_hours: hoursStats.total_hours || 0,
        completed_hours: hoursStats.completed_hours || 0
      }
    })
  } catch (error) {
    console.error('获取学员详情错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 更新学员课时
app.put('/api/coach/students/:phone/hours', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { phone } = req.params
  const { booking_id, hours } = req.body

  try {
    // 这里简化处理，实际应修改关联的timeslot_plan时长
    db.prepare(`
      UPDATE timeslot_plans
      SET end_time = time(start_time, '+${Math.round(hours * 60)} minutes')
      WHERE id = (SELECT timeslot_plan_id FROM bookings WHERE id = ?)
    `).run(booking_id)

    res.json({ code: 200, message: '课时更新成功' })
  } catch (error) {
    console.error('更新课时错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 更新学员等级信息
app.put('/api/coach/students/:phone/level', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { phone } = req.params
  const { free_skating_level, footwork_level } = req.body

  try {
    const result = db.prepare(`
      UPDATE users
      SET free_skating_level = ?, footwork_level = ?
      WHERE phone = ? AND role = 'parent'
    `).run(free_skating_level || 0, footwork_level || 0, phone)

    if (result.changes === 0) {
      return res.status(404).json({ code: 404, message: '学员不存在' })
    }

    res.json({ code: 200, message: '学员信息更新成功' })
  } catch (error) {
    console.error('更新学员等级错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 重置学员密码
app.post('/api/coach/students/:phone/reset-password', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  const { phone } = req.params

  try {
    const hashedPassword = bcrypt.hashSync('123456', 10)
    db.prepare("UPDATE users SET password = ? WHERE phone = ? AND role = 'parent'")
      .run(hashedPassword, phone)

    res.json({ code: 200, message: '密码已重置为 123456' })
  } catch (error) {
    console.error('重置密码错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

// 教练设置
app.get('/api/coach/settings', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM coach_settings WHERE coach_phone = ?')
      .get(req.user.phone)

    if (!settings) {
      db.prepare('INSERT INTO coach_settings (coach_phone, login_account) VALUES (?, ?)')
        .run(req.user.phone, req.user.phone)
      settings = db.prepare('SELECT * FROM coach_settings WHERE coach_phone = ?')
        .get(req.user.phone)
    }

    res.json({ code: 200, data: settings })
  } catch (error) {
    console.error('获取设置错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

app.put('/api/coach/settings', authMiddleware, roleMiddleware(['coach']), (req, res) => {
  console.log('收到设置更新请求:', req.body)
  const { title, subtitle, bg_image, coach_bg_image, login_account } = req.body

  try {
    // 先检查设置记录是否存在
    const existing = db.prepare('SELECT * FROM coach_settings WHERE coach_phone = ?').get(req.user.phone)
    if (!existing) {
      // 如果不存在，先创建默认设置
      db.prepare('INSERT INTO coach_settings (coach_phone, login_account) VALUES (?, ?)')
        .run(req.user.phone, login_account || req.user.phone)
    }

    // 更新设置
    db.prepare(`
      UPDATE coach_settings
      SET title = ?, subtitle = ?, bg_image = ?, coach_bg_image = ?, login_account = ?
      WHERE coach_phone = ?
    `).run(title || '大马课程预约', subtitle || '以冰锻魂 双十必达', bg_image, coach_bg_image, login_account || req.user.phone, req.user.phone)

    res.json({ code: 200, message: '设置更新成功' })
  } catch (error) {
    console.error('更新设置错误:', error)
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message })
  }
})

// 上传家长端背景图
app.post('/api/coach/settings/background', authMiddleware, roleMiddleware(['coach']), upload.single('background'), (req, res) => {
  console.log('收到家长端背景图上传请求')
  if (!req.file) {
    console.log('没有上传文件')
    return res.status(400).json({ code: 400, message: '没有上传文件' })
  }

  try {
    const bgUrl = `/uploads/${req.file.filename}`
    console.log('更新数据库，URL:', bgUrl, '教练:', req.user.phone)
    db.prepare('UPDATE coach_settings SET bg_image = ? WHERE coach_phone = ?')
      .run(bgUrl, req.user.phone)

    res.json({ code: 200, message: '背景上传成功', data: { url: bgUrl } })
  } catch (error) {
    console.error('上传背景图错误:', error)
    res.status(500).json({ code: 500, message: '上传失败: ' + error.message })
  }
})

// 上传教练端背景图
app.post('/api/coach/settings/coach-background', authMiddleware, roleMiddleware(['coach']), upload.single('background'), (req, res) => {
  console.log('收到教练端背景图上传请求')
  if (!req.file) {
    console.log('没有上传文件')
    return res.status(400).json({ code: 400, message: '没有上传文件' })
  }

  try {
    const bgUrl = `/uploads/${req.file.filename}`
    console.log('更新数据库，URL:', bgUrl, '教练:', req.user.phone)
    db.prepare('UPDATE coach_settings SET coach_bg_image = ? WHERE coach_phone = ?')
      .run(bgUrl, req.user.phone)

    res.json({ code: 200, message: '教练端背景上传成功', data: { url: bgUrl } })
  } catch (error) {
    console.error('上传教练端背景图错误:', error)
    res.status(500).json({ code: 500, message: '上传失败: ' + error.message })
  }
})

// 每日统计任务（每日00:01执行）
cron.schedule('1 0 * * *', () => {
  console.log('执行每日统计更新...')
  // 这里可以添加统计数据的计算和缓存逻辑
})

// 诊断路由 - 检查所有注册的路由
app.get('/api/debug/routes', (req, res) => {
  const routes = app._router.stack
    .filter(r => r.route)
    .map(r => ({
      methods: Object.keys(r.route.methods),
      path: r.route.path
    }))
    .filter(r => r.path.includes('coach') && r.path.includes('booking'))
  res.json({ code: 200, data: routes })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  // 打印所有注册的路由用于调试
  const routes = app._router.stack
    .filter(r => r.route)
    .map(r => `${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`)
    .filter(r => r.includes('coach') && r.includes('booking'))
  console.log('教练端预约路由:', routes)
})
