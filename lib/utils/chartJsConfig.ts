import { Chart as ChartJS, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

/**
 * --- Chart.js Configuration ---
 * This file handles the one-time registration of all necessary Chart.js components.
 * In Chart.js v3 and later, components (known as "scales", "elements", etc.) must be
 * explicitly registered before they can be used in a chart. This process is called "tree-shaking"
 * and helps to reduce the final bundle size by only including the parts of the library that are actually used.
 *
 * This function should be imported and called once at the top level of the application,
 * for example, in `index.js` or `App.js`.
 */
const setupChartJs = (): void => {
    ChartJS.register(
        Tooltip,        // For displaying tooltips on hover
        Legend,         // For displaying the chart's legend
        CategoryScale,  // The x-axis for bar charts
        LinearScale,    // The y-axis for bar charts
        BarElement,     // The actual bar shape in the chart
        Title           // For displaying a title at the top of the chart
    );
};

export default setupChartJs;

