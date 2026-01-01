import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Check, X, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getInviteDetails,
  acceptOrganizationInvite,
  declineOrganizationInvite,
  acceptMembershipInvite,
  declineMembershipInvite
} from '@/services/inviteService'

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const token = searchParams.get('token')
  const memberId = searchParams.get('memberId')

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<any>(null)

  useEffect(() => {
    if (token) {
      loadInvite()
    } else if (memberId) {
      // For existing user invites, we don't need to load details upfront
      // Just show a simple accept/decline interface
      setLoading(false)
    } else {
      setError('Invalid invitation link')
      setLoading(false)
    }
  }, [token, memberId])

  const loadInvite = async () => {
    if (!token) return

    try {
      setLoading(true)
      const details = await getInviteDetails(token)
      setInvite(details)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Invite not found or expired')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    try {
      setProcessing(true)
      setError(null)

      if (!user) {
        // Redirect to signup with invite token
        if (token) {
          navigate(`/signup?invite=${token}`)
        } else {
          navigate('/login')
        }
        return
      }

      let result
      if (token) {
        result = await acceptOrganizationInvite(token)
      } else if (memberId) {
        result = await acceptMembershipInvite(memberId)
      }

      // Success! Redirect to organizations page
      alert('Invitation accepted successfully!')
      navigate('/organizations')
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this invitation?')) {
      return
    }

    try {
      setProcessing(true)
      setError(null)

      if (token) {
        await declineOrganizationInvite(token)
      } else if (memberId) {
        await declineMembershipInvite(memberId)
      }

      alert('Invitation declined')
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invite && !memberId) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Invitation Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-6 flex gap-4">
              <Button onClick={() => navigate('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Organization Invitation</CardTitle>
          <CardDescription>
            You've been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          {invite && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Organization</label>
                <p className="text-lg font-semibold">{invite.organizationName}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Invited by</label>
                <p>{invite.inviterName}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Roles</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {invite.roles?.map((role: string) => (
                    <span
                      key={role}
                      className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Expires</label>
                <p className="text-sm">
                  {invite.expiresAt ? new Date(invite.expiresAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          )}

          {memberId && !invite && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have a pending invitation to join an organization.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleAccept}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>

            <Button
              onClick={handleDecline}
              disabled={processing}
              variant="outline"
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </div>

          {!user && (
            <p className="text-sm text-center text-muted-foreground">
              You'll be redirected to sign up or log in to accept this invitation
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
