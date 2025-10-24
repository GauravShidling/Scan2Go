import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { verificationAPI, vendorsAPI } from '../services/api';
import { MagnifyingGlassIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const StudentVerification = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await vendorsAPI.getAll();
        setVendors(response.data.vendors);
        if (response.data.vendors.length > 0) {
          setSelectedVendor(response.data.vendors[0]._id);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
        toast.error('Failed to load vendors');
      }
    };

    fetchVendors();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedVendor) {
      toast.error('Please enter a search query and select a vendor');
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      const response = await verificationAPI.verify({
        identifier: searchQuery.trim(),
        vendorId: selectedVendor
      });

      setVerificationResult(response.data);
      
      if (response.data.verified) {
        toast.success('Student verified successfully!');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      setVerificationResult({
        verified: false,
        message: message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    // This would integrate with a QR code scanner
    toast.info('QR code scanning feature coming soon!');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Student Verification
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Verify students and process meal claims
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Verification Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Verify Student
            </h3>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
                  Select Vendor
                </label>
                <select
                  id="vendor"
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.name} - {vendor.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                  Student Identifier
                </label>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter roll number, email, or QR code"
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  You can search by roll number, email, or QR code
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim() || !selectedVendor}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Verify Student'}
                </button>
                
                <button
                  type="button"
                  onClick={handleQRScan}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <QrCodeIcon className="h-5 w-5 mr-2" />
                  QR Scan
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Verification Result */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Verification Result
            </h3>
            
            {verificationResult ? (
              <div className={`p-4 rounded-md ${
                verificationResult.verified 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {verificationResult.verified ? (
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${
                      verificationResult.verified ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {verificationResult.verified ? 'Verification Successful' : 'Verification Failed'}
                    </h3>
                    <div className={`mt-2 text-sm ${
                      verificationResult.verified ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <p>{verificationResult.message}</p>
                      
                      {verificationResult.student && (
                        <div className="mt-3 space-y-1">
                          <p><strong>Name:</strong> {verificationResult.student.name}</p>
                          <p><strong>Roll Number:</strong> {verificationResult.student.rollNumber}</p>
                          <p><strong>Email:</strong> {verificationResult.student.email}</p>
                          <p><strong>Vendor:</strong> {verificationResult.student.vendor}</p>
                        </div>
                      )}
                      
                      {verificationResult.mealRecord && (
                        <div className="mt-3">
                          <p><strong>Meal Claimed At:</strong> {new Date(verificationResult.mealRecord.claimedAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No verification yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter a student identifier to verify
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentVerification;
