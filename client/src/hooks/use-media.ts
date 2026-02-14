import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type MediaInput, type MediaResponse } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import type { MediaCategory, UpdateMediaRequest, CollectionWithCount } from "@shared/schema";

export function useMediaItems(category?: MediaCategory, enabled: boolean = true) {
  const path = category ? `${api.media.list.path}?category=${category}` : api.media.list.path;
  return useQuery({
    queryKey: [api.media.list.path, category || "all"],
    queryFn: async () => {
      const res = await fetch(path, { credentials: "include" });
      if (res.status === 401) return [] as MediaResponse[];
      if (!res.ok) throw new Error("Failed to fetch media");
      return res.json() as Promise<MediaResponse[]>;
    },
    enabled,
  });
}

export function useCreateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: MediaInput) => {
      const res = await apiRequest("POST", api.media.create.path, data);
      return res.json() as Promise<MediaResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateMediaRequest }) => {
      const url = buildUrl(api.media.update.path, { id });
      const res = await apiRequest("PATCH", url, updates);
      return res.json() as Promise<MediaResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      const url = buildUrl(api.media.toggleFavorite.path, { id });
      const res = await apiRequest("PATCH", url, { isFavorite });
      return res.json() as Promise<MediaResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.media.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}

export function useBatchUpdateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { ids: number[]; updates: { isFavorite?: boolean; label?: string; tags?: string[] } }) => {
      const res = await apiRequest("PATCH", api.media.batchUpdate.path, data);
      return res.json() as Promise<MediaResponse[]>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
    },
  });
}

export function useBatchDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("DELETE", api.media.batchDelete.path, { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
    },
  });
}

export function useCollections(enabled: boolean = true) {
  return useQuery({
    queryKey: [api.collections.list.path],
    queryFn: async () => {
      const res = await fetch(api.collections.list.path, { credentials: "include" });
      if (res.status === 401) return [] as CollectionWithCount[];
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json() as Promise<CollectionWithCount[]>;
    },
    enabled,
  });
}

export function useCollectionItems(collectionId: number | null) {
  return useQuery({
    queryKey: [api.collections.list.path, collectionId, "items"],
    queryFn: async () => {
      if (!collectionId) return [];
      const url = buildUrl(api.collections.items.path, { id: collectionId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch collection items");
      return res.json() as Promise<MediaResponse[]>;
    },
    enabled: !!collectionId,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; parentId?: number }) => {
      const res = await apiRequest("POST", api.collections.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; description?: string; coverMediaId?: number } }) => {
      const url = buildUrl(api.collections.update.path, { id });
      const res = await apiRequest("PATCH", url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.collections.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
    },
  });
}

export function useAddToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, mediaItemIds }: { collectionId: number; mediaItemIds: number[] }) => {
      const url = buildUrl(api.collections.addItems.path, { id: collectionId });
      const res = await apiRequest("POST", url, { mediaItemIds });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path, variables.collectionId, "items"] });
    },
  });
}

export function useRemoveFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, mediaItemIds }: { collectionId: number; mediaItemIds: number[] }) => {
      const url = buildUrl(api.collections.removeItems.path, { id: collectionId });
      await apiRequest("DELETE", url, { mediaItemIds });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path, variables.collectionId, "items"] });
    },
  });
}

export function useShareCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, tenantIds }: { collectionId: number; tenantIds: string[] }) => {
      const res = await apiRequest("POST", `/api/collections/${collectionId}/share`, { tenantIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/shared"] });
    },
  });
}

export function useSharedCollections(enabled: boolean = true) {
  return useQuery({
    queryKey: ["/api/collections/shared"],
    queryFn: async () => {
      const res = await fetch("/api/collections/shared", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json() as Promise<CollectionWithCount[]>;
    },
    enabled,
  });
}

export function useReorderCollections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await apiRequest("PATCH", "/api/collections/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
    },
  });
}
