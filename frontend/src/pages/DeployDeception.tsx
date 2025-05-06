
import { useState, useEffect } from "react"; // Added useEffect
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeploymentButton } from "@/components/deployment/DeploymentButton";
import { DestroyButton } from "@/components/deployment/DestroyButton";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertCircle, Cloud, Loader2 } from "lucide-react"; // Added Cloud icon and Loader2
import { useDeploymentLogs } from "@/context/DeploymentLogsContext";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, // Added DialogTrigger
  DialogClose // Added DialogClose
} from "@/components/ui/dialog"; // Added Dialog components
import { Input } from "@/components/ui/input"; // Added Input component
import { Label } from "@/components/ui/label"; // Added Label component
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"; // Added Select components
//import axiosInstance from '@/lib/axiosInstance'; // Assuming axios instance is configured for auth

// Define template types and provider types
type HoneypotTemplate = "web_honeypot" | "aws_cloud_native_honeypot";
type CloudProvider = "aws" | "gcp" | "azure";

// Define type for deployment history items
interface DeploymentHistoryItem {
  _id: string;
  user_id: string;
  template_id: string;
  provider: string;
  action: 'deploy' | 'destroy';
  status: 'success' | 'failed';
  timestamp: string; // ISO string format
  output?: string;
}

export default function DeployDeception() {
  const [showLogs, setShowLogs] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<HoneypotTemplate | null>(null);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showDestroyDialog, setShowDestroyDialog] = useState(false);
  const { logs, clearLogs } = useDeploymentLogs();
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [terraformVariables, setTerraformVariables] = useState<any[]>([]); // State for fetched variables
  const [variableInputs, setVariableInputs] = useState<Record<string, string>>({}); // State for user inputs
  const [isLoadingVariables, setIsLoadingVariables] = useState(false);
  const [variablesError, setVariablesError] = useState<string | null>(null);
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<string | null>(null); // State for selected log content
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false); // State for log dialog visibility

  // Fetch deployment history on component mount
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const token = localStorage.getItem('token'); // Corrected key from 'authToken' to 'token'
        if (!token) {
          throw new Error('Authentication token not found.');
        }

        const response = await fetch('/api/deployments/history', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // Handle non-2xx responses
          let errorText = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorText = errorData.message || errorText;
          } catch (jsonError) {
            // If JSON parsing fails, try to get the raw text
            try {
              const rawText = await response.text();
              console.error("Raw non-JSON response:", rawText); // Log the raw HTML/text
              errorText = `Failed to parse error response. Server returned non-JSON content starting with: ${rawText.substring(0, 100)}...`;
            } catch (textError) {
              errorText = 'Failed to fetch history and could not parse error response or read response text.';
            }
          }
          throw new Error(errorText);
        }

        // Try parsing the main response as JSON
        try {
          const data: DeploymentHistoryItem[] = await response.json();
          setDeploymentHistory(data);
        } catch (jsonError) {
          // If JSON parsing fails here (e.g., for 2xx status but invalid JSON)
          let errorText = 'Received OK status but failed to parse JSON response.';
          try {
            const rawText = await response.text(); // Attempt to read raw text on JSON parse failure
            console.error("Raw non-JSON response (status OK):", rawText); // Log the raw HTML/text
            errorText = `Received OK status but failed to parse JSON. Response starts with: ${rawText.substring(0, 100)}...`;
          } catch (textError) {
             errorText = 'Received OK status but failed to parse JSON response or read response text.';
          }
          throw new Error(errorText);
        }
      } catch (error) {
        console.error("Error fetching deployment history:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        // Provide a more specific message if the token is missing
        if (errorMessage === 'Authentication token not found.') {
          setHistoryError('Authentication token not found. Please log in again.');
        } else {
          setHistoryError(`Failed to load deployment history: ${errorMessage}`);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  // Fetch Terraform variables when provider and template are selected
  useEffect(() => {
    const fetchVariables = async () => {
      if (!selectedProvider || !selectedTemplate) {
        setTerraformVariables([]); // Clear variables if provider/template is deselected
        setVariableInputs({});
        setVariablesError(null);
        return;
      }

      setIsLoadingVariables(true);
      setVariablesError(null);
      setTerraformVariables([]); // Clear previous variables
      setVariableInputs({}); // Clear previous inputs

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found.');
        }

        const response = await fetch(`/api/terraform/variables/${selectedProvider}/${selectedTemplate}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let errorText = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorText;
          } catch (jsonError) {
            // Handle non-JSON error response
            errorText = `Failed to fetch variables. Server returned status ${response.status}.`;
          }
          throw new Error(errorText);
        }

        const data = await response.json();
        setTerraformVariables(data || []); // Ensure it's an array
        // Initialize variableInputs with default values from fetched variables
        const initialInputs: Record<string, string> = {};
        if (Array.isArray(data)) {
          data.forEach(variable => {
            if (variable.default !== null && variable.default !== undefined) {
              initialInputs[variable.name] = String(variable.default);
            }
          });
        }
        setVariableInputs(initialInputs);

      } catch (error) {
        console.error("Error fetching Terraform variables:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setVariablesError(`Failed to load template variables: ${errorMessage}`);
      } finally {
        setIsLoadingVariables(false);
      }
    };

    fetchVariables();
  }, [selectedProvider, selectedTemplate]); // Re-run when provider or template changes

  // State for storage honeypot deployment options
  interface StorageHoneypotOptions {
    deploy_s3_buckets: boolean;
    deploy_iam_roles: boolean;
    deploy_iam_users: boolean;
    deploy_secrets: boolean;
    deploy_lambdas: boolean;
    deploy_kms_keys: boolean; // Added KMS option
    deploy_cloudtrail_monitoring: boolean; // Added CloudTrail monitoring option
    cloudtrail_name: string; // Added CloudTrail name field
  }

  // Add state for deployOptions
  const [deployOptions, setDeployOptions] = useState<StorageHoneypotOptions>({
    deploy_s3_buckets: true,
    deploy_iam_roles: true,
    deploy_iam_users: true,
    deploy_secrets: true,
    deploy_lambdas: true,
    deploy_kms_keys: false, // Added KMS option
    deploy_cloudtrail_monitoring: true, // Added CloudTrail monitoring option
    cloudtrail_name: "honeypot-data-events-trail", // Default CloudTrail name
  });

  // Handler for storage honeypot option checkboxes
  const handleDeployOptionChange = (optionName: keyof StorageHoneypotOptions, checked: boolean) => {
    setDeployOptions(prev => ({ ...prev, [optionName]: checked }));
  };
  
  // Handler for storage honeypot text inputs
  const handleDeployOptionTextChange = (optionName: keyof StorageHoneypotOptions, value: string) => {
    setDeployOptions(prev => ({ ...prev, [optionName]: value }));
  };

  // Handler to open the log dialog
  const handleHistoryItemClick = (logOutput: string | undefined) => {
    if (logOutput) {
      setSelectedHistoryLog(logOutput);
      setIsLogDialogOpen(true);
    } else {
      // Optionally handle cases where there's no log output
      console.log("No log output available for this history item.");
      // Maybe show a toast notification
    }
  };

  // Handler to close the log dialog
  const handleCloseLogDialog = () => {
    setIsLogDialogOpen(false);
    setSelectedHistoryLog(null);
  };

  // Define providers
  const providers: { id: CloudProvider; name: string }[] = [
    { id: "aws", name: "Amazon Web Services (AWS)" },
    { id: "gcp", name: "Google Cloud Platform (GCP)" },
    { id: "azure", name: "Microsoft Azure" },
  ];

  // Define templates (potentially filter based on provider later)
  const templates = [
    { id: "web_honeypot" as HoneypotTemplate, name: "Web Server Honeypot", description: "VPC with public subnet (10.208.0.0/16)", provider: "aws" },
    { id: "aws_cloud_native_honeypot" as HoneypotTemplate, name: "AWS Cloud Native Honeypot", description: "Various AWS resources mimicking a cloud environment", provider: "aws" }
    // Add GCP/Azure templates here when available
  ];

  const handleProviderSelect = (providerId: CloudProvider) => {
    setSelectedProvider(providerId);
    setSelectedTemplate(null); // Reset template selection when provider changes
    setShowDeployDialog(false);
    setShowDestroyDialog(false);
  };

  const handleTemplateSelect = (templateId: HoneypotTemplate) => {
    setSelectedTemplate(templateId);
    // Variables will be fetched by the useEffect hook
    setShowDeployDialog(false);
    setShowDestroyDialog(false);
  };

  const handleDeployClick = () => {
    if (selectedProvider && selectedTemplate) {
      setShowDeployDialog(true);
    }
  };

  const handleDestroyClick = () => {
    if (selectedProvider && selectedTemplate) {
      setShowDestroyDialog(true);
    }
  };

  const handleConfirmDeploy = () => {
    setShowDeployDialog(false);
    // Actual deployment logic is in DeploymentButton
  };

  const handleConfirmDestroy = () => {
    setShowDestroyDialog(false);
    // Actual destroy logic is in DestroyButton
  };

  const getProviderDetails = (providerId: CloudProvider | null) => {
    return providers.find(p => p.id === providerId);
  };

  const getTemplateDetails = (templateId: HoneypotTemplate | null) => {
    return templates.find(t => t.id === templateId);
  };

  // Handle input changes for dynamic variables
  const handleVariableInputChange = (variableName: string, value: string) => {
    setVariableInputs(prev => ({ ...prev, [variableName]: value }));
  };

  // Filter templates based on selected provider
  const availableTemplates = selectedProvider
    ? templates.filter(t => t.provider === selectedProvider)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deploy Deception</h1>
        <p className="text-muted-foreground">Select a cloud provider and template to deploy honeypots using Terraform.</p>
      </div>

      {/* Cloud Provider Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>1. Select Cloud Provider</CardTitle>
          <CardDescription>
            Choose the cloud environment where you want to deploy the deception technology.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(value: CloudProvider) => handleProviderSelect(value)} value={selectedProvider ?? undefined}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select a cloud provider..." />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Template Selection Card - Enabled only after provider selection */} 
      <Card className={!selectedProvider ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle>2. Select Template</CardTitle>
          <CardDescription>
            {selectedProvider
              ? `Select a template available for ${getProviderDetails(selectedProvider)?.name}.`
              : "Select a cloud provider above to see available templates."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedProvider ? (
            availableTemplates.length > 0 ? (
              <ul className="space-y-2">
                {availableTemplates.map((template) => (
                  <li 
                    key={template.id} 
                    className={`p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors ${ 
                      selectedTemplate === template.id ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2' : 'border-border bg-background'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">{template.description}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center p-3 text-sm text-muted-foreground border rounded-md bg-muted/50">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>No templates currently available for {getProviderDetails(selectedProvider)?.name}.</span>
              </div>
            )
          ) : (
            <div className="flex items-center p-3 text-sm text-muted-foreground border rounded-md bg-muted/50">
              <Cloud className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Select a provider first.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment Actions Card - Enabled only after template selection */} 
      <Card className={!selectedTemplate ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle>3. Manage Deployment</CardTitle>
          <CardDescription>
            {selectedTemplate 
              ? `Deploy or destroy the selected '${getTemplateDetails(selectedTemplate)?.name}' template on ${getProviderDetails(selectedProvider)?.name}.`
              : "Select a provider and template above to enable deployment options."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Conditionally render Storage Honeypot options for AWS */}
          {selectedProvider === 'aws' && selectedTemplate === 'aws_cloud_native_honeypot' && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
              <h4 className="font-medium mb-2">Deployment Options (AWS Cloud Native Honeypot)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="deploy_s3_buckets"
                    checked={deployOptions.deploy_s3_buckets}
                    onCheckedChange={(checked) => handleDeployOptionChange('deploy_s3_buckets', !!checked)}
                  />
                  <Label htmlFor="deploy_s3_buckets" className="cursor-pointer">Deploy S3 Buckets</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="deploy_iam_roles"
                    checked={deployOptions.deploy_iam_roles}
                    onCheckedChange={(checked) => handleDeployOptionChange('deploy_iam_roles', !!checked)}
                  />
                  <Label htmlFor="deploy_iam_roles" className="cursor-pointer">Deploy IAM Roles</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="deploy_iam_users"
                    checked={deployOptions.deploy_iam_users}
                    onCheckedChange={(checked) => handleDeployOptionChange('deploy_iam_users', !!checked)}
                  />
                  <Label htmlFor="deploy_iam_users" className="cursor-pointer">Deploy IAM Users</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="deploy_secrets"
                    checked={deployOptions.deploy_secrets}
                    onCheckedChange={(checked) => handleDeployOptionChange('deploy_secrets', !!checked)}
                  />
                  <Label htmlFor="deploy_secrets" className="cursor-pointer">Deploy Secrets</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="deploy_lambdas"
                    checked={deployOptions.deploy_lambdas}
                    onCheckedChange={(checked) => handleDeployOptionChange('deploy_lambdas', !!checked)}
                  />
                  <Label htmlFor="deploy_lambdas" className="cursor-pointer">Deploy Lambda Functions</Label>
                </div>
                {/* Added KMS checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="deploy_kms_keys"
                    checked={deployOptions.deploy_kms_keys}
                    onCheckedChange={(checked) => handleDeployOptionChange('deploy_kms_keys', !!checked)}
                  />
                  <Label htmlFor="deploy_kms_keys" className="cursor-pointer">Deploy KMS Keys</Label>
                </div>
                {/* Added CloudTrail monitoring checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="deploy_cloudtrail_monitoring"
                    checked={deployOptions.deploy_cloudtrail_monitoring}
                    onCheckedChange={(checked) => handleDeployOptionChange('deploy_cloudtrail_monitoring', !!checked)}
                  />
                  <Label htmlFor="deploy_cloudtrail_monitoring" className="cursor-pointer">Deploy CloudTrail Monitoring</Label>
                </div>
                {/* CloudTrail name input field - only shown if CloudTrail monitoring is enabled */}
                {deployOptions.deploy_cloudtrail_monitoring && (
                  <div className="col-span-2 mt-2">
                    <Label htmlFor="cloudtrail_name" className="text-sm">CloudTrail Name</Label>
                    <Input
                      id="cloudtrail_name"
                      value={deployOptions.cloudtrail_name}
                      onChange={(e) => handleDeployOptionTextChange('cloudtrail_name', e.target.value)}
                      placeholder="Enter CloudTrail name"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Name for the CloudTrail that will monitor data events for honeypot resources.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-4">Deploy Resources</h3>
              {selectedTemplate ? (
                <Button onClick={handleDeployClick} className="w-full">Deploy '{getTemplateDetails(selectedTemplate)?.name}'</Button>
              ) : (
                <div className="flex items-center p-3 text-sm text-muted-foreground border rounded-md bg-muted/50">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Select a template above to deploy.</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Destroy Resources</h3>
              {selectedTemplate ? (
                <Button variant="destructive" onClick={handleDestroyClick} className="w-full">Destroy '{getTemplateDetails(selectedTemplate)?.name}'</Button>
              ) : (
                <div className="flex items-center p-3 text-sm text-muted-foreground border rounded-md bg-muted/50">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Select a template above to destroy.</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Log Section */} 
          <div className="border-t pt-4 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex justify-between items-center"
            >
              <span>Operation Logs</span>
              {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showLogs && (
              <div className="mt-4 space-y-4 max-h-[500px] overflow-auto">
                <div className="p-4 border rounded-md bg-muted/50">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-medium">Recent Operations</h4>
                      <p className="text-sm text-muted-foreground">
                        View logs from recent deployment and destroy operations.
                      </p>
                    </div>
                    {logs.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to clear all operation logs?')) {
                            clearLogs();
                          }
                        }}
                      >
                        Clear Logs
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {logs.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No operation logs available. Deploy or destroy resources to see logs here.
                      </div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="p-3 border rounded-md bg-background">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="font-medium">
                                {log.operation === "deploy" ? "Deploy" : "Destroy"} Operation ({log.templateId || 'Unknown Template'} on {log.provider || 'Unknown Provider'})
                              </span>
                              <span className="text-xs ml-2 text-muted-foreground">
                                {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                              </span>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${ 
                              log.status === "success" 
                                ? "bg-green-500/20 text-green-700" 
                                : "bg-red-500/20 text-red-700"
                            }`}>
                              {log.status === "success" ? "Success" : "Failed"}
                            </span>
                          </div>
                          <div className={`p-2 rounded font-mono text-xs whitespace-pre-wrap overflow-auto max-h-40 ${ 
                            log.status === "success" 
                              ? "bg-black/90 text-green-300" 
                              : "bg-red-950/20 text-red-300"
                          }`}>
                            {log.output}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deployment History Card - Fetched Data */} 
      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>
            Recent deployment and destruction attempts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading history...</span>
            </div>
          ) : historyError ? (
            <div className="flex items-center p-3 text-sm text-destructive border border-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{historyError}</span>
            </div>
            ) : deploymentHistory.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-auto pr-2"> {/* Added pr-2 for scrollbar spacing */}
                {deploymentHistory.map((item) => (
                  <div 
                    key={item._id} 
                    className="p-3 border rounded-md bg-background hover:bg-muted transition-colors cursor-pointer" // Ensure cursor-pointer is present
                    onClick={() => handleHistoryItemClick(item.output)} // Ensure onClick handler uses item.output
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-medium text-sm ${item.status === 'failed' ? 'text-destructive' : ''}`}>
                        {/* Use item properties and helper functions for display */} 
                        {item.action === 'deploy' ? 'Deploy' : 'Destroy'} - {getTemplateDetails(item.template_id as HoneypotTemplate)?.name || item.template_id} ({getProviderDetails(item.provider as CloudProvider)?.name || item.provider})
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(item.timestamp), 'yyyy-MM-dd hh:mm:ss a')}
                    </div>
                    {/* Log preview removed, full log in dialog */}
                  </div>
                ))}
              </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No deployment history found.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Deployment Confirmation Dialog */} 
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deployment: {getTemplateDetails(selectedTemplate)?.name} on {getProviderDetails(selectedProvider)?.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to initiate the deployment process for the selected template on the chosen provider?
              Review the details below before proceeding.
              {selectedTemplate === "web_honeypot" && selectedProvider === "aws" && (
                <div className="mt-3 p-3 bg-muted rounded-md border">
                  <p className="font-medium">AWS Web Server Honeypot Details:</p>
                  <ul className="text-sm list-disc pl-5 mt-1 text-muted-foreground space-y-1">
                    <li>Creates a new VPC (10.208.0.0/16).</li>
                    <li>Creates a public subnet (10.208.1.0/24).</li>
                    <li>Sets up an Internet Gateway and routing.</li>
                    <li>Configures a security group allowing HTTP/HTTPS access.</li>
                  </ul>
                </div>
              )}
              {selectedTemplate === "aws_cloud_native_honeypot" && selectedProvider === "aws" && (
                <div className="mt-3 p-3 bg-muted rounded-md border">
                  <p className="font-medium">AWS S3 Storage Honeypot Details:</p>
                  <ul className="text-sm list-disc pl-5 mt-1 text-muted-foreground space-y-1">
                    <li>Creates a new S3 bucket.</li>
                    <li>Enables server access logging to the bucket itself.</li>
                    <li>Enables versioning for the bucket.</li>
                    <li>Blocks all public access to the bucket.</li>
                  </ul>
                </div>
              )}
              {/* Add details for other providers/templates here */}
            </DialogDescription>
          </DialogHeader>
          {/* Dynamic Variable Inputs */} 
          {isLoadingVariables ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading variables...</span>
            </div>
          ) : variablesError ? (
            <div className="flex items-center p-3 text-sm text-destructive border border-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{variablesError}</span>
            </div>
          ) : terraformVariables.length > 0 ? (
            <div className="space-y-4 my-4">
              <h4 className="font-medium">Template Variables</h4>
              {/* Filter out deploy options from being rendered as inputs */}
              {terraformVariables
                .filter(variable => !
                  ['deploy_s3_buckets', 'deploy_iam_roles', 'deploy_iam_users', 'deploy_secrets', 'deploy_lambdas', 'deploy_kms_keys'] // Added KMS option
                  .includes(variable.name)
                )
                .map((variable) => (
                <div key={variable.name} className="grid grid-cols-1 gap-1.5">
                  <Label htmlFor={variable.name} className="text-sm">
                    {variable.name}
                    {variable.description && <span className="text-xs text-muted-foreground ml-1">({variable.description})</span>}
                  </Label>
                  <Input
                    id={variable.name}
                    value={variableInputs[variable.name] || ''} // Use state value or empty string
                    onChange={(e) => handleVariableInputChange(variable.name, e.target.value)}
                    placeholder={variable.type ? `Type: ${variable.type}` : 'Enter value'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="my-4 p-3 text-sm text-muted-foreground border rounded-md bg-muted/50">
              No additional variables required for this template.
            </div>
          )}
          {/* End Dynamic Variable Inputs */} 
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeployDialog(false)}>Cancel</Button>
            {/* Pass selectedProvider and selectedTemplate to DeploymentButton */} 
            {selectedProvider && selectedTemplate && 
              <DeploymentButton 
                selectedProvider={selectedProvider} 
                selectedTemplate={selectedTemplate} 
                variables={variableInputs} // Pass the collected variable inputs
                // Pass deployOptions only for the relevant template/provider
                deployOptions={selectedProvider === 'aws' && selectedTemplate === 'aws_cloud_native_honeypot' ? deployOptions : undefined}
                onComplete={handleConfirmDeploy} 
              />
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Destroy Confirmation Dialog */} 
      <Dialog open={showDestroyDialog} onOpenChange={setShowDestroyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Destruction: {getTemplateDetails(selectedTemplate)?.name} on {getProviderDetails(selectedProvider)?.name}</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-destructive">Warning:</span> This action is irreversible and will destroy all resources managed by the selected Terraform template ('{getTemplateDetails(selectedTemplate)?.name}') on {getProviderDetails(selectedProvider)?.name}.
              Are you absolutely sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDestroyDialog(false)}>Cancel</Button>
            {/* Pass selectedProvider and selectedTemplate to DestroyButton */} 
            {selectedProvider && selectedTemplate && 
              <DestroyButton 
                selectedProvider={selectedProvider} 
                selectedTemplate={selectedTemplate} 
                onComplete={handleConfirmDestroy} 
              />
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Viewer Dialog */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Deployment Log</DialogTitle>
            <DialogDescription>
              Full output log for the selected deployment operation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-auto p-1 border rounded-md bg-muted/50 my-4">
            <pre className="text-xs whitespace-pre-wrap break-words">
              {selectedHistoryLog || "No log content available."}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseLogDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
