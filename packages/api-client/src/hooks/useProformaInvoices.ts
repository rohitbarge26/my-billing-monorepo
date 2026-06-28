import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client.js';
import { ProformaInvoice } from '@my-billing/database';

export const useGetProformaInvoices = () => {
  return useQuery<ProformaInvoice[]>({
    queryKey: ['proformaInvoices'],
    queryFn: async () => {
      const response = await apiClient.get('/proforma-invoices');
      return response.data;
    },
  });
};

export const useGetProformaInvoice = (id: string) => {
  return useQuery<ProformaInvoice>({
    queryKey: ['proformaInvoice', id],
    queryFn: async () => {
      const response = await apiClient.get(`/proforma-invoices/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateProformaInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<ProformaInvoice, Error, Omit<ProformaInvoice, 'id' | 'subTotal' | 'taxAmount' | 'totalAmount'>>({
    mutationFn: async (newProforma) => {
      const response = await apiClient.post('/proforma-invoices', newProforma);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proformaInvoices'] });
    },
  });
};

export const useUpdateProformaInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<ProformaInvoice, Error, { id: string; data: Partial<ProformaInvoice> }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put(`/proforma-invoices/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proformaInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['proformaInvoice', data.id] });
    },
  });
};
