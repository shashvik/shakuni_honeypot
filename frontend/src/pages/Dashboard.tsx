
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, AlertCircle, Server, Shield, Clock, Calendar, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Sector
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define interfaces for our data types
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

interface GenericAlert {
  _id: string;
  user_id: string;
  source: string;
  event_time?: string;
  event_name?: string;
  principal_id?: string;
  source_ip?: string;
  type?: string;
  event_type?: string;
  client_info?: {
    ip_address?: string;
    user_agent?: string;
    [key: string]: any;
  };
  raw_message: any;
  received_at: string;
}

interface Deployment {
  _id: string;
  user_id: string;
  template_id: string;
  provider: string;
  action: string;
  status: string;
  timestamp: string;
  output: string;
}

// Define interfaces for our chart data
interface TrendData {
  date: string;
  count: number;
}

interface AttackTypeData {
  name: string;
  value: number;
}

interface TopOffender {
  ip: string;
  count: number;
  lastSeen: string;
  attackTypes: string[];
}

export default function Dashboard() {
  // State for our data
  const [cloudAlerts, setCloudAlerts] = useState<CloudAlert[]>([]);
  const [genericAlerts, setGenericAlerts] = useState<GenericAlert[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for our chart data
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [attackTypeData, setAttackTypeData] = useState<AttackTypeData[]>([]);
  const [topOffenders, setTopOffenders] = useState<TopOffender[]>([]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch cloud alerts
        const cloudAlertsResponse = await fetch('http://localhost:5000/api/alerts', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        // Fetch generic alerts
        const genericAlertsResponse = await fetch('http://localhost:5000/api/generic-alerts', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        // We would fetch deployments here if there's an API endpoint for it
        // For now, we'll use mock data for deployments
        
        if (!cloudAlertsResponse.ok || !genericAlertsResponse.ok) {
          throw new Error(`HTTP error! status: ${!cloudAlertsResponse.ok ? cloudAlertsResponse.status : genericAlertsResponse.status}`);
        }
        
        const cloudAlertsData = await cloudAlertsResponse.json();
        const genericAlertsData = await genericAlertsResponse.json();
        
        // Sort by received_at (newest first)
        setCloudAlerts(cloudAlertsData.sort((a: CloudAlert, b: CloudAlert) => 
          new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
        ));
        
        setGenericAlerts(genericAlertsData.sort((a: GenericAlert, b: GenericAlert) => 
          new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
        ));
        
        // Mock deployments data - in a real app, this would come from an API
        setDeployments([
          { 
            _id: '1', 
            user_id: 'current-user', 
            template_id: 'aws_cloud_native_honeypot', 
            provider: 'aws', 
            action: 'deploy', 
            status: 'success', 
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            output: 'Deployment successful'
          },
          { 
            _id: '2', 
            user_id: 'current-user', 
            template_id: 'azure_webapp_honeypot', 
            provider: 'azure', 
            action: 'deploy', 
            status: 'success', 
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
            output: 'Deployment successful'
          },
          { 
            _id: '3', 
            user_id: 'current-user', 
            template_id: 'gcp_storage_honeypot', 
            provider: 'gcp', 
            action: 'deploy', 
            status: 'success', 
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            output: 'Deployment successful'
          }
        ]);
        
        // Process data for charts
        processChartData([...cloudAlertsData, ...genericAlertsData]);
        
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(`Failed to fetch data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up polling every 30 seconds
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Process data for charts
  const processChartData = (allAlerts: (CloudAlert | GenericAlert)[]) => {
    // Process trend data (alerts by day for the last 7 days)
    const trendMap = new Map<string, number>();
    const now = new Date();
    
    // Initialize the last 7 days with 0 counts
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendMap.set(dateStr, 0);
    }
    
    // Count alerts by day
    allAlerts.forEach(alert => {
      const alertDate = new Date(alert.received_at);
      const dateStr = alertDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Only count if it's within the last 7 days
      const daysDiff = Math.floor((now.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 6) {
        trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1);
      }
    });
    
    // Convert map to array for chart
    const trendDataArray: TrendData[] = Array.from(trendMap.entries()).map(([date, count]) => ({
      date,
      count
    }));
    
    setTrendData(trendDataArray);
    
    // Process attack type data
    const attackTypeMap = new Map<string, number>();
    
    allAlerts.forEach(alert => {
      let type = '';
      
      if ('event_name' in alert && alert.event_name) {
        type = alert.event_name;
      } else if ('type' in alert && alert.type) {
        type = alert.type;
      } else if ('event_type' in alert && alert.event_type) {
        type = alert.event_type;
      } else {
        type = alert.source;
      }
      
      // Simplify the type for better categorization
      if (type.toLowerCase().includes('delete')) {
        type = 'Delete Operation';
      } else if (type.toLowerCase().includes('put') || type.toLowerCase().includes('create')) {
        type = 'Create/Modify Operation';
      } else if (type.toLowerCase().includes('get') || type.toLowerCase().includes('list')) {
        type = 'Read Operation';
      } else if (type === 'honeypot_deception') {
        type = 'Honeypot Deception';
      } else if (type.toLowerCase().includes('failed')) {
        type = 'Failed Operation';
      }
      
      attackTypeMap.set(type, (attackTypeMap.get(type) || 0) + 1);
    });
    
    // Convert map to array for chart
    const attackTypeDataArray: AttackTypeData[] = Array.from(attackTypeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value) // Sort by count descending
      .slice(0, 5); // Take top 5
    
    setAttackTypeData(attackTypeDataArray);
    
    // Process top offenders data
    const offenderMap = new Map<string, { count: number, lastSeen: Date, types: Set<string> }>();
    
    allAlerts.forEach(alert => {
      let ip = '';
      let type = '';
      
      // Get IP
      if ('source_ip' in alert && alert.source_ip) {
        ip = alert.source_ip;
      } else if ('client_info' in alert && alert.client_info?.ip_address) {
        ip = alert.client_info.ip_address;
      }
      
      // Skip if no IP
      if (!ip) return;
      
      // Get type
      if ('event_name' in alert && alert.event_name) {
        type = alert.event_name;
      } else if ('type' in alert && alert.type) {
        type = alert.type;
      } else if ('event_type' in alert && alert.event_type) {
        type = alert.event_type;
      } else {
        type = alert.source;
      }
      
      // Update offender data
      const existingData = offenderMap.get(ip) || { count: 0, lastSeen: new Date(0), types: new Set<string>() };
      const alertDate = new Date(alert.received_at);
      
      offenderMap.set(ip, {
        count: existingData.count + 1,
        lastSeen: alertDate > existingData.lastSeen ? alertDate : existingData.lastSeen,
        types: existingData.types.add(type)
      });
    });
    
    // Convert map to array for table
    const topOffendersArray: TopOffender[] = Array.from(offenderMap.entries())
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        lastSeen: data.lastSeen.toLocaleString(),
        attackTypes: Array.from(data.types).slice(0, 3) // Limit to 3 types
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 10); // Take top 10
    
    setTopOffenders(topOffendersArray);
  };

  // Function to open modal and set data
  const handleViewRaw = (rawData: any) => {
    setSelectedAlert(rawData);
    setIsModalOpen(true);
  };

  // Calculate metrics
  const activeHoneypots = deployments.filter(d => d.status === 'success').length;
  const totalAlerts = cloudAlerts.length + genericAlerts.length;
  
  // Count critical alerts (high severity)
  const criticalAlerts = [
    ...cloudAlerts.filter(alert => {
      const eventName = alert.event_name?.toLowerCase() || '';
      return eventName.includes('delete') || eventName.includes('failed');
    }),
    ...genericAlerts.filter(alert => alert.type === 'honeypot_deception')
  ].length;

  // Get recent alerts (combined and sorted)
  const recentAlerts = [...cloudAlerts, ...genericAlerts]
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
    .slice(0, 5) // Take top 5
    .map(alert => {
      // Determine alert type and source
      let type = '';
      let level = 'Medium';
      let source = '';
      let time = '';
      
      if ('event_name' in alert && alert.event_name) {
        type = alert.event_name;
      } else if ('type' in alert && alert.type) {
        type = alert.type;
      } else if ('event_type' in alert && alert.event_type) {
        type = alert.event_type;
      } else {
        type = alert.source;
      }
      
      // Determine severity level
      if (type.toLowerCase().includes('delete') || type.toLowerCase().includes('failed') || 
          type === 'honeypot_deception') {
        level = 'Critical';
      } else if (type.toLowerCase().includes('put') || type.toLowerCase().includes('create')) {
        level = 'High';
      }
      
      // Determine source IP
      if ('source_ip' in alert && alert.source_ip) {
        source = alert.source_ip;
      } else if ('client_info' in alert && alert.client_info?.ip_address) {
        source = alert.client_info.ip_address;
      }
      
      // Format time
      time = new Date(alert.received_at).toLocaleTimeString();
      
      return { type, level, source, time, raw: alert.raw_message };
    });

  // Get recent deployments
  const recentDeployments = deployments
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3) // Take top 3
    .map(deployment => {
      // Format the template ID to be more readable
      const name = deployment.template_id
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Format the date
      const date = new Date(deployment.timestamp).toLocaleDateString();
      
      return {
        name,
        status: deployment.status === 'success' ? 'Active' : 'Failed',
        date,
        provider: deployment.provider.toUpperCase()
      };
    });

  // Calculate alert trends (mock data - in a real app, you'd calculate this from actual data)
  const alertsLastWeek = totalAlerts - Math.floor(Math.random() * 10);
  const alertsPercentChange = alertsLastWeek > 0 
    ? Math.round((totalAlerts - alertsLastWeek) / alertsLastWeek * 100) 
    : 100;

  // Calculate honeypot trends (mock data)
  const honeypotLastWeek = activeHoneypots - Math.floor(Math.random() * 2);
  const honeypotChange = activeHoneypots - honeypotLastWeek;

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading Dashboard...</h2>
          <Progress value={75} className="w-[300px] mb-2" />
          <p className="text-muted-foreground">Fetching your security metrics</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
        <p className="text-muted-foreground">Real-time overview of your deception technology deployments and alerts.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Honeypots</CardTitle>
            <Shield className="h-4 w-4 text-cyber-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeHoneypots}</div>
            <p className="text-xs text-muted-foreground">
              {honeypotChange > 0 ? `+${honeypotChange}` : honeypotChange} from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Activity className="h-4 w-4 text-cyber-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {alertsPercentChange > 0 ? `+${alertsPercentChange}%` : `${alertsPercentChange}%`} from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {criticalAlerts > 0 ? "Requires attention" : "No critical alerts"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date().toLocaleTimeString()}</div>
            <p className="text-xs text-muted-foreground">Auto-refreshes every 30s</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Alert Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Trends</CardTitle>
          <CardDescription>Alert volume over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Alert Count"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Attack Types Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Attack Types</CardTitle>
            <CardDescription>Distribution of different attack types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attackTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {attackTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} alerts`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Top Offenders Table */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Offenders</CardTitle>
            <CardDescription>IP addresses with the most alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Attack Types</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topOffenders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No data available</TableCell>
                  </TableRow>
                ) : (
                  topOffenders.map((offender, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{offender.ip}</TableCell>
                      <TableCell>{offender.count}</TableCell>
                      <TableCell>{offender.lastSeen}</TableCell>
                      <TableCell>{offender.attackTypes.join(', ')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Deployments</CardTitle>
            <CardDescription>
              Latest deception technology deployments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDeployments.length === 0 ? (
                <p className="text-muted-foreground">No deployments found</p>
              ) : (
                recentDeployments.map((item) => (
                  <div key={item.name} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>Deployed on {item.date}</span>
                        <span className="mx-1">•</span>
                        <span>{item.provider}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`h-2 w-2 rounded-full ${item.status === 'Active' ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
                      <span className="text-sm">{item.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>
              Latest security alerts from all sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.length === 0 ? (
                <p className="text-muted-foreground">No alerts detected yet</p>
              ) : (
                recentAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-xs text-muted-foreground">From {alert.source || 'Unknown'} at {alert.time}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        alert.level === "Critical" ? "bg-red-500/20 text-red-500" :
                        alert.level === "High" ? "bg-orange-500/20 text-orange-500" :
                        "bg-yellow-500/20 text-yellow-500"
                      }`}>
                        {alert.level}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => handleViewRaw(alert.raw)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raw Alert Data</DialogTitle>
            <DialogDescription>
              Detailed information about this alert
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md overflow-x-auto">
            <pre className="text-xs">{JSON.stringify(selectedAlert, null, 2)}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
