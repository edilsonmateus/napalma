import { Star } from "lucide-react";

export default function RadarStarIcon({ marked = false, size = 14, className = "" }) {
  return (
    <Star
      aria-hidden="true"
      size={size}
      className={`radar-star-icon ${marked ? "is-marked" : ""} ${className}`.trim()}
    />
  );
}
