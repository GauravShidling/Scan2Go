import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { vendorsAPI, verificationAPI } from '../services/api';
import { UserGroupIcon, ClipboardDocumentCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const VendorDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch vendors list
        const vendorsResponse = await vendorsAPI.getAll();
        setVendors(vendorsResponse.data.vendors);
        
        // Set default vendor (user's vendor or first available)
        const defaultVendor = user.vendor || vendorsResponse.data.vendors[0]?._id;
        if (defaultVendor) {
          setSelectedVendor(defaultVendor);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedVendor) {
      fetchDashboardData();
    }
  }, [selectedVendor]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await vendorsAPI.getDashboard(selectedVendor);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClaimRateColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !dashboardData) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Vendor Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your vendor performance and student activity
        </p>
      </div>

      {/* Vendor Selection */}
      <div className="mb-6">
        <label htmlFor="vendor-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Vendor
        </label>
        <select
          id="vendor-select"
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="">Select a vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor._id} value={vendor._id}>
              {vendor.name} - {vendor.location}
            </option>
          ))}
        </select>
      </div>

      {dashboardData && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Students
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData.vendor.totalStudents}
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
                    <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Today's Meals
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData.vendor.todayMeals}
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
                    <ChartBarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Monthly Meals
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData.vendor.monthlyMeals}
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
                    <div className="h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-600">%</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Claim Rate
                      </dt>
                      <dd className={`text-lg font-medium ${getClaimRateColor(dashboardData.vendor.claimRate)}`}>
                        {dashboardData.vendor.claimRate}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Assigned Students ({dashboardData.students.length})
              </h3>
              
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Meal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.rollNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.lastMealClaimed 
                            ? new Date(student.lastMealClaimed).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VendorDashboard;
