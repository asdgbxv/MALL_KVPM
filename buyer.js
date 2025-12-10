const CART_KEY = 'kvpm_cart';
const AUTH_KEY = 'kvpm_session';
const ACCOUNTS_KEY = 'kvpm_accounts';
let buyerAuthMode = 'login';

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
};

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
  toggleCart(true);
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
        <div class="price">RM ${(item.price || 0).toFixed(2)}</div>
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

  elements.cartTotal.textContent = `RM ${total.toFixed(2)}`;
  updateCartBadge(cart);
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
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? products.filter(p => (p.name || '').toLowerCase().includes(term))
      : products;

    if (!filtered.length) {
      elements.productsGrid.innerHTML = '<p>Tiada produk tersedia.</p>';
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
        <div class="price">RM ${priceVal.toFixed(2)}</div>
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

async function handleCheckout() {
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
  const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);

  if (elements.checkoutBtn) {
    elements.checkoutBtn.disabled = true;
    elements.checkoutBtn.textContent = 'Memproses...';
  }

  try {
    await db.runTransaction(async (tx) => {
      for (const item of cart) {
        const ref = db.collection('products').doc(item.id);
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new Error(`Produk "${item.name}" tiada.`);
        }
        const data = snap.data();
        const currentStock = Number(data.stock || 0);
        if (currentStock < item.qty) {
          throw new Error(`Stok ${item.name} tidak mencukupi. Tinggal ${currentStock}.`);
        }
        tx.update(ref, { stock: currentStock - item.qty });
      }
    });

    alert(`Checkout berjaya! Jumlah: RM ${total.toFixed(2)}. Pesanan akan diproses.`);
    saveCart([]);
    toggleCart(false);
    loadProducts();
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

function bindEvents() {
  if (elements.openCartBtn && elements.cartDrawer) {
    elements.openCartBtn.addEventListener('click', () => toggleCart());
  }

  if (elements.closeCartBtn) {
    elements.closeCartBtn.addEventListener('click', () => toggleCart(false));
  }

  if (elements.checkoutBtn) {
    elements.checkoutBtn.addEventListener('click', handleCheckout);
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      loadProducts(e.target.value);
    });
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
        if (accounts.some(acc => acc.email === email)) {
          alert('Emel sudah wujud. Sila log masuk.');
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
  loadProducts();
});
