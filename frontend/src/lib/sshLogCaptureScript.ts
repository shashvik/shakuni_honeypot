/**
 * Generates a shell script that continuously monitors auth.log for SSH activities and sends them to a remote server.
 * @param apiKey - The API key for authentication
 * @param serverUrl - The server URL to send logs to
 * @param description - Optional description for the logs
 * @returns A shell script as a string
 */
export const generateSSHLogCaptureScript = (apiKey: string, serverUrl: string, description: string = ''): string => {
  // Escape any double quotes and backticks for safe shell embedding
  const escapedApiKey = apiKey.replace(/"/g, '\\"').replace(/`/g, '\\`');
  const escapedServerUrl = serverUrl.replace(/"/g, '\\"').replace(/`/g, '');
  const escapedDescription = description.replace(/"/g, '\\"').replace(/`/g, '\\`');

  return `#!/bin/bash

# === SSH Honeypot Monitor ===
# Continuously monitors auth.log for SSH activities and sends them to a remote server
#
# Usage (Debian/Ubuntu):
#   1. Download this script to your Linux server
#   2. Make it executable: chmod +x ssh_honeypot_monitor.sh
#   3. Run it in the background for continuous monitoring:
#        nohup ./ssh_honeypot_monitor.sh > /var/log/ssh_monitor.log 2>&1 &
#   4. To stop monitoring, kill the process or reboot the server.
#
# Note: This script is designed for real-time, continuous monitoring. Do NOT schedule it with cron. For periodic log capture, use a different script variant.
#
# This will run the monitor in the background and log output to /var/log/ssh_monitor.log

# === Configuration ===
API_KEY="${escapedApiKey}"
SERVER_URL="${escapedServerUrl}"
DESCRIPTION="${escapedDescription}"
LOG_FILE="/var/log/auth.log"  # Explicitly set to auth.log
TEMP_FILE="/tmp/ssh_honeypot_last_position"
HOSTNAME=$(hostname)

# === Functions ===

# Determine if this is the first run or if we have a stored position
initialize_position() {
    if [ ! -f "$TEMP_FILE" ]; then
        # First run, set position to current end of file
        wc -l "$LOG_FILE" | awk '{print $1}' > "$TEMP_FILE"
        echo "Initialized monitoring from line $(cat \"$TEMP_FILE\")"
    else
        echo "Resuming monitoring from line $(cat \"$TEMP_FILE\")"
    fi
}

# Process and send a log entry
process_log_entry() {
    local log_entry="$1"
    
    # Only process sshd entries
    if echo "$log_entry" | grep -q "sshd"; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Processing: $log_entry"
        
        # Determine event type
        local status="info"
        if echo "$log_entry" | grep -qi "invalid user\|authentication failure\|failed"; then
            status="warning"
        elif echo "$log_entry" | grep -qi "accepted"; then
            status="success"
        fi
        
        # Format for JSON using printf for robust escaping
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        local payload=$(printf '%s' "$log_entry" | sed 's/"/\\"/g')
        local json_payload=$(printf '{"timestamp": "%s", "hostname": "%s", "description": "%s", "log_entry": "%s"}' "$timestamp" "$HOSTNAME" "$DESCRIPTION" "$payload")
        local data=$(printf '{"source": "ssh_logs", "event_type": "%s", "raw_message": %s}' "$status" "$json_payload")
        
        # Send to server and capture response
        response=$(curl -s -X POST "$SERVER_URL/api/logs/ingest" \
             -H "Content-Type: application/json" \
             -H "X-API-Key: $API_KEY" \
             -d "$data")
        
        if [ $? -eq 0 ]; then
            echo "✓ Sent to server"
            echo "Server response: $response"
        else
            echo "✗ Failed to send to server"
        fi
    fi
}

# Main monitoring function
monitor_logs() {
    local last_line=$(cat "$TEMP_FILE")
    local current_line=0
    
    echo "=== Starting SSH Honeypot Monitoring ==="
    echo "Monitoring $LOG_FILE for SSH activities..."
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    # First, process any logs that were added since the last run
    if [ "$last_line" -gt 0 ]; then
        echo "Processing logs since last run..."
        tail -n +$((last_line + 1)) "$LOG_FILE" | while read -r line; do
            process_log_entry "$line"
        done
    fi
    
    # Update position
    wc -l "$LOG_FILE" | awk '{print $1}' > "$TEMP_FILE"
    
    # Now continuously monitor for new entries
    echo ""
    echo "=== Now monitoring for new SSH activities in real-time ==="
    tail -f "$LOG_FILE" | while read -r line; do
        process_log_entry "$line"
        # Update position after each line
        wc -l "$LOG_FILE" | awk '{print $1}' > "$TEMP_FILE"
    done
}

# === Main Script Execution ===
initialize_position
monitor_logs

echo ""
echo "Monitoring stopped."
exit 0
`;
}