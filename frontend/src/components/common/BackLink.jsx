import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function BackLink({ children = "Voltar", to, onClick, className = "" }) {
  const classes = ["app-back-link", className].filter(Boolean).join(" ");
  const content = <><ArrowLeft size={18} aria-hidden="true" /><span>{children}</span></>;

  if (to) {
    return <Link className={classes} to={to}>{content}</Link>;
  }

  return <button type="button" className={classes} onClick={onClick}>{content}</button>;
}
