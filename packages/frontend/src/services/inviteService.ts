import { getAuth } from 'firebase/auth'

/**
 * Get invite details by token (public endpoint - no auth required)
 */
export async function getInviteDetails(token: string) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/invites/${token}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Invite not found or expired')
  }

  return await response.json()
}

/**
 * Accept organization invite (requires authentication)
 */
export async function acceptOrganizationInvite(token: string) {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('User not authenticated')
  }

  const idToken = await user.getIdToken()

  const response = await fetch(`${import.meta.env.VITE_API_URL}/invites/${token}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to accept invitation')
  }

  return await response.json()
}

/**
 * Decline organization invite (public endpoint - no auth required)
 */
export async function declineOrganizationInvite(token: string) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/invites/${token}/decline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to decline invitation')
  }

  return await response.json()
}

/**
 * Accept membership invite for existing user (requires authentication)
 */
export async function acceptMembershipInvite(memberId: string) {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('User not authenticated')
  }

  const idToken = await user.getIdToken()

  const response = await fetch(`${import.meta.env.VITE_API_URL}/organization-members/${memberId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to accept membership')
  }

  return await response.json()
}

/**
 * Decline membership invite for existing user (requires authentication)
 */
export async function declineMembershipInvite(memberId: string) {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('User not authenticated')
  }

  const idToken = await user.getIdToken()

  const response = await fetch(`${import.meta.env.VITE_API_URL}/organization-members/${memberId}/decline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to decline membership')
  }

  return await response.json()
}

/**
 * Get pending invites for current user (requires authentication)
 */
export async function getPendingInvites() {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('User not authenticated')
  }

  const idToken = await user.getIdToken()

  const response = await fetch(`${import.meta.env.VITE_API_URL}/invites/pending`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to get pending invites')
  }

  return await response.json()
}
