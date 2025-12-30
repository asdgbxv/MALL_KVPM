const CART_KEY = 'kvpm_cart';
const AUTH_KEY = 'kvpm_session';
const ACCOUNTS_KEY = 'kvpm_accounts';
let buyerAuthMode = 'login';
let pendingOrder = null;

const elements = {
  productsGrid: document.getElementById('productsGrid'),
  cartDrawer: document.getElementById('cartDrawer'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  cartCount: document.getElementById('cartCount'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  closeCartBtn: document.getElementById('closeCartBtn'),
  searchInput: document.getElementById('search'),
  openCartBtn: document.getElementById('openCartBtn'),
  year: document.getElementById('year'),
  buyerEmail: document.getElementById('buyerEmail'),
  buyerPassword: document.getElementById('buyerPassword'),
  buyerLogoutBtn: document.getElementById('buyerLogoutBtn'),
  buyerAuthStatus: document.getElementById('buyerAuthStatus'),
  buyerSubmitBtn: document.getElementById('buyerSubmitBtn'),
  buyerTabLogin: document.getElementById('buyerTabLogin'),
  buyerTabRegister: document.getElementById('buyerTabRegister'),
  buyerAuthPanel: document.getElementById('buyerAuthPanel'),
  buyerOpenAuth: document.getElementById('buyerOpenAuth'),
  filterMinPrice: document.getElementById('filterMinPrice'),
  filterMaxPrice: document.getElementById('filterMaxPrice'),
  filterInStock: document.getElementById('filterInStock'),
  checkoutModal: document.getElementById('checkoutModal'),
  checkoutSummary: document.getElementById('checkoutSummary'),
  buyerPhone: document.getElementById('buyerPhone'),
  qrContainer: document.getElementById('qrContainer'),
  confirmPaymentBtn: document.getElementById('confirmPaymentBtn'),
  receiptContainer: document.getElementById('receiptContainer'),
  printReceiptBtn: document.getElementById('printReceiptBtn'),
  closeCheckoutBtn: document.getElementById('closeCheckoutBtn'),
};

function formatCurrency(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function setFooterYear() {
  if (elements.year) {
    elements.year.textContent = new Date().getFullYear();
  }
}

function seedAccounts() {
  if (localStorage.getItem(ACCOUNTS_KEY)) return;
  const defaults = [
    { email: 'pembeli@example.com', password: 'pembeli123', role: 'buyer' },
    { email: 'penjual@example.com', password: 'penjual123', role: 'seller' },
  ];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(defaults));
}

function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];
  } catch (err) {
    console.error('Gagal baca akaun', err);
    return [];
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch (err) {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  renderAuthState();
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
  renderAuthState();
}

function renderAuthState() {
  const user = getCurrentUser();
  if (!elements.buyerAuthStatus || !elements.buyerLogoutBtn || !elements.buyerSubmitBtn) return;

  if (user) {
    elements.buyerAuthStatus.textContent = `Status: Log masuk sebagai ${user.email} (${user.role})`;
    elements.buyerLogoutBtn.style.display = 'inline-flex';
    elements.buyerSubmitBtn.disabled = true;
    if (elements.buyerEmail) elements.buyerEmail.value = user.email;
    if (elements.buyerPassword) elements.buyerPassword.value = '';
  } else {
    elements.buyerAuthStatus.textContent = 'Status: belum log masuk';
    elements.buyerLogoutBtn.style.display = 'none';
    elements.buyerSubmitBtn.disabled = false;
  }
}

function setBuyerMode(mode) {
  buyerAuthMode = mode;
  if (elements.buyerTabLogin) elements.buyerTabLogin.classList.toggle('active', mode === 'login');
  if (elements.buyerTabRegister) elements.buyerTabRegister.classList.toggle('active', mode === 'register');
  if (elements.buyerSubmitBtn) {
    elements.buyerSubmitBtn.textContent = mode === 'login' ? 'Log Masuk' : 'Daftar & Log Masuk';
  }
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (err) {
    console.error('Gagal baca troli:', err);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge(cart);
  renderCart(cart);
}

function updateCartBadge(cart = getCart()) {
  if (!elements.cartCount) return;
  const totalQty = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  elements.cartCount.textContent = totalQty;
}

function toggleCart(forceOpen) {
  if (!elements.cartDrawer) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !elements.cartDrawer.classList.contains('open');
  elements.cartDrawer.classList.toggle('open', shouldOpen);
}

function addToCart(id, name, price, image, stock) {
  const cart = getCart();
  const existing = cart.find(item => item.id === id);

  const available = typeof stock === 'number' ? stock : undefined;

  if (existing) {
    if (typeof available === 'number') {
      existing.stock = available;
      if (existing.qty >= available) {
        alert('Stok tidak mencukupi.');
        return;
      }
    }
    existing.qty += 1;
  } else {
    if (typeof available === 'number' && available <= 0) {
      alert('Stok habis.');
      return;
    }
    cart.push({ id, name, price, image, qty: 1, stock: available });
  }
  saveCart(cart);
}

function changeQty(id, delta) {
  const cart = getCart();
  const idx = cart.findIndex(entry => entry.id === id);
  if (idx === -1) return;

  if (delta === 'remove') {
    cart.splice(idx, 1);
  } else {
    const maxStock = cart[idx].stock;
    if (delta === 1 && typeof maxStock === 'number' && cart[idx].qty >= maxStock) {
      alert('Stok tidak mencukupi.');
      return;
    }
    const nextQty = (cart[idx].qty || 0) + delta;
    if (nextQty <= 0) {
      cart.splice(idx, 1);
    } else {
      cart[idx].qty = nextQty;
    }
  }

  saveCart(cart);
}

function renderCart(cart = getCart()) {
  if (!elements.cartItems || !elements.cartTotal) return;

  if (!cart.length) {
    elements.cartItems.innerHTML = '<p>Troli kosong.</p>';
    elements.cartTotal.textContent = 'RM 0';
    updateCartBadge(cart);
    return;
  }

  elements.cartItems.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    total += (item.price || 0) * (item.qty || 0);
    const node = document.createElement('div');
    node.className = 'cart-item';
    node.innerHTML = `
      <div>
        <div class="name">${item.name}</div>
        <div class="muted">Qty: ${item.qty}</div>
      </div>
      <div class="cart-actions">
        <div class="price">${formatCurrency(item.price || 0)}</div>
        <div class="qty-controls">
          <button class="btn small" data-action="dec" data-id="${item.id}">-</button>
          <button class="btn small" data-action="inc" data-id="${item.id}">+</button>
          <button class="btn small danger" data-action="remove" data-id="${item.id}">Buang</button>
        </div>
      </div>
    `;
    elements.cartItems.appendChild(node);
  });

  elements.cartItems.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.getAttribute('data-action');
      const id = e.currentTarget.getAttribute('data-id');
      if (action === 'inc') changeQty(id, 1);
      if (action === 'dec') changeQty(id, -1);
      if (action === 'remove') changeQty(id, 'remove');
    });
  });

  elements.cartTotal.textContent = formatCurrency(total);
  updateCartBadge(cart);
}

function getFilters() {
  const minVal = parseFloat(elements.filterMinPrice?.value);
  const maxVal = parseFloat(elements.filterMaxPrice?.value);
  const minPrice = Number.isFinite(minVal) ? Math.max(0, minVal) : null;
  const maxPrice = Number.isFinite(maxVal) ? Math.max(0, maxVal) : null;
  const inStockOnly = elements.filterInStock ? elements.filterInStock.checked : true;
  return { minPrice, maxPrice, inStockOnly };
}

async function loadProducts(searchTerm = '') {
  if (!elements.productsGrid) return;
  elements.productsGrid.innerHTML = '<p>Sedang memuatkan produk...</p>';

  try {
    let snap;
    try {
      snap = await db.collection('products').orderBy('created_at', 'desc').get();
    } catch (err) {
      console.warn('Order by created_at gagal, fallback tanpa susunan', err);
      snap = await db.collection('products').get();
    }

    const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const searchTermClean = (typeof searchTerm === 'string' ? searchTerm : elements.searchInput?.value || '').trim().toLowerCase();
    const { minPrice, maxPrice, inStockOnly } = getFilters();

    const filtered = products.filter(p => {
      const stockVal = Number(p.stock ?? 0);
      const priceVal = Number(p.price || 0);
      const nameMatch = searchTermClean ? (p.name || '').toLowerCase().includes(searchTermClean) : true;
      const minMatch = minPrice === null ? true : priceVal >= minPrice;
      const maxMatch = maxPrice === null ? true : priceVal <= maxPrice;
      const stockMatch = inStockOnly ? stockVal > 0 : true;
      return nameMatch && minMatch && maxMatch && stockMatch;
    });

    if (!filtered.length) {
      elements.productsGrid.innerHTML = '<p>Tiada produk tersedia (mungkin stok habis atau penapis terlalu ketat).</p>';
      return;
    }

    elements.productsGrid.innerHTML = '';
    filtered.forEach(p => {
      const imageUrl = p.image_url || 'https://via.placeholder.com/400x300';
      const priceVal = Number(p.price || 0);
      const stockVal = Number(p.stock ?? 0);
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${imageUrl}" alt="${p.name}">
        <h3 class="title">${p.name}</h3>
        <div class="price">${formatCurrency(priceVal)}</div>
        <div class="stock">Stok: ${Number.isFinite(stockVal) ? stockVal : '-'}</div>
        <button class="btn small add-to-cart">${stockVal > 0 ? 'Tambah ke Troli' : 'Habis Stok'}</button>
      `;

      const addBtn = card.querySelector('.add-to-cart');
      addBtn.disabled = !Number.isFinite(stockVal) ? false : stockVal <= 0;
      addBtn.addEventListener('click', () => {
        addToCart(p.id, p.name, priceVal, imageUrl, Number.isFinite(stockVal) ? stockVal : undefined);
      });

      elements.productsGrid.appendChild(card);
    });
  } catch (err) {
    console.error('Gagal memuatkan produk', err);
    elements.productsGrid.innerHTML = '<p>Gagal memuatkan produk. Cuba lagi.</p>';
  }
}

function openCheckoutModal() {
  if (elements.checkoutModal) {
    elements.checkoutModal.classList.add('open');
  }
  if (elements.buyerPhone) {
    elements.buyerPhone.focus();
  }
}

function resetCheckoutUI() {
  pendingOrder = null;
  if (elements.qrContainer) elements.qrContainer.innerHTML = '';
  if (elements.receiptContainer) elements.receiptContainer.style.display = 'none';
  if (elements.printReceiptBtn) elements.printReceiptBtn.style.display = 'none';
  if (elements.confirmPaymentBtn) {
    elements.confirmPaymentBtn.disabled = false;
    elements.confirmPaymentBtn.textContent = 'Sahkan & Hantar Resit';
  }
}

function closeCheckoutModal() {
  resetCheckoutUI();
  if (elements.checkoutModal) {
    elements.checkoutModal.classList.remove('open');
  }
}

function renderCheckoutSummary(order) {
  if (!elements.checkoutSummary) return;
  if (!order || !order.items.length) {
    elements.checkoutSummary.innerHTML = '<p>Tiada item dalam troli.</p>';
    return;
  }
  const lines = order.items
    .map(item => `<li>${item.name} x${item.qty} — ${formatCurrency((item.price || 0) * (item.qty || 0))}</li>`)
    .join('');
  elements.checkoutSummary.innerHTML = `
    <div class="summary-row"><span>Jumlah item</span><strong>${order.items.length}</strong></div>
    <ul>${lines}</ul>
    <div class="summary-row"><span>Jumlah perlu dibayar</span><strong>${formatCurrency(order.total)}</strong></div>
  `;
}

function generateQrForOrder(order) {
  if (!elements.qrContainer || !order) return;
  elements.qrContainer.innerHTML = `
    <img src="maybank-qr.png" alt="QR Maybank" class="qr-static">
    <p class="muted" style="text-align:center;">Jumlah perlu dibayar: ${formatCurrency(order.total)}<br>Imbas QR ini di aplikasi Maybank / DuitNow.</p>
  `;
}

async function startCheckoutFlow() {
  const cart = getCart();
  if (!cart.length) {
    alert('Troli kosong. Tambah produk dahulu.');
    return;
  }
  const user = getCurrentUser();
  if (!user || user.role !== 'buyer') {
    alert('Sila log masuk sebagai pembeli sebelum checkout.');
    return;
  }

  resetCheckoutUI();

  if (elements.checkoutBtn) {
    elements.checkoutBtn.disabled = true;
    elements.checkoutBtn.textContent = 'Memeriksa stok...';
  }

  try {
    const freshItems = [];
    for (const item of cart) {
      const ref = db.collection('products').doc(item.id);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new Error(`Produk "${item.name}" tiada.`);
      }
      const data = snap.data();
      const currentStock = Number(data.stock || 0);
      if (currentStock < item.qty) {
        throw new Error(`Stok ${data.name || item.name} tidak mencukupi. Tinggal ${currentStock}.`);
      }
      const price = Number(data.price || item.price || 0);
      freshItems.push({
        ...item,
        name: data.name || item.name,
        price,
        stock: currentStock,
        sellerEmail: data.seller_email || 'unknown',
        image: data.image_url || item.image,
      });
    }

    const total = freshItems.reduce((sum, itm) => sum + (itm.price || 0) * (itm.qty || 0), 0);
    pendingOrder = { items: freshItems, total, buyerEmail: user.email };

    renderCheckoutSummary(pendingOrder);
    generateQrForOrder(pendingOrder);
    toggleCart(false);
    openCheckoutModal();
  } catch (err) {
    console.error('Checkout gagal', err);
    alert(err.message || 'Checkout gagal. Cuba lagi.');
  } finally {
    if (elements.checkoutBtn) {
      elements.checkoutBtn.disabled = false;
      elements.checkoutBtn.textContent = 'Checkout';
    }
  }
}

function renderReceipt(receiptData) {
  if (!elements.receiptContainer) return;
  const itemsHtml = receiptData.items
    .map(item => {
      const lineTotal = formatCurrency((item.price || 0) * (item.qty || 0));
      return `
        <div class="receipt-item-row">
          <div>
            <div class="item-name">${item.name}</div>
            <div class="muted small">Qty ${item.qty} @ ${formatCurrency(item.price || 0)}</div>
          </div>
          <div class="item-amount">${lineTotal}</div>
        </div>
      `;
    })
    .join('');
  const warning = receiptData.saveWarning
    ? `<p class="muted text-danger">Amaran: ${receiptData.saveWarning}</p>`
    : '';
  elements.receiptContainer.innerHTML = `
    <div class="receipt-header">
      <div class="receipt-brand">
        <div class="badge-text">Resit Pembayaran</div>
        <h3>KVPM Mall</h3>
      </div>
      <div class="receipt-ref">
        <span>No. Resit</span>
        <strong>${receiptData.receiptNumber || receiptData.id}</strong>
      </div>
    </div>
    <div class="receipt-meta">
      <div>
        <span>Emel Pembeli</span>
        <strong>${receiptData.buyerEmail}</strong>
      </div>
      <div>
        <span>No. Telefon</span>
        <strong>${receiptData.buyerPhone}</strong>
      </div>
      <div>
        <span>Tarikh</span>
        <strong>${receiptData.createdAt ? receiptData.createdAt.toLocaleString() : new Date().toLocaleString()}</strong>
      </div>
    </div>
    <div class="receipt-items">
      <div class="receipt-items-header">
        <h4>Butiran Pesanan</h4>
        <span class="muted">Bayaran diterima</span>
      </div>
      ${itemsHtml}
    </div>
    <div class="receipt-total">
      <span>Jumlah Dibayar</span>
      <strong>${formatCurrency(receiptData.total)}</strong>
    </div>
    ${warning}
    <p class="muted receipt-footer-note">Terima kasih kerana membeli di KVPM Mall. Simpan resit ini sebagai bukti pembayaran.</p>
  `;
  elements.receiptContainer.style.display = 'block';
  if (elements.printReceiptBtn) {
    elements.printReceiptBtn.style.display = 'inline-flex';
  }
}

async function confirmPayment() {
  if (!pendingOrder || !pendingOrder.items.length) {
    alert('Tiada pesanan untuk diproses.');
    return;
  }
  const user = getCurrentUser();
  if (!user || user.role !== 'buyer') {
    alert('Sesi tamat. Sila log masuk semula.');
    return;
  }
  const phone = (elements.buyerPhone?.value || '').trim();
  if (!phone) {
    alert('Masukkan nombor telefon sebelum membuat bayaran.');
    return;
  }

  if (elements.confirmPaymentBtn) {
    elements.confirmPaymentBtn.disabled = true;
    elements.confirmPaymentBtn.textContent = 'Memproses & menjana resit...';
  }

  try {
    const orderItems = [];
    await db.runTransaction(async (tx) => {
      for (const item of pendingOrder.items) {
        const ref = db.collection('products').doc(item.id);
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new Error(`Produk "${item.name}" tiada.`);
        }
        const data = snap.data();
        const currentStock = Number(data.stock || 0);
        if (currentStock < item.qty) {
          throw new Error(`Stok ${data.name || item.name} tidak mencukupi. Tinggal ${currentStock}.`);
        }
        const price = Number(data.price || item.price || 0);
        const sellerEmail = data.seller_email || item.sellerEmail || 'unknown';
        orderItems.push({
          productId: item.id,
          name: data.name || item.name,
          qty: item.qty,
          price,
          sellerEmail,
        });
        tx.update(ref, { stock: currentStock - item.qty });
      }
    });

    const paidTotal = orderItems.reduce((sum, itm) => sum + (itm.price || 0) * (itm.qty || 0), 0);
    const sellerTotals = orderItems.reduce((map, itm) => {
      const key = itm.sellerEmail || 'unknown';
      map[key] = (map[key] || 0) + (itm.price || 0) * (itm.qty || 0);
      return map;
    }, {});
    const sellerEmails = Object.keys(sellerTotals).filter(Boolean);
    const receiptNumber = `ORD-${Date.now()}`;
    const receiptData = {
      receiptNumber,
      buyerEmail: user.email,
      buyerPhone: phone,
      total: paidTotal,
      items: orderItems,
      createdAt: new Date(),
    };

    try {
      const orderDoc = await db.collection('orders').add({
        buyerEmail: user.email,
        buyerPhone: phone,
        items: orderItems,
        total: paidTotal,
        seller_totals: sellerTotals,
        seller_emails: sellerEmails,
        receipt_number: receiptNumber,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      receiptData.id = orderDoc.id;
    } catch (saveErr) {
      console.error('Gagal simpan rekod pesanan, resit masih dijana', saveErr);
      receiptData.saveWarning = 'Rekod pesanan tidak sempat disimpan. Simpan resit ini sebagai bukti bayaran.';
    }

    renderReceipt(receiptData);

    saveCart([]);
    pendingOrder = null;
    loadProducts();
  } catch (err) {
    console.error('Checkout gagal', err);
    alert(err.message || 'Checkout gagal. Cuba lagi.');
  } finally {
    if (elements.confirmPaymentBtn) {
      elements.confirmPaymentBtn.disabled = false;
      elements.confirmPaymentBtn.textContent = 'Sahkan & Hantar Resit';
    }
  }
}

function bindEvents() {
  if (elements.openCartBtn && elements.cartDrawer) {
    elements.openCartBtn.addEventListener('click', () => toggleCart());
  }

  if (elements.closeCartBtn) {
    elements.closeCartBtn.addEventListener('click', () => toggleCart(false));
  }

  if (elements.checkoutBtn) {
    elements.checkoutBtn.addEventListener('click', startCheckoutFlow);
  }

  if (elements.confirmPaymentBtn) {
    elements.confirmPaymentBtn.addEventListener('click', confirmPayment);
  }

  if (elements.closeCheckoutBtn) {
    elements.closeCheckoutBtn.addEventListener('click', closeCheckoutModal);
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      loadProducts(e.target.value);
    });
  }

  if (elements.filterMinPrice) {
    elements.filterMinPrice.addEventListener('input', () => loadProducts(elements.searchInput?.value || ''));
  }
  if (elements.filterMaxPrice) {
    elements.filterMaxPrice.addEventListener('input', () => loadProducts(elements.searchInput?.value || ''));
  }
  if (elements.filterInStock) {
    elements.filterInStock.addEventListener('change', () => loadProducts(elements.searchInput?.value || ''));
  }

  if (elements.printReceiptBtn) {
    elements.printReceiptBtn.addEventListener('click', () => window.print());
  }

  if (elements.buyerOpenAuth && elements.buyerAuthPanel) {
    elements.buyerOpenAuth.addEventListener('click', () => {
      elements.buyerAuthPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (elements.buyerTabLogin) {
    elements.buyerTabLogin.addEventListener('click', () => setBuyerMode('login'));
  }
  if (elements.buyerTabRegister) {
    elements.buyerTabRegister.addEventListener('click', () => setBuyerMode('register'));
  }

  if (elements.buyerSubmitBtn) {
    elements.buyerSubmitBtn.addEventListener('click', () => {
      seedAccounts();
      const email = (elements.buyerEmail?.value || '').trim().toLowerCase();
      const password = elements.buyerPassword?.value || '';
      if (!email || !password) {
        alert('Isi emel dan kata laluan.');
        return;
      }
      const accounts = getAccounts();
      if (buyerAuthMode === 'register') {
        const existingSameRole = accounts.find(acc => acc.email === email && acc.role === 'buyer');
        if (existingSameRole) {
          alert('Emel sudah wujud untuk peranan Pembeli. Sila log masuk.');
          setBuyerMode('login');
          return;
        }
        accounts.push({ email, password, role: 'buyer' });
        saveAccounts(accounts);
        alert('Pendaftaran berjaya. Anda kini log masuk.');
        setCurrentUser({ email, role: 'buyer' });
      } else {
        const account = accounts.find(acc => acc.email === email && acc.role === 'buyer');
        if (!account || account.password !== password) {
          alert('Emel/kata laluan tidak sah atau bukan pembeli.');
          return;
        }
        setCurrentUser({ email, role: 'buyer' });
        alert('Log masuk berjaya.');
      }
    });
  }

  if (elements.buyerLogoutBtn) {
    elements.buyerLogoutBtn.addEventListener('click', () => {
      clearSession();
      alert('Anda telah log keluar.');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  bindEvents();
  seedAccounts();
  setBuyerMode('login');
  renderAuthState();
  renderCart();
  updateCartBadge();
  if (elements.filterInStock) {
    elements.filterInStock.checked = true;
  }
  loadProducts();
});

