import React, { useState, useRef } from 'react';
import './index.css';
import {
  useGetQuotations,
  useGetProformaInvoices,
  useGetFinalInvoices,
  useCreateQuotation,
  useCreateProformaInvoice,
  useCreateFinalInvoice,
  useGetClients,
  useCreateClient,
  useConvertQuoteToProforma,
  useConvertProformaToInvoice,
  useUpdateQuotation,
  useUpdateProformaInvoice,
  useUpdateFinalInvoice,
} from '@my-billing/api-client';
import { type Quotation, type ProformaInvoice, type FinalInvoice } from '@my-billing/database';
import { generateDocumentHtml } from '@my-billing/document-templates';

export default function App() {
  // Querying using shared TanStack Query hooks from @my-billing/api-client
  const { data: quotations = [], isLoading: loadingQuotes, error: errorQuotes } = useGetQuotations();
  const { data: proformas = [], isLoading: loadingProformas, error: errorProformas } = useGetProformaInvoices();
  const { data: invoices = [], isLoading: loadingInvoices, error: errorInvoices } = useGetFinalInvoices();
  const { data: clients = [], isLoading: loadingClients } = useGetClients();

  const createClientMutation = useCreateClient();
  const createQuotation = useCreateQuotation();
  const createProforma = useCreateProformaInvoice();
  const createInvoice = useCreateFinalInvoice();
  const createClient = useCreateClient();
  const convertQuote = useConvertQuoteToProforma();
  const convertProforma = useConvertProformaToInvoice();
  const updateQuotation = useUpdateQuotation();
  const updateProforma = useUpdateProformaInvoice();
  const updateInvoice = useUpdateFinalInvoice();

  const isApiError = errorQuotes || errorProformas || errorInvoices;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docType, setDocType] = useState<'QUOTATION' | 'PROFORMA' | 'FINAL_INVOICE'>('QUOTATION');
  const [printDoc, setPrintDoc] = useState<Quotation | ProformaInvoice | FinalInvoice | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getDocumentData = (doc: Quotation | ProformaInvoice | FinalInvoice) => {
    return {
      documentType: doc.documentType,
      documentNumber: doc.documentNumber || (doc as any).quoteNumber || (doc as any).proformaNumber || (doc as any).invoiceNumber || '',
      issueDate: doc.issueDate,
      dueDate: (doc as any).dueDate,
      validUntil: (doc as any).validUntil,
      clientInfo: {
        name: doc.clientInfo?.name || '',
        email: doc.clientInfo?.email,
        billingAddress: doc.clientInfo?.billingAddress,
        billingAndShippingAddress: doc.clientInfo?.billingAddress,
        gstin: doc.clientInfo?.gstin,
        stateName: (doc.clientInfo as any)?.stateName || 'Maharashtra',
        stateCode: (doc.clientInfo as any)?.stateCode || '27',
      },
      items: (doc.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        taxRate: item.taxRate,
        hsnSac: (item as any).hsnSac || '998311',
        per: (item as any).per || 'nos',
        discountPercent: (item as any).discountPercent || 0,
      })),
      notes: doc.notes,
      currency: doc.currency,
      applyGst: (doc as any).applyGst !== false,
      logoUrl: `${window.location.origin}/website_icon.png`,
    };
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  // Daily Mode & History States
  const [viewMode, setViewMode] = useState<'daily' | 'history'>('daily');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    billingAddress: '',
    taxId: '',
    gstin: '',
    pan: '',
  });

  const [docNumber, setDocNumber] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [notes, setNotes] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [items, setItems] = useState<Array<{ description: string; quantity: number; price: number; taxRate: number; hsnSac: string }>>([
    { description: '', quantity: 1, price: 0, taxRate: 18, hsnSac: '998311' }
  ]);

  // Date and Search Helpers
  const isToday = (dateStr?: Date | string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const filterBySearch = (list: any[]) => {
    if (!searchQuery) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(item => {
      const docNum = (item.documentNumber || item.quoteNumber || item.proformaNumber || item.invoiceNumber || '').toLowerCase();
      const clientName = (item.clientInfo?.name || '').toLowerCase();
      const clientEmail = (item.clientInfo?.email || '').toLowerCase();
      return docNum.includes(query) || clientName.includes(query) || clientEmail.includes(query);
    });
  };

  const filteredQuotes = viewMode === 'daily'
    ? quotations.filter((q: any) => isToday(q.createdAt || q.issueDate))
    : filterBySearch(quotations);

  const filteredProformas = viewMode === 'daily'
    ? proformas.filter((p: any) => isToday(p.createdAt || p.issueDate))
    : filterBySearch(proformas);

  const filteredInvoices = viewMode === 'daily'
    ? invoices.filter((i: any) => isToday(i.createdAt || i.issueDate))
    : filterBySearch(invoices);

  // Aggregate values for display
  const totalQuoteVolume = (quotations as Quotation[]).reduce((sum: number, q: Quotation) => sum + (q.totalAmount || 0), 0);
  const totalProformaVolume = (proformas as ProformaInvoice[]).reduce((sum: number, p: ProformaInvoice) => sum + (p.totalAmount || 0), 0);
  const totalInvoiceVolume = (invoices as FinalInvoice[]).reduce((sum: number, i: FinalInvoice) => sum + (i.totalAmount || 0), 0);

  const todayQuoteVolume = (quotations as Quotation[]).filter((q: any) => isToday(q.createdAt || q.issueDate)).reduce((sum, q) => sum + (q.totalAmount || 0), 0);
  const todayProformaVolume = (proformas as ProformaInvoice[]).filter((p: any) => isToday(p.createdAt || p.issueDate)).reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const todayInvoiceVolume = (invoices as FinalInvoice[]).filter((i: any) => isToday(i.createdAt || i.issueDate)).reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const activeQuoteVolume = viewMode === 'daily' ? todayQuoteVolume : totalQuoteVolume;
  const activeProformaVolume = viewMode === 'daily' ? todayProformaVolume : totalProformaVolume;
  const activeInvoiceVolume = viewMode === 'daily' ? todayInvoiceVolume : totalInvoiceVolume;

  const activeQuoteCount = viewMode === 'daily' ? filteredQuotes.length : quotations.length;
  const activeProformaCount = viewMode === 'daily' ? filteredProformas.length : proformas.length;
  const activeInvoiceCount = viewMode === 'daily' ? filteredInvoices.length : invoices.length;

  const formatCurrency = (val: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(val);
  };

  const formatDate = (dateStr?: Date | string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderAuditTrail = (doc: any) => {
    const history: React.ReactNode[] = [];
    const docId = doc.id || doc._id;

    if (doc.documentType === 'QUOTATION') {
      const relatedProforma: any = proformas.find((p: any) => p.quotationRef === docId);
      if (relatedProforma) {
        history.push(
          <div key="to-proforma" className="audit-trail-item">
            <span>➔ Converted to Proforma Invoice:</span> <strong>{relatedProforma.documentNumber || relatedProforma.proformaNumber}</strong>
          </div>
        );
        const relatedInvoice: any = invoices.find((i: any) => i.proformaRef === relatedProforma.id || i.proformaRef === relatedProforma._id);
        if (relatedInvoice) {
          history.push(
            <div key="to-invoice" className="audit-trail-item">
              <span>➔ Converted to Final Invoice:</span> <strong>{relatedInvoice.documentNumber || relatedInvoice.invoiceNumber}</strong>
            </div>
          );
        }
      }
    } else if (doc.documentType === 'PROFORMA') {
      const relatedQuotation: any = quotations.find((q: any) => (q.id || q._id) === doc.quotationRef);
      if (relatedQuotation) {
        history.push(
          <div key="from-quote" className="audit-trail-item">
            <span>← Converted from Quotation:</span> <strong>{relatedQuotation.documentNumber || relatedQuotation.quoteNumber}</strong>
          </div>
        );
      }
      const relatedInvoice: any = invoices.find((i: any) => i.proformaRef === docId);
      if (relatedInvoice) {
        history.push(
          <div key="to-invoice" className="audit-trail-item">
            <span>➔ Converted to Final Invoice:</span> <strong>{relatedInvoice.documentNumber || relatedInvoice.invoiceNumber}</strong>
          </div>
        );
      }
    } else if (doc.documentType === 'FINAL_INVOICE') {
      const relatedProforma: any = proformas.find((p: any) => (p.id || p._id) === doc.proformaRef);
      if (relatedProforma) {
        history.push(
          <div key="from-proforma" className="audit-trail-item">
            <span>← Converted from Proforma Invoice:</span> <strong>{relatedProforma.documentNumber || relatedProforma.proformaNumber}</strong>
          </div>
        );
        const relatedQuotation: any = quotations.find((q: any) => (q.id || q._id) === relatedProforma.quotationRef);
        if (relatedQuotation) {
          history.push(
            <div key="from-quote" className="audit-trail-item">
              <span>← Source Quotation:</span> <strong>{relatedQuotation.documentNumber || relatedQuotation.quoteNumber}</strong>
            </div>
          );
        }
      }
    }

    if (history.length === 0) return null;

    return (
      <div className="audit-trail-container no-print" style={{ padding: '1rem', margin: '0 0 1rem 0' }}>
        <h4 className="audit-trail-title" style={{ color: '#eab308', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>⛓️ Document Reference History</h4>
        <div className="audit-trail-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {history}
        </div>
      </div>
    );
  };

  // Form Handlers
  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0, taxRate: 18, hsnSac: '998311' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setItems(updated);
  };

  const formSubTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const formTaxAmount = items.reduce((sum, item) => sum + (item.quantity * item.price * (item.taxRate / 100)), 0);
  const formTotalAmount = formSubTotal + formTaxAmount;

  const resetForm = () => {
    setSelectedClientId('');
    setIsCreatingClient(false);
    setDocNumber('');
    setCurrency('INR');
    setNotes('');
    setDateVal('');
    setItems([{ description: '', quantity: 1, price: 0, taxRate: 18, hsnSac: '998311' }]);
    setNewClientData({
      name: '',
      email: '',
      billingAddress: '',
      taxId: '',
      gstin: '',
      pan: '',
    });
  };

  const openModal = (type: 'QUOTATION' | 'PROFORMA' | 'FINAL_INVOICE') => {
    setDocType(type);
    resetForm();
    
    // Auto-generate some sequential mock number based on current list length
    const nextNum = String(
      (type === 'QUOTATION' ? quotations.length : type === 'PROFORMA' ? proformas.length : invoices.length) + 1
    ).padStart(4, '0');
    
    const prefix = type === 'QUOTATION' ? 'QT' : type === 'PROFORMA' ? 'PRO' : 'INV';
    const year = new Date().getFullYear();
    setDocNumber(`${prefix}-${year}-${nextNum}`);
    setIsModalOpen(true);
  };

  const handleCreateClient = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newClientData.name || !newClientData.email) {
      alert('Name and Email are required.');
      return;
    }
    try {
      const created = await createClientMutation.mutateAsync(newClientData);
      const createdId = created.id || created._id;
      setSelectedClientId(createdId);
      setIsCreatingClient(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to register client.');
    }
  };

  const handleConvertQuote = async (id: string) => {
    if (!confirm('Are you sure you want to convert this quotation to a Proforma Invoice?')) return;
    try {
      await convertQuote.mutateAsync(id);
      alert('Quotation successfully converted to Proforma Invoice!');
      setPrintDoc(null);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to convert Quotation.');
    }
  };

  const handleConvertProforma = async (id: string) => {
    if (!confirm('Are you sure you want to convert this Proforma Invoice to a Final Invoice?')) return;
    try {
      await convertProforma.mutateAsync(id);
      alert('Proforma Invoice successfully converted to Final Invoice!');
      setPrintDoc(null);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to convert Proforma Invoice.');
    }
  };

  const handleUpdateQuoteStatus = async (id: string, status: string) => {
    try {
      await updateQuotation.mutateAsync({ id, data: { status: status as any } });
      alert(`Quotation status updated to ${status}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to update Quotation status.');
    }
  };

  const handleUpdateProformaStatus = async (id: string, status: string) => {
    try {
      await updateProforma.mutateAsync({ id, data: { status: status as any } });
      alert(`Proforma status updated to ${status}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to update Proforma status.');
    }
  };

  const handleMarkInvoicePaid = async (id: string) => {
    try {
      await updateInvoice.mutateAsync({ id, data: { status: 'PAID' as any, paymentStatus: 'PAID' as any } });
      alert('Invoice successfully marked as PAID!');
    } catch (err) {
      console.error(err);
      alert('Failed to mark Invoice as paid.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Please select or register a client.');
      return;
    }
    if (!docNumber) {
      alert('Please specify a document number.');
      return;
    }
    if (!dateVal) {
      alert('Please select a validity or due date.');
      return;
    }

    const selectedClient = clients.find(c => c.id === selectedClientId || (c as any)._id === selectedClientId);
    if (!selectedClient) return;

    try {
      if (docType === 'QUOTATION') {
        const payload = {
          documentType: 'QUOTATION' as const,
          documentNumber: docNumber,
          quoteNumber: docNumber,
          clientRef: selectedClientId,
          clientInfo: {
            name: selectedClient.name,
            email: selectedClient.email,
            billingAddress: selectedClient.billingAddress || '',
            taxId: selectedClient.taxId || '',
            gstin: selectedClient.gstin || '',
            pan: selectedClient.pan || '',
          },
          items: items.map(item => ({
            description: item.description,
            quantity: Number(item.quantity) || 0,
            price: Number(item.price) || 0,
            taxRate: Number(item.taxRate) || 0,
            hsnSac: item.hsnSac || '998311',
          })),
          currency: currency,
          notes: notes,
          status: 'DRAFT' as const,
          issueDate: new Date(),
          validUntil: new Date(dateVal),
        };
        await createQuotation.mutateAsync(payload);
      } else if (docType === 'PROFORMA') {
        const payload = {
          documentType: 'PROFORMA' as const,
          documentNumber: docNumber,
          proformaNumber: docNumber,
          clientRef: selectedClientId,
          clientInfo: {
            name: selectedClient.name,
            email: selectedClient.email,
            billingAddress: selectedClient.billingAddress || '',
            taxId: selectedClient.taxId || '',
            gstin: selectedClient.gstin || '',
            pan: selectedClient.pan || '',
          },
          items: items.map(item => ({
            description: item.description,
            quantity: Number(item.quantity) || 0,
            price: Number(item.price) || 0,
            taxRate: Number(item.taxRate) || 0,
            hsnSac: item.hsnSac || '998311',
          })),
          currency: currency,
          notes: notes,
          status: 'DRAFT' as const,
          issueDate: new Date(),
          validUntil: new Date(dateVal),
        };
        await createProforma.mutateAsync(payload);
      } else {
        const payload = {
          documentType: 'FINAL_INVOICE' as const,
          documentNumber: docNumber,
          invoiceNumber: docNumber,
          clientRef: selectedClientId,
          clientInfo: {
            name: selectedClient.name,
            email: selectedClient.email,
            billingAddress: selectedClient.billingAddress || '',
            taxId: selectedClient.taxId || '',
            gstin: selectedClient.gstin || '',
            pan: selectedClient.pan || '',
          },
          items: items.map(item => ({
            description: item.description,
            quantity: Number(item.quantity) || 0,
            price: Number(item.price) || 0,
            taxRate: Number(item.taxRate) || 0,
            hsnSac: item.hsnSac || '998311',
          })),
          currency: currency,
          notes: notes,
          status: 'DRAFT' as const,
          issueDate: new Date(),
          dueDate: new Date(dateVal),
          paymentStatus: 'UNPAID' as const,
        };
        await createInvoice.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to create document.');
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="header">
        <div className="logo-section">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/website_icon.png" alt="Logo" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            Cashflow Billing ERP
          </h1>
          <p>Production-Grade Invoicing & Billing Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="view-mode-tabs">
            <button 
              type="button"
              className={`view-mode-btn ${viewMode === 'daily' ? 'active' : ''}`} 
              onClick={() => setViewMode('daily')}
            >
              📅 Daily Workspace
            </button>
            <button 
              type="button"
              className={`view-mode-btn ${viewMode === 'history' ? 'active' : ''}`} 
              onClick={() => setViewMode('history')}
            >
              📜 Archive & History
            </button>
          </div>
          <div className="connection-pill">
            <div className="connection-dot" style={{ backgroundColor: isApiError ? '#f87171' : '#34d399', boxShadow: isApiError ? '0 0 8px #f87171' : '0 0 8px #34d399' }} />
            <span>API: {isApiError ? 'Disconnected' : 'Connected'}</span>
          </div>
        </div>
      </header>

      {/* Global Search Bar (Only in History mode) */}
      {viewMode === 'history' && (
        <div className="search-bar-container">
          <input 
            type="text" 
            placeholder="🔍 Search history by Document #, Client name or email..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {/* Metrics Row */}
      <section className="stats-grid">
        <div className="stat-card quotation">
          <div className="stat-header">
            <span>Quotations</span>
            <span style={{ color: 'var(--info)' }}>{activeQuoteCount} {viewMode === 'daily' ? 'Today' : 'Total'}</span>
          </div>
          <div className="stat-value">{formatCurrency(activeQuoteVolume, quotations[0]?.currency || 'INR')}</div>
          <div className="stat-footer">{viewMode === 'daily' ? "Today's pipe volume" : "Estimated sales pipe volume"}</div>
        </div>

        <div className="stat-card proforma">
          <div className="stat-header">
            <span>Proforma Invoices</span>
            <span style={{ color: 'var(--warning)' }}>{activeProformaCount} {viewMode === 'daily' ? 'Today' : 'Total'}</span>
          </div>
          <div className="stat-value">{formatCurrency(activeProformaVolume, proformas[0]?.currency || 'INR')}</div>
          <div className="stat-footer">{viewMode === 'daily' ? "Today's pending" : "Awaiting confirmations"}</div>
        </div>

        <div className="stat-card invoice">
          <div className="stat-header">
            <span>Final Invoices</span>
            <span style={{ color: 'var(--primary)' }}>{activeInvoiceCount} {viewMode === 'daily' ? 'Today' : 'Total'}</span>
          </div>
          <div className="stat-value">{formatCurrency(activeInvoiceVolume, invoices[0]?.currency || 'INR')}</div>
          <div className="stat-footer">{viewMode === 'daily' ? "Today's revenue" : "Total billed revenue"}</div>
        </div>
      </section>

      {/* Lists Section */}
      <section className="lists-container">
        {/* 1. Quotations List */}
        <div>
          <h2 className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><span style={{ color: 'var(--info)' }}>●</span> {viewMode === 'daily' ? "Today's Quotations" : "Quotations Archive"}</span>
            <button className="btn-create" onClick={() => openModal('QUOTATION')}>+ Create</button>
          </h2>
          <div className="document-list">
            <div className="list-header">
              <span>Quote #</span>
              <span>Client</span>
              <span>Valid Until</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {loadingQuotes ? (
              <div className="empty-state">Loading quotations...</div>
            ) : filteredQuotes.length === 0 ? (
              <div className="empty-state">{viewMode === 'daily' ? "No quotations created today." : "No quotations found in history."}</div>
            ) : (
              (filteredQuotes as Quotation[]).map((q: Quotation) => (
                <div key={q.id || q.documentNumber || q.quoteNumber} className="list-row">
                  <span className="doc-number">{q.documentNumber || q.quoteNumber}</span>
                  <div className="client-info">
                    <span className="client-name">{q.clientInfo.name}</span>
                    <span className="client-email">{q.clientInfo.email}</span>
                  </div>
                  <span className="doc-date">{formatDate(q.validUntil)}</span>
                  <span className="doc-amount">{formatCurrency(q.totalAmount, q.currency)}</span>
                  <div>
                    <span className={`status-badge ${q.status.toLowerCase()}`}>{q.status}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button className="btn-print" title="Print Quotation" onClick={() => setPrintDoc(q)}>🖨️</button>
                      {q.status === 'DRAFT' && (
                        <>
                          <button className="btn-status-action text-info" title="Mark Sent" onClick={() => handleUpdateQuoteStatus(q.id || (q as any)._id, 'SENT')}>✉️</button>
                          <button className="btn-status-action text-success" title="Accept & Convert to Proforma" onClick={() => handleConvertQuote(q.id || (q as any)._id)}>✅</button>
                        </>
                      )}
                      {q.status === 'SENT' && (
                        <>
                          <button className="btn-status-action text-success" title="Accept & Convert to Proforma" onClick={() => handleConvertQuote(q.id || (q as any)._id)}>✅</button>
                          <button className="btn-status-action text-danger" title="Decline Quote" onClick={() => handleUpdateQuoteStatus(q.id || (q as any)._id, 'DECLINED')}>❌</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Proforma Invoices List */}
        <div>
          <h2 className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><span style={{ color: 'var(--warning)' }}>●</span> {viewMode === 'daily' ? "Today's Proformas" : "Proformas Archive"}</span>
            <button className="btn-create" onClick={() => openModal('PROFORMA')}>+ Create</button>
          </h2>
          <div className="document-list">
            <div className="list-header">
              <span>Proforma #</span>
              <span>Client</span>
              <span>Valid Until</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {loadingProformas ? (
              <div className="empty-state">Loading proforma invoices...</div>
            ) : filteredProformas.length === 0 ? (
              <div className="empty-state">{viewMode === 'daily' ? "No proforma invoices created today." : "No proforma invoices found in history."}</div>
            ) : (
              (filteredProformas as ProformaInvoice[]).map((p: ProformaInvoice) => (
                <div key={p.id || p.documentNumber || p.proformaNumber} className="list-row">
                  <span className="doc-number">{p.documentNumber || p.proformaNumber}</span>
                  <div className="client-info">
                    <span className="client-name">{p.clientInfo.name}</span>
                    <span className="client-email">{p.clientInfo.email}</span>
                  </div>
                  <span className="doc-date">{formatDate(p.validUntil)}</span>
                  <span className="doc-amount">{formatCurrency(p.totalAmount, p.currency)}</span>
                  <div>
                    <span className={`status-badge ${p.status.toLowerCase()}`}>{p.status}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button className="btn-print" title="Print Proforma" onClick={() => setPrintDoc(p)}>🖨️</button>
                      {p.status === 'DRAFT' && (
                        <>
                          <button className="btn-status-action text-info" title="Mark Sent" onClick={() => handleUpdateProformaStatus(p.id || (p as any)._id, 'SENT')}>✉️</button>
                          <button className="btn-status-action text-success" title="Confirm Payment & Convert to Invoice" onClick={() => handleConvertProforma(p.id || (p as any)._id)}>✅</button>
                        </>
                      )}
                      {p.status === 'SENT' && (
                        <button className="btn-status-action text-success" title="Confirm Payment & Convert to Invoice" onClick={() => handleConvertProforma(p.id || (p as any)._id)}>✅</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Final Invoices List */}
        <div>
          <h2 className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><span style={{ color: 'var(--primary)' }}>●</span> {viewMode === 'daily' ? "Today's Final Invoices" : "Final Invoices Archive"}</span>
            <button className="btn-create" onClick={() => openModal('FINAL_INVOICE')}>+ Create</button>
          </h2>
          <div className="document-list">
            <div className="list-header">
              <span>Invoice #</span>
              <span>Client</span>
              <span>Due Date</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {loadingInvoices ? (
              <div className="empty-state">Loading final invoices...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="empty-state">{viewMode === 'daily' ? "No final invoices created today." : "No final invoices found in history."}</div>
            ) : (
              (filteredInvoices as FinalInvoice[]).map((i: FinalInvoice) => (
                <div key={i.id || i.documentNumber || i.invoiceNumber} className="list-row">
                  <span className="doc-number">{i.documentNumber || i.invoiceNumber}</span>
                  <div className="client-info">
                    <span className="client-name">{i.clientInfo.name}</span>
                    <span className="client-email">{i.clientInfo.email}</span>
                  </div>
                  <span className="doc-date">{formatDate(i.dueDate)}</span>
                  <span className="doc-amount">{formatCurrency(i.totalAmount, i.currency)}</span>
                  <div>
                    <span className={`status-badge ${i.status.toLowerCase()}`}>{i.status}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button className="btn-print" title="Print Invoice" onClick={() => setPrintDoc(i)}>🖨️</button>
                      {i.status !== 'PAID' && (
                        <button className="btn-status-action text-success" title="Mark Paid" onClick={() => handleMarkInvoicePaid(i.id || (i as any)._id)}>💰</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* FLOATING CREATION MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <form onSubmit={handleSubmit} className="modal-card">
            <div className="modal-header">
              <h3>Create New {docType === 'QUOTATION' ? 'Quotation' : docType === 'PROFORMA' ? 'Proforma Invoice' : 'Final Invoice'}</h3>
              <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
                {/* Client selection row */}
                <div className="form-group">
                  <label>Client</label>
                  {!isCreatingClient ? (
                    <div className="client-selection-row">
                      <select
                        className="form-select"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        required
                      >
                        <option value="">-- Select Client --</option>
                        {clients.map((c) => (
                          <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>
                            {c.name} ({c.email})
                          </option>
                        ))}
                      </select>
                      <button className="btn-inline-action" onClick={(e) => { e.preventDefault(); setIsCreatingClient(true); }}>
                        + New Client
                      </button>
                    </div>
                  ) : (
                    <div className="inline-client-card">
                      <h4>Register New Client inline</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="Client Name *"
                            className="form-input"
                            value={newClientData.name}
                            onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="email"
                            placeholder="Client Email *"
                            className="form-input"
                            value={newClientData.email}
                            onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="form-row" style={{ marginTop: '0.5rem' }}>
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="Tax ID / Registration Code *"
                            className="form-input"
                            value={newClientData.taxId}
                            onChange={(e) => setNewClientData({ ...newClientData, taxId: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="Billing Address"
                            className="form-input"
                            value={newClientData.billingAddress}
                            onChange={(e) => setNewClientData({ ...newClientData, billingAddress: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="form-row" style={{ marginTop: '0.5rem' }}>
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="GSTIN"
                            className="form-input"
                            value={newClientData.gstin}
                            onChange={(e) => setNewClientData({ ...newClientData, gstin: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="PAN"
                            className="form-input"
                            value={newClientData.pan}
                            onChange={(e) => setNewClientData({ ...newClientData, pan: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <button className="btn-secondary-action" style={{ padding: '0.4rem 1rem' }} onClick={(e) => { e.preventDefault(); setIsCreatingClient(false); }}>
                          Cancel
                        </button>
                        <button className="btn-primary-action" style={{ padding: '0.4rem 1.25rem' }} onClick={handleCreateClient}>
                          Save Client
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Doc Details */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Document Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{docType === 'FINAL_INVOICE' ? 'Due Date' : 'Valid Until'}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={dateVal}
                      onChange={(e) => setDateVal(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      className="form-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Thank you for your business"
                      className="form-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="items-section-title">Line Items</div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', marginBottom: '1.25rem' }}>
                  <table className="items-table" style={{ minWidth: '700px', margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Description *</th>
                        <th style={{ width: '15%' }}>HSN/SAC</th>
                        <th style={{ width: '12%' }}>Qty *</th>
                        <th style={{ width: '13%' }}>Price *</th>
                        <th style={{ width: '12%' }}>Tax (%)</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Total</th>
                        <th style={{ width: '3%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const itemSubTotal = item.quantity * item.price;
                        const itemTax = itemSubTotal * (item.taxRate / 100);
                        const itemTotal = itemSubTotal + itemTax;
                        return (
                          <tr key={idx} className="item-row">
                            <td>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                placeholder="Service / Product name"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.hsnSac}
                                onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                                placeholder="998311"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*$/.test(val)) {
                                    let cleaned = val;
                                    if (/^0\d+/.test(val)) {
                                      cleaned = val.replace(/^0+/, '');
                                    }
                                    handleItemChange(idx, 'quantity', cleaned === '' ? 0 : Number(cleaned));
                                  }
                                }}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.price === 0 ? '' : item.price}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    let cleaned = val;
                                    if (/^0\d+/.test(val) && !val.startsWith('0.')) {
                                      cleaned = val.replace(/^0+/, '');
                                    }
                                    handleItemChange(idx, 'price', cleaned === '' ? 0 : Number(cleaned));
                                  }
                                }}
                                placeholder="0.00"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.taxRate === 0 ? '' : item.taxRate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*$/.test(val)) {
                                    let cleaned = val;
                                    if (/^0\d+/.test(val)) {
                                      cleaned = val.replace(/^0+/, '');
                                    }
                                    handleItemChange(idx, 'taxRate', cleaned === '' ? 0 : Number(cleaned));
                                  }
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '500' }}>
                              {formatCurrency(itemTotal, currency)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-delete-item"
                                disabled={items.length === 1}
                                onClick={() => handleRemoveItem(idx)}
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="btn-inline-action" onClick={handleAddItem}>
                  + Add Item
                </button>

                {/* Totals Summary */}
                <div className="totals-summary">
                  <div>Subtotal: {formatCurrency(formSubTotal, currency)}</div>
                  <div>Tax Amount: {formatCurrency(formTaxAmount, currency)}</div>
                  <div className="grand-total">Total: {formatCurrency(formTotalAmount, currency)}</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary-action" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={createQuotation.isPending || createProforma.isPending || createInvoice.isPending}
                >
                  {createQuotation.isPending || createProforma.isPending || createInvoice.isPending ? 'Creating...' : 'Create Document'}
                </button>
              </div>
          </form>
        </div>
      )}

      {/* FLOATING PRINT PREVIEW MODAL */}
      {printDoc && (
        <div className="modal-overlay print-overlay">
          <div className="modal-card print-preview-card">
            <div className="modal-header no-print">
              <h3>Print Preview</h3>
              <button type="button" className="btn-close" onClick={() => setPrintDoc(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ background: '#f8f9fa', padding: 0 }}>
              {renderAuditTrail(printDoc)}
              <iframe
                ref={iframeRef}
                title="Print Preview"
                style={{ width: '100%', height: '700px', border: 'none', background: '#fff', display: 'block' }}
                srcDoc={generateDocumentHtml(getDocumentData(printDoc))}
              />
              <div className="print-area" style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: generateDocumentHtml(getDocumentData(printDoc)) }} />
            </div>
            <div className="modal-footer no-print">
              <button type="button" className="btn-secondary-action" onClick={() => setPrintDoc(null)}>Close</button>
              {printDoc.documentType === 'QUOTATION' && printDoc.status !== 'CONVERTED' && (
                <button type="button" className="btn-primary-action" style={{ background: '#eab308', borderColor: '#eab308' }} onClick={() => handleConvertQuote(printDoc.id || (printDoc as any)._id)}>
                  Convert to Proforma
                </button>
              )}
              {printDoc.documentType === 'PROFORMA' && printDoc.status !== 'CONVERTED' && (
                <button type="button" className="btn-primary-action" style={{ background: '#f97316', borderColor: '#f97316' }} onClick={() => handleConvertProforma(printDoc.id || (printDoc as any)._id)}>
                  Convert to Final Invoice
                </button>
              )}
              <button type="button" className="btn-primary-action" onClick={handlePrint}>Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
