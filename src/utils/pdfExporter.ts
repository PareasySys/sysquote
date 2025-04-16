
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ScheduledTaskSegment } from './types';
import { supabase } from "@/integrations/supabase/client";

// Common interface for plan cost data
export interface PlanCostData {
  planId: number;
  planName: string;
  trainingDays: number;
  totalCost: number;
}

/**
 * Generate a PDF quote document based on the checkout data
 */
export const generateQuotePDF = async (
  quoteId: string,
  userName: string | undefined,
  clientName: string | undefined,
  planCosts: PlanCostData[],
  logoUrl: string = '/placeholder.svg'
): Promise<boolean> => {
  // Try to get the logo from Supabase storage
  let logoSrc = logoUrl;
  try {
    const { data, error } = await supabase.storage
      .from('identityimages')
      .download('System_Logo.png');
    
    if (data && !error) {
      logoSrc = URL.createObjectURL(data);
    } else {
      console.warn('Could not load logo from storage:', error);
    }
  } catch (err) {
    console.error('Error loading logo from storage:', err);
  }

  // Create a temporary container to render the HTML for the PDF
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  // Get the current date in the desired format
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric', 
    year: 'numeric'
  });

  // Build the HTML content using the template
  container.innerHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Training Plan Quote - A4</title>
        <style>
            /* Basic Reset & Body Styling */
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f7f6; /* Background outside the 'page' */
            }

            /* Page Container - Adapts to @page size */
            .container {
                /* Removed max-width to fill page margins */
                margin: 0 auto; /* Centering if screen view is wider than page */
                padding: 0; /* Padding handled by @page margins or internal elements */
                background-color: #ffffff; /* White paper background */
                /* box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); */ /* Less relevant for direct print */
                /* border-radius: 5px; */ /* Less relevant for print */
                border: 1px solid #e0e0e0; /* Optional border for screen view */
            }

            .content-padding {
                 padding: 15mm; /* Add padding inside the container */
            }


            /* Header Section */
            .quote-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px; /* Reduced margin */
                padding-bottom: 20px; /* Reduced padding */
                border-bottom: 3px solid #007bff;
            }

            .logo-container img {
                max-height: 70px; /* Slightly smaller */
                width: auto;
            }

            .quote-details {
                text-align: right;
            }

            .quote-details h2 {
                margin: 0 0 10px 0;
                color: #007bff;
                font-size: 1.8em; /* Adjusted size */
                font-weight: 600;
            }

            .quote-details p {
                margin: 4px 0;
                font-size: 0.9em; /* Adjusted size */
                color: #555;
            }

            .quote-details strong {
                display: inline-block;
                min-width: 90px; /* Adjusted size */
                text-align: left;
                color: #333;
                font-weight: 600;
            }

            /* Main Content Area */
            main {
                margin-bottom: 30px;
            }

            main > h3 { /* Title above cards */
                color: #333;
                border-bottom: 1px solid #ccc;
                padding-bottom: 6px;
                margin-bottom: 20px;
                font-size: 1.3em; /* Adjusted size */
                font-weight: 600;
            }

            /* Card Container */
            .plans-container {
                display: flex;
                flex-wrap: wrap;
                gap: 20px; /* Space between cards */
                justify-content: flex-start; /* Align cards to the start */
            }

            /* --- NEW CARD STYLES --- */
            .card {
                /* width: 190px; */ /* Replaced with flex-basis */
                /* height: 264px; */ /* Removed fixed height */
                flex: 1 1 calc(50% - 10px - 42px); /* Aim for 2 cards per row: 50% - half gap - padding*2 - border*2 */
                min-width: 250px; /* Minimum width before breaking flow */
                min-height: 220px; /* Minimum height for some consistency */
                background: rgb(240, 255, 180); /* Adjusted background for potentially better print contrast */
                font-family: inherit;
                position: relative;
                border-radius: 8px;
                border: 1px solid rgb(183, 226, 25); /* Add border matching theme */
                display: flex;
                flex-direction: column; /* Stack content vertically */
                overflow: hidden; /* Hide overflow from positioned quote SVG */
                box-sizing: border-box;
                padding: 0; /* Reset padding, apply to inner elements */
                 box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Subtle shadow */
            }

            .quote {
                /* Contains the SVG Icon */
                position: absolute;
                top: 15px;
                right: 15px;
                color: rgba(127, 155, 29, 0.5); /* Lighter color for decoration */
                z-index: 0;
            }
            .quote svg {
                 height: 60px; /* Adjusted size */
                 width: 60px;
            }
            .quote svg path {
                fill: currentColor; /* Inherit color from .quote */
            }

            .card-name {
                text-transform: uppercase;
                font-weight: 700;
                color: rgb(127, 155, 29);
                padding: 20px 20px 5px 20px; /* Adjusted padding */
                line-height: 1.3; /* Adjusted line height */
                font-size: 1.1em;
                z-index: 1; /* Above quote icon */
                background-color: rgba(240, 255, 180, 0.8); /* Ensure text readability over icon */
            }

            .body-text {
                font-size: 0.95em; /* Adjusted size */
                font-weight: 500; /* Adjusted weight */
                padding: 10px 20px 15px 20px; /* Adjusted padding */
                color: #465512;
                /* position: absolute; */ /* Removed absolute positioning */
                /* top: 40px; */
                /* left: 1px; */
                line-height: 1.5; /* Adjusted line height */
                flex-grow: 1; /* Allow description to take available space */
                z-index: 1;
            }

            .author { /* Repurposed for Price */
                /* opacity: 0; */ /* Removed: Price always visible */
                /* transition: 0.5s; */ /* Removed hover transition */
                font-weight: 700;
                color: rgb(70, 85, 18); /* Darker for contrast */
                padding: 15px 20px 15px 20px; /* Adjusted padding */
                text-align: right;
                font-size: 1.2em; /* Make price prominent */
                border-top: 2px solid rgba(127, 155, 29, 0.5); /* Separator line */
                margin-top: auto; /* Push to bottom */
                background-color: rgba(223, 248, 134, 0.6); /* Slight background tint */
                z-index: 1;
            }

            /* Removed hover style for author opacity */
            /* Removed pic, author-container styles as they are not used */
            /* Removed heart SVG style */
            /* --- END NEW CARD STYLES --- */


            /* Footer */
            .quote-footer {
                margin-top: 40px; /* Adjusted margin */
                padding-top: 15px;
                border-top: 1px solid #eee;
                font-size: 0.85em; /* Adjusted size */
                color: #888;
                text-align: center;
            }

            .quote-footer p {
                margin: 4px 0;
            }

            /* Print-specific styles */
            @page {
                size: A4;
                margin: 15mm; /* Define page margins */
            }

            @media print {
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #fff; /* Ensure white background for print */
                    font-size: 10pt;
                    -webkit-print-color-adjust: exact; /* Force colors in Chrome/Safari */
                    print-color-adjust: exact; /* Standard */
                }
                .container {
                     /* Ensure container fills the printable area */
                    width: 100%;
                    margin: 0;
                    padding: 0; /* Page margins handled by @page */
                    border: none;
                    box-shadow: none;
                    border-radius: 0;
                }
                 .content-padding {
                     padding: 0; /* Use @page margins */
                 }
                .plans-container {
                    gap: 15px; /* Reduce gap slightly for print */
                }
                .card {
                    box-shadow: none; /* Remove shadow for print */
                    border: 1px solid #ccc; /* Use a standard border for print clarity */
                    /* Adjust flex basis slightly if needed for print layout differences */
                     flex: 1 1 calc(50% - 7.5px - 42px);
                     page-break-inside: avoid; /* Try to keep cards from breaking */
                     background: rgb(240, 255, 180) !important; /* Force background color */
                }
                .author {
                     background-color: rgba(223, 248, 134, 0.6) !important; /* Force background color */
                }

                .quote-header {
                    page-break-after: avoid;
                }
                .quote-footer {
                     /* Footer positioning in print can be tricky, default flow is often safer */
                     font-size: 8pt;
                     color: #aaa;
                     margin-top: 30px;
                     padding-top: 10px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
           <div class="content-padding"> 
                <header class="quote-header">
                    <div class="logo-container">
                        <img src="${logoSrc}" alt="Company Logo">
                    </div>
                    <div class="quote-details">
                        <h2>Training Quote</h2>
                        <p><strong>Quote To:</strong> ${clientName || 'Customer'}</p>
                        <p><strong>Quote Date:</strong> ${currentDate}</p>
                        <p><strong>Prepared By:</strong> ${userName || 'Training Specialist'}</p>
                    </div>
                </header>

                <main>
                    <h3>Training Plan Options</h3>
                    <div class="plans-container">
                        ${planCosts.map(plan => `
                            <div class="card">
                                <div class="quote">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 330 307" height="80" width="80">
                                        <path fill="currentColor" d="M302.258 176.221C320.678 176.221 329.889 185.432 329.889 203.853V278.764C329.889 297.185 320.678 306.395 302.258 306.395H231.031C212.61 306.395 203.399 297.185 203.399 278.764V203.853C203.399 160.871 207.902 123.415 216.908 91.4858C226.323 59.1472 244.539 30.902 271.556 6.75027C280.562 -1.02739 288.135 -2.05076 294.275 3.68014L321.906 29.4692C328.047 35.2001 326.614 42.1591 317.608 50.3461C303.69 62.6266 292.228 80.4334 283.223 103.766C274.626 126.69 270.328 150.842 270.328 176.221H302.258ZM99.629 176.221C118.05 176.221 127.26 185.432 127.26 203.853V278.764C127.26 297.185 118.05 306.395 99.629 306.395H28.402C9.98126 306.395 0.770874 297.185 0.770874 278.764V203.853C0.770874 160.871 5.27373 123.415 14.2794 91.4858C23.6945 59.1472 41.9106 30.902 68.9277 6.75027C77.9335 -1.02739 85.5064 -2.05076 91.6467 3.68014L119.278 29.4692C125.418 35.2001 123.985 42.1591 114.98 50.3461C101.062 62.6266 89.6 80.4334 80.5942 103.766C71.9979 126.69 67.6997 150.842 67.6997 176.221H99.629Z"></path>
                                    </svg>
                                </div>
                                <div class="card-name">${plan.planName}</div>
                                <div class="body-text">A ${plan.trainingDays}-day intensive workshop covering the essential concepts and core techniques.</div>
                                <div class="author"> 
                                    €${plan.totalCost.toFixed(2)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </main>

                <footer class="quote-footer">
                    <p>Thank you for considering our training programs!</p>
                    <p>Quote ID: ${quoteId}</p>
                </footer>
            </div> 
        </div>
    </body>
    </html>
  `;

  try {
    // Generate a PDF from the HTML
    const pdf = new jsPDF('p', 'pt', 'a4');
    const canvas = await html2canvas(container, {
      scale: 2, // Better quality
      useCORS: true, // Allow loading cross-origin images
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 30;
    
    pdf.addImage(
      imgData, 
      'PNG', 
      imgX, 
      imgY, 
      imgWidth * ratio, 
      imgHeight * ratio
    );
    
    // Clean up - revoke the object URL for the logo if we created one
    if (logoSrc !== logoUrl) {
      URL.revokeObjectURL(logoSrc);
    }
    
    // Remove the temporary container
    document.body.removeChild(container);
    
    // Save the PDF
    pdf.save(`training-quote-${quoteId}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Clean up - revoke the object URL for the logo if we created one
    if (logoSrc !== logoUrl) {
      URL.revokeObjectURL(logoSrc);
    }
    
    document.body.removeChild(container);
    return false;
  }
};
