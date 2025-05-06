
import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Initial nodes for our deception assets graph
const initialNodes = [
  {
    id: '1',
    position: { x: 250, y: 100 },
    data: { label: 'Honeypot Server' },
    type: 'input',
    className: 'cyber-node',
  },
  {
    id: '2',
    position: { x: 100, y: 250 },
    data: { label: 'Decoy Database' },
    className: 'cyber-node',
  },
  {
    id: '3',
    position: { x: 400, y: 250 },
    data: { label: 'File Bait' },
    className: 'cyber-node',
  },
  {
    id: '4',
    position: { x: 250, y: 400 },
    data: { label: 'Network Trap' },
    type: 'output',
    className: 'cyber-node',
  },
];

// Initial edges connecting our nodes
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e2-4', source: '2', target: '4', animated: true },
  { id: 'e3-4', source: '3', target: '4' },
];

export default function ViewAssets() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);
  // Filter states
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterIP, setFilterIP] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterEvent, setFilterEvent] = useState("");

  useEffect(() => {
    const fetchAlerts = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [cloudRes, genericRes] = await Promise.all([
          fetch('http://localhost:5000/api/alerts', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/generic-alerts', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (!cloudRes.ok || !genericRes.ok) {
          throw new Error('Failed to fetch alerts');
        }
        let cloudData = await cloudRes.json();
        let genericData = await genericRes.json();
        // Apply filters client-side
        let allAlerts = [...cloudData, ...genericData];
        if (filterStartDate) {
          allAlerts = allAlerts.filter(a => {
            const t = new Date(a.event_time || a.received_at).getTime();
            return t >= new Date(filterStartDate).getTime();
          });
        }
        if (filterEndDate) {
          allAlerts = allAlerts.filter(a => {
            const t = new Date(a.event_time || a.received_at).getTime();
            return t <= new Date(filterEndDate).getTime();
          });
        }
        if (filterIP) {
          allAlerts = allAlerts.filter(a => (a.source_ip || a.client_info?.ip_address || "").includes(filterIP));
        }
        if (filterUser) {
          allAlerts = allAlerts.filter(a => (a.user_id || "").includes(filterUser));
        }
        if (filterEvent) {
          allAlerts = allAlerts.filter(a => (a.event_name || a.type || a.event_type || a.source || "").toLowerCase().includes(filterEvent.toLowerCase()));
        }
        setAlerts(allAlerts);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [filterStartDate, filterEndDate, filterIP, filterUser, filterEvent]);

  useEffect(() => {
    if (!alerts.length) return;
    // Build nodes and edges based on IP and user_id
    const ipMap = new Map();
    const userMap = new Map();
    const alertNodes = [];
    const ipNodes = [];
    const userNodes = [];
    const newEdges = [];
    let nodeId = 10;
    // Arrange nodes in a grid
    const gridSpacingX = 200;
    const gridSpacingY = 120;
    let alertIndex = 0;
    let ipIndex = 0;
    let userIndex = 0;
    alerts.slice(0, visibleCount).forEach(alert => {
      // Alert node
      const alertNodeId = `alert-${alert._id}`;
      alertNodes.push({
        id: alertNodeId,
        position: { x: 100 + (alertIndex % 5) * gridSpacingX, y: 100 + Math.floor(alertIndex / 5) * gridSpacingY },
        data: { label: alert.event_name || alert.type || alert.event_type || alert.source },
        className: 'cyber-node',
      });
      alertIndex++;
      // IP node
      let ip = alert.source_ip || (alert.client_info && alert.client_info.ip_address);
      if (ip) {
        if (!ipMap.has(ip)) {
          const ipNodeId = `ip-${ip}`;
          ipNodes.push({
            id: ipNodeId,
            position: { x: 1200, y: 100 + ipIndex * gridSpacingY },
            data: { label: ip },
            className: 'cyber-node',
          });
          ipMap.set(ip, ipNodeId);
          ipIndex++;
        }
        newEdges.push({ id: `e-${alertNodeId}-${ipMap.get(ip)}`, source: alertNodeId, target: ipMap.get(ip), animated: true, label: 'Triggered by IP', type: 'step' });
      }
      // User node
      if (alert.user_id) {
        if (!userMap.has(alert.user_id)) {
          const userNodeId = `user-${alert.user_id}`;
          userNodes.push({
            id: userNodeId,
            position: { x: 1400, y: 100 + userIndex * gridSpacingY },
            data: { label: alert.user_id },
            className: 'cyber-node',
          });
          userMap.set(alert.user_id, userNodeId);
          userIndex++;
        }
        newEdges.push({ id: `e-${alertNodeId}-${userMap.get(alert.user_id)}`, source: alertNodeId, target: userMap.get(alert.user_id), animated: false, label: 'Associated with User', type: 'step' });
      }
    });
    setNodes([...alertNodes, ...ipNodes, ...userNodes]);
    setEdges(newEdges);
  }, [alerts, visibleCount]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const handleAddNodes = () => {
    setVisibleCount((prev) => prev + 10);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deception Assets & Alert Graph</h1>
        <p className="text-muted-foreground">Interactive graph of alerts, IPs, and users based on real alert data.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Alert Relationship Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[1000px] border border-border rounded-md overflow-hidden flex">
            <div className="flex-1 relative">
              {loading ? (
                <div className="flex items-center justify-center h-full">Loading graph...</div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-red-500">{error}</div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  fitView
                  edgeOptions={{ type: "straight" }}
                >
                  <Background />
                  <Controls />
                  <MiniMap 
                    nodeStrokeColor={(n) => n.selected ? "#9b87f5" : "#ddd"}
                    nodeColor={(n) => n.selected ? "#fff" : "#9b87f5"}
                  />
                  <Panel position="top-right">
                    <div className="bg-card p-2 rounded-md shadow-sm">
                      <p className="text-sm">Total Nodes: {nodes.length}</p>
                    </div>
                  </Panel>
                </ReactFlow>
              )}
            </div>
            <div className="w-64 bg-muted border-l border-border p-4 flex flex-col items-center justify-start space-y-4">
              <h2 className="text-lg font-semibold mb-2">Filters</h2>
              <input
                type="date"
                className="mb-2 w-full p-1 rounded border"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                placeholder="Start Date"
              />
              <input
                type="date"
                className="mb-2 w-full p-1 rounded border"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                placeholder="End Date"
              />
              <input
                type="text"
                className="mb-2 w-full p-1 rounded border"
                value={filterIP}
                onChange={e => setFilterIP(e.target.value)}
                placeholder="Filter by IP"
              />
              <input
                type="text"
                className="mb-2 w-full p-1 rounded border"
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                placeholder="Filter by User ID"
              />
              <input
                type="text"
                className="mb-2 w-full p-1 rounded border"
                value={filterEvent}
                onChange={e => setFilterEvent(e.target.value)}
                placeholder="Filter by Event Name/Type"
              />
              <hr className="my-2 w-full border-border" />
              <h2 className="text-lg font-semibold mb-2">Navigation</h2>
              <p className="mb-2">Currently showing {visibleCount} alerts</p>
              <button
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition"
                onClick={handleAddNodes}
                disabled={visibleCount >= alerts.length}
              >
                Add 10 More
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Total alerts: {alerts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
