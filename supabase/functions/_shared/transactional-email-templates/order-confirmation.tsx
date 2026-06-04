import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Section, Text, Row, Column, Hr } from 'npm:@react-email/components@0.0.22'

interface OrderItem {
  name: string
  quantity: number
  price: string
}

interface OrderConfirmationProps {
  customerName?: string
  orderNumber?: string
  items?: OrderItem[]
  totalAmount?: string
}

// The Visual Layout Components
const OrderConfirmationComponent = ({
  customerName = 'Valued Customer',
  orderNumber = 'N/A',
  items = [],
  totalAmount = 'KSh 0',
}: OrderConfirmationProps) => {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '20px' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', maxWidth: '580px', margin: '0 auto' }}>
          <Heading style={{ size: '24px', color: '#111' }}>Asante for your order!</Heading>
          <Text>Hi {customerName}, we are processing your order <strong>#{orderNumber}</strong>.</Text>
          
          <Section style={{ marginTop: '20px', backgroundColor: '#fafafa', padding: '15px', borderRadius: '6px' }}>
            <Text style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', margin: '0 0 10px 0' }}>
              Order Summary
            </Text>
            
            {items.map((item, index) => (
              <Row key={index} style={{ padding: '6px 0' }}>
                <Column align="left">
                  <Text style={{ margin: 0 }}>{item.name} <strong>x{item.quantity}</strong></Text>
                </Column>
                <Column align="right">
                  <Text style={{ margin: 0, fontWeight: 'bold' }}>{item.price}</Text>
                </Column>
              </Row>
            ))}
            
            <Hr style={{ borderColor: '#e6e6e6', margin: '15px 0' }} />
            
            <Row>
              <Column align="left"><Text style={{ fontWeight: 'bold', margin: 0 }}>Total Paid:</Text></Column>
              <Column align="right"><Text style={{ fontWeight: 'bold', color: '#e67e22', margin: 0 }}>{totalAmount}</Text></Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Exporting the exact TemplateEntry matching your registry's interface
export const template = {
  component: OrderConfirmationComponent,
  displayName: "Order Confirmation",
  subject: (data: Record<string, any>) => `Ushanga Chronicles: Order Confirmation #${data.orderNumber || 'New'}`,
  previewData: {
    customerName: "Alex",
    orderNumber: "UC-1042",
    totalAmount: "KSh 4,700",
    items: [
      { name: "Maasai Beaded Necklace", quantity: 1, price: "KSh 3,500" },
      { name: "Beaded Bracelet", quantity: 1, price: "KSh 1,200" }
    ]
  }
}
