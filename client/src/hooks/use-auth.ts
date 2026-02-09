import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  name: string;
  mustReset: boolean;
  tenantId?: string;
  isAdmin?: boolean;
}

interface AuthStatus {
  accountExists: boolean;
  accountCount: number;
}

async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const { data: authStatus, isLoading: isLoadingStatus } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
    staleTime: 1000 * 60 * 5,
  });

  const setupMutation = useMutation({
    mutationFn: async ({ name, password }: { name: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/setup", { name, password });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Setup failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ name, password }: { name?: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { name, password });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", { newPassword });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Reset failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Change password failed");
      }
      return res.json();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    accountExists: authStatus?.accountExists ?? true,
    accountCount: authStatus?.accountCount ?? 0,
    isLoadingStatus,
    setup: setupMutation.mutateAsync,
    setupError: setupMutation.error,
    isSettingUp: setupMutation.isPending,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    resetPasswordError: resetPasswordMutation.error,
    isResettingPassword: resetPasswordMutation.isPending,
    changePassword: changePasswordMutation.mutateAsync,
    changePasswordError: changePasswordMutation.error,
    isChangingPassword: changePasswordMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
