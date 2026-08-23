import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyLegalSignatures } from "../services/legalDocuments.service";

const QUERY_KEY = ["my-legal-signatures"];

export function useMyLegalSignaturesQuery(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    window.addEventListener("77gira:legal-signatures-updated", refresh);
    return () => window.removeEventListener("77gira:legal-signatures-updated", refresh);
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getMyLegalSignatures,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true
  });
}

export function getPendingLegalSignatures(items = []) {
  return items.filter((entry) => ["pending", "viewed"].includes(entry.status));
}
