import React, { useState, useEffect } from 'react';
import AlertsDisplay from '@/components/alerts/AlertsDisplay';
import AlertsTimeline from '@/components/alerts/AlertsTimeline'; // Import the new timeline component
// Removed useAuth import as token is fetched directly

// Define the CloudAlert interface (or import it if defined elsewhere)
interface CloudAlert {
  _id: string;
  user_id: string;
  source: 's3_event' | 'sqs_direct' | 'sqs_raw' | 'api_ingest';
  region?: string;
  event_time?: string;
  event_name?: string;
  principal_id?: string;
  source_ip?: string;
  bucket_name?: string;
  object_key?: string;
  raw_message: any;
  received_at: string;
}

const CloudAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<CloudAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Removed token from useAuth()

  useEffect(() => {
    const fetchAlerts = async () => {
      const token = localStorage.getItem('token'); // Get token directly from localStorage
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/alerts', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            setError('Unauthorized. Please log in again.');
            // Optionally clear token and redirect
            // localStorage.removeItem('token');
            // window.location.href = '/login';
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          setAlerts([]); // Clear alerts on error
        } else {
          const data: CloudAlert[] = await response.json();
          // Sort alerts by received_at descending (newest first) for the display list
          // The timeline component will sort by event_time internally
          setAlerts(data.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()));
          setError(null); // Clear error on success
        }
      } catch (err: any) {
        console.error('Failed to fetch alerts:', err);
        setError(`Failed to fetch alerts: ${err.message}`);
        setAlerts([]); // Clear alerts on error
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Optional: Set up polling like in AlertsDisplay if needed, or rely on manual refresh
    // const intervalId = setInterval(fetchAlerts, 30000); // Poll every 30 seconds
    // return () => clearInterval(intervalId); // Cleanup interval on unmount

  }, []); // Removed token from dependency array

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Cloud Security Alerts</h1>

      {/* Render Timeline */}
      <AlertsTimeline alerts={alerts} />

      {/* Render Alerts List */}
      <AlertsDisplay alerts={alerts} loading={loading} error={error} />
    </div>
  );
};

export default CloudAlertsPage;