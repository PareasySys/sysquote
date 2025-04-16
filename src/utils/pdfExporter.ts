
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ScheduledTaskSegment } from './types'; // Import from types.ts
import { supabase } from "@/integrations/supabase/client"; // Assuming supabase client setup
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
  // Fields to match with ScheduledTaskSegment if needed
  resource_category?: 'Machine' | 'Software' | 'Unknown';
  machine_name?: string;
  segment_hours?: number;
}

// Extended interface for plan details data
export interface PlanDetailsData extends PlanCostData {
  resources: PlanResourceData[];
  totalTrainingCost: number;
  totalTripCost: number;
  scheduledTasks?: ScheduledTaskSegment[]; // Using imported ScheduledTaskSegment
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
  logoUrl: string = '/placeholder.svg' // Default placeholder logo path
): Promise<boolean> => {
  // Try to get the logo from Supabase storage
  let logoSrc = logoUrl;
  let logoObjectUrl: string | null = null; // To keep track for revocation
  try {
    const { data, error } = await supabase.storage
      .from('identityimages') // Make sure this bucket name is correct
      .download('System_Logo.png'); // Make sure this file name is correct

    if (data && !error) {
      logoObjectUrl = URL.createObjectURL(data);
      logoSrc = logoObjectUrl;
    } else {
      console.warn('Could not load logo from storage:', error?.message || 'Unknown error');
    }
  } catch (err) {
    console.error('Error loading logo from storage:', err);
  }

  // Create a PDF with multiple pages
  // 'p' for portrait, 'pt' for points, 'a4' for page size
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // Approx 595.28 points for A4
  const pdfHeight = pdf.internal.pageSize.getHeight(); // Approx 841.89 points for A4

  try {
    // --- Generate the first page (Cover page with cards) ---
    const coverHtml = generateCoverPageHtml(quoteId, userName, clientName, planCosts, logoSrc);

    // Create a temporary container for the cover page
    const coverContainer = document.createElement('div');
    coverContainer.style.position = 'absolute';
    coverContainer.style.left = '-9999px'; // Position off-screen
    coverContainer.style.top = '-9999px';
    // Set a defined width for the cover page container (A4 width in mm)
    coverContainer.style.width = '210mm';
    coverContainer.style.height = 'auto'; // Let height be determined by content
    document.body.appendChild(coverContainer);
    coverContainer.innerHTML = coverHtml;

    // Convert cover page HTML to canvas using html2canvas
    const coverCanvas = await html2canvas(coverContainer, {
      scale: 2, // Increase scale for better resolution
      useCORS: true, // Important if logo is from a different origin (like Supabase storage)
      allowTaint: true, // May be needed depending on image source and CORS setup
      backgroundColor: '#ffffff', // Ensure solid background
      windowWidth: coverContainer.scrollWidth, // Use element's width
      windowHeight: coverContainer.scrollHeight // Use element's height
    });

    // Add cover page image to PDF
    const coverImgData = coverCanvas.toDataURL('image/png');
    const coverImgWidth = coverCanvas.width;
    const coverImgHeight = coverCanvas.height;

    // Calculate scaling to fit PDF page width
    const coverRatio = pdfWidth / coverImgWidth;
    const finalCoverImgHeight = coverImgHeight * coverRatio;
    const coverImgX = 0; // Align to left edge
    const coverImgY = 0; // Align to top edge (or add margin if needed)

    // Add the image, scaling to fit the width
    pdf.addImage(
      coverImgData,
      'PNG',
      coverImgX,
      coverImgY,
      pdfWidth, // Fit to page width
      finalCoverImgHeight // Scaled height
    );

    // Clean up cover page container from DOM
    document.body.removeChild(coverContainer);

    // --- Generate detail pages if plan details are provided ---
    if (planDetails.length > 0) {
      for (let i = 0; i < planDetails.length; i++) {
        const plan = planDetails[i];

        // For each plan, generate one or more pages with resource chunks
        // Break the resources into smaller chunks that can fit on a single page
        const resourceChunks = splitResourcesIntoChunks(plan.resources);

        for (let chunkIndex = 0; chunkIndex < resourceChunks.length; chunkIndex++) {
          // Add a new page for each resource chunk
          if (i > 0 || chunkIndex > 0) {
            pdf.addPage();
          }

          // Generate HTML for this chunk of resources
          const detailsHtml = generatePlanDetailsPageHtml(
            plan, 
            quoteId, 
            logoSrc, 
            resourceChunks[chunkIndex],
            chunkIndex === 0, // Only show header on first chunk
            chunkIndex === resourceChunks.length - 1 // Only show summary on last chunk
          );

          // Create a temporary container for the details page
          const detailsContainer = document.createElement('div');
          detailsContainer.style.position = 'absolute';
          detailsContainer.style.left = '-9999px'; // Position off-screen
          detailsContainer.style.top = '-9999px';
          detailsContainer.style.width = '210mm'; // A4 width
          detailsContainer.style.height = 'auto'; // Auto height based on content
          document.body.appendChild(detailsContainer);
          detailsContainer.innerHTML = detailsHtml;

          // Convert details page HTML to canvas
          const detailsCanvas = await html2canvas(detailsContainer, {
            scale: 2, // Use scale for better quality
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            windowWidth: detailsContainer.scrollWidth,
            windowHeight: detailsContainer.scrollHeight
          });

          // Get image data and dimensions from canvas
          const detailsImgData = detailsCanvas.toDataURL('image/png');
          const detailsImgWidth = detailsCanvas.width;

          // Calculate scaling to fit PDF width
          const finalDetailsImgWidth = pdfWidth; // Target full PDF width
          const finalDetailsImgHeight = (detailsCanvas.height * pdfWidth) / detailsImgWidth;
          
          // Add the image to the PDF
          pdf.addImage(
            detailsImgData,
            'PNG',
            0, // Left edge
            30, // Top margin
            finalDetailsImgWidth,
            finalDetailsImgHeight
          );

          // Clean up details container from DOM
          document.body.removeChild(detailsContainer);

          // Add page number if there are multiple chunks
          if (resourceChunks.length > 1) {
            const pageText = `Page ${chunkIndex + 1} of ${resourceChunks.length} - ${plan.planName}`;
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(pageText, pdfWidth - 20, pdfHeight - 20, { align: 'right' });
          }
        }
      }
    }

    // Format the PDF filename
    const shortenedQuoteId = quoteId.substring(0, 8);
    const customerName = clientName?.replace(/\s+/g, '_') || 'Customer';
    const fileDate = format(new Date(), 'dd_MM_yyyy');
    const filename = `${customerName}_${fileDate}_${shortenedQuoteId}.pdf`;

    // Save the PDF
    pdf.save(filename);

    // Clean up the logo object URL if it was created
    if (logoObjectUrl) {
      URL.revokeObjectURL(logoObjectUrl);
    }

    return true; // Indicate success

  } catch (error) {
    console.error('Error generating PDF:', error);

    // Clean up the logo object URL if it was created, even on error
    if (logoObjectUrl) {
      URL.revokeObjectURL(logoObjectUrl);
    }

    return false; // Indicate failure
  }
};

/**
 * Split resources into chunks that can fit on a single page
 */
function splitResourcesIntoChunks(resources: PlanResourceData[]): PlanResourceData[][] {
  // Estimate how many resources can fit on a page
  // This is a rough estimate - approx 4-5 resources per page
  const resourcesPerPage = 5;
  const chunks: PlanResourceData[][] = [];
  
  for (let i = 0; i < resources.length; i += resourcesPerPage) {
    chunks.push(resources.slice(i, i + resourcesPerPage));
  }
  
  return chunks;
}

// ===========================================================================
// Helper Function: Generate HTML for the Cover Page
// ===========================================================================
const generateCoverPageHtml = (
  quoteId: string,
  userName: string | undefined,
  clientName: string | undefined,
  planCosts: PlanCostData[],
  logoSrc: string
): string => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const cardColors = [
    { bg: '#F2FCE2', border: '#C9E29E', text: '#3F5713', accent: '#6B8E23', description: "A comprehensive training covering essential concepts and hands-on practical exercises tailored to your team's skill level." }, // Green
    { bg: '#FEF7CD', border: '#F0D861', text: '#6B5D10', accent: '#D4AC16', description: "An extended program that dives deeper into advanced techniques with real-world scenarios and problem-solving workshops." }, // Yellow
    { bg: '#E5DEFF', border: '#B9A5F0', text: '#42348C', accent: '#6C5CE7', description: "Our premium training that includes all standard modules plus specialized content for advanced users and system administrators." }, // Purple
    { bg: '#D3E4FD', border: '#92BBF3', text: '#2C4C7A', accent: '#3B82F6', description: "Experience hands-on learning alongside our experts with this shadowing program designed for complete knowledge transfer." }  // Blue
  ];

  // NOTE: Ensure styles here are compatible with html2canvas rendering.
  // Avoid overly complex CSS features if possible. Use inline styles or simple CSS.
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Training Plan Quote</title>
        <style>
            /* Reset and base styles */
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            * { box-sizing: border-box; }
            /* Container to control overall layout */
            .cover-container { width: 100%; /* Take full width of parent */ padding: 40pt; background-color: #ffffff; }
            /* Header */
            .quote-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50pt; }
            .logo-container img { max-height: 70pt; width: auto; } /* Adjust logo size */
            .quote-details { text-align: right; }
            .quote-details h2 { margin: 0 0 10pt 0; color: #005a9e; font-size: 18pt; font-weight: 600; }
            .quote-details p { margin: 5pt 0; font-size: 10pt; color: #444; }
            .quote-details strong { display: inline-block; min-width: 80pt; text-align: left; color: #111; font-weight: 600; margin-right: 5pt;}
            /* Main content title */
            main > h3 { color: #333; margin: 0 0 30pt 0; font-size: 16pt; font-weight: 600; text-align: center; }
            /* Grid for plan cards */
            .plans-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20pt; }
            /* Card styles */
            .card { border-radius: 6pt; display: flex; flex-direction: column; overflow: hidden; position: relative; padding: 15pt; min-height: 200pt; border-width: 1px; border-style: solid; }
            .quote-icon { position: absolute; top: 10pt; right: 10pt; opacity: 0.4; z-index: 0; }
            .quote-icon svg { height: 35pt; width: 35pt; }
            .card-name { text-transform: uppercase; font-weight: 700; font-size: 11pt; margin-bottom: 10pt; z-index: 1; }
            .body-text { font-size: 9.5pt; font-weight: 400; line-height: 1.4; flex-grow: 1; margin-bottom: 15pt; z-index: 1; }
            .price { font-weight: 700; font-size: 13pt; text-align: right; margin-top: auto; padding-top: 10pt; border-top-width: 2px; border-top-style: solid; z-index: 1; }
            /* Footer */
            .quote-footer { margin-top: 50pt; padding-top: 15pt; border-top: 1px solid #eee; font-size: 9pt; color: #777; text-align: center; }
            .quote-footer p { margin: 4pt 0; }
        </style>
    </head>
    <body>
        <div class="cover-container">
            <header class="quote-header">
                <div class="logo-container">
                    <img src="${logoSrc}" alt="Company Logo">
                </div>
                <div class="quote-details">
                    <h2>Training Quote</h2>
                    <p><strong>Quote To:</strong> ${clientName || 'Valued Customer'}</p>
                    <p><strong>Quote Date:</strong> ${currentDate}</p>
                    <p><strong>Prepared By:</strong> ${userName || 'System Logistics Specialist'}</p>
                    <p><strong>Quote ID:</strong> ${quoteId}</p>
                </div>
            </header>

            <main>
                <h3>Training Plan Options</h3>
                <div class="plans-container">
                    ${planCosts.map((plan, index) => {
                      const colorScheme = cardColors[index % cardColors.length];
                      return `
                        <div class="card" style="background-color: ${colorScheme.bg}; border-color: ${colorScheme.border};">
                            <div class="quote-icon" style="color: ${colorScheme.accent};">
                                <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
                            </div>
                            <div class="card-name" style="color: ${colorScheme.accent};">${plan.planName}</div>
                            <div class="body-text" style="color: ${colorScheme.text};">${colorScheme.description}</div>
                            <div class="price" style="color: ${colorScheme.accent}; border-top-color: ${colorScheme.border};">
                                € ${plan.totalCost.toFixed(2)}
                            </div>
                        </div>
                      `;
                    }).join('')}
                </div>
            </main>

            <footer class="quote-footer">
                <p>Thank you for considering System Logistics training programs.</p>
                <p>Quote valid for 30 days. Prices are exclusive of applicable taxes.</p>
            </footer>
        </div>
    </body>
    </html>
  `;
};


// ===========================================================================
// Helper Function: Generate HTML for a Plan Details Page
// ===========================================================================
const generatePlanDetailsPageHtml = (
  plan: PlanDetailsData,
  quoteId: string,
  logoSrc: string,
  resourcesChunk: PlanResourceData[],
  showHeader: boolean = true,
  showSummary: boolean = true
): string => {
  const totalTrainingCost = plan.totalTrainingCost;
  const totalTripCost = plan.totalTripCost;
  const grandTotal = totalTrainingCost + totalTripCost;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Training Plan Details - ${plan.planName}</title>
        <style>
            /* Basic Reset & Body Styling */
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 0; background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10pt; }
            * { box-sizing: border-box; }
            /* Page Container */
            .container { width: 100%; padding: 30pt 30pt 40pt 30pt; background-color: #ffffff; }
            /* Header Section */
            .details-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25pt; }
            .logo-container img { height: 40pt; width: auto; max-width: 150pt; }
            .plan-title { display: flex; align-items: center; gap: 10pt; }
            .plan-title h2 { margin: 0; font-size: 16pt; font-weight: 600; color: #2d3748; }
            .plan-icon { background: #E5E7EB; width: 30pt; height: 30pt; display: flex; align-items: center; justify-content: center; border-radius: 6pt; font-size: 1.5em; flex-shrink: 0; }
            /* Resource Allocation Section */
            .resources-container { margin-bottom: 25pt; }
            .resources-title { font-size: 14pt; font-weight: 600; color: #2d3748; margin-bottom: 15pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 5pt; }
            .resource-card { border: 1px solid #e2e8f0; border-radius: 6pt; overflow: hidden; background-color: #f8fafc; margin-bottom: 12pt; }
            .resource-header { background-color: #f1f5f9; padding: 8pt 12pt; display: flex; align-items: center; gap: 8pt; border-bottom: 1px solid #e2e8f0; }
            .resource-name { font-weight: 600; font-size: 10.5pt; color: #334155; }
            .resource-icon { font-size: 1.2em; flex-shrink: 0; }
            .resource-details { padding: 12pt; display: grid; grid-template-columns: 1fr 1fr; grid-gap: 10pt; }
            .detail-box { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4pt; padding: 8pt 10pt; }
            .detail-box-header { font-size: 8pt; color: #64748b; margin-bottom: 4pt; text-transform: uppercase; }
            .detail-box-content { display: flex; justify-content: space-between; align-items: center; gap: 5pt; flex-wrap: wrap; }
            .detail-box-value { font-weight: 600; color: #334155; font-size: 10pt; display: flex; align-items: center; gap: 4pt; }
            .detail-box-price { color: #10b981; font-weight: 600; font-size: 10pt; white-space: nowrap; }
            .subdetails { margin-top: 6pt; border-top: 1px solid #e2e8f0; padding-top: 6pt; font-size: 8.5pt; }
            .subdetail-row { display: flex; justify-content: space-between; color: #64748b; margin-bottom: 3pt; }
            .subdetail-row span:first-child { padding-right: 10pt; }
            /* Summary Section */
            .cost-summary { margin-top: 25pt; padding: 15pt; background-color: #f8fafc; border-radius: 6pt; border: 1px solid #e2e8f0; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 6pt; color: #475569; font-size: 10pt; }
            .summary-row span:first-child { padding-right: 15pt; }
            .summary-row.total { margin-top: 8pt; padding-top: 8pt; border-top: 1px solid #e2e8f0; font-weight: 600; font-size: 11pt; color: #10b981; }
            /* Footer */
            .page-footer { margin-top: 30pt; text-align: center; color: #94a3b8; font-size: 8pt; border-top: 1px solid #e2e8f0; padding-top: 10pt; }
            .page-footer p { margin: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            ${showHeader ? `
            <header class="details-header">
                <div class="plan-title">
                    <div class="plan-icon">📋</div>
                    <h2>${plan.planName}</h2>
                </div>
                <div class="logo-container">
                    <img src="${logoSrc}" alt="Company Logo">
                </div>
            </header>
            ` : ''}

            <section class="resources-container">
                ${showHeader ? `<div class="resources-title">Resource Allocation</div>` : ''}
                ${resourcesChunk.map(resource => `
                    <div class="resource-card">
                        <div class="resource-header">
                            <div class="resource-icon">👤</div>
                            <div class="resource-name">${resource.resourceName}</div>
                        </div>
                        <div class="resource-details">
                            <div class="detail-box">
                                <div class="detail-box-header">Training Days</div>
                                <div class="detail-box-content">
                                    <div class="detail-box-value"><span>📅</span> ${resource.trainingDaysCount}</div>
                                    <div class="detail-box-price">€ ${resource.trainingCost.toFixed(2)}</div>
                                </div>
                            </div>
                            <div class="detail-box">
                                <div class="detail-box-header">Business Trip Costs</div>
                                <div class="detail-box-content">
                                    <div class="detail-box-value"><span>✈️</span> ${resource.businessTripDays} Days</div>
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

            ${showSummary ? `
            <section class="cost-summary">
                <div class="summary-row">
                    <span>Total Training Cost:</span>
                    <span>€ ${totalTrainingCost.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Total Business Trip Cost:</span>
                    <span>€ ${totalTripCost.toFixed(2)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total Plan Cost:</span>
                    <span>€ ${grandTotal.toFixed(2)}</span>
                </div>
            </section>
            ` : ''}

            <footer class="page-footer">
                <p>Quote ID: ${quoteId} | Plan: ${plan.planName}</p>
            </footer>
        </div>
    </body>
    </html>
  `;
};

// ===========================================================================
// Helper Function: Generate HTML for the Gantt Chart Visualization
// ===========================================================================
function generateGanttChartHTML(tasks: ScheduledTaskSegment[]): string {
  if (!tasks || tasks.length === 0) {
    // Return placeholder styled similarly to other elements
    return `<div style="padding: 20pt; text-align: center; color: #888; font-style: italic; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">No schedule data available.</div>`;
  }

  // Find the maximum day span
  let maxDay = 0;
  tasks.forEach(task => {
    const endDay = task.start_day + task.duration_days;
    if (endDay > maxDay) {
      maxDay = endDay;
    }
  });
  // Add a small buffer (e.g., 1 day) for visual spacing
  const totalDays = maxDay + 1;

  // Group tasks by resource
  const resourceMap = new Map<number, { name: string; tasks: ScheduledTaskSegment[] }>();
  tasks.forEach(task => {
    if (!resourceMap.has(task.resource_id)) {
      resourceMap.set(task.resource_id, { name: task.resource_name, tasks: [] });
    }
    resourceMap.get(task.resource_id)!.tasks.push(task);
  });

  // Generate day headers
  const daysHeaderCells = Array.from({ length: totalDays }, (_, i) =>
      `<div class="gantt-day-header">Day ${i + 1}</div>`
  ).join('');
  const ganttDaysHeader = `
    <div class="gantt-days-header">
      <div class="gantt-resource-label-header">Resource</div>
      <div class="gantt-days-cells-header">${daysHeaderCells}</div>
    </div>`;

  // Generate resource rows with tasks
  const resourceRows = Array.from(resourceMap.values()).map(resourceData => {
    const resourceName = resourceData.name;

    // Task bars for this resource
    const taskBars = resourceData.tasks.map(task => {
      // Calculate position and width based on days (0-indexed start_day)
      // Ensure duration is at least a small visual element even if 0 days
      const duration = Math.max(task.duration_days, 0.1); // Prevent zero width
      const start = Math.max(task.start_day, 0); // Ensure start is not negative

      const leftPercent = (start / totalDays) * 100;
      const widthPercent = (duration / totalDays) * 100;

      // Determine color based on category
      let taskClass = 'task-default';
      if (task.resource_category === 'Machine') taskClass = 'task-machine';
      else if (task.resource_category === 'Software') taskClass = 'task-software';

      const titleText = `${task.machine_name || resourceName}: Day ${task.start_day + 1} - Day ${task.start_day + task.duration_days} (${task.segment_hours} hours)`;

      return `<div class="gantt-task ${taskClass}"
                   style="left: ${leftPercent}%; width: ${widthPercent}%;"
                   title="${titleText}">
                 ${task.segment_hours}h
              </div>`;
    }).join('');

    // Grid cells for this row
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
      ${ganttDaysHeader}
      ${resourceRows}
    </div>
  `;
}
