
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ScheduledTaskSegment } from './types';

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
  areaName: string | undefined,
  planCosts: PlanCostData[],
  logoUrl: string = '/placeholder.svg'
) => {
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
        <title>Training Plan Quote</title>
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
                max-width: 850px;
                margin: 25px auto;
                padding: 35px;
                border: 1px solid #e0e0e0;
                background-color: #ffffff;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                border-radius: 5px;
            }

            /* Header Section */
            .quote-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 35px;
                padding-bottom: 25px;
                border-bottom: 3px solid #007bff;
            }

            .logo-container img {
                max-height: 75px;
                width: auto;
            }

            .quote-details {
                text-align: right;
            }

            .quote-details h2 {
                margin: 0 0 12px 0;
                color: #007bff;
                font-size: 2em;
                font-weight: 600;
            }

            .quote-details p {
                margin: 5px 0;
                font-size: 0.95em;
                color: #555;
            }

            .quote-details strong {
                display: inline-block;
                min-width: 100px;
                text-align: left;
                color: #333;
                font-weight: 600;
            }

            /* Main Content Area */
            main {
                margin-bottom: 35px;
            }

            main > h3 {
                color: #333;
                border-bottom: 1px solid #ccc;
                padding-bottom: 8px;
                margin-bottom: 25px;
                font-size: 1.4em;
                font-weight: 600;
            }

            /* Card Container */
            .plans-container {
                display: flex;
                flex-wrap: wrap;
                gap: 25px;
                justify-content: flex-start;
            }

            /* Individual Card Styling */
            .plan-card {
                background-color: #fdfdfd;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 20px 25px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
                flex: 1 1 calc(50% - 12.5px - 52px);
                min-width: 280px;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }

            .plan-card h4 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #0056b3;
                font-size: 1.15em;
                font-weight: 600;
            }

            .plan-card p {
                font-size: 0.9em;
                color: #666;
                flex-grow: 1;
                margin-bottom: 15px;
            }

            .plan-price {
                margin-top: auto;
                padding-top: 15px;
                border-top: 1px dashed #ccc;
                text-align: right;
            }

            .plan-price span {
                font-size: 1.3em;
                font-weight: bold;
                color: #007bff;
            }

            /* Footer */
            .quote-footer {
                margin-top: 45px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 0.9em;
                color: #888;
                text-align: center;
            }

            .quote-footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header class="quote-header">
                <div class="logo-container">
                    <img src="${logoUrl}" alt="Company Logo">
                </div>
                <div class="quote-details">
                    <h2>Training Quote</h2>
                    <p><strong>Quote To:</strong> ${areaName || 'Customer'}</p>
                    <p><strong>Quote Date:</strong> ${currentDate}</p>
                    <p><strong>Prepared By:</strong> ${userName || 'Training Specialist'}</p>
                </div>
            </header>

            <main>
                <h3>Training Plan Options</h3>
                <div class="plans-container">
                    ${planCosts.map(plan => `
                        <div class="plan-card">
                            <h4>${plan.planName}</h4>
                            <p>A ${plan.trainingDays}-day intensive workshop covering the essential concepts and core techniques.</p>
                            <div class="plan-price">
                                <span>€${plan.totalCost.toFixed(2)}</span>
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
    
    // Remove the temporary container
    document.body.removeChild(container);
    
    // Save the PDF
    pdf.save(`training-quote-${quoteId}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    document.body.removeChild(container);
    return false;
  }
};
