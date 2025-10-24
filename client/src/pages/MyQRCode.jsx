import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { qrAPI } from '../services/api';
import { QrCodeIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const MyQRCode = () => {
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQRCode();
  }, []);

  const fetchQRCode = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching QR code...');
      const response = await qrAPI.getMyQRCode();
      console.log('✅ QR code response:', response.data);
      setQrData(response.data);
    } catch (error) {
      console.error('❌ Error fetching QR code:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle specific error cases
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;
      
      if (errorCode === 'STUDENT_NOT_FOUND' || errorCode === 'NO_VENDOR_ASSIGNED') {
        // Don't show toast for these cases, let the component handle the display
        setQrData(null);
      } else {
        toast.error(errorMessage || 'Failed to load QR code');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (qrData?.qrCodeDataURL) {
      const link = document.createElement('a');
      link.download = `qr-code-${user?.name || 'student'}.png`;
      link.href = qrData.qrCodeDataURL;
      link.click();
      toast.success('QR code downloaded!');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="text-center py-12">
        <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No QR Code Available</h3>
        <p className="mt-1 text-sm text-gray-500 mb-6">
          You are not subscribed to any vendor. Please contact the admin to add your student record and assign you to a vendor.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 max-w-md mx-auto">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Action Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Contact your admin to:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Add your student record to the system</li>
                  <li>Assign you to a vendor</li>
                  <li>Enable QR code generation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={fetchQRCode}
          className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Your Meal QR Code
            </h3>
            <button
              onClick={fetchQRCode}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          {/* Student Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{qrData.student.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Batch</label>
                <p className="mt-1 text-sm text-gray-900">{qrData.student.rollNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Vendor</label>
                <p className="mt-1 text-sm text-gray-900">{qrData.student.vendor}</p>
              </div>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="text-center">
            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
              <img
                src={qrData.qrCodeDataURL}
                alt="Student QR Code"
                className="w-64 h-64 mx-auto"
              />
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Show this QR code to your vendor to claim your meal
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={downloadQRCode}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download QR Code
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <QrCodeIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  How to use your QR code
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to your assigned vendor: <strong>{qrData.student.vendor}</strong></li>
                    <li>Show this QR code to the vendor staff</li>
                    <li>The vendor will scan your QR code to verify your meal</li>
                    <li>You can only claim one meal per day</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyQRCode;
