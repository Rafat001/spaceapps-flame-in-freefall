"use client";
import { useState } from "react";

/** Click-to-load YouTube player: shows a still and only loads the (privacy-enhanced) player after a click. */
export default function VideoFacade({ id, title, start = 0 }: { id: string; title: string; start?: number }) {
  const [on, setOn] = useState(false);
  const [still, setStill] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
  if (on) {
    return (
      <div className="video-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1${start ? `&start=${start}` : ""}`}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button type="button" className="video-frame video-facade" onClick={() => setOn(true)} aria-label={`Play video: ${title}`}>
      <img src={still} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
        onError={() => setStill(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)} />
      <span className="video-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
      </span>
      <span className="video-hint" aria-hidden="true">Play · loads YouTube</span>
    </button>
  );
}
