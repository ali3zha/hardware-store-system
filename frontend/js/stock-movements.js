async function fetchMovements() {
    try {
        const response = await fetch('/api/movements'); 
        const data = await response.json();
        renderMovements(data);
    } catch (error) {
        console.error("Error loading stock movements:", error);
    }
}

function renderMovements(data) {
    const tableBody = document.getElementById("movementTableBody");
    
    tableBody.innerHTML = data.map(m => {
        const isPositive = m.qty > 0;
        const typeClass = m.type === 'Restock' ? 'tag-ok' : (m.type === 'Sale' ? 'tag-low' : '');
        
        // Currency formatting for Philippine Peso
        const formatPHP = (num) => new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(num);

        return `
            <tr>
                <td><code style="color: #64748b;">#${m.movement_id}</code></td>
                <td>
                    <div class="product-meta" style="display: flex; align-items: center; gap: 12px;">
                        <div class="product-thumb" style="width: 40px; height: 40px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
                             <i class="fas fa-box" style="color: #cbd5e1;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 700; color: #1e293b;">${m.product_name}</div>
                            <small style="color: #94a3b8;">PID: ${m.product_id}</small>
                        </div>
                    </div>
                </td>
                <td><span class="tag ${typeClass}">${m.type}</span></td>
                <td style="font-weight: 800; color: ${isPositive ? '#16a34a' : '#dc2626'};">
                    ${isPositive ? '+' : ''}${m.qty}
                </td>
                <td style="font-weight: 600;">${formatPHP(m.price || 0)}</td>
                <td style="color: #475569; font-style: italic;">${m.reason || 'No remarks'}</td>
                <td style="color: #64748b; font-size: 0.85rem;">
                    ${new Date(m.moved_at).toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', fetchMovements);