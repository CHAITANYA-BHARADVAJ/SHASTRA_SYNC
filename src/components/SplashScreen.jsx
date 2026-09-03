import React, { useState, useEffect } from 'react';
import './SplashScreen.css';

/**
 * Apple-Inspired Holographic Loading & Neural Link Initialization Screen
 * Features dynamic system telemetry, glowing Apple titanium shield,
 * and a smooth, cinematic dissolve transition into the Elder App.
 */
export default function SplashScreen({ onFinish }) {
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(12);
  const [stageIndex, setStageIndex] = useState(0);

  const STAGES = [
    'Initializing Neural Voice & Web Speech Engines...',
    'Calibrating ShastraVision & Fall Detection Mesh...',
    'Establishing Secure Cloud Sync & 112 Lifeline...',
    'Systems Operational • Welcome Kamala',
  ];

  useEffect(() => {
    // Dynamic progress bar progression
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 18) + 12;
        return next > 100 ? 100 : next;
      });
    }, 280);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 30) setStageIndex(0);
    else if (progress < 65) setStageIndex(1);
    else if (progress < 95) setStageIndex(2);
    else setStageIndex(3);

    if (progress >= 100) {
      const fadeTimer = setTimeout(() => {
        setFadingOut(true);
      }, 350);

      const finishTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 850);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(finishTimer);
      };
    }
  }, [progress, onFinish]);

  return (
    <div className={`apple-splash-root ${fadingOut ? 'apple-splash-fade-out' : ''}`}>
      {/* Ambient Halo Lighting */}
      <div className="splash-ambient-halo halo-blue"></div>
      <div className="splash-ambient-halo halo-cyan"></div>

      <div className="apple-splash-container">
        {/* Glowing Apple Titanium Shield Centerpiece */}
        <div className="splash-shield-cluster">
          <div className="splash-ripple-wave wave-1"></div>
          <div className="splash-ripple-wave wave-2"></div>
          <div className="splash-shield-core">
            <svg
              className="icon-splash-shield"
              width="52"
              height="52"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div className="shield-specular-highlight"></div>
          </div>
        </div>

        {/* Brand & Identity */}
        <div className="splash-brand-stack">
          <h1 className="splash-app-title">SHASTRA GUARDIAN</h1>
          <p className="splash-app-tagline">Elder Edge Intelligence & Emergency Care</p>
        </div>

        {/* Apple Fluid Progress Track */}
        <div className="splash-progress-wrapper">
          <div className="splash-progress-track">
            <div
              className="splash-progress-fill"
              style={{ transform: `scaleX(${progress / 100})` }}
            ></div>
          </div>
          <div className="splash-progress-meta">
            <span className="splash-stage-text">{STAGES[stageIndex]}</span>
            <span className="splash-percent-text">{progress}%</span>
          </div>
        </div>

        {/* Security / Health Badge */}
        <div className="splash-security-badge">
          <span className="badge-dot"></span>
          <span>Encrypted Edge Telemetry • 112 Rapid Dispatch</span>
        </div>
      </div>
    </div>
  );
}
