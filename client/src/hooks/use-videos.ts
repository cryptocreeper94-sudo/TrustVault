import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type VideoInput, type VideoResponse } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

// Helper for type safety with Zod schemas
function parseResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error("Validation failed:", result.error);
    throw new Error("Invalid API response");
  }
  return result.data;
}

// GET /api/videos
export function useVideos() {
  return useQuery({
    queryKey: [api.videos.list.path],
    queryFn: async () => {
      const res = await fetch(api.videos.list.path, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch videos");
      const data = await res.json();
      return parseResponse(api.videos.list.responses[200], data);
    },
  });
}

// GET /api/videos/:id
export function useVideo(id: number) {
  return useQuery({
    queryKey: [api.videos.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.videos.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch video");
      const data = await res.json();
      return parseResponse(api.videos.get.responses[200], data);
    },
    enabled: !!id,
  });
}

// POST /api/videos (Save metadata after upload)
export function useCreateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: VideoInput) => {
      const res = await apiRequest("POST", api.videos.create.path, data);
      const json = await res.json();
      return parseResponse(api.videos.create.responses[201], json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
    },
  });
}

// DELETE /api/videos/:id
export function useDeleteVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.videos.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
    },
  });
}

// PATCH /api/videos/:id/favorite
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      const url = buildUrl(api.videos.toggleFavorite.path, { id });
      const res = await apiRequest("PATCH", url, { isFavorite });
      const json = await res.json();
      return parseResponse(api.videos.toggleFavorite.responses[200], json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
    },
  });
}
