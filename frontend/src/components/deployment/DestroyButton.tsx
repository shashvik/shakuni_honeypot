import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useDeploymentLogs } from "@/context/DeploymentLogsContext";
import { DeploymentLog } from "./DeploymentButton"; // Assuming DeploymentLog is exported from there

// Define template types (can be shared or defined here)
type HoneypotTemplate = "web_honeypot" | "aws_cloud_native_honeypot";
type CloudProvider = "aws" | "gcp" | "azure"; // Added CloudProvider type

type DestroyStatus = "idle" | "loading" | "success" | "error";

interface DestroyOutput {
  status: "success" | "failure";
  output: string;
}

// Add props interface
interface DestroyButtonProps {
  selectedProvider: CloudProvider;
  selectedTemplate: HoneypotTemplate;
  onComplete?: () => void; // Optional callback for when operation finishes
}

export function DestroyButton({ selectedProvider, selectedTemplate, onComplete }: DestroyButtonProps) {
  const [status, setStatus] = useState<DestroyStatus>("idle");
  const [output, setOutput] = useState<string>("");
  const { toast } = useToast();
  const { addLog } = useDeploymentLogs();
  
  const handleDestroy = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Template Not Selected",
        description: "Please select a template before destroying.",
        variant: "destructive",
      });
      return;
    }

    setStatus("loading");
    setOutput(""); // Clear previous output
    
    // Call the backend API to run Terraform destroy for the selected template
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("User not authenticated");
      }
      
      const response = await fetch('http://localhost:5000/api/terraform/destroy', { // Updated endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          template_id: selectedTemplate,
          provider: selectedProvider // Send provider
        }), 
      });
      
      const result: DestroyOutput = await response.json();
      setOutput(result.output);

      if (!response.ok) {
        throw new Error(result.output || 'Failed to run Terraform destroy');
      }
      
      setStatus(result.status === "success" ? "success" : "error");
      
      // Add log to the deployment logs context
      addLog({
        timestamp: new Date().toISOString(),
        operation: "destroy",
        status: result.status,
        output: result.output,
        templateId: selectedTemplate, // Include templateId in the log
        provider: selectedProvider, // Include provider in log
      });

      toast({
        title: `Destruction ${result.status === "success" ? "Successful" : "Failed"}`,
        description: result.status === "success" 
          ? `Successfully initiated destruction for ${selectedTemplate}.`
          : `Destruction failed for ${selectedTemplate}. Check logs for details.`,
        variant: result.status === "success" ? "default" : "destructive",
      });

      if (onComplete) onComplete(); // Call the callback on completion

    } catch (error: any) {
      console.error("Destroy error:", error);
      const errorMessage = error.message || "An unexpected error occurred during destruction.";
      setStatus("error");
      setOutput(errorMessage);
      
      addLog({
        timestamp: new Date().toISOString(),
        operation: "destroy",
        status: "failure",
        output: errorMessage,
        templateId: selectedTemplate,
        provider: selectedProvider, // Include provider in log
      });

      toast({
        title: "Destruction Error",
        description: errorMessage,
        variant: "destructive",
      });
      if (onComplete) onComplete(); // Call callback even on error
    }
  };

  return (
    <Button 
      variant="destructive" 
      onClick={handleDestroy}
      disabled={status === 'loading'}
      className="w-full"
    >
      {status === 'loading' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
      {status === 'success' && <CheckCircle className="mr-2 h-4 w-4" />}
      {status === 'error' && <AlertCircle className="mr-2 h-4 w-4" />}
      {status === 'idle' && <Trash2 className="mr-2 h-4 w-4" />}
      {status === 'loading' ? "Destroying..." : `Confirm & Destroy`}
    </Button>
  );
}