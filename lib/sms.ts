import twilio from 'twilio'

const getClient = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

/**
 * Send a customer their stamp card link on join.
 */
export async function sendCardLink({
  phone,
  businessSlug,
  customerId,
  businessName,
}: {
  phone: string
  businessSlug: string
  customerId: string
  businessName?: string
}) {
  const client = getClient()
  const cardUrl = `https://lastmileloyalty.com/${businessSlug}/${customerId}`

  const body = businessName
    ? `Welcome to ${businessName}'s loyalty programme! Here's your stamp card — save this link so you can check your stamps anytime: ${cardUrl}`
    : `Welcome! Here's your loyalty stamp card — save this link to check your stamps anytime: ${cardUrl}`

  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phone,
  })
}

/**
 * Re-send a customer their card link (for the "already a member?" lookup flow).
 */
export async function resendCardLink({
  phone,
  businessSlug,
  customerId,
  businessName,
}: {
  phone: string
  businessSlug: string
  customerId: string
  businessName?: string
}) {
  const client = getClient()
  const cardUrl = `https://lastmileloyalty.com/${businessSlug}/${customerId}`

  const body = businessName
    ? `Here's your ${businessName} loyalty card link: ${cardUrl}`
    : `Here's your loyalty card link: ${cardUrl}`

  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phone,
  })
}

/**
 * Notify a customer that they've earned a reward.
 */
export async function sendRewardNotification({
  phone,
  businessName,
  rewardDescription,
  businessSlug,
  customerId,
}: {
  phone: string
  businessName: string
  rewardDescription: string
  businessSlug: string
  customerId: string
}) {
  const client = getClient()
  const cardUrl = `https://lastmileloyalty.com/${businessSlug}/${customerId}`

  return client.messages.create({
    body: `Great news! You've earned your reward at ${businessName}: ${rewardDescription}. Show this next time you visit: ${cardUrl}`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phone,
  })
}
