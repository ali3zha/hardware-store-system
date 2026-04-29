const products = [
    { name: "Stanley Claw Hammer", cat: "Hand Tools", stock: "24 pcs", price: 450.00, img: "https://images.unsplash.com/photo-1586864387917-f749f55939b7?w=200" },
    { name: "Adjustable Wrench", cat: "Hand Tools", stock: "15 pcs", price: 320.00, img: "https://images.unsplash.com/photo-1620055375740-9a25039304a0?w=200" },
    { name: "Boysen Latex White", cat: "Paints", stock: "12 pcs", price: 680.00, img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200" },
    { name: "Bosch Cordless Drill", cat: "Power Tools", stock: "8 pcs", price: 3200.00, img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200" },
    { name: "Omni LED Bulb 9W", cat: "Electrical", stock: "50 pcs", price: 145.00, img: "https://images.unsplash.com/photo-1550985616-10810253b84d?w=200" },
    { name: "PVC Pipe 1/2 Blue", cat: "Plumbing", stock: "100 pcs", price: 85.00, img: "https://images.unsplash.com/photo-1581094288338-2314dddb7ec4?w=200" }
];

function filterData(category) {
    document.getElementById('tableTitle').innerText = "Showing: " + (category === 'All' ? 'All Items' : category);
    const body = document.getElementById('inventoryBody');
    body.innerHTML = "";

    const filtered = products.filter(p => category === 'All' || p.cat === category);

    filtered.forEach(p => {
        // Peso format logic
        const formattedPrice = p.price.toLocaleString('en-PH', { minimumFractionDigits: 2 });
        
        body.innerHTML += `
            <tr onclick="openOrder('${p.name}', '${p.cat}', '${formattedPrice}', '${p.img}')" style="cursor:pointer;">
                <td>
                    <div class="product-meta" style="display:flex; align-items:center; gap:12px;">
                        <img src="${p.img}" class="product-thumb" style="width:45px; height:45px; border-radius:10px; object-fit:cover;">
                        <strong>${p.name}</strong>
                    </div>
                </td>
                <td>${p.cat}</td>
                <td><span class="tag tag-ok" style="background:#dcfce7; color:#166534; padding:5px 10px; border-radius:8px;">${p.stock}</span></td>
                <td style="font-weight: 700; color: var(--black);">₱${formattedPrice}</td>
            </tr>`;
    });
}

function openOrder(name, cat, price, img) {
    document.getElementById('modalName').innerText = name;
    document.getElementById('modalCat').innerText = cat;
    document.getElementById('modalPrice').innerText = "₱" + price;
    document.getElementById('modalImg').src = img;
    document.getElementById('orderModal').style.display = "block";
}

function closeModal() {
    document.getElementById('orderModal').style.display = "none";
}

function confirmOrder() {
    const name = document.getElementById('modalName').innerText;
    alert("Order Successful!\n\nYour request for " + name + " has been added to the system.");
    closeModal();
}

window.onload = () => filterData('All');