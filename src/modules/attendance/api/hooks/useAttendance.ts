// src/modules/attendance/hooks/useAttendance.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  checkIn,
  checkOut,
  getAttendanceHistory,
  getAttendanceToday,
  getLeaveRequests,
  requestLeave,
  updateLeave,
  deleteLeave,
  endLeaveEarly,
  checkLeaveStatus,
} from '../api/attendance.api'
import type {
  AttendanceFilters,
  AttendanceRecord,
  AttendanceToday,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '@/types/attendance'

function getErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback
}

// ------------------------------------------------------------
// موظّف: حضور/انصراف اليوم
// ------------------------------------------------------------
export function useCheckInOut() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doCheckIn = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await checkIn()
    } catch (e) {
      setError(getErrorMessage(e, 'فشل تسجيل الحضور'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const doCheckOut = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await checkOut()
    } catch (e) {
      setError(getErrorMessage(e, 'فشل تسجيل الانصراف'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { checkIn: doCheckIn, checkOut: doCheckOut, loading, error }
}

// ------------------------------------------------------------
// مدير: حضور كل الموظفين النهارده (attendance_today view)
// ------------------------------------------------------------
export function useAttendanceToday(userIds?: string[]) {
  const [data, setData] = useState<AttendanceToday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getAttendanceToday({ userIds }))
    } catch (e) {
      setError(getErrorMessage(e, 'تعذر تحميل بيانات الحضور'))
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(userIds)])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// ------------------------------------------------------------
// سجل الحضور (موظف بيشوف بتاعه، مدير بيشوف بتاع أي حد بفلتر userId)
// ------------------------------------------------------------
export function useAttendanceHistory(filters: AttendanceFilters) {
  const [data, setData] = useState<AttendanceRecord[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAttendanceHistory(filters)
      setData(result.data)
      setCount(result.count)
    } catch (e) {
      setError(getErrorMessage(e, 'تعذر تحميل سجل الحضور'))
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, count, loading, error, refresh }
}

// ------------------------------------------------------------
// طلبات الإجازة (قراءة + إدارة)
// ------------------------------------------------------------
export function useLeaveRequests(filters: { userId?: string; status?: LeaveStatus }) {
  const [data, setData] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getLeaveRequests(filters))
    } catch (e) {
      setError(getErrorMessage(e, 'تعذر تحميل طلبات الإجازة'))
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

export function useLeaveActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run<T>(fn: () => Promise<T>, fallback: string) {
    setLoading(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(getErrorMessage(e, fallback))
      throw e
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    // موظف
    submitLeave: (payload: {
      p_start_date: string
      p_end_date: string
      p_leave_type: LeaveType
      p_reason: string
    }) => run(() => requestLeave(payload), 'فشل إرسال طلب الإجازة'),
    editLeave: (payload: {
      p_leave_id: number
      p_start_date: string
      p_end_date: string
      p_reason: string
    }) => run(() => updateLeave(payload), 'فشل تعديل طلب الإجازة'),
    removeLeave: (leaveId: number) =>
      run(() => deleteLeave(leaveId), 'فشل حذف طلب الإجازة'),
    endEarly: (leaveId: number) =>
      run(() => endLeaveEarly(leaveId), 'فشل إنهاء الإجازة مبكرًا'),
    // مدير
    setLeaveStatus: (leaveId: number, newStatus: LeaveStatus) =>
      run(
        () => checkLeaveStatus(leaveId, newStatus),
        'فشل تحديث حالة طلب الإجازة'
      ),
  }
}