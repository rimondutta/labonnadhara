/**
 * InvoiceDocument.tsx
 * React-PDF template for generating professional PDF invoices.
 * Modern, clean, professional layout.
 */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const BRAND_COLOR = '#0f172a'; // slate-900
const ACCENT_COLOR = '#3b82f6'; // blue-500
const TEXT_MAIN = '#334155'; // slate-700
const TEXT_MUTED = '#64748b'; // slate-500
const BORDER_COLOR = '#e2e8f0'; // slate-200

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Roboto',
    color: TEXT_MAIN,
    backgroundColor: '#ffffff',
  },
  topAccent: {
    height: 6,
    backgroundColor: BRAND_COLOR,
    width: '100%',
  },
  container: {
    padding: 40,
  },
  
  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  brandName: {
    fontSize: 24,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: BRAND_COLOR,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 9,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: BORDER_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'right',
  },
  
  // Meta Details Grid
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 35,
    paddingBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  metaCol: {
    width: '30%',
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: 'Roboto',
    color: BRAND_COLOR,
    lineHeight: 1.4,
  },
  metaValueBold: {
    fontSize: 10,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: BRAND_COLOR,
  },

  // Bill To & Ship To
  addressesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  addressBox: {
    width: '45%',
    padding: 15,
    backgroundColor: '#f8fafc', // slate-50
    borderRadius: 4,
  },
  addressName: {
    fontSize: 12,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: BRAND_COLOR,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.5,
  },

  // Table
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9', // slate-100
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  colDesc: { width: '45%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  
  itemTitle: {
    fontSize: 10,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: BRAND_COLOR,
  },
  itemVariant: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 3,
  },
  cellText: {
    fontSize: 9,
    color: TEXT_MAIN,
  },
  cellBold: {
    fontSize: 10,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: BRAND_COLOR,
  },

  // Summary Section
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentInfo: {
    width: '45%',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: 'Roboto',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgePaid: {
    backgroundColor: '#dcfce7', // green-100
    color: '#166534', // green-800
  },
  badgePending: {
    backgroundColor: '#fef3c7', // amber-100
    color: '#92400e', // amber-800
  },
  totalsArea: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
  },
  totalValue: {
    fontSize: 9,
    color: TEXT_MAIN,
    fontFamily: 'Roboto',
    fontWeight: 700,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: BRAND_COLOR,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: BRAND_COLOR,
    textTransform: 'uppercase',
  },
  grandTotalValue: {
    fontSize: 16,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: ACCENT_COLOR,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
});

interface InvoiceItem {
  title: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
  variantOptions?: Record<string, string>;
}

export interface InvoiceDocumentProps {
  invoiceNumber: string;
  invoiceDate: string;
  orderId: string;
  orderDate: string;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: {
    addressLine1?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
}

const fmt = (n: number) => `Tk ${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

const paymentLabel = (method: string) => {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'bkash') return 'bKash';
  if (method === 'card') return 'Credit / Debit Card';
  return method.toUpperCase();
};

export function InvoiceDocument({
  invoiceNumber,
  invoiceDate,
  orderId,
  orderDate,
  paymentMethod,
  paymentStatus,
  fulfillmentStatus,
  customer,
  shippingAddress,
  items,
  subtotal,
  shippingCost,
  totalAmount,
  company,
}: InvoiceDocumentProps) {
  const shortId = orderId.slice(-8).toUpperCase();
  const isPaid = paymentStatus === 'paid';
  
  const variantText = (item: InvoiceItem) =>
    [
    ...(item.variantOptions 
      ? Object.values(item.variantOptions) 
      : [
          item.color && item.color !== 'Default' ? item.color : null,
          item.size && item.size !== 'Default' ? item.size : null,
        ]
    ),
    ]
      .filter(Boolean)
      .join(' / ');

  return (
    <Document
      title={`Invoice ${invoiceNumber} — ${company.name}`}
      author={company.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccent} />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View>
              <Text style={styles.brandName}>{company.name.toUpperCase()}</Text>
              <Text style={styles.brandTagline}>Professional Toys & Gear</Text>
            </View>
            <View>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
            </View>
          </View>

          {/* Meta Details */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text style={styles.metaValueBold}>{invoiceNumber}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Date of Issue</Text>
              <Text style={styles.metaValue}>{invoiceDate}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Order Ref</Text>
              <Text style={styles.metaValue}>#{shortId}</Text>
            </View>
          </View>

          {/* Bill To & Ship To */}
          <View style={styles.addressesContainer}>
            <View style={styles.addressBox}>
              <Text style={styles.metaLabel}>Billed To</Text>
              <Text style={styles.addressName}>{customer.name || 'Customer'}</Text>
              {customer.email ? <Text style={styles.addressText}>{customer.email}</Text> : null}
              {customer.phone ? <Text style={styles.addressText}>{customer.phone}</Text> : null}
            </View>
            
            <View style={styles.addressBox}>
              <Text style={styles.metaLabel}>Shipped To</Text>
              {shippingAddress ? (
                <>
                  <Text style={styles.addressText}>{shippingAddress.addressLine1}</Text>
                  <Text style={styles.addressText}>{shippingAddress.city} {shippingAddress.postcode}</Text>
                  <Text style={styles.addressText}>{shippingAddress.country}</Text>
                </>
              ) : (
                <Text style={styles.addressText}>No shipping address provided</Text>
              )}
            </View>
          </View>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount</Text>
            </View>

            {items.map((item, i) => {
              const variant = variantText(item);
              return (
                <View key={i} style={styles.tableRow}>
                  <View style={styles.colDesc}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {variant ? <Text style={styles.itemVariant}>{variant}</Text> : null}
                  </View>
                  <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
                  <Text style={[styles.cellText, styles.colPrice]}>{fmt(item.price)}</Text>
                  <Text style={[styles.cellBold, styles.colTotal]}>
                    {fmt(item.price * item.quantity)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.paymentInfo}>
              <Text style={styles.metaLabel}>Payment Status</Text>
              <Text style={[styles.badge, isPaid ? styles.badgePaid : styles.badgePending]}>
                {isPaid ? 'PAID' : 'PENDING'}
              </Text>
              <Text style={styles.metaLabel}>Payment Method</Text>
              <Text style={styles.metaValue}>{paymentLabel(paymentMethod)}</Text>
            </View>

            <View style={styles.totalsArea}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalValue}>{fmt(shippingCost)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total Due</Text>
                <Text style={styles.grandTotalValue}>{fmt(totalAmount)}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerText}>{company.name}</Text>
            <Text style={styles.footerText}>{company.address}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerText}>{company.email}</Text>
            <Text style={styles.footerText}>{company.phone}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
