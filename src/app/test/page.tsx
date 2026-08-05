'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Department = {
  id: number
  name: string
}

export default function TestPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('department')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else {
          setDepartments(data)
        }
      })
  }, [])

async function addDepartment() {
  const randomName = 'قسم تجربة ' + Date.now()

  const { data, error } = await supabase
    .from('department')
    .insert({ name: randomName })
    .select()

  if (error) {
    console.log('في مشكلة:', error.message)
    setError(error.message)
  } else {
    console.log('تمام:', data)
    setDepartments((prev) => [...prev, ...data])
  }
}

  if (error) return <div className="p-6 text-red-500">خطأ: {error}</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">الأقسام</h1>

      <button
        onClick={addDepartment}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        ضيف قسم تجربة
      </button>

      {departments.length === 0 ? (
        <p>مفيش أقسام لسه</p>
      ) : (
        <ul>
          {departments.map((dept) => (
            <li key={dept.id} className="border-b py-2">{dept.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}