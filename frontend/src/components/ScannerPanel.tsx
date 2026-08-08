import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const SCAN_THRESHOLD = 3;

type ScannerPanelProps = {
  onScan: (barcode: string) => void;
};

function ScannerPanel({ onScan }: ScannerPanelProps) {
  const [error, setError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scanCandidateRef = useRef<string | null>(null);
  const scanCountRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const startScanner = async () => {
    if (isTransitioningRef.current) return;

    try {
      isTransitioningRef.current = true;
      setError('');

      if (!window.isSecureContext) {
        setError('Camera access requires a secure connection (HTTPS).');
        isTransitioningRef.current = false;
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('sales-reader');
      }

      if (html5QrCodeRef.current.isScanning) {
        isTransitioningRef.current = false;
        return;
      }

      setIsCameraActive(true);
      scanCandidateRef.current = null;
      scanCountRef.current = 0;

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        { fps: 20, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0, disableFlip: false },
        onScanSuccess,
        () => {}
      );
    } catch (err: any) {
      let userMessage = 'Unable to start camera. Please ensure no other app is using it and try again.';
      const errorString = String(err).toLowerCase();

      if (errorString.includes('notallowederror') || errorString.includes('permission denied') || err.name === 'NotAllowedError') {
        userMessage = 'Camera blocked. Please click the padlock icon (🔒) in your address bar and allow camera access.';
      } else if (errorString.includes('notfounderror') || err.name === 'NotFoundError') {
        userMessage = 'No camera device found on this device.';
      }

      setError(userMessage);
      setIsCameraActive(false);
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (isTransitioningRef.current) return;
    if (html5QrCodeRef.current) {
      try {
        isTransitioningRef.current = true;
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        setIsCameraActive(false);
      } catch {
        // ignore stop errors, camera may already be gone
      } finally {
        html5QrCodeRef.current = null;
        isTransitioningRef.current = false;
      }
    }
  };

  async function onScanSuccess(decodedText: string) {
    const trimmedText = decodedText.trim();

    if (trimmedText === scanCandidateRef.current) {
      scanCountRef.current += 1;
    } else {
      scanCandidateRef.current = trimmedText;
      scanCountRef.current = 1;
      return;
    }

    if (scanCountRef.current < SCAN_THRESHOLD) return;

    await stopScanner();
    onScanRef.current(trimmedText);
    setTimeout(() => { startScanner(); }, 600);
  }

  useEffect(() => {
    startScanner();
    return () => {
      void stopScanner();
      const readerElement = document.getElementById('sales-reader');
      if (readerElement) readerElement.innerHTML = '';
    };
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      {!isCameraActive && !error && <p className="muted" style={{ margin: '0 0 0.5rem' }}>Starting camera...</p>}
      {error && (
        <div style={{ marginBottom: '0.5rem' }}>
          <p className="error-text">{error}</p>
          <button type="button" className="btn btn-light" onClick={startScanner} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            Retry Camera
          </button>
        </div>
      )}
      <div
        id="sales-reader"
        style={{
          width: '100%',
          maxWidth: '360px',
          margin: '0 auto',
          background: '#f3f4f6',
          borderRadius: '12px',
          overflow: 'hidden',
          display: isCameraActive ? 'block' : 'none'
        }}
      ></div>
    </div>
  );
}

export default ScannerPanel;
