import React, { useState, useMemo } from 'react';
import { Chrono } from 'react-chrono';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react'; // Changed from Timeline to History

// Re-use the CloudAlert interface and getSeverity function if possible, or redefine/import
// Assuming CloudAlert and getSeverity are defined similarly to AlertsDisplay.tsx
interface CloudAlert {
  _id: string;
  user_id: string;
  source: 's3_event' | 'sqs_direct' | 'sqs_raw' | 'api_ingest';
  region?: string;
  event_time?: string; // ISO format string
  event_name?: string;
  principal_id?: string;
  source_ip?: string;
  bucket_name?: string;
  object_key?: string;
  raw_message: any;
  received_at: string; // ISO format string
}

const getSeverity = (eventName?: string): { level: 'Critical' | 'High' | 'Medium' | 'Low', color: string, textClass: string } => {
  if (!eventName) return { level: 'Low', color: 'bg-blue-500', textClass: 'text-blue-500' };
  const lowerEventName = eventName.toLowerCase();
  if (lowerEventName.includes('delete') || lowerEventName.includes('failed')) {
    return { level: 'High', color: 'bg-orange-500', textClass: 'text-orange-500' };
  }
  if (lowerEventName.includes('put') || lowerEventName.includes('create')) {
    return { level: 'Medium', color: 'bg-yellow-500', textClass: 'text-yellow-500' };
  }
  return { level: 'Low', color: 'bg-blue-500', textClass: 'text-blue-500' };
};

// Helper function to parse alert details (similar to AlertsDisplay)
const parseAlertDetails = (alert: CloudAlert) => {
  let eventName: string | undefined;
  let eventTime: string | undefined;
  let region: string | undefined;
  let sourceIP: string | undefined;
  let principalId: string | undefined;
  let userAgent: string | undefined;
  let detail: any = null;

  if (alert.source === 'api_ingest' && typeof alert.raw_message === 'object' && alert.raw_message !== null) {
    detail = alert.raw_message.detail;
    eventName = detail?.eventName;
    eventTime = detail?.eventTime;
    region = detail?.awsRegion;
    sourceIP = detail?.sourceIPAddress;
    principalId = detail?.userIdentity?.principalId || detail?.userIdentity?.arn;
    userAgent = detail?.userAgent;
  } else if (alert.source === 'sqs_direct' && typeof alert.raw_message === 'object' && alert.raw_message !== null) {
    detail = alert.raw_message?.detail;
    eventName = detail?.eventName;
    eventTime = detail?.eventTime;
    region = detail?.awsRegion;
    sourceIP = detail?.sourceIPAddress;
    principalId = detail?.userIdentity?.principalId;
  } else {
    eventName = alert.event_name;
    eventTime = alert.event_time;
    region = alert.region;
    sourceIP = alert.source_ip;
    principalId = alert.principal_id;
  }
  return { eventName, eventTime, region, sourceIP, principalId, userAgent };
};

interface AlertsTimelineProps {
  alerts: CloudAlert[];
}

const AlertsTimeline: React.FC<AlertsTimelineProps> = ({ alerts }) => {
  const [filterIP, setFilterIP] = useState('');
  const [filterPrincipal, setFilterPrincipal] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSeverity, setFilterSeverity] = useState(''); // 'All', 'Low', 'Medium', 'High'

  const timelineItems = useMemo(() => {
    return alerts
      .map(alert => {
        const { eventName, eventTime, sourceIP, principalId } = parseAlertDetails(alert);
        const severity = getSeverity(eventName);
        return {
          ...alert, // Keep original alert data if needed
          parsedDetails: { eventName, eventTime, sourceIP, principalId },
          severity,
          title: eventTime ? new Date(eventTime).toLocaleTimeString() : new Date(alert.received_at).toLocaleTimeString(), // Use eventTime if available
          cardTitle: eventName || alert.source,
          cardSubtitle: `IP: ${sourceIP || 'N/A'} | Principal: ${principalId || 'N/A'}`,
          cardDetailedText: `Severity: ${severity.level}. Received: ${new Date(alert.received_at).toLocaleString()}`,
          eventTime: eventTime || alert.received_at // Ensure a valid date string for sorting
        };
      })
      .filter(item => {
        const ipMatch = !filterIP || (item.parsedDetails.sourceIP && item.parsedDetails.sourceIP.includes(filterIP));
        const principalMatch = !filterPrincipal || (item.parsedDetails.principalId && item.parsedDetails.principalId.includes(filterPrincipal));
        const actionMatch = !filterAction || (item.parsedDetails.eventName && item.parsedDetails.eventName.toLowerCase().includes(filterAction.toLowerCase()));
        const severityMatch = !filterSeverity || filterSeverity === 'All' || item.severity.level === filterSeverity;
        return ipMatch && principalMatch && actionMatch && severityMatch;
      })
      .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()); // Sort chronologically
  }, [alerts, filterIP, filterPrincipal, filterAction, filterSeverity]);

  // Since react-chrono doesn't have official types, we use 'any'
  // Customize theme for better aesthetics and dark mode visibility
  // Customize theme using Shadcn CSS variables and specific react-chrono properties
  const chronoTheme = {
    primary: 'hsl(var(--primary))', // Timeline points/active title
    secondary: 'hsl(var(--accent))', // Timeline line
    cardBgColor: 'hsl(var(--card))', // Card background
    // Use specific properties for card text elements
    cardTitleColor: 'hsl(var(--card-foreground))', 
    cardSubtitleColor: 'hsl(var(--muted-foreground))',
    cardDetailsColor: 'hsl(var(--muted-foreground))',
    // Timeline title colors
    titleColor: 'hsl(var(--muted-foreground))', // Inactive timeline titles
    titleColorActive: 'hsl(var(--primary-foreground))', // Active timeline title
    // Removed cardForeColor and detailsColor as specific ones are used
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" /> Alerts Timeline {/* Changed from Timeline to History */}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-md">
          <Input
            placeholder="Filter by Source IP..."
            value={filterIP}
            onChange={(e) => setFilterIP(e.target.value)}
            className="w-full"
          />
          <Input
            placeholder="Filter by Principal ID..."
            value={filterPrincipal}
            onChange={(e) => setFilterPrincipal(e.target.value)}
            className="w-full"
          />
          <Input
            placeholder="Filter by Action/Event Name..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full"
          />
          <Select onValueChange={setFilterSeverity} value={filterSeverity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Severities</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              {/* Add Critical if needed */}
            </SelectContent>
          </Select>
        </div>

        {timelineItems.length > 0 ? (
          <div style={{ width: '100%', height: '600px' }}> {/* Increased height from 400px to 600px */}
            <Chrono
              items={timelineItems as any} // Cast to any due to lack of types
              mode="HORIZONTAL" // Horizontal timeline
              itemWidth={200} // Increased width from 180 to 200
              // Removed showSingleItem, slideShow, and slideItemDuration to display all cards
              theme={chronoTheme}
              fontSizes={{
                cardSubtitle: '0.8rem',
                cardText: '0.75rem',
                cardTitle: '0.9rem',
                title: '1rem',
              }}
              borderLessCards
              useReadMore={false} // Disable 'read more' for simplicity
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-center">No alerts match the current filters.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsTimeline;