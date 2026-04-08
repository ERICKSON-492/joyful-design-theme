import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Ushanga Chronicles"

interface OrderStatusProps {
  customerName?: string
  orderId?: string
  status?: string
  trackingNumber?: string
  totalAmount?: string
}

const statusMessages: Record<string, { title: string; message: string }> = {
  paid: {
    title: 'Payment Confirmed',
    message: 'Your payment has been received and confirmed. We are preparing your order.',
  },
  processing: {
    title: 'Order Being Prepared',
    message: 'Great news! Your order is being prepared and will be shipped soon.',
  },
  shipped: {
    title: 'Order Shipped',
    message: 'Your order is on its way! It has been handed to the courier for delivery.',
  },
  delivered: {
    title: 'Order Delivered',
    message: 'Your order has been delivered. We hope you love your items!',
  },
  cancelled: {
    title: 'Order Cancelled',
    message: 'Your order has been cancelled. If you have any questions, please contact us.',
  },
}

const OrderStatusUpdateEmail = ({
  customerName,
  orderId,
  status,
  trackingNumber,
  totalAmount,
}: OrderStatusProps) => {
  const statusInfo = statusMessages[status || 'processing'] || {
    title: 'Order Update',
    message: 'Your order status has been updated.',
  }

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{statusInfo.title} — {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {statusInfo.title}
          </Heading>
          <Text style={text}>
            {customerName ? `Hi ${customerName},` : 'Hi there,'}
          </Text>
          <Text style={text}>
            {statusInfo.message}
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Order ID</Text>
            <Text style={detailValue}>{orderId || '—'}</Text>
            <Hr style={divider} />
            <Text style={detailLabel}>Status</Text>
            <Text style={statusBadge}>{(status || 'processing').toUpperCase()}</Text>
            {trackingNumber && (
              <>
                <Hr style={divider} />
                <Text style={detailLabel}>Tracking Number</Text>
                <Text style={detailValue}>{trackingNumber}</Text>
              </>
            )}
            {totalAmount && (
              <>
                <Hr style={divider} />
                <Text style={detailLabel}>Total</Text>
                <Text style={detailValue}>KSh {totalAmount}</Text>
              </>
            )}
          </Section>

          <Text style={text}>
            If you have any questions about your order, feel free to reach out to us on WhatsApp.
          </Text>

          <Text style={footer}>
            Best regards,<br />The {SITE_NAME} Team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderStatusUpdateEmail,
  subject: (data: Record<string, any>) => {
    const info = statusMessages[data.status] || { title: 'Order Update' }
    return `${info.title} — Order #${(data.orderId || '').slice(0, 8)}`
  },
  displayName: 'Order status update',
  previewData: {
    customerName: 'Jane',
    orderId: 'abc12345-6789',
    status: 'shipped',
    trackingNumber: 'TRK-001234',
    totalAmount: '2,500',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1A1A1A', margin: '0 0 24px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#FFFDF7', border: '1px solid #E8D9A8', borderRadius: '8px', padding: '16px 20px', margin: '0 0 24px' }
const detailLabel = { fontSize: '11px', color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px' }
const detailValue = { fontSize: '14px', color: '#1A1A1A', fontWeight: '600' as const, margin: '0 0 8px' }
const statusBadge = { fontSize: '12px', color: '#D4A017', fontWeight: '700' as const, margin: '0 0 8px', letterSpacing: '1px' }
const divider = { borderColor: '#E8D9A8', margin: '8px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
