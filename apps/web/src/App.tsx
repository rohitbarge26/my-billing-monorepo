import React from 'react';
import './index.css';
import {
  useGetQuotations,
  useGetProformaInvoices,
  useGetFinalInvoices,
} from '@my-billing/api-client';
import { type Quotation, type ProformaInvoice, type FinalInvoice } from '@my-billing/database';

export default function App() {
  // Querying using shared TanStack Query hooks from @my-billing/api-client
  const { data: quotations = [], isLoading: loadingQuotes, error: errorQuotes } = useGetQuotations();
  const { data: proformas = [], isLoading: loadingProformas, error: errorProformas } = useGetProformaInvoices();
  const { data: invoices = [], isLoading: loadingInvoices, error: errorInvoices } = useGetFinalInvoices();

  const isApiError = errorQuotes || errorProformas || errorInvoices;

  // Aggregate values for display
  const totalQuoteVolume = (quotations as Quotation[]).reduce((sum: number, q: Quotation) => sum + (q.totalAmount || 0), 0);
  const totalProformaVolume = (proformas as ProformaInvoice[]).reduce((sum: number, p: ProformaInvoice) => sum + (p.totalAmount || 0), 0);
  const totalInvoiceVolume = (invoices as FinalInvoice[]).reduce((sum: number, i: FinalInvoice) => sum + (i.totalAmount || 0), 0);

  const formatCurrency = (val: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(val);
  };

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="header">
        <div className="logo-section">
          <h1>My Billing ERP</h1>
          <p>Production-Grade Invoicing & Billing Dashboard</p>
        </div>
        <div className="connection-pill">
          <div className="connection-dot" style={{ backgroundColor: isApiError ? '#f87171' : '#34d399', boxShadow: isApiError ? '0 0 8px #f87171' : '0 0 8px #34d399' }} />
          <span>API: {isApiError ? 'Disconnected' : 'Connected'}</span>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="stats-grid">
        <div className="stat-card quotation">
          <div className="stat-header">
            <span>Quotations</span>
            <span style={{ color: 'var(--info)' }}>{quotations.length} Active</span>
          </div>
          <div className="stat-value">{formatCurrency(totalQuoteVolume)}</div>
          <div className="stat-footer">Estimated sales pipe volume</div>
        </div>

        <div className="stat-card proforma">
          <div className="stat-header">
            <span>Proforma Invoices</span>
            <span style={{ color: 'var(--warning)' }}>{proformas.length} Active</span>
          </div>
          <div className="stat-value">{formatCurrency(totalProformaVolume)}</div>
          <div className="stat-footer">Awaiting confirmations</div>
        </div>

        <div className="stat-card invoice">
          <div className="stat-header">
            <span>Final Invoices</span>
            <span style={{ color: 'var(--primary)' }}>{invoices.length} Active</span>
          </div>
          <div className="stat-value">{formatCurrency(totalInvoiceVolume)}</div>
          <div className="stat-footer">Total billed revenue</div>
        </div>
      </section>

      {/* Lists Section */}
      <section className="lists-container">
        {/* 1. Quotations List */}
        <div>
          <h2 className="section-title">
            <span style={{ color: 'var(--info)' }}>●</span> Recent Quotations
          </h2>
          <div className="document-list">
            <div className="list-header">
              <span>Quote #</span>
              <span>Client</span>
              <span>Valid Until</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {loadingQuotes ? (
              <div className="empty-state">Loading quotations...</div>
            ) : quotations.length === 0 ? (
              <div className="empty-state">No quotations found. Create one to get started.</div>
            ) : (
              (quotations as Quotation[]).slice(0, 5).map((q: Quotation) => (
                <div key={q.id || q.quoteNumber} className="list-row">
                  <span className="doc-number">{q.quoteNumber}</span>
                  <div className="client-info">
                    <span className="client-name">{q.clientInfo.name}</span>
                    <span className="client-email">{q.clientInfo.email}</span>
                  </div>
                  <span className="doc-date">{formatDate(q.validUntil)}</span>
                  <span className="doc-amount">{formatCurrency(q.totalAmount, q.currency)}</span>
                  <div>
                    <span className={`status-badge ${q.status.toLowerCase()}`}>{q.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Proforma Invoices List */}
        <div>
          <h2 className="section-title">
            <span style={{ color: 'var(--warning)' }}>●</span> Recent Proforma Invoices
          </h2>
          <div className="document-list">
            <div className="list-header">
              <span>Proforma #</span>
              <span>Client</span>
              <span>Valid Until</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {loadingProformas ? (
              <div className="empty-state">Loading proforma invoices...</div>
            ) : proformas.length === 0 ? (
              <div className="empty-state">No proforma invoices found.</div>
            ) : (
              (proformas as ProformaInvoice[]).slice(0, 5).map((p: ProformaInvoice) => (
                <div key={p.id || p.proformaNumber} className="list-row">
                  <span className="doc-number">{p.proformaNumber}</span>
                  <div className="client-info">
                    <span className="client-name">{p.clientInfo.name}</span>
                    <span className="client-email">{p.clientInfo.email}</span>
                  </div>
                  <span className="doc-date">{formatDate(p.validUntil)}</span>
                  <span className="doc-amount">{formatCurrency(p.totalAmount, p.currency)}</span>
                  <div>
                    <span className={`status-badge ${p.status.toLowerCase()}`}>{p.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Final Invoices List */}
        <div>
          <h2 className="section-title">
            <span style={{ color: 'var(--primary)' }}>●</span> Recent Final Invoices
          </h2>
          <div className="document-list">
            <div className="list-header">
              <span>Invoice #</span>
              <span>Client</span>
              <span>Due Date</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {loadingInvoices ? (
              <div className="empty-state">Loading final invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="empty-state">No final invoices found.</div>
            ) : (
              (invoices as FinalInvoice[]).slice(0, 5).map((i: FinalInvoice) => (
                <div key={i.id || i.invoiceNumber} className="list-row">
                  <span className="doc-number">{i.invoiceNumber}</span>
                  <div className="client-info">
                    <span className="client-name">{i.clientInfo.name}</span>
                    <span className="client-email">{i.clientInfo.email}</span>
                  </div>
                  <span className="doc-date">{formatDate(i.dueDate)}</span>
                  <span className="doc-amount">{formatCurrency(i.totalAmount, i.currency)}</span>
                  <div>
                    <span className={`status-badge ${i.status.toLowerCase()}`}>{i.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
