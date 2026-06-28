import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client.js';
import { FinalInvoice } from '@my-billing/database';

export const useGetFinalInvoices = () => {
  return useQuery<FinalInvoice[]>({
    queryKey: ['finalInvoices'],
    queryFn: async () => {
      const response = await apiClient.get('/final-invoices');
      return response.data;
    },
  });
};

export const useGetFinalInvoice = (id: string) => {
  return useQuery<FinalInvoice>({
    queryKey: ['finalInvoice', id],
    queryFn: async () => {
      const response = await apiClient.get(`/final-invoices/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateFinalInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<FinalInvoice, Error, Omit<FinalInvoice, 'id' | 'subTotal' | 'taxAmount' | 'totalAmount'>>({
    mutationFn: async (newInvoice) => {
      const response = await apiClient.post('/final-invoices', newInvoice);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoices'] });
    },
  });
};

export const useUpdateFinalInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<FinalInvoice, Error, { id: string; data: Partial<FinalInvoice> }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put(`/final-invoices/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['finalInvoice', data.id] });
    },
  });
};
