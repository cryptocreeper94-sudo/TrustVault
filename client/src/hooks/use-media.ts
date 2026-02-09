import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type MediaInput, type MediaResponse } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import type { MediaCategory, UpdateMediaRequest } from "@shared/schema";

export function useMediaItems(category?: MediaCategory) {
  const path = category ? `${api.media.list.path}?category=${category}` : api.media.list.path;
  return useQuery({
    queryKey: [api.media.list.path, category || "all"],
    queryFn: async () => {
      const res = await fetch(path, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch media");
      return res.json() as Promise<MediaResponse[]>;
    },
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
