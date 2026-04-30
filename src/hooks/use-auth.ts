import { useQuery, useQueryClient } from "@tanstack/react-query";
import { serverGetSession, serverLogin, serverLogout } from "@/lib/auth";

export function useAuth() {
  const qc = useQueryClient();
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: () => serverGetSession(),
    staleTime: 60_000,
  });

  return {
    isLoggedIn: !!session,
    username: session?.username ?? null,
    isLoading,
    login: async (username: string, password: string) => {
      const r = await serverLogin({ data: { username, password } });
      await qc.invalidateQueries({ queryKey: ["session"] });
      return r;
    },
    logout: async () => {
      await serverLogout();
      await qc.invalidateQueries({ queryKey: ["session"] });
    },
  };
}
