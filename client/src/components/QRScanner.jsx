import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { XMarkIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

const QRScanner = ({ onScan, onClose, isOpen }) => {
  const scannerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('QRScanner render - isOpen:', isOpen);

  useEffect(() => {
    console.log('QRScanner useEffect - isOpen:', isOpen);
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting HTML5 QR Scanner...');

      // Create scanner with html5-qrcode
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false // verbose
      );

      // Start scanning
      scannerRef.current.render(
        (decodedText, decodedResult) => {
          console.log('QR Code detected:', decodedText);
          onScan(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Ignore decode errors - they're common when scanning
          console.log('Decode error (normal):', errorMessage);
        }
      );

      console.log('QR Scanner started successfully');
      setLoading(false);
    } catch (err) {
      console.error('Scanner error:', err);
      setError('Failed to start camera. Please check permissions.');
      setLoading(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
        console.log('Scanner stopped and cleared');
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) {
    console.log('QRScanner not open, returning null');
    return null;
  }

  console.log('QRScanner is open, rendering modal');
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              Scan QR Code
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Scanner Content */}
          <div className="p-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-sm text-gray-600">
                  Starting camera...
                </p>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <button
                  onClick={startScanner}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-4">
                <div className="relative">
                  <div id="qr-reader" className="w-full h-64 bg-gray-100 rounded-lg flex justify-center items-center">
                    {/* The scanner will render here */}
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Position the QR code within the frame
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    The code will be scanned automatically
                  </p>
                </div>

                {/* Manual Input Fallback */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Camera not working? Enter QR code manually:
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Paste QR code data here..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = e.target.value.trim();
                          if (value) {
                            onScan(value);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Paste QR code data here..."]');
                        const value = input?.value?.trim();
                        if (value) {
                          onScan(value);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
