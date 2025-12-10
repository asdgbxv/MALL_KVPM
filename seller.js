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
};

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

async function loadProducts() {
  const grid = document.getElementById('sellerProducts');
  if (!grid) return;

  grid.innerHTML = '<p>Sedang memuatkan...</p>';

  try {
    let snapshot;
    try {
      snapshot = await db.collection('products').orderBy('created_at', 'desc').get();
    } catch (err) {
      console.warn('Order by created_at gagal, fallback tanpa susunan', err);
      snapshot = await db.collection('products').get();
    }

    if (snapshot.empty) {
      grid.innerHTML = '<p>Tiada produk lagi. Tambah produk pertama anda!</p>';
      return;
    }

    grid.innerHTML = '';
    snapshot.forEach(doc => {
      const p = doc.data();
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${p.image_url || 'https://via.placeholder.com/400x300'}" alt="${p.name}">
        <h3 class="title">${p.name}</h3>
        <div class="price">RM ${Number(p.price || 0).toFixed(2)}</div>
        <div class="stock">Stok: ${p.stock ?? '-'}</div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Gagal memuatkan produk', err);
    grid.innerHTML = '<p>Ralat memuatkan produk.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  seedAccounts();
  setSellerMode('login');
  renderAuthState();
  loadProducts();

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
        if (accounts.some(acc => acc.email === email)) {
          alert('Emel sudah wujud. Sila log masuk.');
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
});
