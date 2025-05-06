from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime, timezone
import base64
import io

import urllib.parse

def generate_pdf(filename="output.pdf", title="Sample PDF", content="This is a sample PDF generated with Python.", api_key="", server_url="", description=""):
    """
    Generate a PDF with a full-page tracking image and overlayed URL annotation.
    """
    width, height = letter
    c = canvas.Canvas(filename, pagesize=letter)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    base_tracking_url = f"{server_url}/api/logs/ingest?api_key={api_key}&source=pdf_file&event_type=link_clicked&timestamp={timestamp}&type=pdf_decoy"
    
    # Add description as a query parameter if provided
    if description:
        encoded_description = urllib.parse.quote(description)
        tracking_url = f"{base_tracking_url}&description={encoded_description}"
    else:
        tracking_url = base_tracking_url

    # Transparent 1x1 GIF decoded and stretched
    transparent_gif = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
    
    try:
        from reportlab.lib.utils import ImageReader
        gif_stream = io.BytesIO(transparent_gif)
        img = ImageReader(gif_stream)
        
        # Draw the image across the full page
        c.drawImage(img, 0, 0, width=width, height=height, mask='auto')

        # Overlay the full-page tracking link
        c.linkURL(tracking_url, (0, 0, width, height), relative=0)
    except Exception as e:
        print(f"Couldn't create tracking image: {e}")

    # Optional: visible content
    c.setFont("Helvetica-Bold", 20)
    c.drawString(100, height - 100, title)

    # Keep the default content or use provided content, but description is now in the URL
    c.setFont("Helvetica", 12)
    y_position = height - 150
    default_content = "This document contains tracking capabilities."
    display_content = content if content else default_content
    for line in display_content.split('\n'):
        c.drawString(100, y_position, line)
        y_position -= 20

    c.setFont("Helvetica-Oblique", 10)
    c.drawString(100, 50, "Generated with Python using ReportLab")

    c.save()
    print(f"✅ PDF generated successfully: {filename}")
    print(f"📡 Tracking URL embedded: {tracking_url}")


# Example usage
if __name__ == "__main__":
    sample_content = """This is a honeypot PDF document.
    
It covers the full page with a transparent tracking image.
Opening or interacting with this document may trigger a callback to the tracker.

Use this carefully in controlled environments."""
    
    
    generate_pdf(
        filename="honeypot_fullpage.pdf",
        title="Full-Page Honeypot PDF",
        content=sample_content,
        api_key=API_KEY
    )
