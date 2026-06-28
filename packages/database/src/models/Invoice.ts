import { Schema, model, Document } from 'mongoose';
import { Invoice, LineItem } from '../types';

export const LineItemSchema = new Schema<LineItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  total: { type: Number, default: 0, min: 0 },
});

// Client info snapshot schema, stored inline to preserve historical values 
// if a master client profile changes. Do NOT add unique indexes here.
const ClientInfoSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  billingAddress: { type: String, required: true },
  taxId: { type: String, required: true },
  gstin: { type: String },
  pan: { type: String },
}, { _id: false });

export interface InvoiceDocument extends Omit<Invoice, 'id'>, Document {}

const InvoiceSchema = new Schema<InvoiceDocument>({
  documentType: {
    type: String,
    enum: ['QUOTATION', 'PROFORMA', 'FINAL_INVOICE'],
    required: true,
    index: true,
  },
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  clientRef: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true,
  },
  clientInfo: {
    type: ClientInfoSchema,
    required: true,
  },
  items: {
    type: [LineItemSchema],
    required: true,
  },
  subTotal: { type: Number, required: true, default: 0 },
  taxAmount: { type: Number, required: true, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  currency: { type: String, required: true, default: 'USD' },
  notes: { type: String },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'CONVERTED', 'EXPIRED', 'PAID', 'VOID', 'OVERDUE'],
    default: 'DRAFT',
    index: true,
  },

  // Tracing relationships (self-references)
  quotationRef: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    index: true,
  },
  proformaRef: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    index: true,
  },

  // Type-specific optional fields
  validUntil: { type: Date },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
    index: true,
  },
  paymentDate: { type: Date },
}, { timestamps: true });

export const InvoiceModel = model<InvoiceDocument>('Invoice', InvoiceSchema);
export default InvoiceModel;
