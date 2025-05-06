import React, { useState } from 'react'; // Add useState
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bell, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  // DialogTrigger, // No longer needed here if Dialog is outside the loop
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// Define the structure for the cloud alerts fetched from the backend
interface CloudAlert {
  _id: string; // MongoDB ObjectId as string
  user_id: string;
  source: 's3_event' | 'sqs_direct' | 'sqs_raw' | 'api_ingest'; // Added 'api_ingest'
  region?: string;
  event_time?: string; // ISO format string
  event_name?: string;
  principal_id?: string;
  source_ip?: string;
  bucket_name?: string;
  object_key?: string;
  raw_message: any; // Can be JSON object or raw string
  received_at: string; // ISO format string
}

// Helper function to determine severity (example logic)
const getSeverity = (eventName?: string): { level: 'Critical' | 'High' | 'Medium' | 'Low', color: string, textClass: string } => {
  // Basic example: Customize based on actual event names
  if (!eventName) return { level: 'Low', color: 'bg-blue-500', textClass: 'text-blue-500' }; // Default if no event name
  const lowerEventName = eventName.toLowerCase();
  if (lowerEventName.includes('delete') || lowerEventName.includes('failed')) {
    return { level: 'High', color: 'bg-orange-500', textClass: 'text-orange-500' };
  }
  if (lowerEventName.includes('put') || lowerEventName.includes('create')) {
    return { level: 'Medium', color: 'bg-yellow-500', textClass: 'text-yellow-500' };
  }
  return { level: 'Low', color: 'bg-blue-500', textClass: 'text-blue-500' };
};

// Define props for the component
interface AlertsDisplayProps {
  alerts: CloudAlert[];
  loading: boolean;
  error: string | null;
}

const AlertsDisplay: React.FC<AlertsDisplayProps> = ({ alerts, loading, error }) => {
  // State for modal
  const [selectedAlertRaw, setSelectedAlertRaw] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to open modal and set data
  const handleViewRaw = (rawMessage: any) => {
    setSelectedAlertRaw(rawMessage);
    setIsModalOpen(true);
  };

  // Function to handle modal close via onOpenChange
  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedAlertRaw(null); // Clear data when closing
    }
  };

  if (loading) {
    return <p>Loading alerts...</p>; // Simple loading text
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optional: Add critical alerts section if needed */}
      {/* <div className="grid gap-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Alert Example</AlertTitle>
          <AlertDescription>
            This is a placeholder for critical alerts.
          </AlertDescription>
        </Alert>
      </div> */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Cloud Activity Alerts
          </CardTitle>
          <CardDescription>
            Recent alerts detected from cloud sources (SQS, S3 Events, API Ingest).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">No alerts detected yet.</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                // --- Start Parsing Logic --- (Keep this logic)
                let eventName: string | undefined;
                let eventTime: string | undefined;
                let region: string | undefined;
                let sourceIP: string | undefined;
                let principalId: string | undefined;
                let bucketName: string | undefined;
                let objectKey: string | undefined;
                let userAgent: string | undefined;
                let detail: any = null; // To hold the detail object if applicable

                if (alert.source === 'api_ingest' && typeof alert.raw_message === 'object' && alert.raw_message !== null) {
                  // Handle the new API ingest format with nested raw_message structure
                  const apiSource = alert.raw_message.source; // e.g., 'ssh_logs', 'aws', etc.
                  
                  if (apiSource === 'ssh_logs' && alert.raw_message.raw_message) {
                    // Handle SSH logs format
                    eventName = alert.raw_message.event_type || 'info';
                    eventTime = alert.raw_message.raw_message.timestamp;
                    sourceIP = alert.raw_message.raw_message.log_entry?.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/)?.[0];
                    detail = alert.raw_message.raw_message;
                  } else if (apiSource === 'aws' && alert.raw_message.raw_message) {
                    // Handle AWS format
                    eventName = alert.raw_message.raw_message.event_type || 'access';
                    eventTime = alert.raw_message.raw_message.timestamp;
                    sourceIP = alert.raw_message.raw_message.ip_address;
                    userAgent = alert.raw_message.raw_message.user_agent;
                    principalId = alert.raw_message.raw_message.username;
                    detail = alert.raw_message.raw_message;
                  } else {
                    // Fallback for other API ingest formats or original structure
                    detail = alert.raw_message.detail || alert.raw_message;
                    eventName = detail?.eventName || alert.raw_message.event_type;
                    eventTime = detail?.eventTime || alert.raw_message.timestamp;
                    region = detail?.awsRegion;
                    sourceIP = detail?.sourceIPAddress;
                    principalId = detail?.userIdentity?.principalId || detail?.userIdentity?.arn;
                    userAgent = detail?.userAgent;
                    bucketName = detail?.requestParameters?.bucketName;
                    objectKey = detail?.requestParameters?.key;
                  }
                  // Add more fields as needed from detail
                } else if (alert.source === 'sqs_direct' && typeof alert.raw_message === 'object' && alert.raw_message !== null) {
                  // Existing logic for sqs_direct (assuming it wraps a CloudTrail event)
                  detail = alert.raw_message?.detail;
                  const s3Data = detail?.s3; // For S3 events via CloudTrail
                  const requestParams = detail?.requestParameters;

                  eventName = detail?.eventName;
                  eventTime = detail?.eventTime;
                  region = detail?.awsRegion;
                  sourceIP = detail?.sourceIPAddress;
                  principalId = detail?.userIdentity?.principalId;
                  bucketName = requestParams?.bucketName || s3Data?.bucket?.name;
                  objectKey = requestParams?.key || s3Data?.object?.key;
                } else {
                  // Fallback for s3_event, sqs_raw, or if parsing fails
                  eventName = alert.event_name;
                  eventTime = alert.event_time;
                  region = alert.region;
                  sourceIP = alert.source_ip;
                  principalId = alert.principal_id;
                  bucketName = alert.bucket_name;
                  objectKey = alert.object_key;
                }

                const receivedTime = new Date(alert.received_at).toLocaleString();
                const severity = getSeverity(eventName);
                // --- End Parsing Logic ---

                return (
                  <div key={alert._id} className="border border-border rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${severity.color}`}
                        ></span>
                        <h4 className="font-medium break-all">{eventName || alert.source}</h4>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${severity.color}/20 ${severity.textClass}`}>
                        {severity.level}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                      {/* Display parsed fields conditionally */}
                      {eventName && <div><p className="text-muted-foreground">Event Name:</p><p className="break-all">{eventName}</p></div>}
                      {sourceIP && <div><p className="text-muted-foreground">Source IP:</p><p className="break-all">{sourceIP}</p></div>}
                      {region && <div><p className="text-muted-foreground">Region:</p><p>{region}</p></div>}
                      {principalId && <div><p className="text-muted-foreground">Principal ID:</p><p className="break-all">{principalId}</p></div>}
                      {bucketName && <div><p className="text-muted-foreground">Bucket Name:</p><p className="break-all">{bucketName}</p></div>}
                      {objectKey && <div><p className="text-muted-foreground">Object Key:</p><p className="break-all">{objectKey}</p></div>}
                      {userAgent && <div><p className="text-muted-foreground">User Agent:</p><p className="break-all">{userAgent}</p></div>}
                      {eventTime && <div><p className="text-muted-foreground">Event Time:</p><p>{new Date(eventTime).toLocaleString()}</p></div>}
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Source: {alert.source}</span>
                      <span>Received: {receivedTime}</span>
                    </div>
                    {/* Button to trigger the modal */}
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => handleViewRaw(alert.raw_message)}>
                      <Eye className="mr-2 h-4 w-4" /> View Raw JSON
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog component moved outside the map loop */}
      <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Raw Alert Data (JSON)</DialogTitle>
            <DialogDescription>
              Complete raw data received for this alert.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-auto bg-muted p-4 rounded-md">
            <pre className="text-sm whitespace-pre-wrap break-all">
              {/* Display selected data, ensure it's not null before stringifying */}
              {selectedAlertRaw ? JSON.stringify(selectedAlertRaw, null, 2) : 'No data selected.'}
            </pre>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlertsDisplay;