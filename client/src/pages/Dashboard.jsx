import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { studentsAPI, vendorsAPI, verificationAPI } from '../services/api';
import {
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        if (hasRole('admin')) {
          // Admin dashboard - get overall stats
          const response = await studentsAPI.getAll({ limit: 1 });
          setStats({
            totalStudents: response.data.total,
            totalVendors: 3, // This would come from an API call
            todayVerifications: 0, // This would come from verification stats
            activeStudents: response.data.students.filter(s => s.isActive).length
          });
        } else if (hasRole('vendor')) {
          // Vendor dashboard - get vendor-specific stats
          const vendorId = user.vendor; // Assuming vendor ID is stored in user
          if (vendorId) {
            const response = await verificationAPI.getStats(vendorId);
            setStats({
              totalStudents: response.data.totalStudents,
              todayMeals: response.data.claimedToday,
              claimRate: response.data.claimRate,
              notClaimedToday: response.data.notClaimedToday
            });
          }
        } else {
          // Student dashboard
          setStats({
            message: "Welcome to Scan2Go! Use the verification system to claim your meals."
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, hasRole]);

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  const getDashboardContent = () => {
    if (hasRole('admin')) {
      return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                      {stats?.totalStudents || 0}
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
                      Total Vendors
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalVendors || 0}
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
                      Today's Verifications
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.todayVerifications || 0}
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
                  <ClockIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Students
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.activeStudents || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (hasRole('vendor')) {
      return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Assigned Students
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalStudents || 0}
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
                      Meals Served Today
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.todayMeals || 0}
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
                      Claim Rate
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.claimRate || 0}%
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
                  <ClockIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Claims
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.notClaimedToday || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Student dashboard
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Welcome, {user?.name}!
          </h3>
          <p className="text-gray-600 mb-6">
            {stats?.message || "Use the verification system to claim your meals."}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  How to claim your meal
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>1. Go to the verification counter at your assigned vendor</p>
                  <p>2. Show your QR code or provide your batch</p>
                  <p>3. The vendor will verify and serve your meal</p>
                </div>
                <div className="mt-3">
                  <a
                    href="/my-qr-code"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View My QR Code
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.name}! Here's what's happening with your account.
        </p>
      </div>

      {getDashboardContent()}

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasRole('vendor') && (
            <a
              href="/verification"
              className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <ClipboardDocumentCheckIcon className="mx-auto h-8 w-8 text-gray-400" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Student Verification
              </span>
            </a>
          )}
          
          {hasRole('admin') && (
            <a
              href="/admin"
              className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Admin Panel
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
