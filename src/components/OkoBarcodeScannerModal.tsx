'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, Barcode, AlertCircle, Sparkles, Volume2 } from 'lucide-react';

interface OkoBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export default function OkoBarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: OkoBarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [camErrorMsg, setCamErrorMsg] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setCamErrorMsg('');
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCamErrorMsg('Accès caméra non supporté. Veuillez saisir le code OKO manuellement.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);

        // Détection automatique de code-barres via BarcodeDetector si disponible
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39'],
            });

            const scanLoop = async () => {
              if (!videoRef.current || !streamRef.current) return;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  if (rawValue) {
                    playBeepSound();
                    stopCamera();
                    onScanSuccess(rawValue);
                    onClose();
                    return;
                  }
                }
              } catch (e) {
                // Poursuivre la boucle de scan
              }
              if (streamRef.current) {
                requestAnimationFrame(scanLoop);
              }
            };
            requestAnimationFrame(scanLoop);
          } catch (e) {
            console.warn('BarcodeDetector notice:', e);
          }
        }
      }
    } catch (err: any) {
      console.warn('Erreur caméra:', err);
      setCameraActive(false);
      setCamErrorMsg('Veuillez autoriser l\'accès à la caméra pour scanner les étiquettes.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz Beep
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) { console.warn('Audio notice:', e); }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeepSound();
    stopCamera();
    onScanSuccess(manualCode.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FBF7EF] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-[#B8442C]" />
            <h3 className="font-serif font-black text-lg text-[#1B4332]">Scan Code Article OKO</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera Viewport */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border-2 border-[#1B4332] shadow-inner flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Cadre de Viseur de Code-barres */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-24 border-2 border-[#E8A33D] rounded-xl shadow-lg relative flex items-center justify-center bg-[#E8A33D]/10 animate-pulse">
              <div className="w-full h-0.5 bg-[#B8442C]" />
            </div>
          </div>

          {!cameraActive && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center space-y-2">
              <Camera className="w-8 h-8 text-gray-400" />
              <p className="text-xs text-gray-300 font-medium">{camErrorMsg || 'Activation de la caméra...'}</p>
            </div>
          )}
        </div>

        {/* Saisie Manuelle de Secours */}
        <form onSubmit={handleManualSubmit} className="space-y-2 pt-1">
          <label className="block text-xs font-bold text-[#1B4332]">Ou saisissez le code OKO-XXXXXX :</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              placeholder="ex: OKO-000452"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-mono font-bold text-[#1B4332] uppercase"
            />
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs shadow transition-transform active:scale-95"
            >
              Ajouter ➔
            </button>
          </div>
        </form>

        <p className="text-[10px] text-gray-500 font-medium text-center">
          Pointez la caméra sur l'étiquette autocollante de l'article pour l'ajouter automatiquement au panier.
        </p>
      </div>
    </div>
  );
}
