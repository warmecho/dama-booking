import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

// 获取日历数据（周一起始）
export function getCalendarDays(year, month) {
  const firstDay = dayjs(`${year}-${month}-01`)
  const startOfMonth = firstDay.startOf('month')
  const endOfMonth = firstDay.endOf('month')

  // 周一起始，计算月初是周几（0=周日, 1=周一...）
  const firstDayWeekday = startOfMonth.day() || 7
  const daysFromPrevMonth = firstDayWeekday - 1

  const days = []
  const totalCells = 42 // 6行 x 7列

  // 上月日期
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    days.push({
      date: startOfMonth.subtract(i + 1, 'day').format('YYYY-MM-DD'),
      day: startOfMonth.subtract(i + 1, 'day').date(),
      isCurrentMonth: false,
      isToday: false
    })
  }

  // 当月日期
  const daysInMonth = endOfMonth.date()
  const today = dayjs().format('YYYY-MM-DD')

  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    days.push({
      date,
      day: i,
      isCurrentMonth: true,
      isToday: date === today
    })
  }

  // 下月日期
  const remainingCells = totalCells - days.length
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: endOfMonth.add(i, 'day').format('YYYY-MM-DD'),
      day: i,
      isCurrentMonth: false,
      isToday: false
    })
  }

  return days
}

// 获取节假日（简化版，实际应接入节假日API）
export function getHolidayName(date) {
  const holidays = {
    '01-01': '元旦',
    '05-01': '劳动节',
    '10-01': '国庆节',
    '10-02': '国庆节',
    '10-03': '国庆节',
  }
  const monthDay = date.slice(5)
  return holidays[monthDay] || null
}

// 判断是否工作日
export function isWorkday(date) {
  const d = dayjs(date)
  const weekday = d.day()
  // 0=周日, 6=周六
  return weekday !== 0 && weekday !== 6
}

// 获取重复日期
export function getRepeatDates(startDate, option, maxDate) {
  const dates = [startDate]
  const start = dayjs(startDate)
  const max = dayjs(maxDate)

  if (option === 'none') return dates

  let current = start

  while (true) {
    let next

    switch (option) {
      case 'tomorrow':
        next = current.add(1, 'day')
        break
      case 'workday':
        // 下一个工作日
        next = current.add(1, 'day')
        while (next.day() === 0 || next.day() === 6) {
          next = next.add(1, 'day')
        }
        break
      case 'weekend':
        // 下一个周六日
        next = current.add(1, 'day')
        while (next.day() !== 0 && next.day() !== 6) {
          next = next.add(1, 'day')
        }
        break
      case 'next_week':
        next = current.add(7, 'day')
        break
      default:
        return dates
    }

    if (next.isAfter(max)) break
    dates.push(next.format('YYYY-MM-DD'))
    current = next
  }

  return dates
}

// 计算时长（小时）
export function calculateDuration(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  return (endMinutes - startMinutes) / 60
}

// 格式化日期显示
export function formatDate(date, format = 'MM月DD日') {
  return dayjs(date).format(format)
}

// 获取本周开始和结束
export function getWeekRange(offset = 0) {
  const now = dayjs().add(offset, 'week')
  const start = now.startOf('week').add(1, 'day') // 周一开始
  const end = now.endOf('week').add(1, 'day') // 周日结束

  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  }
}

// 获取本月开始和结束
export function getMonthRange(offset = 0) {
  const now = dayjs().add(offset, 'month')
  const start = now.startOf('month')
  const end = now.endOf('month')

  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  }
}

// 判断日期是否过期
export function isExpired(date, time) {
  const now = dayjs()
  const dateTime = dayjs(`${date} ${time}`)
  return dateTime.isBefore(now)
}

export default dayjs
