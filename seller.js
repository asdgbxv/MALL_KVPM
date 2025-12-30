function setFooterYear() {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

const AUTH_KEY = 'kvpm_session';
const ACCOUNTS_KEY = 'kvpm_accounts';
let sellerAuthMode = 'login';

const sellerEls = {
  authStatus: document.getElementById('sellerAuthStatus'),
  logoutBtn: document.getElementById('sellerLogoutBtn'),
  loginBtn: document.getElementById('sellerLoginBtn'),
  registerBtn: document.getElementById('sellerRegisterBtn'),
  emailInput: document.getElementById('sellerEmail'),
  passwordInput: document.getElementById('sellerPassword'),
  tabLogin: document.getElementById('sellerTabLogin'),
  tabRegister: document.getElementById('sellerTabRegister'),
  submitBtn: document.getElementById('sellerSubmitBtn'),
  openAuthBtn: document.getElementById('sellerOpenAuth'),
  authPanel: document.getElementById('sellerAuthPanel'),
  productsGrid: document.getElementById('sellerProducts'),
  refreshSalesBtn: document.getElementById('refreshSalesBtn'),
  printChartBtn: document.getElementById('printChartBtn'),
  salesSummary: document.getElementById('salesSummary'),
  salesChart: document.getElementById('salesChart'),
};

function formatCurrency(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
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
  loadProducts();
  loadSales();
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
  renderAuthState();
  loadProducts();
  loadSales();
}

function setSellerMode(mode) {
  sellerAuthMode = mode;
  if (sellerEls.tabLogin) sellerEls.tabLogin.classList.toggle('active', mode === 'login');
  if (sellerEls.tabRegister) sellerEls.tabRegister.classList.toggle('active', mode === 'register');
  if (sellerEls.submitBtn) {
    sellerEls.submitBtn.textContent = mode === 'login' ? 'Log Masuk' : 'Daftar & Log Masuk';
  }
}

function renderAuthState() {
  const user = getCurrentUser();
  const { authStatus, logoutBtn, submitBtn, emailInput } = sellerEls;
  if (!authStatus || !logoutBtn || !submitBtn) return;

  if (user) {
    authStatus.textContent = `Status: Log masuk sebagai ${user.email} (${user.role})`;
    logoutBtn.style.display = 'inline-flex';
    submitBtn.disabled = true;
    if (emailInput) emailInput.value = user.email;
    if (sellerEls.passwordInput) sellerEls.passwordInput.value = '';
  } else {
    authStatus.textContent = 'Status: belum log masuk';
    logoutBtn.style.display = 'none';
    submitBtn.disabled = false;
  }
}

async function addProduct() {
  const nameInput = document.getElementById('p_name');
  const priceInput = document.getElementById('p_price');
  const stockInput = document.getElementById('p_stock');
  const fileInput = document.getElementById('p_image');

  const name = nameInput.value.trim();
  const price = Number(priceInput.value);
  const stock = Number(stockInput.value);
  const file = fileInput.files[0];

  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
    alert('Isi nama produk, harga (>0), dan stok (>=0).');
    return;
  }

  const user = getCurrentUser();
  if (!user || user.role !== 'seller') {
    alert('Sila log masuk sebagai penjual untuk tambah produk.');
    return;
  }

  let imageUrl = 'https://via.placeholder.com/400x300';

  try {
    if (file) {
      // Simpan dengan nama unik dan pastikan ada contentType
      const ref = storage.ref('products/' + Date.now() + '_' + file.name);
      await ref.put(file, { contentType: file.type || 'image/jpeg' });
      imageUrl = await ref.getDownloadURL();
    }

    await db.collection('products').add({
      name,
      price,
      stock,
      image_url: imageUrl,
      seller_email: user.email,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
    });

    alert('Produk berjaya ditambah!');
    nameInput.value = '';
    priceInput.value = '';
    stockInput.value = '';
    fileInput.value = '';
    loadProducts();
  } catch (err) {
    console.error('Gagal tambah produk', err);
    alert(err.message || 'Tambah produk gagal. Cuba lagi.');
  }
}

async function saveProductEdit(card) {
  const id = card.getAttribute('data-id');
  const nameInput = card.querySelector('[data-field="name"]');
  const priceInput = card.querySelector('[data-field="price"]');
  const stockInput = card.querySelector('[data-field="stock"]');
  const name = nameInput.value.trim();
  const price = Number(priceInput.value);
  const stock = Number(stockInput.value);
  const user = getCurrentUser();

  if (!user || user.role !== 'seller') {
    alert('Sesi tamat. Sila log masuk semula.');
    return;
  }
  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
    alert('Pastikan nama tidak kosong, harga > 0 dan stok >= 0.');
    return;
  }

  try {
    await db.collection('products').doc(id).update({
      name,
      price,
      stock,
      seller_email: user.email,
    });
    alert('Produk dikemaskini & stok ditetapkan semula.');
    loadProducts();
  } catch (err) {
    console.error('Gagal kemaskini produk', err);
    alert(err.message || 'Kemaskini gagal. Cuba lagi.');
  }
}

async function loadProducts() {
  const grid = sellerEls.productsGrid;
  if (!grid) return;
  const user = getCurrentUser();
  if (!user || user.role !== 'seller') {
    grid.innerHTML = '<p>Log masuk sebagai penjual untuk lihat dan kemaskini produk.</p>';
    return;
  }

  grid.innerHTML = '<p>Sedang memuatkan...</p>';

  try {
    let snapshot;
    try {
      snapshot = await db.collection('products').orderBy('created_at', 'desc').get();
    } catch (err) {
      console.warn('Order by created_at gagal, fallback tanpa susunan', err);
      snapshot = await db.collection('products').get();
    }

    const products = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => !p.seller_email || p.seller_email === user.email);

    if (!products.length) {
      grid.innerHTML = '<p>Tiada produk lagi. Tambah produk pertama anda!</p>';
      return;
    }

    grid.innerHTML = '';
    products.forEach(p => {
      const card = document.createElement('div');
      const priceVal = Number(p.price || 0);
      const stockVal = Number(p.stock ?? 0);
      card.className = 'card seller-card';
      card.setAttribute('data-id', p.id);
      card.innerHTML = `
        <img src="${p.image_url || 'https://via.placeholder.com/400x300'}" alt="${p.name}">
        <h3 class="title">${p.name}</h3>
        <div class="muted">Pemilik: ${p.seller_email || 'Belum ditetapkan (akan diambil alih oleh anda)'}</div>
        <div class="price">${formatCurrency(priceVal)}</div>
        <div class="stock">Stok semasa: ${stockVal}</div>
        <div class="form-row">
          <label>Nama Produk</label>
          <input data-field="name" value="${p.name || ''}">
        </div>
        <div class="form-row">
          <label>Harga (RM)</label>
          <input data-field="price" type="number" min="0" step="0.01" value="${priceVal.toFixed(2)}">
        </div>
        <div class="form-row">
          <label>Stok baharu (boleh tambah walaupun stok 0)</label>
          <input data-field="stock" type="number" min="0" step="1" value="${stockVal}">
        </div>
        <button class="btn small" data-action="save">Simpan & Restock</button>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('[data-action="save"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.seller-card');
        saveProductEdit(card);
      });
    });
  } catch (err) {
    console.error('Gagal memuatkan produk', err);
    grid.innerHTML = '<p>Ralat memuatkan produk.</p>';
  }
}

function drawSalesChart(labels, values) {
  const canvas = sellerEls.salesChart;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth || 600;
  const height = canvas.height || 260;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (!labels.length) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px Arial';
    ctx.fillText('Tiada data jualan lagi.', 20, height / 2);
    return;
  }

  const padding = 40;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const maxVal = Math.max(...values, 1);
  const barSpace = chartWidth / labels.length;
  const barWidth = Math.max(20, barSpace * 0.6);

  ctx.strokeStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  ctx.fillStyle = '#0b5ed7';
  ctx.textAlign = 'center';
  ctx.font = '12px Arial';

  labels.forEach((label, idx) => {
    const barHeight = (values[idx] / maxVal) * chartHeight;
    const x = padding + idx * barSpace + (barSpace - barWidth) / 2;
    const y = height - padding - barHeight;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillText(formatCurrency(values[idx]), x + barWidth / 2, y - 6);
    ctx.fillText(label.slice(5), x + barWidth / 2, height - padding + 14);
  });
}

async function loadSales() {
  const user = getCurrentUser();
  const summaryEl = sellerEls.salesSummary;
  if (!user || user.role !== 'seller') {
    if (summaryEl) summaryEl.textContent = 'Log masuk untuk melihat graf jualan anda.';
    if (sellerEls.salesChart) {
      const ctx = sellerEls.salesChart.getContext('2d');
      ctx.clearRect(0, 0, sellerEls.salesChart.width, sellerEls.salesChart.height);
    }
    return;
  }

  if (summaryEl) summaryEl.textContent = 'Sedang memuatkan jualan...';

  try {
    let snapshot;
    try {
      snapshot = await db.collection('orders')
        .where('seller_emails', 'array-contains', user.email)
        .orderBy('created_at', 'desc')
        .limit(60)
        .get();
    } catch (err) {
      console.warn('Order by created_at gagal, fallback tanpa susunan', err);
      snapshot = await db.collection('orders')
        .where('seller_emails', 'array-contains', user.email)
        .get();
    }

    if (snapshot.empty) {
      if (summaryEl) summaryEl.textContent = 'Belum ada jualan untuk dipaparkan.';
      if (sellerEls.salesChart) drawSalesChart([], []);
      return;
    }

    const totalsByDate = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const fallbackTotal = (data.items || []).reduce((sum, item) => {
        return item.sellerEmail === user.email ? sum + (Number(item.price || 0) * (item.qty || 0)) : sum;
      }, 0);
      const totalForSeller = (data.seller_totals && data.seller_totals[user.email]) || fallbackTotal;
      const created = data.created_at?.toDate ? data.created_at.toDate() : new Date();
      const key = created.toISOString().slice(0, 10);
      totalsByDate[key] = (totalsByDate[key] || 0) + totalForSeller;
    });

    const labels = Object.keys(totalsByDate).sort();
    const values = labels.map(label => totalsByDate[label]);
    drawSalesChart(labels, values);
    const total = values.reduce((sum, v) => sum + v, 0);
    if (summaryEl) summaryEl.textContent = `Jumlah jualan anda: ${formatCurrency(total)} (${labels.length} hari terkini)`;
  } catch (err) {
    console.error('Gagal memuatkan jualan', err);
    if (summaryEl) summaryEl.textContent = 'Ralat memuatkan jualan. Cuba lagi.';
  }
}

function bindEvents() {
  if (sellerEls.openAuthBtn && sellerEls.authPanel) {
    sellerEls.openAuthBtn.addEventListener('click', () => {
      sellerEls.authPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (sellerEls.tabLogin) {
    sellerEls.tabLogin.addEventListener('click', () => setSellerMode('login'));
  }
  if (sellerEls.tabRegister) {
    sellerEls.tabRegister.addEventListener('click', () => setSellerMode('register'));
  }

  if (sellerEls.submitBtn) {
    sellerEls.submitBtn.addEventListener('click', () => {
      seedAccounts();
      const email = (sellerEls.emailInput?.value || '').trim().toLowerCase();
      const password = sellerEls.passwordInput?.value || '';
      if (!email || !password) {
        alert('Isi emel dan kata laluan.');
        return;
      }
      const accounts = getAccounts();
      if (sellerAuthMode === 'register') {
        const existingSameRole = accounts.find(acc => acc.email === email && acc.role === 'seller');
        if (existingSameRole) {
          alert('Emel sudah wujud untuk peranan Penjual. Sila log masuk.');
          setSellerMode('login');
          return;
        }
        accounts.push({ email, password, role: 'seller' });
        saveAccounts(accounts);
        alert('Pendaftaran penjual berjaya. Anda kini log masuk.');
        setCurrentUser({ email, role: 'seller' });
      } else {
        const account = accounts.find(acc => acc.email === email && acc.role === 'seller');
        if (!account || account.password !== password) {
          alert('Emel/kata laluan tidak sah atau bukan penjual.');
          return;
        }
        setCurrentUser({ email, role: 'seller' });
        alert('Log masuk berjaya.');
      }
    });
  }

  if (sellerEls.logoutBtn) {
    sellerEls.logoutBtn.addEventListener('click', () => {
      clearSession();
      alert('Anda telah log keluar.');
    });
  }

  if (sellerEls.refreshSalesBtn) {
    sellerEls.refreshSalesBtn.addEventListener('click', loadSales);
  }

  if (sellerEls.printChartBtn) {
    sellerEls.printChartBtn.addEventListener('click', () => window.print());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  seedAccounts();
  setSellerMode('login');
  renderAuthState();
  loadProducts();
  loadSales();
  bindEvents();
});
