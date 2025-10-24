import React, { useState, useEffect } from 'react';
import { adminAPI, studentsAPI, vendorsAPI } from '../services/api';
import { DocumentArrowUpIcon, DocumentArrowDownIcon, ChartBarIcon, PlusIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  
  // Vendor management state
  const [vendors, setVendors] = useState([]);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    description: '',
    location: '',
    contactInfo: {
      phone: '',
      email: '',
      address: ''
    }
  });
  const [creatingVendor, setCreatingVendor] = useState(false);

  // User management state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    vendorId: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchVendors();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data.vendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setUploadResult(null);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);

      const response = await adminAPI.uploadCSV(formData);
      setUploadResult(response.data);
      
      if (response.data.errors > 0) {
        toast.error(`Upload completed with ${response.data.errors} errors`);
      } else {
        toast.success('CSV uploaded and processed successfully!');
      }
      
      // Refresh stats
      fetchStats();
    } catch (error) {
      const message = error.response?.data?.message || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminAPI.exportStudents();
      
      // Create and download CSV
      const csvContent = convertToCSV(response.data.students);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Students data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export students data');
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.location) {
      toast.error('Name and location are required');
      return;
    }

    setCreatingVendor(true);
    try {
      await vendorsAPI.create(newVendor);
      toast.success('Vendor created successfully!');
      setNewVendor({
        name: '',
        description: '',
        location: '',
        contactInfo: {
          phone: '',
          email: '',
          address: ''
        }
      });
      setShowAddVendor(false);
      fetchVendors();
      fetchStats();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create vendor';
      toast.error(message);
    } finally {
      setCreatingVendor(false);
    }
  };

  const handleCreateUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Name, email, and password are required');
      return;
    }

    setCreatingUser(true);
    try {
      const userData = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role
      };

      // Add vendorId if role is vendor
      if (newUser.role === 'vendor' && newUser.vendorId) {
        userData.vendorId = newUser.vendorId;
      }

      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      toast.success(`${newUser.role} user created successfully`);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'student',
        vendorId: ''
      });
      setShowCreateUser(false);
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage students, upload CSV data, and view system statistics
        </p>
      </div>

      {/* Key Metrics Overview */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-600">✓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Today's Verifications
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.todaysVerifications || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">👥</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Students
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.activeStudents || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-purple-600">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Vendor Distribution
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.studentsByVendor?.length || 0} vendors
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Summary */}
      {stats && (
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
                <div className="text-sm text-gray-500">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalVendors}</div>
                <div className="text-sm text-gray-500">Total Vendors</div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Vendor Management Section */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Vendor Management
            </h3>
            <button
              onClick={() => setShowAddVendor(!showAddVendor)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Vendor
            </button>
          </div>

          {/* Add Vendor Form */}
          {showAddVendor && (
            <form onSubmit={handleCreateVendor} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vendor-name" className="block text-sm font-medium text-gray-700">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    id="vendor-name"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="e.g., Gaura's Secret Recipe"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="vendor-location" className="block text-sm font-medium text-gray-700">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="vendor-location"
                    value={newVendor.location}
                    onChange={(e) => setNewVendor({...newVendor, location: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="e.g., Main Campus"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="vendor-description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="vendor-description"
                    value={newVendor.description}
                    onChange={(e) => setNewVendor({...newVendor, description: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Brief description of the vendor"
                  />
                </div>
                <div>
                  <label htmlFor="vendor-phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="vendor-phone"
                    value={newVendor.contactInfo.phone}
                    onChange={(e) => setNewVendor({
                      ...newVendor, 
                      contactInfo: {...newVendor.contactInfo, phone: e.target.value}
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label htmlFor="vendor-email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="vendor-email"
                    value={newVendor.contactInfo.email}
                    onChange={(e) => setNewVendor({
                      ...newVendor, 
                      contactInfo: {...newVendor.contactInfo, email: e.target.value}
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="vendor@example.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="vendor-address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <textarea
                    id="vendor-address"
                    value={newVendor.contactInfo.address}
                    onChange={(e) => setNewVendor({
                      ...newVendor, 
                      contactInfo: {...newVendor.contactInfo, address: e.target.value}
                    })}
                    rows={2}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Full address of the vendor"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddVendor(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingVendor}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingVendor ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    'Create Vendor'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Vendors List */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <div key={vendor._id} className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900">{vendor.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{vendor.location}</p>
                {vendor.description && (
                  <p className="text-xs text-gray-500 mt-2">{vendor.description}</p>
                )}
                {vendor.contactInfo?.phone && (
                  <p className="text-xs text-gray-500 mt-1">📞 {vendor.contactInfo.phone}</p>
                )}
                {vendor.contactInfo?.email && (
                  <p className="text-xs text-gray-500 mt-1">✉️ {vendor.contactInfo.email}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Management
            </h3>
            <button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create User
            </button>
          </div>

          {/* Create User Form */}
          {showCreateUser && (
            <form onSubmit={handleCreateUserSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="user-name"
                    name="name"
                    value={newUser.name}
                    onChange={handleCreateUserChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="user-email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="user-email"
                    name="email"
                    value={newUser.email}
                    onChange={handleCreateUserChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="user@sst.scaler.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="user-password" className="block text-sm font-medium text-gray-700">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="user-password"
                    name="password"
                    value={newUser.password}
                    onChange={handleCreateUserChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">
                    Role *
                  </label>
                  <select
                    id="user-role"
                    name="role"
                    value={newUser.role}
                    onChange={handleCreateUserChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    required
                  >
                    <option value="student">Student</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {newUser.role === 'vendor' && (
                  <div className="sm:col-span-2">
                    <label htmlFor="user-vendor" className="block text-sm font-medium text-gray-700">
                      Assign to Vendor
                    </label>
                    <select
                      id="user-vendor"
                      name="vendorId"
                      value={newUser.vendorId}
                      onChange={handleCreateUserChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Select a vendor (optional)</option>
                      {vendors.map((vendor) => (
                        <option key={vendor._id} value={vendor._id}>
                          {vendor.name} - {vendor.location}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          )}

          <div className="text-sm text-gray-600">
            <p><strong>Note:</strong> Only admins can create vendor and admin accounts. Students can register themselves through the public registration form.</p>
          </div>
        </div>
      </div>

      {/* CSV Upload Section */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            CSV Data Management
          </h3>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700">
                Upload Student Data (CSV)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400">
                <div className="space-y-1 text-center">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="csv-file" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                      <span>Upload a file</span>
                      <input
                        id="csv-file"
                        name="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </div>
              </div>
              {csvFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {csvFile.name}
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!csvFile || uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload CSV
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export Students
              </button>
            </div>
          </form>

          {/* Upload Results */}
          {uploadResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Results</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Total rows processed: {uploadResult.totalRows}</p>
                <p>Successfully processed: {uploadResult.processed}</p>
                <p>Errors: {uploadResult.errors}</p>
                {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Error details:</p>
                    <ul className="list-disc list-inside text-xs">
                      {uploadResult.errorDetails.map((error, index) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Students by Vendor */}
      {stats?.studentsByVendor && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Students by Vendor
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.studentsByVendor.map((vendor) => (
                <div key={vendor._id} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900">{vendor.vendorName}</h4>
                  <p className="text-2xl font-bold text-primary-600">{vendor.count} students</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
