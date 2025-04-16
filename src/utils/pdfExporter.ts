
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

  // Array of colors for the cards
  const cardColors = [
    { bg: '#F2FCE2', border: '#C9E29E', text: '#3F5713', accent: '#6B8E23', description: "A comprehensive training covering essential concepts and hands-on practical exercises tailored to your team's skill level." }, // Green
    { bg: '#FEF7CD', border: '#F0D861', text: '#6B5D10', accent: '#D4AC16', description: "An extended program that dives deeper into advanced techniques with real-world scenarios and problem-solving workshops." }, // Yellow
    { bg: '#E5DEFF', border: '#B9A5F0', text: '#42348C', accent: '#6C5CE7', description: "Our premium training that includes all standard modules plus specialized content for advanced users and system administrators." }, // Purple
    { bg: '#D3E4FD', border: '#92BBF3', text: '#2C4C7A', accent: '#3B82F6', description: "Experience hands-on learning alongside our experts with this shadowing program designed for complete knowledge transfer." }  // Blue
  ];

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
                background-color: #f4f7f6;
            }

            /* Page Container */
            .container {
                margin: 0 auto;
                padding: 0;
                background-color: #ffffff;
                border: 1px solid #e0e0e0;
            }

            .content-padding {
                padding: 15mm;
            }

            /* Header Section */
            .quote-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
                padding-bottom: 15px;
                border-bottom: 3px solid #007bff;
            }

            .logo-container img {
                max-height: 90px;
                width: auto;
            }

            .quote-details {
                text-align: right;
            }

            .quote-details h2 {
                margin: 0 0 10px 0;
                color: #007bff;
                font-size: 1.8em;
                font-weight: 600;
            }

            .quote-details p {
                margin: 4px 0;
                font-size: 0.9em;
                color: #555;
            }

            .quote-details strong {
                display: inline-block;
                min-width: 90px;
                text-align: left;
                color: #333;
                font-weight: 600;
            }

            /* Main Content Area */
            main {
                margin-bottom: 30px;
            }

            main > h3 {
                color: #333;
                padding-bottom: 14px;
                margin-bottom: 30px;
                font-size: 1.4em;
                font-weight: 600;
                text-align: center;
            }

            /* Card Container */
            .plans-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: auto auto;
                gap: 20px;
                height: calc(100% - 180px);
                min-height: 450px;
            }

            /* --- UPDATED CARD STYLES --- */
            .card {
                height: 100%;
                min-height: 220px;
                position: relative;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-sizing: border-box;
                padding: 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .quote {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 0;
                opacity: 0.5;
            }
            
            .quote svg {
                height: 40px;
                width: 40px;
            }
            
            .card-name {
                text-transform: uppercase;
                font-weight: 700;
                padding: 20px 20px 5px 20px;
                line-height: 1.3;
                font-size: 1.1em;
                z-index: 1;
            }

            .body-text {
                font-size: 0.95em;
                font-weight: 500;
                padding: 10px 20px 15px 20px;
                line-height: 1.5;
                flex-grow: 1;
                z-index: 1;
            }

            .price {
                font-weight: 700;
                padding: 15px 20px 15px 20px;
                text-align: right;
                font-size: 1.2em;
                margin-top: auto;
                border-top-width: 2px;
                border-top-style: solid;
                z-index: 1;
            }

            /* Footer */
            .quote-footer {
                margin-top: 40px;
                padding-top: 15px;
                border-top: 1px solid #eee;
                font-size: 0.85em;
                color: #888;
                text-align: center;
            }

            .quote-footer p {
                margin: 4px 0;
            }

            /* Print-specific styles */
            @page {
                size: A4;
                margin: 15mm;
            }

            @media print {
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #fff;
                    font-size: 10pt;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .container {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    border: none;
                    box-shadow: none;
                    border-radius: 0;
                }
                
                .content-padding {
                    padding: 0;
                }
                
                .plans-container {
                    gap: 15px;
                    height: 850px;
                }
                
                .card {
                    box-shadow: none;
                    border-width: 1px;
                    border-style: solid;
                    page-break-inside: avoid;
                }

                .quote-header {
                    page-break-after: avoid;
                }
                
                .quote-footer {
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
                        ${planCosts.map((plan, index) => {
                          const colorScheme = cardColors[index % cardColors.length];
                          return `
                            <div class="card" style="background: ${colorScheme.bg}; border: 1px solid ${colorScheme.border};">
                                <div class="quote" style="color: ${colorScheme.accent};">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 330 307">
                                        <path fill="currentColor" d="M302.258 176.221C320.678 176.221 329.889 185.432 329.889 203.853V278.764C329.889 297.185 320.678 306.395 302.258 306.395H231.031C212.61 306.395 203.399 297.185 203.399 278.764V203.853C203.399 160.871 207.902 123.415 216.908 91.4858C226.323 59.1472 244.539 30.902 271.556 6.75027C280.562 -1.02739 288.135 -2.05076 294.275 3.68014L321.906 29.4692C328.047 35.2001 326.614 42.1591 317.608 50.3461C303.69 62.6266 292.228 80.4334 283.223 103.766C274.626 126.69 270.328 150.842 270.328 176.221H302.258ZM99.629 176.221C118.05 176.221 127.26 185.432 127.26 203.853V278.764C127.26 297.185 118.05 306.395 99.629 306.395H28.402C9.98126 306.395 0.770874 297.185 0.770874 278.764V203.853C0.770874 160.871 5.27373 123.415 14.2794 91.4858C23.6945 59.1472 41.9106 30.902 68.9277 6.75027C77.9335 -1.02739 85.5064 -2.05076 91.6467 3.68014L119.278 29.4692C125.418 35.2001 123.985 42.1591 114.98 50.3461C101.062 62.6266 89.6 80.4334 80.5942 103.766C71.9979 126.69 67.6997 150.842 67.6997 176.221H99.629Z"></path>
                                    </svg>
                                </div>
                                <div class="card-name" style="color: ${colorScheme.accent};">${plan.planName}</div>
                                <div class="body-text" style="color: ${colorScheme.text};">${colorScheme.description}</div>
                                <div class="price" style="color: ${colorScheme.accent}; border-top-color: ${colorScheme.border};"> 
                                    €${plan.totalCost.toFixed(2)}
                                </div>
                            </div>
                          `;
                        }).join('')}
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
