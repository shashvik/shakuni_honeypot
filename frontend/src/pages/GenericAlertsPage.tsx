import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import AlertsTimeline from "@/components/alerts/AlertsTimeline";

// Define the structure for generic alerts fetched from the backend
interface GenericAlert {
  _id: string; // MongoDB ObjectId as string
  user_id: string;
  source: 's3_event' | 'sqs_direct' | 'sqs_raw' | 'api_ingest' | 'api_ingest_get'; // Added api_ingest_get
  event_time?: string; // ISO format string
  event_name?: string;
  principal_id?: string;
  source_ip?: string;
  type?: string; // e.g., 'honeypot_deception'
  event_type?: string; // e.g., 'link_clicked'
  client_info?: {
    ip_address?: string;
    x_forwarded_for?: string;
    host?: string;
    method?: string;
    path?: string;
    url?: string;
    timestamp?: string;
    user_agent?: string;
    browser?: string;
    platform?: string;
    version?: string;
    language?: string;
    referer?: string;
    accept?: string;
    accept_encoding?: string;
    accept_language?: string;
    cache_control?: string;
    connection?: string;
    dnt?: string;
    origin?: string;
    pragma?: string;
    sec_fetch_dest?: string;
    sec_fetch_mode?: string;
    sec_fetch_site?: string;
    sec_fetch_user?: string;
    upgrade_insecure_requests?: string;
    cookies?: Record<string, string>;
    all_headers?: Record<string, string>;
    ip?: string; // For backward compatibility
    os?: string; // For backward compatibility
    device?: string; // For backward compatibility
  };
  raw_message: any; // Can be JSON object or raw string
  received_at: string; // ISO format string
}

const GenericAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<GenericAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await fetch('http://localhost:5000/api/generic-alerts', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            setError('Unauthorized. Please log in again.');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          setAlerts([]); // Clear alerts on error
        } else {
          const data = await response.json();
          // Sort alerts by received_at descending (newest first)
          setAlerts(data.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()));
          setError(null); // Clear error on success
        }
      } catch (err) {
        console.error('Failed to fetch generic alerts:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setAlerts([]); // Clear alerts on error
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Sort alerts by event_time in descending order (newest first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const dateA = a.event_time ? new Date(a.event_time).getTime() : 0;
    const dateB = b.event_time ? new Date(b.event_time).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Generic Security Alerts</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Generic Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p>Loading alerts...</p>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : sortedAlerts.length === 0 ? (
                <p className="text-muted-foreground">No alerts detected yet.</p>
              ) : (
                sortedAlerts.map((alert) => {
                  // Format received time
                  const receivedTime = new Date(alert.received_at).toLocaleString();
                  
                  return (
                    <div key={alert._id} className="border border-border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span>
                          <h4 className="font-medium break-all">{alert.type || alert.event_type || alert.source}</h4>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-500">
                          {alert.type === 'honeypot_deception' ? 'High' : 'Medium'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                        {alert.type && <div><p className="text-muted-foreground">Alert Type:</p><p className="break-all">{alert.type}</p></div>}
                        {alert.event_type && <div><p className="text-muted-foreground">Event Type:</p><p className="break-all">{alert.event_type}</p></div>}
                        {alert.source && <div><p className="text-muted-foreground">Source:</p><p className="break-all">{alert.source}</p></div>}
                        
                        {/* Client Info Section */}
                        {alert.client_info && (
                          <>
                            {alert.client_info.ip_address && <div><p className="text-muted-foreground">IP Address:</p><p className="break-all">{alert.client_info.ip_address}</p></div>}
                            {alert.client_info.method && <div><p className="text-muted-foreground">HTTP Method:</p><p className="break-all">{alert.client_info.method}</p></div>}
                            {alert.client_info.path && <div><p className="text-muted-foreground">Path:</p><p className="break-all">{alert.client_info.path}</p></div>}
                            {alert.client_info.url && <div><p className="text-muted-foreground">URL:</p><p className="break-all">{alert.client_info.url}</p></div>}
                            {alert.client_info.user_agent && <div><p className="text-muted-foreground">User Agent:</p><p className="break-all">{alert.client_info.user_agent}</p></div>}
                            {alert.client_info.referer && alert.client_info.referer !== "Unknown" && <div><p className="text-muted-foreground">Referer:</p><p className="break-all">{alert.client_info.referer}</p></div>}
                          </>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Type: {alert.type || 'N/A'}</span>
                        <span>Received: {receivedTime}</span>
                      </div>
                      
                      {/* View Raw JSON Button */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="mt-2">
                            <Eye className="mr-2 h-4 w-4" /> View Raw JSON
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Raw Alert Data</DialogTitle>
                            <DialogDescription>
                              Complete raw data received for this alert.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="mt-4 max-h-[60vh] overflow-auto bg-muted p-4 rounded-md">
                            <pre className="text-sm whitespace-pre-wrap break-all">
                              {JSON.stringify(alert, null, 2)}
                            </pre>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generic Alerts Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsTimeline 
              alerts={sortedAlerts.map(alert => ({
                _id: alert._id,
                user_id: alert.user_id,
                source: alert.source === 'api_ingest_get' ? 'api_ingest' : alert.source,
                region: undefined,
                event_time: alert.event_time,
                event_name: alert.event_name || alert.type || alert.event_type,
                principal_id: alert.principal_id,
                source_ip: alert.source_ip || alert.client_info?.ip_address,
                bucket_name: undefined,
                object_key: undefined,
                raw_message: alert.raw_message,
                received_at: alert.received_at
              }))} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GenericAlertsPage;