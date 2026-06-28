import React, { useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Platform,
} from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  setApiBaseUrl,
  useGetQuotations,
  useGetProformaInvoices,
  useGetFinalInvoices,
} from '@my-billing/api-client';

// 1. Configure the API client host at runtime depending on the platform.
// Android emulator uses 10.0.2.2 to access host's localhost, while iOS simulator uses localhost.
const LOCAL_API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
setApiBaseUrl(LOCAL_API_HOST);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function DashboardScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  
  // Use shared hooks from @my-billing/api-client
  const { data: quotations = [], isLoading: loadingQuotes, error: errorQuotes } = useGetQuotations();
  const { data: proformas = [], isLoading: loadingProformas, error: errorProformas } = useGetProformaInvoices();
  const { data: invoices = [], isLoading: loadingInvoices, error: errorInvoices } = useGetFinalInvoices();

  const isApiError = errorQuotes || errorProformas || errorInvoices;

  const totalQuoteVolume = quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
  const totalProformaVolume = proformas.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalInvoiceVolume = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const formatCurrency = (val: number) => {
    return `$${val.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT': return '#71717a';
      case 'SENT': return '#38bdf8';
      case 'ACCEPTED':
      case 'CONVERTED':
      case 'PAID': return '#34d399';
      case 'UNPAID': return '#facc15';
      case 'DECLINED':
      case 'EXPIRED':
      case 'VOID':
      case 'OVERDUE': return '#f87171';
      default: return '#71717a';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Billing ERP</Text>
            <Text style={styles.subtitle}>Mobile Invoice Manager</Text>
          </View>
          <View style={styles.connectionContainer}>
            <View style={[styles.connectionDot, { backgroundColor: isApiError ? '#f87171' : '#34d399' }]} />
            <Text style={styles.connectionText}>{isApiError ? 'Offline' : 'Online'}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: '#38bdf8' }]}>
            <Text style={styles.statLabel}>QUOTES ({quotations.length})</Text>
            <Text style={styles.statValue}>{formatCurrency(totalQuoteVolume)}</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#facc15' }]}>
            <Text style={styles.statLabel}>PROFORMAS ({proformas.length})</Text>
            <Text style={styles.statValue}>{formatCurrency(totalProformaVolume)}</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#fb923c' }]}>
            <Text style={styles.statLabel}>FINAL INVOICES ({invoices.length})</Text>
            <Text style={styles.statValue}>{formatCurrency(totalInvoiceVolume)}</Text>
          </View>
        </View>

        {/* Document Listings */}
        <Text style={styles.sectionHeader}>Recent Invoices</Text>
        {loadingInvoices ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : invoices.length === 0 ? (
          <Text style={styles.emptyText}>No final invoices generated yet.</Text>
        ) : (
          invoices.slice(0, 5).map((item) => (
            <View key={item.id || item.invoiceNumber} style={styles.docRow}>
              <View>
                <Text style={styles.docNumber}>{item.invoiceNumber}</Text>
                <Text style={styles.docClient}>{item.clientInfo.name}</Text>
              </View>
              <View style={styles.docRight}>
                <Text style={styles.docAmount}>{formatCurrency(item.totalAmount)}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '1A' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionHeader}>Recent Quotations</Text>
        {loadingQuotes ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : quotations.length === 0 ? (
          <Text style={styles.emptyText}>No quotations generated yet.</Text>
        ) : (
          quotations.slice(0, 5).map((item) => (
            <View key={item.id || item.quoteNumber} style={styles.docRow}>
              <View>
                <Text style={styles.docNumber}>{item.quoteNumber}</Text>
                <Text style={styles.docClient}>{item.clientInfo.name}</Text>
              </View>
              <View style={styles.docRight}>
                <Text style={styles.docAmount}>{formatCurrency(item.totalAmount)}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '1A' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardScreen />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f4f4f5',
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginTop: 4,
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  statsContainer: {
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f4f4f5',
    marginBottom: 15,
    marginTop: 10,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  docNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f4f4f5',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  docClient: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 4,
  },
  docRight: {
    alignItems: 'flex-end',
  },
  docAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f4f4f5',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  loadingText: {
    color: '#71717a',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 10,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 10,
  },
});
