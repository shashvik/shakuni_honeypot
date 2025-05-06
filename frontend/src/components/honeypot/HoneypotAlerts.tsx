import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface HoneypotAlert {
  timestamp: string;
  event_name: string;
  source_ip: string;
  user_agent?: string;
  principal_id?: string;
  user_type?: string;
  bucket_name?: string;
  object_key?: string;
  error_code?: string;
  error_message?: string;
}

export function HoneypotAlerts() {
  const [alerts, setAlerts] = useState<HoneypotAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const response = await fetch('http://localhost:5000/api/honeypot/alerts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch alerts: ${response.statusText}`);
      }

      const data: HoneypotAlert[] = await response.json();
      // Sort alerts by timestamp, newest first
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAlerts(data);

    } catch (err: any) {
      console.error('Error fetching honeypot alerts:', err);
      setError(err.message || 'An unexpected error occurred.');
      toast({
        title: 'Error Fetching Alerts',
        description: err.message || 'Could not load honeypot alerts.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAlerts();
    // Optional: Set up polling to refresh alerts periodically
    // const intervalId = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds
    // return () => clearInterval(intervalId);
  }, [fetchAlerts]);

  const formatTimestamp = (timestamp: string) => {
    try {
      return `${formatDistanceToNow(new Date(timestamp))} ago`;
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1.5">
          <CardTitle>Honeypot Activity</CardTitle>
          <CardDescription>
            Detected interactions with the storage honeypot.
          </CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={fetchAlerts} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-red-500 flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" /> {error}
          </div>
        )}
        {!error && alerts.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">No alerts detected yet.</p>
        )}
        {!error && (alerts.length > 0 || isLoading) && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Source IP</TableHead>
                <TableHead>Principal ID / User Type</TableHead>
                <TableHead>Object Key</TableHead>
                <TableHead>Details</TableHead> 
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading alerts...
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert, index) => (
                  <TableRow key={`${alert.timestamp}-${index}`}>
                    <TableCell className="text-xs">{formatTimestamp(alert.timestamp)}</TableCell>
                    <TableCell className="font-medium">{alert.event_name}</TableCell>
                    <TableCell>{alert.source_ip}</TableCell>
                    <TableCell className="text-xs">
                      {alert.principal_id ? `${alert.principal_id} (${alert.user_type || 'N/A'})` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs">{alert.object_key || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {alert.error_code ? `Error: ${alert.error_code}` : 'Success'}
                      {alert.user_agent && <div className="text-muted-foreground truncate" title={alert.user_agent}>UA: {alert.user_agent.substring(0, 30)}...</div>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}