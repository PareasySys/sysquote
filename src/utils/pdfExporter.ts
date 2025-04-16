
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ScheduledTaskSegment } from './types';
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Common interface for plan cost data
export interface PlanCostData {
  planId: number;
  planName: string;
  trainingDays: number;
  totalCost: number;
}

// Interface for resource data in a training plan
export interface PlanResourceData {
  resourceId: number;
  resourceName: string;
  resourceIcon: string | null;
  hourlyRate: number;
  totalHours: number;
  trainingDaysCount: number;
  businessTripDays: number;
  trainingCost: number;
  tripCosts: {
    accommodationFood: number;
    allowance: number;
    pocketMoney: number;
    total: number;
  };
}

// Extended interface for plan details data
export interface PlanDetailsData extends PlanCostData {
  resources: PlanResourceData[];
  totalTrainingCost: number;
  totalTripCost: number;
  scheduledTasks?: ScheduledTaskSegment[];
}

/**
 * Generate a PDF quote document based on the checkout data
 */
export const generateQuotePDF = async (
  quoteId: string,
  userName: string | undefined,
  clientName: string | undefined,
  planCosts: PlanCostData[],
  planDetails: PlanDetailsData[] = [],
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

  // Create a PDF with multiple pages
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  try {
    // Generate the first page (Cover page with cards)
    const coverHtml = generateCoverPageHtml(quoteId, userName, clientName, planCosts, logoSrc);
    
    // Create a temporary container for the cover page
    const coverContainer = document.createElement('div');
    coverContainer.style.position = 'absolute';
    coverContainer.style.left = '-9999px';
    coverContainer.style.top = '-9999px';
    document.body.appendChild(coverContainer);
    coverContainer.innerHTML = coverHtml;
    
    // Convert cover page HTML to canvas
    const coverCanvas = await html2canvas(coverContainer, {
      scale: 2, // Better quality
      useCORS: true, // Allow loading cross-origin images
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Add cover page to PDF
    const imgData = coverCanvas.toDataURL('image/png');
    const imgWidth = coverCanvas.width;
    const imgHeight = coverCanvas.height;
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
    
    // Clean up cover page container
    document.body.removeChild(coverContainer);
    
    // If plan details are provided, add a detail page for each plan
    if (planDetails.length > 0) {
      // For each plan, create a new page with details
      for (let i = 0; i < planDetails.length; i++) {
        const plan = planDetails[i];
        
        // Add a new page
        pdf.addPage();
        
        // Generate HTML for plan details
        const detailsHtml = generatePlanDetailsPageHtml(plan, quoteId, logoSrc);
        
        // Create a temporary container for the details page
        const detailsContainer = document.createElement('div');
        detailsContainer.style.position = 'absolute';
        detailsContainer.style.left = '-9999px';
        detailsContainer.style.top = '-9999px';
        document.body.appendChild(detailsContainer);
        detailsContainer.innerHTML = detailsHtml;
        
        // Convert details page HTML to canvas
        const detailsCanvas = await html2canvas(detailsContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 840, // Larger width to ensure full page content
          height: 1200 // Larger height to ensure full content
        });
        
        // Add details page to PDF
        const detailsImgData = detailsCanvas.toDataURL('image/png');
        const detailsImgWidth = detailsCanvas.width;
        const detailsImgHeight = detailsCanvas.height;
        const detailsRatio = Math.min(pdfWidth / detailsImgWidth, pdfHeight / detailsImgHeight);
        const detailsImgX = (pdfWidth - detailsImgWidth * detailsRatio) / 2;
        const detailsImgY = 30;
        
        pdf.addImage(
          detailsImgData, 
          'PNG', 
          detailsImgX, 
          detailsImgY, 
          detailsImgWidth * detailsRatio, 
          detailsImgHeight * detailsRatio
        );
        
        // Clean up details container
        document.body.removeChild(detailsContainer);
      }
    }
    
    // Clean up - revoke the object URL for the logo if we created one
    if (logoSrc !== logoUrl) {
      URL.revokeObjectURL(logoSrc);
    }
    
    // Format the PDF filename as requested
    const shortenedQuoteId = quoteId.substring(0, 8);
    const customerName = clientName?.replace(/\s+/g, '_') || 'Customer';
    const fileDate = format(new Date(), 'dd_MM_yyyy');
    const filename = `${customerName}_${fileDate}_${shortenedQuoteId}.pdf`;
    
    // Save the PDF with the formatted name
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Clean up - revoke the object URL for the logo if we created one
    if (logoSrc !== logoUrl) {
      URL.revokeObjectURL(logoSrc);
    }
    
    return false;
  }
};

/**
 * Generate HTML for the cover page
 */
const generateCoverPageHtml = (
  quoteId: string,
  userName: string | undefined,
  clientName: string | undefined,
  planCosts: PlanCostData[],
  logoSrc: string
): string => {
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

  return `
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
            }

            .logo-container img {
                max-height: 120px;
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
                margin: 0 0 30px 0;
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
                min-height: 850px;
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
};

/**
 * Generate HTML for a plan details page
 */
const generatePlanDetailsPageHtml = (
  plan: PlanDetailsData,
  quoteId: string,
  logoSrc: string
): string => {
  // Get the total costs
  const totalTrainingCost = plan.totalTrainingCost;
  const totalTripCost = plan.totalTripCost;
  const grandTotal = totalTrainingCost + totalTripCost;

  // Generate a visual Gantt chart if schedule data is available
  const ganttChartHTML = generateGanttChartHTML(plan.scheduledTasks || []);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Training Plan Details - A4</title>
        <style>
/* Print-specific styles */

/* Basic Reset & Body Styling */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    /* Ensure background colors are printed/exported */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

/* Apply box-sizing globally for easier width calculations */
* {
    box-sizing: border-box;
}

@page {
    size: A4;
    margin: 0; /* Remove printer margins */
}

/* Page Container */
.container {
    /* margin: 0 auto; */ /* REMOVED: No longer needed for centering if we want full width */
    width: 100%; /* ADDED: Make container use full page width */
    padding: 5mm; /* ADJUSTED: Slightly larger padding for better margins inside the page */
    background-color: #ffffff;
    overflow: hidden; /* ADDED: Helps contain floated/complex elements, though might interfere with breaks if misused */
}

/* Header Section */
.details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    page-break-after: avoid; /* Avoid breaking page right after header */
}

.logo-container img {
    height: 50px; /* Slightly reduced for potentially less vertical space */
    width: auto;
    /* ADDED: Ensure image doesn't cause overflow issues */
    max-width: 100%;
}

.plan-title {
    display: flex;
    align-items: center;
    gap: 15px;
}

.plan-title h2 {
    margin: 0;
    font-size: 1.8em;
    font-weight: 600;
    color: #2d3748;
}

.plan-icon {
    background: #E5E7EB;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    /* ADDED: Ensure icon content fits */
    font-size: 1.2em;
    flex-shrink: 0;
}

/* Resource Cards */
.resources-container {
    display: flex;
    flex-direction: column;
    gap: 15px; /* Reduced gap slightly */
    margin-bottom: 25px;
}

.resources-title {
    font-size: 1.4em;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 15px;
    page-break-after: avoid; /* Avoid breaking page right after this title */
}

.resource-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background-color: #f8fafc;
    page-break-inside: avoid; /* *** IMPORTANT: Try not to break a card across pages *** */
    break-inside: avoid-page; /* Modern equivalent */
}

.resource-header {
    background-color: #f1f5f9;
    padding: 10px 14px; /* Slightly adjusted padding */
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #e2e8f0;
    /* page-break-after: avoid; */ /* Might be too strict, avoid inside card is better */
}

.resource-name {
    font-weight: 600;
    font-size: 1.1em;
    color: #334155;
}

.resource-icon {
    width: 20px;
    height: 20px;
    background: #cbd5e1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.resource-details {
    padding: 14px; /* Slightly adjusted padding */
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 12px; /* Slightly adjusted gap */
}

.detail-box {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px; /* Slightly adjusted padding */
    page-break-inside: avoid; /* Avoid breaking inside a detail box */
    break-inside: avoid-page;
}

.detail-box-header {
    font-size: 0.8em;
    color: #64748b;
    margin-bottom: 5px;
}

.detail-box-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap; /* Allow wrapping if space is tight */
    gap: 5px;
}

.detail-box-value {
    font-weight: 600;
    color: #334155;
}

.detail-box-price {
    color: #10b981;
    font-weight: 600;
}

.subdetails {
    margin-top: 8px;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    font-size: 0.85em;
    page-break-inside: avoid; /* Avoid breaking within subdetails */
    break-inside: avoid-page;
}

.subdetail-row {
    display: flex;
    justify-content: space-between;
    color: #64748b;
    margin-bottom: 4px;
}

/* Gantt Chart Container */
.gantt-container {
    margin-top: 30px; /* Adjusted margin */
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden; /* Keep overflow hidden for the container border-radius */
    width: 100%;
    /* ADDED: Control breaking before this section if possible */
    page-break-before: auto;
    break-before: auto;
}

.gantt-header {
    background-color: #f1f5f9;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    page-break-after: avoid; /* Keep header with the chart */
}

.gantt-title {
    font-weight: 600;
    font-size: 1.1em;
    color: #334155;
}

.gantt-chart {
    background-color: #ffffff;
    padding: 0; /* Remove padding here, handle inside grid */
    position: relative; /* Keep for absolute positioned tasks */
    width: 100%;
    /* REMOVED: overflow: auto; - This prevents content flow in print */
    /* REMOVED: min-height: 300px; - Let content dictate height */
}

/* Gantt chart styles */
/* IMPORTANT: The Gantt chart breaking naturally across pages is tricky.
   CSS page breaks work best *between* block elements.
   Breaking inside a complex grid/flex structure across pages often fails.
   The best bet is to ensure rows don't break internally and hope the
   renderer breaks *between* rows. If the chart is *wider* than the page,
   it *will* be cut off horizontally unless scaled down. */

.gantt-grid {
    display: grid; /* Keep using grid */
    width: 100%;
    border: none; /* Remove outer border, container has one */
    /* ADDED: Tell the grid it's okay to break between rows */
    page-break-inside: auto;
    break-inside: auto;
}

.gantt-days {
    display: flex; /* Use flex for the header row */
    border-bottom: 1px solid #e2e8f0;
    background-color: #f8fafc;
    /* ADDED: Keep header together */
    page-break-inside: avoid;
    break-inside: avoid-page;
}

.gantt-day {
    flex: 1;
    text-align: center;
    padding: 8px 0;
    font-size: 0.8em;
    font-weight: 600;
    color: #64748b;
    border-right: 1px solid #e2e8f0;
}

.gantt-day:last-child {
    border-right: none;
}

/* This represents one entire resource row in the Gantt */
.gantt-resource-row {
    display: flex; /* Use flex for layout */
    border-bottom: 1px solid #e2e8f0;
    position: relative; /* Keep for absolute positioned tasks */
    min-height: 40px; /* Use min-height instead of height */
    /* ADDED: CRITICAL - Avoid breaking *inside* a single resource's row */
    page-break-inside: avoid;
    break-inside: avoid-page;
}

.gantt-resource-row:last-child {
    border-bottom: none;
}

.gantt-resource-name {
    width: 150px; /* Keep fixed width */
    padding: 10px;
    background-color: #f8fafc;
    border-right: 1px solid #e2e8f0;
    font-weight: 500;
    color: #334155;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    /* REMOVED: position: sticky; left: 0; z-index: 1; - Sticky position doesn't work well in print/PDF */
    /* ADDED: Ensure it stays vertically aligned */
    display: flex;
    align-items: center;
    flex-shrink: 0; /* Prevent shrinking */
}

.gantt-days-container {
    flex: 1; /* Takes remaining space */
    display: flex;
    position: relative; /* Keep for absolute tasks */
}

.gantt-day-cell {
    flex: 1;
    border-right: 1px solid #e2e8f0;
    min-height: 40px; /* Match row min-height */
}

.gantt-day-cell:last-child {
    border-right: none;
}

.gantt-task {
    position: absolute;
    height: 24px;
    top: 8px; /* Adjust as needed */
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.8em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 5px;
    z-index: 2; /* Keep on top */
}

/* Task colors by resource type */
.task-machine { background-color: #3b82f6; }
.task-software { background-color: #10b981; }
.task-default { background-color: #6366f1; }


/* Summary Section */
.cost-summary {
    margin-top: 30px;
    padding: 20px;
    background-color: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    /* ADDED: Control breaking */
    page-break-inside: avoid;
    break-inside: avoid-page;
    page-break-before: auto; /* Allow break before if needed */
    break-before: auto;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #475569;
}

.summary-row.total {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-weight: 600;
    font-size: 1.1em;
    color: #10b981;
}

/* Footer */
.page-footer {
    margin-top: 30px; /* Reduced margin */
    text-align: center;
    color: #94a3b8;
    font-size: 0.85em;
    border-top: 1px solid #e2e8f0;
    padding-top: 10px; /* Reduced padding */
    /* ADDED: Try to keep footer on the same page as the summary if possible */
    page-break-before: auto;
    break-before: auto;
    /* Or force to bottom if using running footers (more advanced) */
}

/* Add media print rules specifically (optional but good practice) */
@media print {
    body {
        /* Already set globally, but ensuring */
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .container {
       /* Ensure no box-shadows etc. that might interfere */
       box-shadow: none;
       border: none; /* If container border is not desired in print */
    }
    /* Add any other print-specific overrides */

    /* Re-iterate break rules for clarity if needed, though they work outside @media print too */
    .resource-card,
    .detail-box,
    .subdetails,
    .gantt-resource-row,
    .cost-summary {
        page-break-inside: avoid;
        break-inside: avoid-page;
    }

    .details-header,
    .resources-title,
    .gantt-header {
         page-break-after: avoid;
         break-after: avoid-page;
    }

    .gantt-container,
    .cost-summary,
    .page-footer {
        page-break-before: auto;
        break-before: auto;
    }
}

/* Removed the extra closing brace */
/* } */ /* This brace was extra */
        </style>
    </head>
    <body>
        <div class="container">
            <header class="details-header">
                <div class="plan-title">
                    <div class="plan-icon">📋</div>
                    <h2>${plan.planName}</h2>
                </div>
                <div class="logo-container">
                    <img src="${logoSrc}" alt="Company Logo">
                </div>
            </header>

            <section class="resources-container">
                <div class="resources-title">Resource Allocation</div>
                
                ${plan.resources.map(resource => `
                    <div class="resource-card">
                        <div class="resource-header">
                            <div class="resource-icon">👤</div>
                            <div class="resource-name">${resource.resourceName}</div>
                        </div>
                        <div class="resource-details">
                            <div class="detail-box">
                                <div class="detail-box-header">Training Days</div>
                                <div class="detail-box-content">
                                    <div class="detail-box-value">📅 ${resource.trainingDaysCount}</div>
                                    <div class="detail-box-price">€ ${resource.trainingCost.toFixed(2)}</div>
                                </div>
                            </div>
                            <div class="detail-box">
                                <div class="detail-box-header">Business Trip Days</div>
                                <div class="detail-box-content">
                                    <div class="detail-box-value">🧳 ${resource.businessTripDays}</div>
                                    <div class="detail-box-price">€ ${resource.tripCosts.total.toFixed(2)}</div>
                                </div>
                                <div class="subdetails">
                                    <div class="subdetail-row">
                                        <span>Accommodation & Food:</span>
                                        <span>€ ${resource.tripCosts.accommodationFood.toFixed(2)}</span>
                                    </div>
                                    <div class="subdetail-row">
                                        <span>Daily Allowance:</span>
                                        <span>€ ${resource.tripCosts.allowance.toFixed(2)}</span>
                                    </div>
                                    <div class="subdetail-row">
                                        <span>Pocket Money:</span>
                                        <span>€ ${resource.tripCosts.pocketMoney.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </section>

            <section class="gantt-container">
                <div class="gantt-header">
                    <div class="gantt-title">Resource Training Schedule</div>
                </div>
                <div class="gantt-chart">
                    ${ganttChartHTML}
                </div>
            </section>

            <section class="cost-summary">
                <div class="summary-row">
                    <span>Training Cost:</span>
                    <span>€ ${totalTrainingCost.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Business Trip Cost:</span>
                    <span>€ ${totalTripCost.toFixed(2)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span>€ ${grandTotal.toFixed(2)}</span>
                </div>
            </section>

            <footer class="page-footer">
                <p>Quote ID: ${quoteId} | Plan: ${plan.planName}</p>
            </footer>
        </div>
    </body>
    </html>
  `;
};

/**
 * Generate the HTML for the Gantt chart visualization
 */
function generateGanttChartHTML(tasks: ScheduledTaskSegment[]): string {
  if (!tasks || tasks.length === 0) {
    return `<div class="gantt-placeholder">No schedule data available for this plan</div>`;
  }

  // Find the maximum day to determine chart width
  const maxDay = Math.max(...tasks.map(task => task.start_day + task.duration_days));
  // Add buffer days to make the chart look better
  const totalDays = maxDay + 2;
  
  // Group tasks by resource for better visualization
  const resourceMap = new Map<number, ScheduledTaskSegment[]>();
  
  tasks.forEach(task => {
    if (!resourceMap.has(task.resource_id)) {
      resourceMap.set(task.resource_id, []);
    }
    resourceMap.get(task.resource_id)!.push(task);
  });

  // Generate day headers
  const daysHeader = Array.from({ length: totalDays }, (_, i) => `<div class="gantt-day">Day ${i + 1}</div>`).join('');
  
  // Generate resource rows with tasks
  const resourceRows = Array.from(resourceMap.entries()).map(([resourceId, resourceTasks]) => {
    const firstTask = resourceTasks[0];
    const resourceName = firstTask.resource_name;
    
    // Generate task bars
    const taskBars = resourceTasks.map(task => {
      const left = (task.start_day / totalDays) * 100;
      const width = (task.duration_days / totalDays) * 100;
      const taskClass = task.resource_category === 'Machine' ? 'task-machine' : 
                       task.resource_category === 'Software' ? 'task-software' : 'task-default';
      
      return `<div class="gantt-task ${taskClass}" 
                  style="left: ${left}%; width: ${width}%;" 
                  title="${task.machine_name}: ${task.segment_hours} hours">
                ${task.segment_hours}h
              </div>`;
    }).join('');
    
    // Generate empty day cells for the grid
    const dayCells = Array.from({ length: totalDays }, () => `<div class="gantt-day-cell"></div>`).join('');
    
    return `
      <div class="gantt-resource-row">
        <div class="gantt-resource-name">${resourceName}</div>
        <div class="gantt-days-container">
          ${dayCells}
          ${taskBars}
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="gantt-grid">
      <div class="gantt-days">
        <div style="width: 150px; border-right: 1px solid #e2e8f0; background-color: #f8fafc;"></div>
        <div style="flex: 1; display: flex;">${daysHeader}</div>
      </div>
      ${resourceRows}
    </div>
  `;
}
