import { useEffect } from 'react'
import { useCircleStore } from '../store/circleStore'
import { useAuthStore } from '../store/authStore'

export function useCircle() {
  const { user } = useAuthStore()
  const { circle, members, loading, fetchCircle, fetchMembers } = useCircleStore()

  useEffect(() => {
    if (user?.id) {
      fetchCircle(user.id)
    }
  }, [user?.id])

  useEffect(() => {
    if (circle?.id) {
      fetchMembers(circle.id)
    }
  }, [circle?.id])

  return { circle, members, loading }
}
