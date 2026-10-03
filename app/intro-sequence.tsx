"use client";

import { useEffect, useState } from "react";

export default function IntroSequence() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const replayRequested = new URLSearchParams(window.location.search).has("intro");
    const introWasSeen = !replayRequested && window.sessionStorage.getItem("greenmeter-intro-seen");
    const timer = window.setTimeout(() => {
      if (!introWasSeen) window.sessionStorage.setItem("greenmeter-intro-seen", "true");
      setShowIntro(false);
    }, introWasSeen ? 0 : 3800);

    return () => window.clearTimeout(timer);
  }, []);

  function closeIntro() {
    window.sessionStorage.setItem("greenmeter-intro-seen", "true");
    setShowIntro(false);
  }

  if (!showIntro) return null;

  return (
    <div className="intro-sequence" role="dialog" aria-label="GreenMeter introduction">
      <button onClick={closeIntro} aria-label="Skip introduction">Skip</button>
      <div className="intro-content">
        <div className="intro-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div className="intro-meter" aria-hidden="true">
          <span className="intro-meter-track" />
          <span className="intro-meter-needle" />
          <i />
        </div>
        <div className="intro-wordmark"><span>Green</span><span>Meter</span></div>
      </div>
      <div className="intro-trace" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
    </div>
  );
}
