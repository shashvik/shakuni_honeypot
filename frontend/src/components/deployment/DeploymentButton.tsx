
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useDeploymentLogs } from "@/context/DeploymentLogsContext";

// Define template types (can be shared or defined here)
type HoneypotTemplate = "web_honeypot" | "aws_cloud_native_honeypot";
type CloudProvider = "aws" | "gcp" | "azure"; // Added CloudProvider type

// Update DeploymentLog interface to include templateId
export interface DeploymentLog {
  timestamp: string;
  operation: "deploy" | "destroy";
  status: "success" | "failure";
  output: string;
  templateId: HoneypotTemplate | string; // Added templateId
  provider: CloudProvider | string; // Added provider
}

type DeploymentStatus = "idle" | "loading" | "success" | "error";

interface DeploymentOutput {
  status: "success" | "failure";
  output: string;
}

// State for storage honeypot deployment options (copied from DeployDeception for type safety)
interface StorageHoneypotOptions {
  deploy_s3_buckets: boolean;
  deploy_iam_roles: boolean;
  deploy_iam_users: boolean;
  deploy_secrets: boolean;
  deploy_lambdas: boolean;
}

// Add props interface
interface DeploymentButtonProps {
  selectedProvider: CloudProvider;
  selectedTemplate: HoneypotTemplate;
  variables?: Record<string, string>; // Optional variables object
  deployOptions?: StorageHoneypotOptions; // Optional deployment options for storage honeypot
  onComplete?: () => void; // Optional callback for when operation finishes
}

export function DeploymentButton({ selectedProvider, selectedTemplate, variables, deployOptions, onComplete }: DeploymentButtonProps) {
  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const [output, setOutput] = useState<string>("");
  const [s3BucketName, setS3BucketName] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const { toast } = useToast();
  const { addLog } = useDeploymentLogs();
  
  // Fetch settings only once or when needed, not strictly necessary for deploy button itself
  // but kept for context if settings influence deployment (e.g., region)
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("User not authenticated");
        setStatus("error");
        setOutput("Authentication token not found. Please log in again.");
        setIsLoadingSettings(false);
        return;
      }
      
      const response = await fetch('http://localhost:5000/api/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }); 
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const settings = await response.json();
      setS3BucketName(settings.terraform_s3_bucket);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error Fetching Settings",
        description: "Could not load Terraform configuration. Please check settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Template Not Selected",
        description: "Please select a template before deploying.",
        variant: "destructive",
      });
      return;
    }

    if (!s3BucketName && !isLoadingSettings) {
      // Re-fetch settings if not available and not already loading
      await fetchSettings(); 
      if (!s3BucketName) { // Check again after fetch attempt
        toast({
          title: "Configuration Error",
          description: "Terraform S3 backend bucket is not configured. Please check settings.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setStatus("loading");
    setOutput(""); // Clear previous output
    
    // Prepare request body
    const requestBody: any = {
      template_id: selectedTemplate,
      provider: selectedProvider,
      variables: variables || {}
    };

    // Conditionally add deployOptions for AWS cloud native honeypot
    if (selectedProvider === 'aws' && selectedTemplate === 'aws_cloud_native_honeypot' && deployOptions) {
      requestBody.deploy_options = deployOptions;
    }

    // Call the backend API to run Terraform apply for the selected template
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("User not authenticated");
      }
      
      const response = await fetch('http://localhost:5000/api/terraform/deploy', { // Updated endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody), // Use the prepared request body
      });
      
      const result: DeploymentOutput = await response.json();
      setOutput(result.output);

      if (!response.ok) {
        throw new Error(result.output || 'Failed to run Terraform deployment');
      }
      
      setStatus(result.status === "success" ? "success" : "error");
      
      // Add log to the deployment logs context
      addLog({
        timestamp: new Date().toISOString(),
        operation: "deploy",
        status: result.status,
        output: result.output,
        templateId: selectedTemplate, // Include templateId in the log
        provider: selectedProvider, // Include provider in log
      });

      toast({
        title: `Deployment ${result.status === "success" ? "Successful" : "Failed"}`,
        description: result.status === "success" 
          ? `Successfully initiated deployment for ${selectedTemplate}.`
          : `Deployment failed for ${selectedTemplate}. Check logs for details.`,
        variant: result.status === "success" ? "default" : "destructive",
      });

      if (onComplete) onComplete(); // Call the callback on completion

    } catch (error: any) {
      console.error("Deployment error:", error);
      const errorMessage = error.message || "An unexpected error occurred during deployment.";
      setStatus("error");
      setOutput(errorMessage);
      
      addLog({
        timestamp: new Date().toISOString(),
        operation: "deploy",
        status: "failure",
        output: errorMessage,
        templateId: selectedTemplate,
        provider: selectedProvider, // Include provider in log
      });

      toast({
        title: "Deployment Error",
        description: errorMessage,
        variant: "destructive",
      });
      if (onComplete) onComplete(); // Call callback even on error
    }
  };

  return (
    <Button 
      onClick={handleDeploy}
      disabled={status === 'loading' || isLoadingSettings}
      className="w-full"
    >
      {status === 'loading' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
      {status === 'success' && <CheckCircle className="mr-2 h-4 w-4" />}
      {status === 'error' && <AlertCircle className="mr-2 h-4 w-4" />}
      {status === 'idle' && <Play className="mr-2 h-4 w-4" />}
      {status === 'loading' ? "Deploying..." : `Confirm & Deploy`}
    </Button>
  );
}
