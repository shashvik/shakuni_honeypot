import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, FileText, Code, Webhook, FileIcon, Mail, Key, Terminal } from 'lucide-react'; // Updated imports
import { useToast } from '@/components/ui/use-toast';
import { generateGrafanaDecoyHtml } from '@/lib/grafanaDecoyTemplate'; // Import the new function
import { generateSSHLogCaptureScript } from '@/lib/sshLogCaptureScript'; // Import SSH log capture script generator

// Define the types for the services
type Service = 'google_sheets' | 'generic' | 'pdf_decoy' | 'html_decoy' | 'password_decoy' | 'email_decoy' | 'ssh_log_capture' | 'access_point_decoy' | 'switch_decoy' | 'active_directory_decoy' | 'scada_decoy' | 'kubernetes_decoy'; // Added SSH log capture

interface ServiceInfo {
  id: Service;
  name: string;
  icon: React.ReactNode; // Placeholder for icon component or SVG
  curlTemplate?: (apiKey: string) => string; // Made optional as not all services need it
  getUrlTemplate?: (apiKey: string, serverUrl: string, description?: string) => string; // For generic webhook URL
  getHtmlDecoyContent?: (apiKey: string, serverUrl: string, description?: string) => string; // For HTML decoy
  getPasswordDecoyContent?: (apiKey: string, serverUrl: string, description?: string) => string; // For Password decoy
  getEmailDecoyContent?: (apiKey: string, serverUrl: string, description?: string) => string; // For Email decoy
  getSSHLogCaptureScript?: (apiKey: string, serverUrl: string, description?: string) => string; // For SSH log capture
  getKubernetesYamlContent?: (apiKey: string, serverUrl: string, description?: string) => string; // For Kubernetes decoy
  generatePdf?: (apiKey: string, serverUrl: string, description?: string) => Promise<Blob> | Blob; // Function to generate PDF with tracking (supports both sync and async)
  pdfDescription?: string; // Description of the PDF tracking functionality
}

// Custom SVG icons for each service
const WebhookIcon = () => (
    <img src="/hook.svg" alt="Kubernetes" className="w-16 h-16" />
);

const PdfIcon = () => (
    <img src="/pdf.svg" alt="Kubernetes" className="w-16 h-16" />
);

const HtmlIcon = () => (
    <img src="/website.svg" alt="Kubernetes" className="w-16 h-16" />
);

const PasswordIcon = () => (
    <img src="/password.svg" alt="Kubernetes" className="w-16 h-16" />
);

const EmailIcon = () => (
    <img src="/email.svg" alt="Kubernetes" className="w-16 h-16" />
);

// New decoy icons with improved SVG quality
const AccessPointIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
    <circle cx="12" cy="8" r="3" />
    <path d="M6 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <path d="M3 18c0-5 4-9 9-9s9 4 9 9" />
    <rect x="2" y="19" width="20" height="1.5" rx="0.75" fill="currentColor" />
    <text x="12" y="22" fontSize="2.5" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="bold">COMING SOON</text>
  </svg>
);

const SwitchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
    <rect x="2" y="6" width="20" height="10" rx="2" />
    <rect x="4" y="8" width="16" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
    <circle cx="6" y="11" r="0.75" fill="currentColor" />
    <circle cx="10" y="11" r="0.75" fill="currentColor" />
    <circle cx="14" y="11" r="0.75" fill="currentColor" />
    <circle cx="18" y="11" r="0.75" fill="currentColor" />
    <rect x="2" y="19" width="20" height="1.5" rx="0.75" fill="currentColor" />
    <text x="12" y="22" fontSize="2.5" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="bold">COMING SOON</text>
  </svg>
);

const ActiveDirectoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
    <rect x="2" y="3" width="20" height="7" rx="1.5" />
    <rect x="2" y="12" width="20" height="7" rx="1.5" />
    <circle cx="6" cy="6.5" r="1" fill="currentColor" />
    <circle cx="10" cy="6.5" r="1" fill="currentColor" />
    <circle cx="6" cy="15.5" r="1" fill="currentColor" />
    <circle cx="10" cy="15.5" r="1" fill="currentColor" />
    <line x1="14" y1="6.5" x2="18" y2="6.5" strokeWidth="1.5" />
    <line x1="14" y1="15.5" x2="18" y2="15.5" strokeWidth="1.5" />
    <rect x="2" y="19" width="20" height="1.5" rx="0.75" fill="currentColor" />
    <text x="12" y="22" fontSize="2.5" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="bold">COMING SOON</text>
  </svg>
);

const ScadaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
    <rect x="2" y="3" width="20" height="10" rx="1.5" />
    <circle cx="7" cy="8" r="1.5" />
    <circle cx="17" cy="8" r="1.5" />
    <path d="M7 13v3" />
    <path d="M17 13v3" />
    <path d="M5 16h14" />
    <path d="M8 16l4 3 4-3" />
    <rect x="2" y="19" width="20" height="1.5" rx="0.75" fill="currentColor" />
    <text x="12" y="22" fontSize="2.5" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="bold">COMING SOON</text>
  </svg>
);

const KubernetesIcon = () => (
  <img src="/kubernetes.svg" alt="Kubernetes" className="w-16 h-16" />
);

const SSHLogIcon = () => (
  
  <img src="/ssh.svg" alt="Kubernetes" className="w-16 h-16" />
);

const CustomDeceptions: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [pdfDescription, setPdfDescription] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:5000');
  // State for generic/HTML decoy server URL and description (reused)
  const [decoyServerUrl, setDecoyServerUrl] = useState(apiBaseUrl);
  const [decoyDescription, setDecoyDescription] = useState('');
  // Removed Slack state variables
  // const [slackServerUrl, setSlackServerUrl] = useState('YOUR_SLACK_WEBHOOK_URL_HERE');
  // const [slackDescription, setSlackDescription] = useState('');
  const { toast } = useToast();

  // Base URL for the backend API - should be configured based on environment
  // const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const services: ServiceInfo[] = [
    // Removed Slack service entry

    {
      id: 'generic',
      name: 'Generic Webhook',
      icon: <WebhookIcon />, // Updated to custom SVG icon
      // Removed curlTemplate as it's not used for generic
      // Update getUrlTemplate to use serverUrl and description
      getUrlTemplate: (key, serverUrl, description = '') => {
        let url = `${serverUrl}/api/logs/ingest?api_key=${key}&source=honeypot_link&event_type=link_clicked&timestamp=${new Date().toISOString()}&type=honeypot_deception`;
        if (description) {
          url += `&description=${encodeURIComponent(description)}`;
        }
        return url;
      },
    },
    {
      id: 'ssh_log_capture',
      name: 'SSH Log Capture',
      icon: <SSHLogIcon />,
      getSSHLogCaptureScript: (key, serverUrl, description = '') => {
        return generateSSHLogCaptureScript(key, serverUrl, description);
      },
    },
    {
      id: 'kubernetes_decoy',
      name: 'Kubernetes Decoy',
      icon: <KubernetesIcon />,
      getKubernetesYamlContent: (key, serverUrl, description = '') => {
        let trackingUrl = `${serverUrl}/api/logs/ingest?api_key=${key}&source=kubernetes_yaml_applied&event_type=k8s_config_applied&timestamp=${new Date().toISOString()}&type=kubernetes_decoy`;
        if (description) {
          trackingUrl += `&description=${encodeURIComponent(description)}`;
        }
        
        return `# Kubernetes Decoy Configuration
# Deploy this configuration and monitor the Kubernetes API logs for any access attempts

apiVersion: v1 
kind: Namespace 
metadata: 
  name: secret-data-store 
--- 
apiVersion: v1 
kind: ServiceAccount 
metadata: 
  namespace: secret-data-store 
  name: internal-admin-sa 
  annotations: 
    description: "Service account with potentially high privileges" 
--- 
apiVersion: v1 
kind: ServiceAccount 
metadata: 
  namespace: secret-data-store 
  name: legacy-app-sa 
  annotations: 
    description: "Service account for an old application, might have vulnerabilities" 
--- 
apiVersion: v1 
kind: ConfigMap 
metadata: 
  namespace: secret-data-store 
  name: internal-configs 
data: 
  DATABASE_HOST: "internal-db.local" 
  API_ENDPOINT: "internal-api.corp" 
  # Add other seemingly internal configurations here 
--- 
apiVersion: v1 
kind: Secret 
metadata: 
  namespace: secret-data-store 
  name: credentials 
type: Opaque 
data: 
  ADMIN_USER: $(echo -n "admin" | base64) 
  ROOT_PASSWORD: $(echo -n "secure-root-password" | base64) 
  API_KEY: $(echo -n "super-secret-api-key" | base64) 
  # Add other enticing "credentials" here 
--- 
apiVersion: apps/v1 
kind: Deployment 
metadata: 
  namespace: secret-data-store 
  name: privileged-access-server 
spec: 
  replicas: 1 
  selector: 
    matchLabels: 
      app: privileged-access 
  template: 
    metadata: 
      labels: 
        app: privileged-access 
    spec: 
      serviceAccountName: internal-admin-sa # Assign the "high-privilege" SA 
      containers: 
      - name: privileged-access 
        image: "cowrie/cowrie:latest" # Still using cowrie as an example 
        ports: 
        - containerPort: 2222 
          name: ssh 
        - containerPort: 2323 
          name: telnet 
        envFrom: 
        - configMapRef: 
            name: internal-configs 
        - secretRef: 
            name: credentials 
--- 
apiVersion: v1 
kind: Service 
metadata: 
  namespace: secret-data-store 
  name: privileged-access 
spec: 
  selector: 
    app: privileged-access 
  ports: 
  - protocol: TCP 
    port: 22 
    targetPort: 2222 
    name: ssh 
  - protocol: TCP 
    port: 23 
    targetPort: 2323 
    name: telnet 
  type: ClusterIP # Limiting external exposure

# Important: After deploying this configuration, make sure to configure your Kubernetes API logs
# to monitor for any API calls to these resources, as they may indicate potential attackers
# attempting to access sensitive information.

<!-- Hidden tracking element -->
<!-- ${trackingUrl} -->`;
      },
    },
    {
      id: 'pdf_decoy',
      name: 'Tracking PDF',
      icon: <PdfIcon />, // Updated to custom SVG icon
      // curlTemplate is not needed for PDF
      pdfDescription: 'Create a PDF document that will send tracking information when opened. This PDF contains embedded JavaScript that makes a web request to your server, revealing information about who opened it, including their IP address, device details, and more.',
      // Use the server-side PDF generator to create a tracking PDF
      generatePdf: (key, serverUrl, description = '') => {
        // Generate a timestamp for the PDF filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `tracking-document-${timestamp}.pdf`;
        
        // Create a download URL that points to our backend PDF generator
        // Construct the URL to the backend PDF generator endpoint using apiBaseUrl
        let backendPdfUrl = `${apiBaseUrl}/api/logs/generate-pdf?api_key=${key}&filename=${encodeURIComponent(filename)}&server_url=${encodeURIComponent(serverUrl)}`;
        
        // Add description if provided
        if (description) {
          backendPdfUrl += `&description=${encodeURIComponent(description)}`;
        }
        
        // Fetch the PDF from the actual backend server
        return fetch(backendPdfUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to generate PDF');
            }
            return response.blob();
          })
          .catch(error => {
            console.error('Error generating PDF:', error);
            // Fallback to a simple PDF if the server request fails
            const fallbackContent = `TRACKING PDF DOCUMENT

${description || 'This is a fallback PDF because the server-side generation failed.'}

In normal operation, this would be a PDF with embedded tracking that would:

1. Make a web request to: ${serverUrl}/api/logs/ingest
2. Include parameters: api_key=${key}, source=pdf_opened, event_type=document_opened
3. Send timestamp and user agent information

Please check that the backend server is running and the PDF generator is properly configured.`;
            
            return new Blob([fallbackContent], { type: 'application/pdf' });
          });
      },
    },
    {
      id: 'html_decoy',
      name: 'HTML Decoy Button',
      icon: <HtmlIcon />, // Updated to custom SVG icon
      getHtmlDecoyContent: (key, serverUrl, description = '') => {
        // Generate the tracking URL first
        let trackingUrl = `${serverUrl}/api/logs/ingest?api_key=${key}&source=html_login_attempt&event_type=login_button_clicked&timestamp=${new Date().toISOString()}&type=html_decoy`;
        if (description) {
          trackingUrl += `&description=${encodeURIComponent(description)}`;
        }
        // Escape the URL for use in JavaScript string
        const escapedUrl = trackingUrl.replace(/'/g, "\\'"); // Ensure proper escaping for JS

        // Use the imported function to generate the HTML
        return generateGrafanaDecoyHtml(escapedUrl);
      },
    },
    {
      id: 'password_decoy',
      name: 'Decoy Password File',
      icon: <PasswordIcon />, // Updated to custom SVG icon
      getPasswordDecoyContent: (key, serverUrl, description = '') => {
        let trackingUrl = `${serverUrl}/api/logs/ingest?api_key=${key}&source=password_file_opened&event_type=file_opened&timestamp=${new Date().toISOString()}&type=password_decoy`;
        if (description) {
          trackingUrl += `&description=${encodeURIComponent(description)}`;
        }
        // Basic HTML with a hidden image tracker
        return `If you're reading this, something went wrong.

<!-- Hidden image tracker -->
<img src="${trackingUrl}" width="1" height="1" />`;
      },
    },
    {
      id: 'email_decoy',
      name: 'Email Deception',
      icon: <EmailIcon />, // Updated to custom SVG icon
      getEmailDecoyContent: (key, serverUrl, description = '') => {
        let trackingUrl = `${serverUrl}/api/logs/ingest?api_key=${key}&source=email_opened&event_type=email_viewed&timestamp=${new Date().toISOString()}&type=email_deception`;
        if (description) {
          trackingUrl += `&description=${encodeURIComponent(description)}`;
        }
        // Email template with enticing content that attackers might search for
        return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Internal Company Information</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .header { background-color: #0056b3; color: white; padding: 10px; }
      .content { padding: 20px; }
      .footer { font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
      .confidential { color: red; font-weight: bold; }
      .link { color: #0056b3; text-decoration: underline; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>INTERNAL USE ONLY</h2>
    </div>
    <div class="content">
      <p>Hello Team,</p>
      
      <p>As requested, I'm sharing the updated access credentials for our development environments:</p>
      
      <ul>
        <li><strong>Admin Portal:</strong> admin / Passw0rd2023!</li>
        <li><strong>Database Access:</strong> dbadmin / DB@ccess2023</li>
        <li><strong>AWS Console:</strong> aws_admin / Cloud#Access!2023</li>
        <li><strong>VPN Access:</strong> vpn_user / SecureVPN@2023</li>
      </ul>
      
      <p>Please also find attached the <a href="${trackingUrl}" class="link">API keys for our production services</a> in the secure document.</p>
      
      <p>Remember that our quarterly security audit is scheduled for next week. Please ensure all systems are properly configured according to our security policy.</p>
      
      <p class="confidential">CONFIDENTIAL: This email contains sensitive information. Do not forward or share.</p>
      
      <p>Let me know if you need anything else.</p>
      
      <p>Regards,<br>IT Security Team</p>
    </div>
    <div class="footer">
      <p>This message is intended only for authorized personnel. If you received this in error, please delete immediately.</p>
    </div>
    
    <!-- Hidden tracking pixel -->
    <img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />
  </body>
</html>`;
      },
    },
  ];

  const handleIconClick = (service: ServiceInfo) => {
    setSelectedService(service);
    setApiKey('');
    setPdfDescription('');
    setDecoyServerUrl(apiBaseUrl);
    setDecoyDescription('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  const handleCopyCurl = () => {
    // Simplified: Only handle services that have curlTemplate
    if (selectedService && selectedService.curlTemplate) {
      const command = selectedService.curlTemplate(apiKey);
      navigator.clipboard.writeText(command);
      toast({
        title: 'Copied!',
        description: 'Curl command copied to clipboard.',
      });
    } else {
      toast({
        title: 'Not Applicable',
        description: 'Curl command is not available for this service.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyGetUrl = () => {
    if (selectedService && selectedService.getUrlTemplate) {
      // Pass the current state values for server URL and description
      const url = selectedService.getUrlTemplate(apiKey, decoyServerUrl, decoyDescription);
      navigator.clipboard.writeText(url);
      toast({
        title: 'Copied!',
        description: 'GET URL copied to clipboard.',
      });
    }
  };

  // Add a new function to handle copying HTML content
  const handleCopyHtml = () => {
    let htmlContent: string | undefined;

    if (selectedService?.id === 'html_decoy' && selectedService.getHtmlDecoyContent) {
      htmlContent = selectedService.getHtmlDecoyContent(apiKey, decoyServerUrl, decoyDescription);
    } else if (selectedService?.id === 'password_decoy' && selectedService.getPasswordDecoyContent) {
      htmlContent = selectedService.getPasswordDecoyContent(apiKey, decoyServerUrl, decoyDescription);
    } else if (selectedService?.id === 'email_decoy' && selectedService.getEmailDecoyContent) {
      htmlContent = selectedService.getEmailDecoyContent(apiKey, decoyServerUrl, decoyDescription);
    } else if (selectedService?.id === 'ssh_log_capture' && selectedService.getSSHLogCaptureScript) {
      htmlContent = selectedService.getSSHLogCaptureScript(apiKey, decoyServerUrl, decoyDescription);
    } else if (selectedService?.id === 'kubernetes_decoy' && selectedService.getKubernetesYamlContent) {
      htmlContent = selectedService.getKubernetesYamlContent(apiKey, decoyServerUrl, decoyDescription);
    }

    if (htmlContent) {
      try {
        navigator.clipboard.writeText(htmlContent);
        toast({
          title: 'Copied!',
          description: 'Content copied to clipboard.',
          variant: 'default',
        });
      } catch (error) {
        console.error('Error copying content:', error);
        toast({
          title: 'Error',
          description: 'Failed to copy content. Please try again.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Error',
        description: 'Could not generate content for the selected service.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadHtml = () => {
    let htmlContent: string | undefined;
    let filename: string;

    if (selectedService?.id === 'html_decoy' && selectedService.getHtmlDecoyContent) {
      htmlContent = selectedService.getHtmlDecoyContent(apiKey, decoyServerUrl, decoyDescription);
      filename = decoyDescription ? `${decoyDescription.replace(/\s+/g, '_').toLowerCase()}_decoy.html` : `grafana_decoy_${new Date().toISOString().slice(0, 10)}.html`;
    } else if (selectedService?.id === 'password_decoy' && selectedService.getPasswordDecoyContent) {
      htmlContent = selectedService.getPasswordDecoyContent(apiKey, decoyServerUrl, decoyDescription);
      filename = 'passkeys.html'; // Specific filename for password decoy
    } else if (selectedService?.id === 'email_decoy' && selectedService.getEmailDecoyContent) {
      htmlContent = selectedService.getEmailDecoyContent(apiKey, decoyServerUrl, decoyDescription);
      filename = decoyDescription ? `${decoyDescription.replace(/\s+/g, '_').toLowerCase()}_email.html` : `internal_email_${new Date().toISOString().slice(0, 10)}.html`;
    } else if (selectedService?.id === 'ssh_log_capture' && selectedService.getSSHLogCaptureScript) {
      htmlContent = selectedService.getSSHLogCaptureScript(apiKey, decoyServerUrl, decoyDescription);
      filename = decoyDescription ? `${decoyDescription.replace(/\s+/g, '_').toLowerCase()}_ssh_log_capture.sh` : `ssh_log_capture_${new Date().toISOString().slice(0, 10)}.sh`;
    } else if (selectedService?.id === 'kubernetes_decoy' && selectedService.getKubernetesYamlContent) {
      htmlContent = selectedService.getKubernetesYamlContent(apiKey, decoyServerUrl, decoyDescription);
      filename = decoyDescription ? `${decoyDescription.replace(/\s+/g, '_').toLowerCase()}_kubernetes_decoy.yaml` : `kubernetes_decoy_${new Date().toISOString().slice(0, 10)}.yaml`;
    }

    if (htmlContent) {
      try {
        toast({
          title: 'Generating HTML...', 
          description: 'Please wait while we create your decoy file.',
        });
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
        toast({
          title: 'HTML Generated!',
          description: `Decoy file '${filename}' has been downloaded.`, // Updated description
          variant: 'default',
        });
      } catch (error) {
        console.error('Error generating HTML:', error);
        toast({
          title: 'Error',
          description: 'Failed to generate HTML file. Please check your inputs.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Error',
        description: 'Could not generate HTML for the selected service.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPdf = async () => {
    if (selectedService && selectedService.generatePdf) {
      try {
        toast({
          title: 'Generating PDF...',
          description: 'Please wait while we create your tracking document.',
        });
        const serverUrl = apiBaseUrl;
        const pdfBlob = await selectedService.generatePdf(apiKey, serverUrl, pdfDescription);
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tracking-document-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
        toast({
          title: 'PDF Generated!',
          description: 'Tracking PDF has been downloaded. When opened, it will send tracking information back to your server.',
          variant: 'default',
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: 'Error',
          description: 'Failed to generate PDF. Please check your API key and try again.',
          variant: 'destructive',
        });
      } 
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Custom Deception Integrations</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configure Alert Webhooks & Decoys</CardTitle>
          <CardDescription>
            Set up integrations or generate decoys to capture interaction data.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {services.map((service) => (
            <Card
              key={service.id}
              className="flex flex-col items-center justify-center p-6 hover:shadow-lg transition-shadow cursor-pointer text-center"
              onClick={() => handleIconClick(service)}
            >
              <div className="mb-4">{service.icon}</div>
              <p className="font-medium">{service.name}</p>
            </Card>
          ))}
          
          {/* Coming Soon Decoy Services */}
          <Card 
            className="flex flex-col items-center justify-center p-6 hover:shadow-lg transition-shadow cursor-pointer text-center opacity-70"
            onClick={() => toast({
              title: "Coming Soon",
              description: "Decoy Access Point feature will be available in a future update.",
              variant: "default"
            })}
          >
            <div className="mb-4"><AccessPointIcon /></div>
            <p className="font-medium">Decoy Access Point</p>
          </Card>
          
          <Card 
            className="flex flex-col items-center justify-center p-6 hover:shadow-lg transition-shadow cursor-pointer text-center opacity-70"
            onClick={() => toast({
              title: "Coming Soon",
              description: "Decoy Switch feature will be available in a future update.",
              variant: "default"
            })}
          >
            <div className="mb-4"><SwitchIcon /></div>
            <p className="font-medium">Decoy Switch</p>
          </Card>
          
          <Card 
            className="flex flex-col items-center justify-center p-6 hover:shadow-lg transition-shadow cursor-pointer text-center opacity-70"
            onClick={() => toast({
              title: "Coming Soon",
              description: "Decoy Active Directory feature will be available in a future update.",
              variant: "default"
            })}
          >
            <div className="mb-4"><ActiveDirectoryIcon /></div>
            <p className="font-medium">Decoy Active Directory</p>
          </Card>
          
          <Card 
            className="flex flex-col items-center justify-center p-6 hover:shadow-lg transition-shadow cursor-pointer text-center opacity-70"
            onClick={() => toast({
              title: "Coming Soon",
              description: "Decoy SCADA feature will be available in a future update.",
              variant: "default"
            })}
          >
            <div className="mb-4"><ScadaIcon /></div>
            <p className="font-medium">Decoy SCADA</p>
          </Card>
        </CardContent>
      </Card>

      {selectedService && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure {selectedService.name} Integration</DialogTitle>
              <DialogDescription>
                {selectedService.id === 'generic' ? 
                  'Enter your API key/token to generate a honeypot GET URL.' : 
                  selectedService.id === 'pdf_decoy' ?
                  'Enter your API key/token and configure the tracking PDF.' :
                  selectedService.id === 'html_decoy' ?
                  'Enter your API key/token to generate an HTML decoy page (mimics Grafana login).' :
                  selectedService.id === 'password_decoy' ? 
                  'Enter your API key/token to generate a decoy password HTML file.' :
                  selectedService.id === 'email_decoy' ? 
                  'Enter your API key/token to generate a decoy email with embedded tracking.' :
                  'Enter your API key/token and copy the curl command to send test alerts.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* ... (API Key input remains the same) */}
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key/Token</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full"
                  placeholder={`Enter your ${selectedService.name} API Key or Token`}
                />
                {apiKey && (
                  <div className="mt-1">
                    <a 
                      href="#"
                      className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        // Create and trigger the tracking URL based on the service type
                        let trackingUrl = '';
                        if (selectedService) {
                          if (selectedService.id === 'generic' && selectedService.getUrlTemplate) {
                            trackingUrl = selectedService.getUrlTemplate(apiKey, decoyServerUrl, decoyDescription);
                          } else if (selectedService.id === 'html_decoy') {
                            trackingUrl = `${decoyServerUrl}/api/logs/ingest?api_key=${apiKey}&source=html_login_attempt&event_type=test_alert&timestamp=${new Date().toISOString()}&type=html_decoy`;
                          } else if (selectedService.id === 'password_decoy') {
                            trackingUrl = `${decoyServerUrl}/api/logs/ingest?api_key=${apiKey}&source=password_file_opened&event_type=test_alert&timestamp=${new Date().toISOString()}&type=password_decoy`;
                          } else if (selectedService.id === 'email_decoy') {
                            trackingUrl = `${decoyServerUrl}/api/logs/ingest?api_key=${apiKey}&source=email_opened&event_type=test_alert&timestamp=${new Date().toISOString()}&type=email_deception`;
                          }
                          
                          if (trackingUrl) {
                            // Create a hidden iframe to trigger the request without navigating away
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.src = trackingUrl;
                            document.body.appendChild(iframe);
                            
                            // Remove the iframe after the request is sent
                            setTimeout(() => {
                              document.body.removeChild(iframe);
                              toast({
                                title: 'Test Alert Sent!',
                                description: 'A test alert has been triggered with your API key.',
                                variant: 'default',
                              });
                            }, 1000);
                          }
                        }
                      }}
                    >
                      Test API Key (Click to trigger alert)
                    </a>
                  </div>
                )}
              </div>
              
              {/* ... (Curl command section remains the same) */}
              {selectedService.id !== 'generic' && selectedService.id !== 'pdf_decoy' && selectedService.id !== 'html_decoy' && selectedService.id !== 'password_decoy' && selectedService.curlTemplate && (
                <div className="space-y-2">
                  <Label>Curl Command</Label>
                  <div className="bg-muted p-3 rounded-md text-sm relative font-mono overflow-x-auto max-w-full">
                    <pre className="whitespace-pre-wrap break-all"><code>
                      {selectedService.curlTemplate(apiKey)}
                    </code></pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={handleCopyCurl}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Server URL/Description inputs (used by Generic, HTML, Password Decoy, Email Decoy, and SSH Log Capture) */}
              {(selectedService.id === 'generic' || selectedService.id === 'html_decoy' || 
                selectedService.id === 'password_decoy' || selectedService.id === 'email_decoy' ||
                selectedService.id === 'ssh_log_capture' || selectedService.id === 'kubernetes_decoy') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <Label htmlFor="decoy-server-url">Server URL</Label>
                    <Input
                      id="decoy-server-url"
                      placeholder="http://localhost:5000"
                      value={decoyServerUrl}
                      onChange={(e) => setDecoyServerUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="decoy-description">Description (Optional)</Label>
                    <Input
                      id="decoy-description"
                      placeholder="e.g., Fake Credentials File"
                      value={decoyDescription}
                      onChange={(e) => setDecoyDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ... (GET URL section for Generic Webhook remains the same) */}
              {selectedService.id === 'generic' && selectedService.getUrlTemplate && (
                <div className="space-y-2">
                  <Label>Honeypot GET URL</Label>
                  <div className="bg-muted p-3 rounded-md text-sm relative font-mono overflow-x-auto max-w-full">
                    <pre className="whitespace-pre-wrap break-all"><code>{selectedService.getUrlTemplate(apiKey, decoyServerUrl, decoyDescription)}</code></pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={handleCopyGetUrl}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This URL can be used as a honeypot link. When clicked, it will capture comprehensive visitor information including:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc pl-5 mt-1">
                    <li>IP address and connection details</li>
                    <li>Browser, platform, and version information</li>
                    <li>HTTP headers and request metadata</li>
                    <li>Referrer information (where they came from)</li>
                    <li>Cookies and other client-side data</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-1">
                    All this data is stored securely in your generic_alerts collection for security analysis.  
                  </p>
                </div>
              )}

              {/* HTML Decoy Page section */} 
              {selectedService.id === 'html_decoy' && selectedService.getHtmlDecoyContent && (
                <div className="space-y-2">
                  <Label>HTML Decoy Page Preview</Label> {/* Updated Label */}
                  <div className="bg-muted p-3 rounded-md text-sm relative font-mono overflow-x-auto max-w-full max-h-60">
                    <pre className="whitespace-pre-wrap break-all"><code>{selectedService.getHtmlDecoyContent(apiKey, decoyServerUrl, decoyDescription)}</code></pre>
                    {/* Replaced Copy button with Download button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 z-10"
                      onClick={handleDownloadHtml}
                      title="Download HTML File"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Download this HTML file which creates a fake Grafana login page. When the 'Log in' button is clicked, it sends tracking data to your server before showing a 'Login failed' message.
                  </p>
                </div>
              )}

              {/* Password Decoy File section */}
              {selectedService.id === 'password_decoy' && (
                <div className="space-y-2">
                  <Label>Decoy Password File</Label>
                  <div className="bg-muted p-3 rounded-md text-sm relative">
                    <p className="text-xs text-muted-foreground mb-3">
                      Download an HTML file named 'passkeys.html'. When opened in a browser, it will silently send tracking information (like IP address) to your server via a hidden image pixel.
                    </p>
                    <Button
                      onClick={handleDownloadHtml}
                      title="Download passkeys.html"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download passkeys.html
                    </Button>
                  </div>
                </div>
              )}

              {/* Email Decoy section */}
              {selectedService.id === 'email_decoy' && selectedService.getEmailDecoyContent && (
                <div className="space-y-2">
                  <Label>Email Decoy Preview</Label>
                  <div className="bg-muted p-3 rounded-md text-sm relative font-mono overflow-x-auto max-w-full max-h-60">
                    <pre className="whitespace-pre-wrap break-all"><code>{selectedService.getEmailDecoyContent(apiKey, decoyServerUrl, decoyDescription)}</code></pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 z-10"
                      onClick={handleCopyHtml}
                      title="Copy Email HTML"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy this HTML and use it in your email client or phishing simulation. When opened in a browser, it sends tracking data to your server via a hidden 1x1 pixel image.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground mt-2">
                    <p className="font-medium mb-1">How to use:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Open Chrome DevTools</li>
                      <li>Right-click the email body and select "Inspect"</li>
                      <li>In DevTools, locate the &lt;div&gt; where your placeholder text is</li>
                      <li>Double-click inside the element and replace it with your HTML snippet</li>
                    </ol>
                  </div>
                </div>
              )}
              
              {/* SSH Log Capture section */}
              {selectedService.id === 'ssh_log_capture' && selectedService.getSSHLogCaptureScript && (
                <div className="space-y-2">
                  <Label>SSH Log Capture Script</Label>
                  <div className="bg-muted p-3 rounded-md text-sm relative font-mono overflow-x-auto max-w-full max-h-60">
                    <pre className="whitespace-pre-wrap break-all"><code>{selectedService.getSSHLogCaptureScript(apiKey, decoyServerUrl, decoyDescription)}</code></pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 z-10"
                      onClick={handleCopyHtml}
                      title="Copy Script"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <Button
                      onClick={handleDownloadHtml}
                      title="Download SSH Log Capture Script"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download Script
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This script captures SSH login attempts from system logs and sends them to your tracking server. It works with common Linux distributions and is designed for real-time, continuous monitoring. Do <strong>NOT</strong> schedule it with cron. For periodic log capture, use a different script variant.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground mt-2">
                    <p className="font-medium mb-1">How to use:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Download the script to your Linux server</li>
                      <li>Make it executable: <code>chmod +x ssh_honeypot_monitor.sh</code></li>
                      <li>Run it in the background for continuous monitoring: <code>nohup ./ssh_honeypot_monitor.sh &gt; /var/log/ssh_monitor.log 2&gt;&amp;1 &amp;</code></li>
                      <li>To stop monitoring, kill the process or reboot the server</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Kubernetes Decoy section */}
              {selectedService.id === 'kubernetes_decoy' && selectedService.getKubernetesYamlContent && (
                <div className="space-y-2">
                  <Label>Kubernetes Decoy YAML</Label>
                  <div className="bg-muted p-3 rounded-md text-sm relative font-mono overflow-x-auto max-w-full max-h-60">
                    <pre className="whitespace-pre-wrap break-all"><code>{selectedService.getKubernetesYamlContent(apiKey, decoyServerUrl, decoyDescription)}</code></pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 z-10"
                      onClick={handleCopyHtml}
                      title="Copy YAML"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <Button
                      onClick={handleDownloadHtml}
                      title="Download Kubernetes YAML"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download YAML
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This YAML creates a decoy Kubernetes environment with seemingly sensitive resources. Deploy it to your cluster and monitor API logs for access attempts to detect potential attackers exploring your infrastructure.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground mt-2">
                    <p className="font-medium mb-1">How to use:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Download the YAML configuration file</li>
                      <li>Apply it to your Kubernetes cluster: <code>kubectl apply -f kubernetes_decoy.yaml</code></li>
                      <li>Configure your Kubernetes API logs to monitor for any access attempts to these resources</li>
                      <li>Any interaction with these decoy resources may indicate potential attackers exploring your cluster</li>
                    </ol>
                  </div>
                </div>
              )}
              
              {selectedService.id === 'pdf_decoy' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="server-url">Server URL (for PDF generation)</Label>
                    <Input
                      id="server-url"
                      placeholder="http://localhost:5000"
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pdf-description">PDF Description</Label>
                    <Textarea
                      id="pdf-description"
                      placeholder="Enter a custom description for your PDF"
                      value={pdfDescription}
                      onChange={(e) => setPdfDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-6 w-6 text-primary mt-1" />
                      <div>
                        <h4 className="font-medium">Tracking PDF Document</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedService.pdfDescription}
                        </p>
                        <Button
                          className="mt-3"
                          onClick={handleDownloadPdf}
                        >
                          <Download className="mr-2 h-4 w-4" /> Download Tracking PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CustomDeceptions;