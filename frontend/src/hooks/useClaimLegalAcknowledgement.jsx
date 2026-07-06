import { useCallback, useRef, useState } from "react";
import ClaimLegalAcknowledgementModal from "../components/legal/ClaimLegalAcknowledgementModal";

export default function useClaimLegalAcknowledgement() {
  const [open, setOpen] = useState(false);
  const resolver = useRef(null);
  const requestAcknowledgement = useCallback(() => new Promise((resolve) => {
    resolver.current = resolve;
    setOpen(true);
  }), []);
  const finish = useCallback((value) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  }, []);
  const cancel = useCallback(() => finish(null), [finish]);
  const confirm = useCallback((value) => finish(value), [finish]);
  const modal = <ClaimLegalAcknowledgementModal open={open} onCancel={cancel} onConfirm={confirm}/>;
  return { requestAcknowledgement, claimLegalModal: modal };
}
