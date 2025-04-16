// --- Other imports remain the same ---
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas'; // Still needed for cover page
import { ScheduledTaskSegment } from './types';
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// --- Interfaces remain the same ---
// ... (PlanCostData, PlanResourceData, PlanDetailsData, ScheduledTaskSegment) ...
export interface PlanCostData {
    planId: number;
    planName: string;
    trainingDays: number;
    totalCost: number;
}
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
    resource_category?: string;
    machine_name?: string;
    segment_hours?: number;
}
export interface PlanDetailsData extends PlanCostData {
    resources: PlanResourceData[];
    totalTrainingCost: number;
    totalTripCost: number;
    // scheduledTasks field is used by generateGanttChartHTML
    scheduledTasks?: ScheduledTaskSegment[];
    // ganttChartImageDataUrl is NOT used for Option B
}
export interface ScheduledTaskSegment {
    // Ensure these fields exist and have data
    id: number | string; // Unique key for React, potentially useful
    resource_id: number;
    resource_name: string;
    machine_name?: string;
    start_day: number;       // Day number (e.g., 1, 2, ...)
    duration_days: number;   // Duration in logical days
    segment_hours: number;   // Hours for this specific segment
    total_training_hours: number; // Total for the original requirement
    resource_category?: 'Machine' | 'Software' | string; // Allow other strings too
    // Add other fields if needed by logic below
}
// ---

// --- generateQuotePDF function (uses pdf.html for details page) ---
// Use the version from the previous answer that correctly uses pdf.html()
// for detail pages to handle pagination.
export const generateQuotePDF = async (
    quoteId: string,
    userName: string | undefined,
    clientName: string | undefined,
    planCosts: PlanCostData[],
    planDetails: PlanDetailsData[] = [],
    logoUrl: string = '/placeholder.svg'
): Promise<boolean> => {
    let logoSrc = logoUrl;
    let logoObjectUrl: string | null = null;

    try {
        // --- Logo Loading ---
        const { data, error } = await supabase.storage.from('identityimages').download('System_Logo.png');
        if (data && !error) { logoObjectUrl = URL.createObjectURL(data); logoSrc = logoObjectUrl; }
        else { console.warn('Could not load logo:', error?.message); }
    } catch (err) { console.error('Error loading logo:', err); }

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    try {
        // --- Cover Page (using html2canvas - keep this part) ---
        const coverHtml = generateCoverPageHtml(quoteId, userName, clientName, planCosts, logoSrc);
        const coverContainer = document.createElement('div');
        // ... (rest of cover page container setup) ...
        coverContainer.style.width = '210mm';
        coverContainer.style.height = 'auto';
        document.body.appendChild(coverContainer);
        coverContainer.innerHTML = coverHtml;
        const coverCanvas = await html2canvas(coverContainer, { /* ... options ... */ });
        document.body.removeChild(coverContainer);
        const coverImgData = coverCanvas.toDataURL('image/png');
        const coverRatio = pdfWidth / coverCanvas.width;
        pdf.addImage(coverImgData, 'PNG', 0, 0, pdfWidth, coverCanvas.height * coverRatio);

        // --- Detail Pages (using pdf.html) ---
        if (planDetails.length > 0) {
            for (let i = 0; i < planDetails.length; i++) {
                const plan = planDetails[i];
                pdf.addPage();
                // NOTE: Pass only necessary data, ganttChartImageDataUrl is not needed for Option B
                const detailsHtmlString = generatePlanDetailsPageHtml(plan, quoteId, logoSrc);

                await pdf.html(detailsHtmlString, {
                    callback: (doc) => { console.log(`Added details for plan: ${plan.planName}`); },
                    margin: [30, 30, 30, 30], // Adjust margins as needed
                    autoPaging: 'text',
                    html2canvas: { scale: 2, useCORS: true },
                    width: pdfWidth - 60, // Content width = Page width - left margin - right margin
                    windowWidth: pdfWidth - 60,
                });
            }
        }

        // --- Save PDF ---
        const filename = `${clientName?.replace(/\s+/g, '_') || 'Customer'}_${format(new Date(), 'dd_MM_yyyy')}_${quoteId.substring(0, 8)}.pdf`;
        pdf.save(filename);
        if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
        return true;

    } catch (error) {
        console.error('Error generating PDF:', error);
        if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
        return false;
    }
};

// ===========================================================================
// Helper Function: Generate HTML for the Cover Page (Keep Existing)
// ===========================================================================
const generateCoverPageHtml = ( /* ...params... */ ): string => {
    // ... Your existing cover page HTML and CSS ...
    // Make sure it uses pt units for better print consistency.
    return `<!DOCTYPE html>...</html>`;
};

// ===========================================================================
// Helper Function: Generate HTML for a Plan Details Page (Option B CSS)
// ===========================================================================
const generatePlanDetailsPageHtml = (
    plan: PlanDetailsData,
    quoteId: string,
    logoSrc: string
    // No ganttChartImageDataUrl needed for Option B
): string => {
    const totalTrainingCost = plan.totalTrainingCost;
    const totalTripCost = plan.totalTripCost;
    const grandTotal = totalTrainingCost + totalTripCost;

    // Generate Gantt HTML using the updated function
    const ganttSectionHTML = (plan.scheduledTasks && plan.scheduledTasks.length > 0)
      ? generateGanttChartHTML(plan.scheduledTasks) // Call the *new* generator
      : `<div class="gantt-placeholder">No schedule data available.</div>`; // Simple placeholder

    // --- Full Page HTML Structure ---
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Training Plan Details - ${plan.planName}</title>
        <style>
            /* --- Base & Page Styles --- */
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.4; color: #2d3748; /* Darker text */ margin: 0; padding: 0; background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 9pt; /* Base font size */ }
            * { box-sizing: border-box; }
            .pdf-container { width: 100%; padding: 0; /* Padding managed by jsPDF margins */ background-color: #ffffff; } /* Renamed container */
            h2, h3, h4 { margin-top: 1.2em; margin-bottom: 0.6em; color: #1a202c; }
            p { margin-bottom: 0.8em; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
            th, td { border: 1px solid #e2e8f0; padding: 5pt 7pt; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }

            /* --- PDF Specific Sections --- */
            .details-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20pt; padding-bottom: 10pt; border-bottom: 1px solid #e2e8f0; page-break-after: avoid; break-after: avoid-page; }
            .logo-container img { height: 35pt; width: auto; max-width: 140pt; }
            .plan-title { display: flex; align-items: center; gap: 8pt; }
            .plan-title h2 { margin: 0; font-size: 16pt; font-weight: 600; color: #2d3748; }
            .plan-icon { /* Keep if needed */ }

            .section-title { font-size: 13pt; font-weight: 600; color: #2d3748; margin-bottom: 12pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt; page-break-after: avoid; break-after: avoid-page; }

            .resources-container { margin-bottom: 20pt; }
            .resource-card { border: 1px solid #e2e8f0; border-radius: 5pt; overflow: hidden; background-color: #fdfdff; margin-bottom: 10pt; page-break-inside: avoid; break-inside: avoid-page; }
            .resource-header { background-color: #f1f5f9; padding: 6pt 10pt; display: flex; align-items: center; gap: 6pt; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 10pt; color: #334155; }
            .resource-details { padding: 10pt; display: grid; grid-template-columns: 1fr 1fr; grid-gap: 10pt; font-size: 8.5pt; }
            .detail-box { /* Simplified resource details */ }
            .detail-label { color: #64748b; display: block; margin-bottom: 2pt; font-size: 7.5pt; text-transform: uppercase;}
            .detail-value { font-weight: 500; color: #334155; }
            .detail-price { color: #10b981; font-weight: 600; float: right; }
            .subdetails { margin-top: 5pt; border-top: 1px dashed #e2e8f0; padding-top: 5pt; }
            .subdetail-row { display: flex; justify-content: space-between; color: #4a5568; margin-bottom: 2pt; }

            .cost-summary { margin-top: 20pt; padding: 12pt; background-color: #f8fafc; border-radius: 5pt; border: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid-page; page-break-before: auto; break-before: auto; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 5pt; color: #475569; font-size: 9.5pt; }
            .summary-row.total { margin-top: 7pt; padding-top: 7pt; border-top: 1px solid #cbd5e1; font-weight: 600; font-size: 10.5pt; color: #10b981; }

            .page-footer { margin-top: 25pt; text-align: center; color: #a0aec0; font-size: 7.5pt; border-top: 1px solid #e2e8f0; padding-top: 8pt; page-break-before: auto; break-before: auto; }
            .page-footer p { margin: 0; }

            /* --- GANTT CHART STYLES (Option B - Translated from CSS) --- */
            .gantt-container-pdf {
                border: 1px solid #cbd5e1; /* Lighter border */
                border-radius: 4pt;
                overflow: hidden; /* Clip contents */
                background-color: #ffffff;
                margin-top: 15pt;
                page-break-inside: avoid; /* Try to keep Gantt together, but allow breaks between rows */
            }
            .gantt-header-pdf { /* Style for the "Resource Training Schedule" title bar */
                background-color: #f1f5f9;
                padding: 8pt 10pt;
                border-bottom: 1px solid #cbd5e1;
                page-break-after: avoid;
            }
            .gantt-title-pdf {
                font-weight: 600;
                font-size: 11pt;
                color: #334155;
            }
            .gantt-placeholder { /* Style for 'No schedule data' */
                 padding: 15pt; text-align: center; color: #64748b; font-style: italic; background-color: #f8fafc; border-top: 1px solid #e2e8f0;
            }
            .gantt-grid-pdf {
                display: flex; /* Use flexbox for main layout */
                flex-direction: column;
                width: 100%;
            }
            .gantt-days-header-row-pdf {
                display: flex;
                background-color: #f8fafc;
                border-bottom: 1px solid #cbd5e1;
                flex-shrink: 0; /* Prevent shrinking */
                page-break-inside: avoid;
            }
            .gantt-resource-header-pdf { /* Top-left cell */
                width: 110pt; /* Fixed width for resource names column */
                min-width: 110pt;
                padding: 5pt 8pt;
                font-size: 7.5pt;
                font-weight: 600;
                color: #4a5568;
                border-right: 1px solid #cbd5e1;
                text-align: center;
            }
            .gantt-days-scroll-header-pdf { /* Container for day numbers */
                flex: 1;
                display: flex;
                overflow: hidden; /* Should not scroll */
            }
            .gantt-day-header-pdf {
                flex-basis: 20pt; /* Base width per day - ADJUST AS NEEDED */
                flex-grow: 1; /* Allow stretching */
                min-width: 15pt; /* Minimum width */
                text-align: center;
                padding: 5pt 0;
                font-size: 7pt;
                font-weight: 500;
                color: #64748b;
                border-right: 1px solid #eaf0f6; /* Lighter day separators */
                white-space: nowrap;
            }
            .gantt-day-header-pdf:last-child { border-right: none; }

            .gantt-resource-row-pdf {
                display: flex;
                border-bottom: 1px solid #eaf0f6; /* Lighter row separators */
                min-height: 25pt; /* Row height */
                page-break-inside: avoid; /* Crucial for pagination */
                position: relative; /* Needed for absolute tasks */
                background-color: #ffffff;
            }
             .gantt-resource-row-pdf:nth-child(even) {
                 background-color: #fdfdff; /* Subtle alternating row color */
             }
            .gantt-resource-row-pdf:last-child { border-bottom: none; }

            .gantt-resource-name-pdf { /* Resource name cell in data rows */
                width: 110pt;
                min-width: 110pt;
                padding: 6pt 8pt;
                font-size: 8pt;
                font-weight: 500;
                color: #334155;
                border-right: 1px solid #cbd5e1;
                background-color: #f8fafc; /* Match header bg */
                display: flex;
                align-items: center; /* Vertically center */
            }
             .gantt-resource-machine-pdf { /* Style for machine/software name */
                 display: block; /* Stack below resource name if needed, or keep inline */
                 margin-left: 5pt; /* Indent slightly */
                 font-size: 7.5pt;
                 color: #4a5568;
             }
             .gantt-resource-machine-pdf.software-resource {
                 font-style: italic;
                 color: #5b21b6; /* Indigo */
             }

            .gantt-days-container-pdf { /* The main area where tasks are drawn */
                flex: 1;
                position: relative; /* Anchor for tasks */
                display: flex; /* Use flex to layout day cells if needed, though tasks are absolute */
            }
            /* Day cell background - optional, tasks overlay this */
            .gantt-day-cell-pdf {
                 flex-basis: 20pt; /* Match header */
                 flex-grow: 1;
                 min-width: 15pt;
                 border-right: 1px solid #f1f5f9; /* Very light grid lines */
            }
             .gantt-day-cell-pdf:last-child { border-right: none; }

            .gantt-task-pdf {
                position: absolute;
                top: 4pt; /* Position within the row */
                height: 17pt; /* Height of the task bar */
                border-radius: 3pt;
                background-color: #3B82F6; /* Default color, will be overridden */
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 7pt;
                font-weight: 500;
                overflow: hidden;
                white-space: nowrap;
                padding: 0 4pt;
                border: 1px solid rgba(0,0,0,0.1);
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                z-index: 10; /* Above day cells */
            }
            .gantt-task-pdf.software-task {
                border-style: dashed;
                opacity: 0.9;
            }

        </style>
    </head>
    <body>
        <div class="pdf-container"> ${/* Changed class name */''}
            <header class="details-header">
                 <div class="plan-title"><h2>${plan.planName}</h2></div>
                 <div class="logo-container"><img src="${logoSrc}" alt="Logo"></div>
            </header>

            <section class="resources-container">
                <div class="section-title">Resource Allocation</div>
                ${plan.resources.map(resource => `
                    <div class="resource-card">
                        <div class="resource-header">👤 ${resource.resourceName}</div>
                        <div class="resource-details">
                            <div>
                                <span class="detail-label">Training Days</span>
                                <span class="detail-price">€ ${resource.trainingCost.toFixed(2)}</span>
                                <span class="detail-value">📅 ${resource.trainingDaysCount}</span>
                            </div>
                            <div>
                                <span class="detail-label">Business Trip Costs</span>
                                <span class="detail-price">€ ${resource.tripCosts.total.toFixed(2)}</span>
                                <span class="detail-value">✈️ ${resource.businessTripDays} Days</span>
                                <div class="subdetails">
                                    <div class="subdetail-row"><span>Accom. & Food:</span><span>€ ${resource.tripCosts.accommodationFood.toFixed(2)}</span></div>
                                    <div class="subdetail-row"><span>Daily Allowance:</span><span>€ ${resource.tripCosts.allowance.toFixed(2)}</span></div>
                                    <div class="subdetail-row"><span>Pocket Money:</span><span>€ ${resource.tripCosts.pocketMoney.toFixed(2)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </section>

            <div class="gantt-container-pdf"> ${/* Use PDF specific class */''}
                 <div class="gantt-header-pdf">
                    <div class="gantt-title-pdf">Resource Training Schedule</div>
                 </div>
                 ${ganttSectionHTML} ${/* This now contains the generated Gantt */''}
            </div>

            <section class="cost-summary">
                 <div class="summary-row"><span>Total Training Cost:</span><span>€ ${totalTrainingCost.toFixed(2)}</span></div>
                 <div class="summary-row"><span>Total Business Trip Cost:</span><span>€ ${totalTripCost.toFixed(2)}</span></div>
                 <div class="summary-row total"><span>Total Plan Cost:</span><span>€ ${grandTotal.toFixed(2)}</span></div>
            </section>

            <footer class="page-footer">
                <p>Quote ID: ${quoteId} | Plan: ${plan.planName}</p>
            </footer>
        </div>
    </body>
    </html>
  `;
};


// ===========================================================================
// Helper Function: Generate HTML for the Gantt Chart (Option B - Revised)
// ===========================================================================
function generateGanttChartHTML(tasks: ScheduledTaskSegment[]): string {
    if (!tasks || tasks.length === 0) {
      return `<div class="gantt-placeholder">No schedule data available.</div>`; // Use placeholder class
    }

    // --- Determine Time Scale ---
    let maxDay = 0;
    tasks.forEach(task => {
        if (task.start_day != null && task.duration_days != null) {
           const endDay = (task.start_day || 0) + (task.duration_days || 0);
           if (endDay > maxDay) {
               maxDay = endDay;
           }
        }
    });
    // Use a reasonable max or calculated max + buffer
    const totalDays = Math.max(maxDay + 5, 30); // Ensure at least 30 days visible, add buffer

    // --- Group Tasks ---
    // Group by resource, then by machine/software within the resource
    const resourceMap = new Map<number, {
        name: string;
        items: { // Can be machine or software entry
            itemName: string;
            isSoftware: boolean;
            tasks: ScheduledTaskSegment[];
        }[]
    }>();

    tasks.forEach(task => {
        if (task.resource_id == null) return; // Skip tasks without resource

        if (!resourceMap.has(task.resource_id)) {
            resourceMap.set(task.resource_id, { name: task.resource_name || `Res ${task.resource_id}`, items: [] });
        }
        const resourceGroup = resourceMap.get(task.resource_id)!;
        const itemName = task.machine_name || (task.resource_category === 'Software' ? `${task.resource_name} Software` : 'General Tasks');
        const isSoftware = task.resource_category === 'Software';

        let itemGroup = resourceGroup.items.find(item => item.itemName === itemName);
        if (!itemGroup) {
            itemGroup = { itemName, isSoftware, tasks: [] };
            resourceGroup.items.push(itemGroup);
        }
        itemGroup.tasks.push(task);
    });

    // Sort items within each resource (optional: machines first, then software)
     resourceMap.forEach(group => {
        group.items.sort((a, b) => {
            if (a.isSoftware !== b.isSoftware) return a.isSoftware ? 1 : -1; // Software last
            return a.itemName.localeCompare(b.itemName);
        });
    });


    // --- Generate Header Row ---
    const daysHeaderCells = Array.from({ length: totalDays }, (_, i) =>
        `<div class="gantt-day-header-pdf">D${i + 1}</div>` // Shorten day label
    ).join('');

    const ganttHeaderRow = `
      <div class="gantt-days-header-row-pdf">
        <div class="gantt-resource-header-pdf">Resource / Item</div>
        <div class="gantt-days-scroll-header-pdf">${daysHeaderCells}</div>
      </div>`;

    // --- Generate Data Rows ---
    const resourceRows = Array.from(resourceMap.values()).map(resourceData => {
        const itemRows = resourceData.items.map(itemData => {
            const taskBars = itemData.tasks.map(task => {
                if (task.start_day == null || task.duration_days == null || task.duration_days <= 0) {
                    return ''; // Skip tasks with invalid data for positioning
                }
                const leftPercent = Math.max(0, ((task.start_day -1) / totalDays) * 100); // 0-based day index for start
                const widthPercent = Math.max(0.5, (task.duration_days / totalDays) * 100); // Min width for visibility

                const color = getResourceColorPdf(task.resource_id); // Use PDF-safe color function
                const taskClass = `gantt-task-pdf ${itemData.isSoftware ? 'software-task' : ''}`;
                const titleText = `${itemData.itemName}: Day ${task.start_day} - ${task.start_day + task.duration_days - 1} (${task.segment_hours}h)`;

                return `<div class="${taskClass}"
                           style="left: ${leftPercent.toFixed(2)}%; width: ${widthPercent.toFixed(2)}%; background-color: ${color};"
                           title="${titleText}">
                         ${task.segment_hours}h
                      </div>`;
            }).join('');

            // Background day cells (optional, for visual structure)
             const dayCells = Array.from({ length: totalDays }, () => `<div class="gantt-day-cell-pdf"></div>`).join('');

            return `
              <div class="gantt-resource-row-pdf">
                  <div class="gantt-resource-name-pdf">
                       ${resourceData.name}
                       <span class="gantt-resource-machine-pdf ${itemData.isSoftware ? 'software-resource' : ''}">${itemData.itemName}</span>
                  </div>
                  <div class="gantt-days-container-pdf">
                      ${dayCells} ${/* Optional background grid cells */''}
                      ${taskBars}  ${/* Task bars overlay the container */''}
                  </div>
              </div>
            `;
        }).join('');
        return itemRows; // Return the combined rows for this resource's items
    }).join('');

    // --- Combine Header and Rows ---
    return `
      <div class="gantt-grid-pdf">
        ${ganttHeaderRow}
        ${resourceRows}
      </div>
    `;
}


// --- Helper Function for Colors (PDF Safe) ---
// Ensure this returns CSS color strings
function getResourceColorPdf(id: number | null | undefined): string {
  const colors = [
    '#3B82F6', '#F97316', '#10B981', '#8B5CF6',
    '#EC4899', '#EF4444', '#F59E0B', '#06B6D4'
  ];
  // Handle potential null/undefined ID safely
  const validId = id ?? 0; // Use 0 if id is null or undefined
  const index = Math.abs(validId) % colors.length;
  return colors[index];
}