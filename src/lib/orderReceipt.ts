import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from '@/integrations/supabase/client'

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
}

export interface ReceiptInput {
  orderId: string
  customerName: string
  email: string
  phone?: string
  items: ReceiptItem[]
  subtotal: number
  shippingLabel?: string
  shippingCost: number
  grandTotal: number
  shippingAddress?: string
}

const PRIMARY = '#D4A017'
const DARK = '#1A1A1A'

async function buildPdf(input: ReceiptInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 50

  // Header band
  doc.setFillColor(PRIMARY)
  doc.rect(0, 0, W, 90, 'F')
  doc.setTextColor('#FFFFFF')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('USHANGA CHRONICLES', 40, 45)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('One bead. A thousand stories.', 40, 65)
  doc.text('Nairobi, Kenya  ·  admin@ushangachronicles.com', 40, 80)

  y = 130
  doc.setTextColor(DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Order Receipt', 40, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Order #${input.orderId}`, W - 40, y, { align: 'right' })
  y += 14
  doc.text(`Date: ${new Date().toLocaleString('en-GB')}`, W - 40, y, { align: 'right' })

  // Customer
  y += 30
  doc.setFont('helvetica', 'bold'); doc.text('Billed To', 40, y)
  doc.setFont('helvetica', 'normal')
  y += 14; doc.text(input.customerName || '—', 40, y)
  y += 12; doc.text(input.email || '—', 40, y)
  if (input.phone) { y += 12; doc.text(input.phone, 40, y) }
  if (input.shippingAddress) {
    const lines = doc.splitTextToSize(input.shippingAddress, 250)
    y += 12; doc.text(lines, 40, y)
    y += lines.length * 12
  }

  // Items table
  y += 20
  doc.setFillColor('#FAFAFA')
  doc.rect(40, y - 14, W - 80, 22, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text('Item', 50, y)
  doc.text('Qty', W - 220, y, { align: 'right' })
  doc.text('Unit', W - 140, y, { align: 'right' })
  doc.text('Total', W - 50, y, { align: 'right' })
  y += 10
  doc.setDrawColor('#E5E7EB')
  doc.line(40, y, W - 40, y)

  doc.setFont('helvetica', 'normal')
  input.items.forEach(item => {
    y += 20
    const nameLines = doc.splitTextToSize(item.name, W - 280)
    doc.text(nameLines, 50, y)
    doc.text(String(item.quantity), W - 220, y, { align: 'right' })
    doc.text(`KSh ${item.price.toLocaleString()}`, W - 140, y, { align: 'right' })
    doc.text(`KSh ${(item.price * item.quantity).toLocaleString()}`, W - 50, y, { align: 'right' })
    if (nameLines.length > 1) y += (nameLines.length - 1) * 12
    doc.line(40, y + 6, W - 40, y + 6)
  })

  // Totals
  y += 30
  const totalsX = W - 220
  doc.text('Subtotal', totalsX, y)
  doc.text(`KSh ${input.subtotal.toLocaleString()}`, W - 50, y, { align: 'right' })
  y += 16
  doc.text(`Shipping${input.shippingLabel ? ` (${input.shippingLabel})` : ''}`, totalsX, y)
  doc.text(`KSh ${input.shippingCost.toLocaleString()}`, W - 50, y, { align: 'right' })
  y += 8
  doc.setDrawColor(PRIMARY); doc.setLineWidth(1.2)
  doc.line(totalsX, y, W - 40, y)
  y += 18
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text('Grand Total', totalsX, y)
  doc.setTextColor(PRIMARY)
  doc.text(`KSh ${input.grandTotal.toLocaleString()}`, W - 50, y, { align: 'right' })

  // Footer
  doc.setTextColor('#6B7280')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text('Asante sana for supporting handmade African craft.', 40, 800)
  doc.text('Questions? WhatsApp +254 748 207 000 or admin@ushangachronicles.com', 40, 814)
  doc.text('ushangachronicles.com', W - 40, 800, { align: 'right' })

  // QR code linking to order tracking / verification
  try {
    const qrTarget = `https://ushangachronicles.com/my-orders?order=${encodeURIComponent(input.orderId)}`
    const qrDataUrl = await QRCode.toDataURL(qrTarget, {
      margin: 0,
      width: 240,
      color: { dark: DARK, light: '#FFFFFF' },
    })
    const qrSize = 80
    const qrX = W - 40 - qrSize
    const qrY = 740 - qrSize
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    doc.setTextColor(DARK)
    doc.setFontSize(8)
    doc.text('Scan to track your order', qrX + qrSize / 2, qrY + qrSize + 12, { align: 'center' })
  } catch (err) {
    console.error('QR code generation failed', err)
  }

  return doc.output('blob')
}

/**
 * Build the PDF receipt, upload to the order-receipts bucket, return a long-lived signed URL.
 * Returns null on any failure so the email path can fall back gracefully.
 */
export async function generateAndUploadReceipt(input: ReceiptInput): Promise<string | null> {
  try {
    const blob = await buildPdf(input)
    const path = `${input.orderId}/receipt-${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage
      .from('order-receipts')
      .upload(path, blob, { contentType: 'application/pdf', upsert: true })
    if (upErr) { console.error('Receipt upload failed', upErr); return null }

    // Signed URL valid for ~1 year
    const { data, error: signErr } = await supabase.storage
      .from('order-receipts')
      .createSignedUrl(path, 60 * 60 * 24 * 365)
    if (signErr || !data) { console.error('Receipt sign URL failed', signErr); return null }
    return data.signedUrl
  } catch (err) {
    console.error('Receipt generation crashed', err)
    return null
  }
}
