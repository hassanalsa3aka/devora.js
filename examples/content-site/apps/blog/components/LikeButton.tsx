import { useState } from "react";

// Hydrated in the browser through island() — see routes/posts/[slug].tsx.
// The count lives in the browser only; a real site would POST it to an
// API route.
export default function LikeButton({ label }: { label: string }) {
  const [likes, setLikes] = useState(0);
  return (
    <button type="button" onClick={() => setLikes((n) => n + 1)} aria-label={`Like ${label}`}>
      ♥ {likes === 0 ? "Like" : likes}
    </button>
  );
}
