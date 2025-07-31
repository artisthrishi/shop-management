// Simple PDF export using browser's print functionality
export const exportToPDF = (
  title: string = 'Sales Report',
  salesSummary: any,
  paymentStats: any,
  topSellingProducts: any[],
  lowStockProducts: any[]
) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.error('PDF export is only available in browser environment');
    return;
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  // Get the current date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN');
  const timeStr = now.toLocaleTimeString('en-IN');

  // Generate the content HTML
  let contentHtml = '';

  // Sales Summary Section
  if (salesSummary) {
    contentHtml += `
      <div class="section">
        <h2>Sales Summary</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Total Sales</div>
            <div class="metric-value">₹${salesSummary.totalSales.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Estimated Profit</div>
            <div class="metric-value">₹${salesSummary.estimatedProfit.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Number of Checkouts</div>
            <div class="metric-value">${salesSummary.checkouts.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Items Sold</div>
            <div class="metric-value">${salesSummary.itemsSold.toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
  }

  // Payment Methods Section
  if (paymentStats) {
    contentHtml += `
      <div class="section">
        <h2>Payment Methods</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Transactions</th>
              <th>Amount</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cash</td>
              <td>${paymentStats.cash.count}</td>
              <td>₹${paymentStats.cash.amount.toLocaleString()}</td>
              <td>${paymentStats.total.amount > 0 ? Math.round((paymentStats.cash.amount / paymentStats.total.amount) * 100) : 0}%</td>
            </tr>
            <tr>
              <td>Card</td>
              <td>${paymentStats.card.count}</td>
              <td>₹${paymentStats.card.amount.toLocaleString()}</td>
              <td>${paymentStats.total.amount > 0 ? Math.round((paymentStats.card.amount / paymentStats.total.amount) * 100) : 0}%</td>
            </tr>
            <tr>
              <td>UPI</td>
              <td>${paymentStats.upi.count}</td>
              <td>₹${paymentStats.upi.amount.toLocaleString()}</td>
              <td>${paymentStats.total.amount > 0 ? Math.round((paymentStats.upi.amount / paymentStats.total.amount) * 100) : 0}%</td>
            </tr>
            <tr style="font-weight: bold; background-color: #f3f4f6;">
              <td>Total</td>
              <td>${paymentStats.total.count}</td>
              <td>₹${paymentStats.total.amount.toLocaleString()}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // Top Selling Products Section
  if (topSellingProducts.length > 0) {
    contentHtml += `
      <div class="section">
        <h2>Top Selling Products</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Product</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${topSellingProducts.map((product, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>₹${product.revenue.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Low Stock Products Section
  if (lowStockProducts.length > 0) {
    contentHtml += `
      <div class="section">
        <h2>Low Stock Alert</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Current Stock</th>
              <th>Minimum Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${lowStockProducts.map(product => `
              <tr>
                <td>${product.name}</td>
                <td>${product.currentStock}</td>
                <td>${product.minStock}</td>
                <td style="color: #dc2626; font-weight: bold;">Low Stock</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Create the complete HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: #1f2937;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .section {
          margin-bottom: 20px;
        }
        .section h2 {
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .metric-card {
          border: 1px solid #e5e7eb;
          padding: 15px;
          border-radius: 8px;
          background-color: #f9fafb;
        }
        .metric-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        .metric-value {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .table th, .table td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          text-align: left;
        }
        .table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .table tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Generated on ${dateStr} at ${timeStr}</p>
      </div>
      
      <div id="content">
        ${contentHtml}
      </div>
      
      <div class="footer">
        <p>Generated by Shop Manager MVP</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
};

 