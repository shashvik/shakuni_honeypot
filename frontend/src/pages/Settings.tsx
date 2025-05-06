
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/context/ThemeContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ThemeType } from "@/context/ThemeContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select imports

// Define cloud provider type
type CloudProvider = 'aws' | 'gcp' | 'azure';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  // State for general Terraform settings
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('aws');
  const [s3Bucket, setS3Bucket] = useState("");
  const [gcsBucket, setGcsBucket] = useState("");
  const [azureContainer, setAzureContainer] = useState("");

  // State for Web Honeypot Terraform settings
  const [webHoneypotSelectedProvider, setWebHoneypotSelectedProvider] = useState<CloudProvider>('aws');
  const [webHoneypotS3Bucket, setWebHoneypotS3Bucket] = useState("");
  const [webHoneypotGcsBucket, setWebHoneypotGcsBucket] = useState("");
  const [webHoneypotAzureContainer, setWebHoneypotAzureContainer] = useState("");

  // State for API key management
  const [user_settings, setUserSettings] = useState<any>(null); // Will store general settings + api_keys array
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [deletingKeyName, setDeletingKeyName] = useState<string | null>(null); // Track which key is being deleted

  const [isLoading, setIsLoading] = useState(false);
  const [isWebHoneypotLoading, setIsWebHoneypotLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setIsWebHoneypotLoading(true); // Also set loading for web honeypot section
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to view settings.",
          variant: "destructive",
        });
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
      
      const data = await response.json();
      // Update state for general Terraform settings
      if (data.terraform_provider) {
        setSelectedProvider(data.terraform_provider);
      }
      setS3Bucket(data.terraform_s3_bucket || "");
      setGcsBucket(data.terraform_gcs_bucket || "");
      setAzureContainer(data.terraform_azure_container || "");

      // Update state for Web Honeypot Terraform settings
      if (data.web_honeypot_terraform_provider) {
        setWebHoneypotSelectedProvider(data.web_honeypot_terraform_provider);
      }
      setWebHoneypotS3Bucket(data.web_honeypot_terraform_s3_bucket || "");
      setWebHoneypotGcsBucket(data.web_honeypot_terraform_gcs_bucket || "");
      setWebHoneypotAzureContainer(data.web_honeypot_terraform_azure_container || "");

      // Update state for API keys and other settings
      setUserSettings(data); // data now includes api_keys array

    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsWebHoneypotLoading(false);
    }
  };

  // Generate API key function
  const generateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast({
        title: "Input Error",
        description: "Please provide a name for the API key.",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingKey(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to generate an API key.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('http://localhost:5000/api/settings/api-key', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newApiKeyName.trim() }), // Send the key name
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate API key');
      }
      
      const newKeyData = await response.json(); // Contains name and the full api_key
      // Add the new key summary to the state (we only get name and preview from /settings)
      const newKeySummary = { name: newKeyData.name, key_preview: newKeyData.api_key.substring(0, 4) + '...' + newKeyData.api_key.substring(newKeyData.api_key.length - 4) };
      setUserSettings(prev => ({
        ...prev,
        api_keys: [...(prev?.api_keys || []), newKeySummary]
      }));
      setNewApiKeyName(""); // Clear input field
      
      toast({
        title: "Success",
        description: `API key '${newKeyData.name}' generated successfully. Copy it now, it won't be shown again.`, // Inform user to copy
        variant: "default",
        // Optionally display the full key in the toast or a modal for copying
      });
      // Consider showing the full key temporarily for copying
      navigator.clipboard.writeText(newKeyData.api_key);
      toast({ title: "Copied", description: "Full API key copied to clipboard." });

    } catch (error) {
      console.error("Error generating API key:", error);
      toast({
        title: "Error",
        description: `Failed to generate API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Delete API key function
  const deleteApiKey = async (keyNameToDelete: string) => {
    if (!keyNameToDelete) return;
    setDeletingKeyName(keyNameToDelete); // Set loading state for the specific key
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to delete an API key.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`http://localhost:5000/api/settings/api-key/${encodeURIComponent(keyNameToDelete)}`, { // Use key name in URL
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete API key');
      }
      
      // Remove the key from the local state
      setUserSettings(prev => ({
        ...prev,
        api_keys: prev.api_keys.filter((key: { name: string }) => key.name !== keyNameToDelete)
      }));
      
      toast({
        title: "Success",
        description: `API key '${keyNameToDelete}' deleted successfully.`, 
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Error",
        description: `Failed to delete API key '${keyNameToDelete}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setDeletingKeyName(null); // Reset the deleting state for the specific key
    }
  };

  // Save general Terraform settings
  const saveTerraformSettings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to update settings.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('http://localhost:5000/api/settings', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          terraform_provider: selectedProvider,
          terraform_s3_bucket: s3Bucket,
          terraform_gcs_bucket: gcsBucket,
          terraform_azure_container: azureContainer,
          // Include web honeypot settings if saving all at once, or use separate endpoint
          web_honeypot_terraform_provider: webHoneypotSelectedProvider,
          web_honeypot_terraform_s3_bucket: webHoneypotS3Bucket,
          web_honeypot_terraform_gcs_bucket: webHoneypotGcsBucket,
          web_honeypot_terraform_azure_container: webHoneypotAzureContainer
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }
      
      toast({
        title: "Success",
        description: "Terraform configurations saved successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save Web Honeypot Terraform settings (could be combined with saveTerraformSettings)
  const saveWebHoneypotTerraformSettings = async () => {
    setIsWebHoneypotLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to update settings.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('http://localhost:5000/api/settings', { // Assuming same endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          // Include general settings if saving all at once
          terraform_provider: selectedProvider,
          terraform_s3_bucket: s3Bucket,
          terraform_gcs_bucket: gcsBucket,
          terraform_azure_container: azureContainer,
          // Web honeypot specific settings
          web_honeypot_terraform_provider: webHoneypotSelectedProvider,
          web_honeypot_terraform_s3_bucket: webHoneypotS3Bucket,
          web_honeypot_terraform_gcs_bucket: webHoneypotGcsBucket,
          web_honeypot_terraform_azure_container: webHoneypotAzureContainer
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update web honeypot settings');
      }
      
      toast({
        title: "Success",
        description: "Web Honeypot Terraform configuration saved successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving web honeypot settings:", error);
      toast({
        title: "Error",
        description: `Failed to save web honeypot settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsWebHoneypotLoading(false);
    }
  };

  // Helper function to get input details for general Terraform config
  const getTerraformInputDetails = () => {
    switch (selectedProvider) {
      case 'aws':
        return { label: 'S3 Bucket Name (General)', placeholder: 'my-terraform-state-bucket' };
      case 'gcp':
        return { label: 'GCS Bucket Name (General)', placeholder: 'my-terraform-state-gcs-bucket' };
      case 'azure':
        return { label: 'Azure Blob Storage Container Name (General)', placeholder: 'terraform-state-container' };
      default:
        return { label: 'State Storage Location (General)', placeholder: 'Enter location' };
    }
  };

  // Helper function to get input details for Web Honeypot Terraform config
  const getWebHoneypotTerraformInputDetails = () => {
    switch (webHoneypotSelectedProvider) {
      case 'aws':
        return { label: 'S3 Bucket Name (Web Honeypot)', placeholder: 'my-web-honeypot-tfstate-bucket' };
      case 'gcp':
        return { label: 'GCS Bucket Name (Web Honeypot)', placeholder: 'my-web-honeypot-tfstate-gcs' };
      case 'azure':
        return { label: 'Azure Blob Storage Container Name (Web Honeypot)', placeholder: 'web-honeypot-tfstate-container' };
      default:
        return { label: 'State Storage Location (Web Honeypot)', placeholder: 'Enter location' };
    }
  };

  const { label: terraformLabel, placeholder: terraformPlaceholder } = getTerraformInputDetails();
  const { label: webHoneypotTerraformLabel, placeholder: webHoneypotTerraformPlaceholder } = getWebHoneypotTerraformInputDetails();

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* API Key Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Manage your API key for integrating with external services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">API Keys</h3>
              <p className="text-sm text-muted-foreground">
                Manage API keys used to authenticate requests to the log ingestion endpoint.
              </p>

              {/* List Existing Keys */}
              <div className="space-y-3 mt-4">
                <h4 className="text-md font-medium">Your Keys</h4>
                {user_settings?.api_keys && user_settings.api_keys.length > 0 ? (
                  user_settings.api_keys.map((key: { name: string; key_preview: string }) => (
                    <div key={key.name} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                      <div className="flex flex-col">
                        <span className="font-medium">{key.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{key.key_preview}</span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the API key named '${key.name}'? Any integrations using this key will stop working.`)) {
                            deleteApiKey(key.name);
                          }
                        }}
                        disabled={deletingKeyName === key.name} // Disable only the button for the key being deleted
                      >
                        {deletingKeyName === key.name ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No API keys found.</p>
                )}
              </div>

              {/* Generate New Key Section */}
              <div className="space-y-3 pt-4 border-t mt-6">
                 <h4 className="text-md font-medium">Generate New Key</h4>
                 <div className="flex items-center space-x-2">
                    <Input 
                      type="text" 
                      placeholder="Enter a name for the new key" 
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                      disabled={isGeneratingKey}
                      className="flex-grow"
                    />
                    <Button 
                      onClick={generateApiKey}
                      disabled={isGeneratingKey || !newApiKeyName.trim()}
                    >
                      {isGeneratingKey ? "Generating..." : "Generate Key"}
                    </Button>
                 </div>
              </div>

              {/* Usage Example - Updated to be more generic */}
              <div className="space-y-2 mt-6">
                <h4 className="text-sm font-medium">Usage Example</h4>
                <p className="text-xs text-muted-foreground">Replace `YOUR_API_KEY` with one of your generated keys.</p>
                <pre className="bg-secondary p-4 rounded-md overflow-x-auto text-xs">
                  <code>
                    curl -X POST http://localhost:5000/api/logs/ingest \
                    <br />  -H "Content-Type: application/json" \
                    <br />  -H "X-API-Key: YOUR_API_KEY" \
                    <br />  -d '&#123;"source": "aws", "raw_message": &#123;"example": "log data"&#125;&#125;'
                  </code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terraform Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Terraform Configuration</CardTitle>
            <CardDescription>
              Configure your Terraform settings for cloud deployments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Cloud Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="cloud-provider">Cloud Provider</Label>
                <Select 
                  value={selectedProvider} 
                  onValueChange={(value) => setSelectedProvider(value as CloudProvider)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="cloud-provider">
                    <SelectValue placeholder="Select Cloud Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aws">AWS (S3)</SelectItem>
                    <SelectItem value="gcp">GCP (GCS)</SelectItem>
                    <SelectItem value="azure">Azure (Blob Storage)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select the cloud provider for storing Terraform state.
                </p>
              </div>

              {/* State Location Input */}
              <div className="space-y-2">
                <Label htmlFor="terraform-state-location">{terraformLabel}</Label>
                <Input 
                  id="terraform-state-location" 
                  value={selectedProvider === 'aws' ? s3Bucket : selectedProvider === 'gcp' ? gcsBucket : azureContainer}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (selectedProvider === 'aws') {
                      setS3Bucket(value);
                    } else if (selectedProvider === 'gcp') {
                      setGcsBucket(value);
                    } else if (selectedProvider === 'azure') {
                      setAzureContainer(value);
                    }
                  }}
                  placeholder={terraformPlaceholder}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Specify the location where Terraform remote state will be stored.
                </p>
                <Button 
                  onClick={saveTerraformSettings}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Web Honeypot Terraform Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Web Honeypot Configuration</CardTitle>
            <CardDescription>
              Configure settings for the Web Honeypot Terraform remote state storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Cloud Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="web-honeypot-cloud-provider">Cloud Provider</Label>
                <Select 
                  value={webHoneypotSelectedProvider} 
                  onValueChange={(value) => setWebHoneypotSelectedProvider(value as CloudProvider)}
                  disabled={isWebHoneypotLoading}
                >
                  <SelectTrigger id="web-honeypot-cloud-provider">
                    <SelectValue placeholder="Select Cloud Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aws">AWS (S3)</SelectItem>
                    <SelectItem value="gcp">GCP (GCS)</SelectItem>
                    <SelectItem value="azure">Azure (Blob Storage)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select the cloud provider for storing the Web Honeypot Terraform state.
                </p>
              </div>

              {/* State Location Input */}
              <div className="space-y-2">
                <Label htmlFor="web-honeypot-terraform-state-location">{webHoneypotTerraformLabel}</Label>
                <Input 
                  id="web-honeypot-terraform-state-location" 
                  value={webHoneypotSelectedProvider === 'aws' ? webHoneypotS3Bucket : webHoneypotSelectedProvider === 'gcp' ? webHoneypotGcsBucket : webHoneypotAzureContainer}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (webHoneypotSelectedProvider === 'aws') {
                      setWebHoneypotS3Bucket(value);
                    } else if (webHoneypotSelectedProvider === 'gcp') {
                      setWebHoneypotGcsBucket(value);
                    } else if (webHoneypotSelectedProvider === 'azure') {
                      setWebHoneypotAzureContainer(value);
                    }
                  }}
                  placeholder={webHoneypotTerraformPlaceholder}
                  disabled={isWebHoneypotLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Specify the location where the Web Honeypot Terraform remote state will be stored.
                </p>
                <Button 
                  onClick={saveWebHoneypotTerraformSettings}
                  disabled={isWebHoneypotLoading}
                >
                  {isWebHoneypotLoading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
