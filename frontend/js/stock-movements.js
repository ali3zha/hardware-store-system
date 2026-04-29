
const movementsData = [
    { movement_id: 1001, product_name: "Stanley Claw Hammer", product_id: "H-8821", type: "Restock", qty: 25, price: 450.00, reason: "New Inventory", moved_at: "2026-04-29 10:30 AM" },
    { movement_id: 1002, product_name: "Boysen Latex White", product_id: "P-4432", type: "Sale", qty: -5, price: 680.00, reason: "Customer Purchase", moved_at: "2026-04-29 02:15 PM" },
    { movement_id: 1003, product_name: "Omni LED Bulb 9W", product_id: "E-1055", type: "Adjustment", qty: -1, price: 145.00, reason: "Damaged Stock", moved_at: "2026-04-28 09:00 AM" },
    { movement_id: 1004, product_name: "Adjustable Wrench", product_id: "H-1234", type: "Restock", qty: 10, price: 320.00, reason: "Restock Order", moved_at: "2026-04-27 11:45 AM" }
];

function renderMovementsTable(data) {
    const tableBody = document.getElementById("movementTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = ""; 

    data.forEach(item => {
        const isPositive = item.qty > 0;
        
        const typeTag = item.type === 'Restock' ? 'tag-ok' : (item.type === 'Sale' ? 'tag-low' : '');
        
   
        const qtyColor = isPositive ? '#16a34a' : '#dc2626'; 
        const qtyIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';

        const row = `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 15px; color: #64748b; font-weight: 500;">#${item.movement_id}</td>
                <td>
                    <div style="font-weight: 600; color: #0f172a;">${item.product_name}</div>
                    <small style="color: #94a3b8;">PID: ${item.product_id}</small>
                </td>
                <td><span class="tag ${typeTag}" style="padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;">${item.type}</span></td>
                <td style="color: ${qtyColor}; font-weight: bold;">
                    <i class="fas ${qtyIcon}" style="font-size: 10px;"></i> ${isPositive ? '+' : ''}${item.qty}
                </td>
                <td style="font-weight: 600; color: #0f172a;">₱${item.price.toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
                <td style="color: #64748b;">${item.reason}</td>
                <td style="color: #64748b; font-size: 13px;">${item.moved_at}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}


function filterMovements() {
    const searchText = document.getElementById('movementSearch').value.toLowerCase();
    const typeValue = document.getElementById('typeFilter').value;

    const filtered = movementsData.filter(item => {
        const matchesSearch = item.product_name.toLowerCase().includes(searchText) || 
                              item.product_id.toLowerCase().includes(searchText) ||
                              item.movement_id.toString().includes(searchText);
        
        const matchesType = typeValue === "" || item.type === typeValue;

        return matchesSearch && matchesType;
    });

    renderMovementsTable(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
   
    renderMovementsTable(movementsData);

    document.getElementById('movementSearch').addEventListener('input', filterMovements);

    
    document.getElementById('typeFilter').addEventListener('change', filterMovements);
});