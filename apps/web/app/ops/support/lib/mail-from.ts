/**
 * The address support emails are sent from, shown in the support console.
 * Set NEXT_PUBLIC_MAIL_FROM to the same mailbox as the API's SMTP_USER (e.g. support@yourdomain.com).
 */
export const SUPPORT_FROM_ADDRESS = process.env.NEXT_PUBLIC_MAIL_FROM || "your support mailbox";
