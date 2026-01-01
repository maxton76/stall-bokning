import sgMail from '@sendgrid/mail'
import type { OrganizationInvite } from '@stall-bokning/shared/types/organization'

// Initialize SendGrid with API key from environment
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

/**
 * Send invite email to existing user with accept/decline links
 */
export async function sendOrganizationInviteEmail(
  invite: OrganizationInvite,
  acceptUrl: string,
  declineUrl: string
): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent.')
    return
  }

  if (!process.env.SENDGRID_INVITE_TEMPLATE_ID) {
    console.warn('SendGrid invite template ID not configured. Email not sent.')
    return
  }

  const msg = {
    to: invite.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@stallbokning.com',
    templateId: process.env.SENDGRID_INVITE_TEMPLATE_ID,
    dynamicTemplateData: {
      organizationName: invite.organizationName,
      inviterName: invite.inviterName,
      roles: invite.roles.join(', '),
      acceptUrl,
      declineUrl,
      expiresAt: invite.expiresAt.toDate().toLocaleDateString()
    }
  }

  try {
    await sgMail.send(msg)
    console.log(`Invite email sent to ${invite.email} for organization ${invite.organizationName}`)
  } catch (error) {
    console.error('Error sending invite email:', error)
    throw new Error('Failed to send invite email')
  }
}

/**
 * Send signup invite email to non-existing user with signup link
 */
export async function sendSignupInviteEmail(
  invite: OrganizationInvite,
  signupUrl: string
): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent.')
    return
  }

  if (!process.env.SENDGRID_SIGNUP_INVITE_TEMPLATE_ID) {
    console.warn('SendGrid signup invite template ID not configured. Email not sent.')
    return
  }

  const msg = {
    to: invite.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@stallbokning.com',
    templateId: process.env.SENDGRID_SIGNUP_INVITE_TEMPLATE_ID,
    dynamicTemplateData: {
      organizationName: invite.organizationName,
      inviterName: invite.inviterName,
      roles: invite.roles.join(', '),
      signupUrl,
      expiresAt: invite.expiresAt.toDate().toLocaleDateString()
    }
  }

  try {
    await sgMail.send(msg)
    console.log(`Signup invite email sent to ${invite.email} for organization ${invite.organizationName}`)
  } catch (error) {
    console.error('Error sending signup invite email:', error)
    throw new Error('Failed to send signup invite email')
  }
}

/**
 * Send invite email to existing user (organizationMember with pending status)
 */
export async function sendMemberInviteEmail(data: {
  email: string
  organizationName: string
  inviterName: string
  roles: string[]
  acceptUrl: string
  declineUrl: string
}): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent.')
    return
  }

  if (!process.env.SENDGRID_INVITE_TEMPLATE_ID) {
    console.warn('SendGrid invite template ID not configured. Email not sent.')
    return
  }

  const msg = {
    to: data.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@stallbokning.com',
    templateId: process.env.SENDGRID_INVITE_TEMPLATE_ID,
    dynamicTemplateData: {
      organizationName: data.organizationName,
      inviterName: data.inviterName,
      roles: data.roles.join(', '),
      acceptUrl: data.acceptUrl,
      declineUrl: data.declineUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    }
  }

  try {
    await sgMail.send(msg)
    console.log(`Member invite email sent to ${data.email} for organization ${data.organizationName}`)
  } catch (error) {
    console.error('Error sending member invite email:', error)
    throw new Error('Failed to send member invite email')
  }
}
