import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from "@/integrations/supabase/client"; // Assuming supabase client setup
import { format } from "date-fns";

// ===========================================================================
// Interfaces (Define the data structures used)
// ===========================================================================

export interface PlanCostData {
    planId: number;
    planName: string;
    trainingDays: number;
    totalCost: number;
}

export interface PlanResourceData {
    resourceId: number;
    resourceName: string;
    resourceIcon: string | null; // Currently not used in PDF details, but kept for consistency
    hourlyRate: number;         // Potentially useful if displaying costs differently
    totalHours: number;          // Potentially useful
    trainingDaysCount: number;
    businessTripDays: number;
    trainingCost: number;
    tripCosts: {
        accommodationFood: number;
        allowance: number;
        pocketMoney: number;
        total: number;
    };
    // Fields derived from scheduled tasks, ensure they are populated if needed
    resource_category?: string;
    machine_name?: string;
    segment_hours?: number;
}

// Defines the structure for detailed plan data passed to PDF generation
export interface PlanDetailsData extends PlanCostData {
    resources: PlanResourceData[];
    totalTrainingCost: number;
    totalTripCost: number;
    // This holds the data needed to generate the Gantt chart
    scheduledTasks?: ScheduledTaskSegment[];
}

// Defines the structure of individual scheduled task segments
// Ensure this matches the data structure coming from your scheduling logic/API
export interface ScheduledTaskSegment {
    id: number | string; // Unique ID for the segment
    resource_id: number;
    resource_name: string;
    machine_name?: string;     // Name of the machine/software/item
    start_day: number;       // Day number (e.g., 1, 2, ...) relative to plan start
    duration_days: number;   // Duration in logical calendar days
    segment_hours: number;   // Actual work hours within this segment/day
    total_training_hours: number; // Total hours for the original requirement this segment belongs to
    resource_category?: 'Machine' | 'Software' | string; // Type of resource/item
    // Add any other relevant fields from your actual type definition
    start_hour_offset?: number; // Original offset (Not directly used in PDF Option B Gantt rendering)
    originalRequirementId?: number | string; // Original task ID
}


// ===========================================================================
// PDF Generation Function (Main Entry Point)
// ===========================================================================

/**
 * Generate a PDF quote document based on the checkout data.
 * Uses html2canvas for the cover page and jsPDF.html() for detail pages
 * to support automatic pagination.
 */
export const generateQuotePDF = async (
    quoteId: string,
    userName: string | undefined,
    clientName: string | undefined,
    planCosts: PlanCostData[],
    planDetails: PlanDetailsData[] = [],
    logoUrl: string = '/placeholder.svg' // Default placeholder if loading fails
): Promise<boolean> => {
    let logoSrc = logoUrl;
    let logoObjectUrl: string | null = null; // Keep track of Blob URL for cleanup

    // --- 1. Load Logo ---
    try {
        const { data, error } = await supabase.storage
            .from('identityimages') // Ensure this bucket name is correct
            .download('System_Logo.png'); // Ensure this file name is correct

        if (data && !error) {
            logoObjectUrl = URL.createObjectURL(data);
            logoSrc = logoObjectUrl;
        } else {
            console.warn('Could not load logo from storage:', error?.message || 'Unknown error');
            // logoSrc remains the default placeholder
        }
    } catch (err) {
        console.error('Error loading logo from storage:', err);
        // logoSrc remains the default placeholder
    }

    // --- 2. Initialize jsPDF ---
    const pdf = new jsPDF('p', 'pt', 'a4'); // Portrait, Points, A4 size
    const pdfWidth = pdf.internal.pageSize.getWidth(); // Approx 595.28 pt
    const pdfHeight = pdf.internal.pageSize.getHeight(); // Approx 841.89 pt

    try {
        // --- 3. Generate Cover Page (using html2canvas for precise layout) ---
        const coverHtml = generateCoverPageHtml(quoteId, userName, clientName, planCosts, logoSrc);
        const coverContainer = document.createElement('div');
        // Style container for accurate rendering off-screen
        coverContainer.style.position = 'absolute';
        coverContainer.style.left = '-9999px';
        coverContainer.style.top = '-9999px';
        coverContainer.style.width = '210mm'; // A4 width
        coverContainer.style.height = 'auto'; // Auto height based on content
        coverContainer.style.backgroundColor = '#ffffff'; // Ensure background for canvas
        document.body.appendChild(coverContainer);
        coverContainer.innerHTML = coverHtml;

        const coverCanvas = await html2canvas(coverContainer, {
            scale: 2, // Higher scale for better PDF quality
            useCORS: true, // Allow cross-origin images (like logo from Supabase)
            allowTaint: true, // May be needed depending on CORS
            backgroundColor: '#ffffff',
            // Use container's rendered dimensions
            windowWidth: coverContainer.scrollWidth,
            windowHeight: coverContainer.scrollHeight
        });
        document.body.removeChild(coverContainer); // Clean up DOM element

        // Add cover page image to PDF, scaled to fit width
        const coverImgData = coverCanvas.toDataURL('image/png');
        const coverRatio = pdfWidth / coverCanvas.width;
        const finalCoverImgHeight = coverCanvas.height * coverRatio;
        pdf.addImage(coverImgData, 'PNG', 0, 0, pdfWidth, finalCoverImgHeight);

        // --- 4. Generate Detail Pages (using jsPDF.html() for auto-pagination) ---
        if (planDetails.length > 0) {
            for (let i = 0; i < planDetails.length; i++) {
                const plan = planDetails[i];

                // Add a new page *before* rendering the HTML for this plan
                pdf.addPage();

                // Generate the HTML string for this plan's details
                const detailsHtmlString = generatePlanDetailsPageHtml(plan, quoteId, logoSrc);

                // Define margins for the content area within the PDF page
                const margins = { top: 40, bottom: 40, left: 40, right: 40 };

                // Render the HTML string using pdf.html()
                await pdf.html(detailsHtmlString, {
                    callback: (doc) => {
                        // This callback runs after this HTML section is added.
                        // Typically, save is called once after the loop.
                        console.log(`PDF generation: Added details for plan '${plan.planName}'`);
                    },
                    // Pass margins to define the content area
                    margin: [margins.top, margins.left, margins.bottom, margins.right],
                    // autoPaging helps jsPDF decide how to split content
                    // 'text' tries to avoid breaking lines/words, 'slice' just cuts
                    autoPaging: 'text',
                    // Use html2canvas internally for rendering complex elements
                    html2canvas: {
                        scale: 2, // Use same scale for consistency
                        useCORS: true,
                        // letterRendering: true, // Might improve text slightly in some cases
                    },
                    // Set the width for the HTML content rendering area
                    width: pdfWidth - margins.left - margins.right,
                    // The 'viewport' width for the rendering engine
                    windowWidth: pdfWidth - margins.left - margins.right
                });
            }
        }

        // --- 5. Save the PDF ---
        // Format filename
        const shortenedQuoteId = quoteId.substring(0, 8);
        const customerName = clientName?.replace(/\s+/g, '_') || 'Customer'; // Replace spaces for filename
        const fileDate = format(new Date(), 'dd_MM_yyyy');
        const filename = `${customerName}_${fileDate}_${shortenedQuoteId}.pdf`;

        pdf.save(filename);

        // --- 6. Cleanup ---
        if (logoObjectUrl) {
            URL.revokeObjectURL(logoObjectUrl); // Release memory held by Blob URL
        }

        return true; // Indicate success

    } catch (error) {
        console.error('Error generating PDF:', error);

        // Ensure cleanup even on error
        if (logoObjectUrl) {
            URL.revokeObjectURL(logoObjectUrl);
        }

        return false; // Indicate failure
    }
};


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
    // NOTE: This is a placeholder implementation.
    // Replace with your actual cover page HTML and CSS.
    // Use 'pt' units in CSS for sizes/margins/padding for better PDF consistency.
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const cardColors = [ /* ... your color definitions ... */ ]; // Define your card colors here

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Training Plan Quote</title>
        <style>
            /* --- PASTE YOUR COVER PAGE CSS HERE --- */
            /* Ensure styles are compatible with html2canvas */
            /* Use 'pt' units where possible */
            body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #fff; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            * { box-sizing: border-box; }
            .cover-container { padding: 40pt; width: 100%; }
            .quote-header { display: flex; justify-content: space-between; margin-bottom: 40pt; }
            .logo-container img { max-height: 60pt; }
            .quote-details h2 { font-size: 18pt; margin-bottom: 10pt; color: #005a9e; }
            /* ... other cover page styles ... */
             .plans-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20pt; }
             .card { border: 1px solid #eee; border-radius: 6pt; padding: 15pt; min-height: 180pt; /* ... */ }
             .card-name { font-size: 11pt; font-weight: 600; /* ... */ }
             .price { font-size: 12pt; font-weight: bold; text-align: right; margin-top: auto; /* ... */ }
             .quote-footer { text-align: center; margin-top: 40pt; padding-top: 15pt; border-top: 1px solid #eee; font-size: 9pt; color: #777; }
        </style>
    </head>
    <body>
        <div class="cover-container">
            <header class="quote-header">
                <div class="logo-container"><img src="${logoSrc}" alt="Logo"></div>
                <div class="quote-details">
                    <h2>Training Quote</h2>
                    <p><strong>Quote To:</strong> ${clientName || 'Valued Customer'}</p>
                    <p><strong>Quote Date:</strong> ${currentDate}</p>
                    <p><strong>Prepared By:</strong> ${userName || 'Specialist'}</p>
                    <p><strong>Quote ID:</strong> ${quoteId}</p>
                </div>
            </header>
            <main>
                <h3 style="text-align: center; font-size: 16pt; margin-bottom: 25pt;">Training Plan Options</h3>
                <div class="plans-container">
                    ${planCosts.map((plan, index) => `
                        <div class="card" style="border-color: #ccc; background-color: #f9f9f9;">
                             <div class="card-name">${plan.planName}</div>
                             <div class="body-text" style="flex-grow: 1; color: #555;">Option description placeholder...</div>
                             <div class="price">€ ${plan.totalCost.toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
            </main>
             <footer class="quote-footer">
                 <p>Thank you for your business!</p>
             </footer>
        </div>
    </body>
    </html>`;
};


// ===========================================================================
// Helper Function: Generate HTML for a Plan Details Page (Uses Option B CSS)
// ===========================================================================
const generatePlanDetailsPageHtml = (
    plan: PlanDetailsData,
    quoteId: string,
    logoSrc: string
): string => {
    const totalTrainingCost = plan.totalTrainingCost;
    const totalTripCost = plan.totalTripCost;
    const grandTotal = totalTrainingCost + totalTripCost;

    // Generate Gantt HTML using the dedicated function (Option B)
    const ganttSectionHTML = (plan.scheduledTasks && plan.scheduledTasks.length > 0)
      ? generateGanttChartHTML(plan.scheduledTasks)
      : `<div class="gantt-placeholder">No schedule data available.</div>`;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Training Plan Details - ${plan.planName}</title>
        <style>
            /* --- Base & Page Styles --- */
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.4; color: #2d3748; margin: 0; padding: 0; background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 9pt; }
            * { box-sizing: border-box; }
            /* Container class for the content jsPDF processes */
            .pdf-content-area { width: 100%; background-color: #ffffff; }
            h2, h3, h4 { margin-top: 1.2em; margin-bottom: 0.6em; color: #1a202c; }
            p { margin-bottom: 0.8em; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
            th, td { border: 1px solid #e2e8f0; padding: 5pt 7pt; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }

            /* --- PDF Specific Sections Styling --- */
            .details-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20pt; padding-bottom: 10pt; border-bottom: 1px solid #e2e8f0; page-break-after: avoid; break-after: avoid-page; }
            .logo-container img { height: 35pt; width: auto; max-width: 140pt; }
            .plan-title h2 { margin: 0; font-size: 16pt; font-weight: 600; color: #2d3748; }

            .section-title { font-size: 13pt; font-weight: 600; color: #2d3748; margin-bottom: 12pt; margin-top: 20pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt; page-break-after: avoid; break-after: avoid-page; }

            .resources-container { margin-bottom: 20pt; }
            .resource-card { border: 1px solid #e2e8f0; border-radius: 5pt; overflow: hidden; background-color: #fdfdff; margin-bottom: 10pt; page-break-inside: avoid; break-inside: avoid-page; }
            .resource-header { background-color: #f1f5f9; padding: 6pt 10pt; font-weight: 600; font-size: 10pt; color: #334155; border-bottom: 1px solid #e2e8f0; }
            .resource-details { padding: 10pt; display: grid; grid-template-columns: 1fr 1fr; grid-gap: 10pt; font-size: 8.5pt; }
            .detail-label { color: #64748b; display: block; margin-bottom: 2pt; font-size: 7.5pt; text-transform: uppercase;}
            .detail-value { font-weight: 500; color: #334155; }
            .detail-price { color: #10b981; font-weight: 600; float: right; }
            .subdetails { margin-top: 5pt; border-top: 1px dashed #e2e8f0; padding-top: 5pt; }
            .subdetail-row { display: flex; justify-content: space-between; color: #4a5568; margin-bottom: 2pt; }

            .cost-summary { margin-top: 20pt; padding: 12pt; background-color: #f8fafc; border-radius: 5pt; border: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid-page; page-break-before: auto; break-before: auto; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 5pt; color: #475569; font-size: 9.5pt; }
            .summary-row span:first-child { padding-right: 10pt; }
            .summary-row.total { margin-top: 7pt; padding-top: 7pt; border-top: 1px solid #cbd5e1; font-weight: 600; font-size: 10.5pt; color: #10b981; }

            .page-footer { margin-top: 25pt; text-align: center; color: #a0aec0; font-size: 7.5pt; border-top: 1px solid #e2e8f0; padding-top: 8pt; page-break-before: auto; break-before: auto; }
            .page-footer p { margin: 0; }

            /* --- GANTT CHART STYLES (Option B - Translated from CSS) --- */
            .gantt-container-pdf { border: 1px solid #cbd5e1; border-radius: 4pt; overflow: hidden; background-color: #ffffff; margin-top: 15pt; page-break-inside: avoid; }
            .gantt-header-pdf { background-color: #f1f5f9; padding: 8pt 10pt; border-bottom: 1px solid #cbd5e1; page-break-after: avoid; }
            .gantt-title-pdf { font-weight: 600; font-size: 11pt; color: #334155; }
            .gantt-placeholder { padding: 15pt; text-align: center; color: #64748b; font-style: italic; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
            .gantt-grid-pdf { display: flex; flex-direction: column; width: 100%; }
            .gantt-days-header-row-pdf { display: flex; background-color: #f8fafc; border-bottom: 1px solid #cbd5e1; flex-shrink: 0; page-break-inside: avoid; }
            .gantt-resource-header-pdf { width: 110pt; min-width: 110pt; padding: 5pt 8pt; font-size: 7.5pt; font-weight: 600; color: #4a5568; border-right: 1px solid #cbd5e1; text-align: center; }
            .gantt-days-scroll-header-pdf { flex: 1; display: flex; overflow: hidden; }
            .gantt-day-header-pdf { flex-basis: 20pt; flex-grow: 1; min-width: 15pt; text-align: center; padding: 5pt 0; font-size: 7pt; font-weight: 500; color: #64748b; border-right: 1px solid #eaf0f6; white-space: nowrap; }
            .gantt-day-header-pdf:last-child { border-right: none; }
            .gantt-resource-row-pdf { display: flex; border-bottom: 1px solid #eaf0f6; min-height: 25pt; page-break-inside: avoid; position: relative; background-color: #ffffff; }
            .gantt-resource-row-pdf:nth-child(even) { background-color: #fdfdff; }
            .gantt-resource-row-pdf:last-child { border-bottom: none; }
            .gantt-resource-name-pdf { width: 110pt; min-width: 110pt; padding: 6pt 8pt; font-size: 8pt; font-weight: 500; color: #334155; border-right: 1px solid #cbd5e1; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: center; }
            .gantt-resource-machine-pdf { display: block; font-size: 7.5pt; color: #4a5568; margin-top: 1pt; }
            .gantt-resource-machine-pdf.software-resource { font-style: italic; color: #5b21b6; }
            .gantt-days-container-pdf { flex: 1; position: relative; display: flex; }
            .gantt-day-cell-pdf { flex-basis: 20pt; flex-grow: 1; min-width: 15pt; border-right: 1px solid #f1f5f9; }
            .gantt-day-cell-pdf:last-child { border-right: none; }
            .gantt-task-pdf { position: absolute; top: 4pt; height: 17pt; border-radius: 3pt; background-color: #3B82F6; color: white; display: flex; align-items: center; justify-content: center; font-size: 7pt; font-weight: 500; overflow: hidden; white-space: nowrap; padding: 0 4pt; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 1px 2px rgba(0,0,0,0.1); z-index: 10; }
            .gantt-task-pdf.software-task { border-style: dashed; opacity: 0.9; }

        </style>
    </head>
    <body>
        <div class="pdf-content-area"> ${/* Use a class for the content wrapper */''}
            <header class="details-header">
                 <div class="plan-title"><h2>${plan.planName}</h2></div>
                 <div class="logo-container"><img src="${logoSrc}" alt="Logo"></div>
            </header>

            <section class="resources-container">
                <div class="section-title">Resource Allocation</div>
                ${plan.resources.map(resource => `
                    <div class="resource-card">
                        <div class="resource-header">${resource.resourceName}</div>
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

            <div class="gantt-container-pdf">
                 <div class="gantt-header-pdf">
                    <div class="gantt-title-pdf">Resource Training Schedule</div>
                 </div>
                 ${ganttSectionHTML} ${/* Inject generated Gantt HTML */''}
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
// Helper Function: Generate HTML for the Gantt Chart (Option B - Replicates Structure)
// ===========================================================================
function generateGanttChartHTML(tasks: ScheduledTaskSegment[]): string {
    if (!tasks || tasks.length === 0) {
      return `<div class="gantt-placeholder">No schedule data available.</div>`;
    }

    // --- Determine Time Scale ---
    let maxDay = 0;
    tasks.forEach(task => {
        const startDay = task.start_day ?? 0;
        const duration = task.duration_days ?? 0;
        const endDay = startDay + duration;
        if (endDay > maxDay) maxDay = endDay;
    });
    const totalDays = Math.max(maxDay + 5, 30); // Ensure min width, add buffer

    // --- Group Tasks ---
    const resourceMap = new Map<number, {
        name: string;
        items: { itemName: string; isSoftware: boolean; tasks: ScheduledTaskSegment[] }[]
    }>();

    tasks.forEach(task => {
        if (task.resource_id == null) return;
        if (!resourceMap.has(task.resource_id)) {
            resourceMap.set(task.resource_id, { name: task.resource_name || `Res ${task.resource_id}`, items: [] });
        }
        const resourceGroup = resourceMap.get(task.resource_id)!;
        const isSoftware = task.resource_category === 'Software';
        const itemName = task.machine_name || (isSoftware ? `${task.resource_name} SW` : 'General'); // Simplified item name

        let itemGroup = resourceGroup.items.find(item => item.itemName === itemName);
        if (!itemGroup) {
            itemGroup = { itemName, isSoftware, tasks: [] };
            resourceGroup.items.push(itemGroup);
        }
        itemGroup.tasks.push(task);
    });

    // Sort items (optional)
    resourceMap.forEach(group => group.items.sort((a, b) => (a.isSoftware === b.isSoftware) ? a.itemName.localeCompare(b.itemName) : (a.isSoftware ? 1 : -1)));

    // --- Generate Header Row HTML ---
    const daysHeaderCells = Array.from({ length: totalDays }, (_, i) => `<div class="gantt-day-header-pdf">D${i + 1}</div>`).join('');
    const ganttHeaderRow = `<div class="gantt-days-header-row-pdf"><div class="gantt-resource-header-pdf">Resource / Item</div><div class="gantt-days-scroll-header-pdf">${daysHeaderCells}</div></div>`;

    // --- Generate Data Rows HTML ---
    const resourceRows = Array.from(resourceMap.values()).map(resourceData => {
        return resourceData.items.map(itemData => {
            // Generate task bars for this item
            const taskBars = itemData.tasks.map(task => {
                const startDay = task.start_day ?? 0;
                const duration = task.duration_days ?? 0;
                if (startDay <= 0 || duration <= 0) return ''; // Skip invalid tasks for rendering

                const leftPercent = ((startDay - 1) / totalDays) * 100; // 0-based start
                const widthPercent = (duration / totalDays) * 100;
                const color = getResourceColorPdf(task.resource_id);
                const taskClass = `gantt-task-pdf ${itemData.isSoftware ? 'software-task' : ''}`;
                const titleText = `${itemData.itemName}: Day ${startDay}-${startDay + duration - 1} (${task.segment_hours}h)`;

                // Ensure percentages are within bounds
                const safeLeft = Math.max(0, Math.min(100, leftPercent));
                const safeWidth = Math.max(0.5, Math.min(100 - safeLeft, widthPercent)); // Min width 0.5%

                return `<div class="${taskClass}" style="left: ${safeLeft.toFixed(2)}%; width: ${safeWidth.toFixed(2)}%; background-color: ${color};" title="${titleText}">${task.segment_hours}h</div>`;
            }).join('');

            // Generate background day cells (optional visual grid)
            const dayCells = Array.from({ length: totalDays }, () => `<div class="gantt-day-cell-pdf"></div>`).join('');

            // Combine elements for the row
            return `
                <div class="gantt-resource-row-pdf">
                    <div class="gantt-resource-name-pdf">
                        ${resourceData.name}
                        <span class="gantt-resource-machine-pdf ${itemData.isSoftware ? 'software-resource' : ''}">${itemData.itemName}</span>
                    </div>
                    <div class="gantt-days-container-pdf">
                        ${dayCells}
                        ${taskBars}
                    </div>
                </div>`;
        }).join('');
    }).join('');

    // --- Return Combined Gantt HTML ---
    return `<div class="gantt-grid-pdf">${ganttHeaderRow}${resourceRows}</div>`;
}


// ===========================================================================
// Helper Function: Get Resource Color (PDF Safe)
// ===========================================================================
function getResourceColorPdf(id: number | null | undefined): string {
    const colors = [
      '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EF4444',
      '#EC4899', '#F59E0B', '#06B6D4', '#6366F1', '#D97706'
    ]; // Expanded color palette
    const validId = id ?? 0; // Default to 0 if null/undefined
    const index = Math.abs(validId) % colors.length;
    return colors[index];
}

// ===========================================================================
// Example Usage (How you might call this from your application)
// ===========================================================================
/*
async function triggerPdfGeneration() {
    // 1. Gather your data
    const quoteId = "c8dd698f-536b-4e2f-8642-f113d54b4663"; // Example
    const userName = "Your Name";
    const clientName = "Client Company Inc.";
    const planCostsData: PlanCostData[] = [ // Example summary data for cover page
        { planId: 1, planName: "Standard", trainingDays: 5, totalCost: 2630.00 },
        { planId: 2, planName: "Extended", trainingDays: 8, totalCost: 4100.00 },
    ];
    const planDetailsData: PlanDetailsData[] = [ // Example detail data for detail pages
        {
            planId: 1,
            planName: "Standard",
            trainingDays: 5, // This might be redundant if calculated below
            totalCost: 2630.00, // Grand total for the plan
            totalTrainingCost: 2190.00,
            totalTripCost: 440.00,
            resources: [
                { resourceId: 101, resourceName: "Commissioner", resourceIcon: null, hourlyRate: 0, totalHours: 0, trainingDaysCount: 5, businessTripDays: 7, trainingCost: 1650.00, tripCosts: { accommodationFood: 91, allowance: 84, pocketMoney: 105, total: 280.00 } },
                { resourceId: 102, resourceName: "Software Developer", resourceIcon: null, hourlyRate: 0, totalHours: 0, trainingDaysCount: 2, businessTripDays: 4, trainingCost: 540.00, tripCosts: { accommodationFood: 52, allowance: 48, pocketMoney: 60, total: 160.00 } }
            ],
            scheduledTasks: [ // Example task data - Populate with your actual scheduler output
                { id: 't1', resource_id: 101, resource_name: "Commissioner", machine_name: "Machine A", start_day: 2, duration_days: 3, segment_hours: 6, total_training_hours: 18, resource_category: 'Machine' },
                { id: 't2', resource_id: 101, resource_name: "Commissioner", machine_name: "Machine A", start_day: 5, duration_days: 2, segment_hours: 6, total_training_hours: 18, resource_category: 'Machine' }, // Continues after weekend?
                { id: 't3', resource_id: 102, resource_name: "Software Developer", resource_category: 'Software', start_day: 2, duration_days: 1, segment_hours: 8, total_training_hours: 8 },
                { id: 't4', resource_id: 102, resource_name: "Software Developer", resource_category: 'Software', start_day: 3, duration_days: 1, segment_hours: 1, total_training_hours: 8 }, // Short segment
            ]
        }
        // Add more PlanDetailsData objects if needed for other plans
    ];

    // 2. Call the generator function
    const success = await generateQuotePDF(
        quoteId,
        userName,
        clientName,
        planCostsData,
        planDetailsData
        // logoUrl (optional, defaults to placeholder)
    );

    if (success) {
        console.log("PDF generated successfully!");
    } else {
        console.error("PDF generation failed.");
    }
}

// You would call triggerPdfGeneration() from a button click or similar event.
*/