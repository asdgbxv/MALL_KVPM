const AUTH_KEY = 'kvpm_session';
const ACCOUNTS_KEY = 'kvpm_accounts';

let loginMode = 'login'; // or register
let loginRole = 'buyer'; // or seller

const els = {
  year: document.getElementById('year'),
  loginTab: document.getElementById('loginTab'),
  registerTab: document.getElementById('registerTab'),
  roleBuyer: document.getElementById('roleBuyer'),
  roleSeller: document.getElementById('roleSeller'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginSubmit: document.getElementById('loginSubmit'),
  loginStatus: document.getElementById('loginStatus'),
  loginToDashboard: document.getElementById('loginToDashboard'),
  loginLogout: document.getElementById('loginLogout'),
  loginRoleBadge: document.getElementById('loginRoleBadge'),
  loginTitle: document.getElementById('loginTitle'),
};

function setFooterYear() {
  if (els.year) {
    els.year.textContent = new Date().getFullYear();
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
  renderState();
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
  renderState();
}

function renderState() {
  const user = getCurrentUser();
  if (!els.loginStatus) return;
  if (user) {
    els.loginStatus.textContent = `Status: Log masuk sebagai ${user.email} (${user.role})`;
    if (els.loginSubmit) els.loginSubmit.disabled = false;
    if (els.loginPassword) els.loginPassword.value = '';
    if (els.loginEmail) els.loginEmail.value = user.email;
    if (els.loginToDashboard) {
      els.loginToDashboard.style.display = 'inline-flex';
      els.loginToDashboard.textContent = user.role === 'seller' ? 'Ke Dashboard Penjual' : 'Ke Kedai Pembeli';
    }
    if (els.loginLogout) els.loginLogout.style.display = 'inline-flex';
    setRole(user.role);
  } else {
    els.loginStatus.textContent = 'Status: belum log masuk';
    if (els.loginSubmit) els.loginSubmit.disabled = false;
    if (els.loginToDashboard) els.loginToDashboard.style.display = 'none';
    if (els.loginLogout) els.loginLogout.style.display = 'none';
  }
}

function setRole(role) {
  loginRole = role;
  if (els.roleBuyer) els.roleBuyer.classList.toggle('active', role === 'buyer');
  if (els.roleSeller) els.roleSeller.classList.toggle('active', role === 'seller');
  if (els.loginRoleBadge) els.loginRoleBadge.textContent = role === 'buyer' ? 'Pembeli' : 'Penjual';
  if (els.loginTitle) els.loginTitle.textContent = role === 'buyer' ? 'Log masuk KVPM Mall' : 'Log masuk Dashboard Penjual';
}

function setMode(mode) {
  loginMode = mode;
  if (els.loginTab) els.loginTab.classList.toggle('active', mode === 'login');
  if (els.registerTab) els.registerTab.classList.toggle('active', mode === 'register');
  if (els.loginSubmit) els.loginSubmit.textContent = mode === 'login' ? 'Log Masuk' : 'Daftar & Log Masuk';
}

function redirectToRole(role) {
  if (role === 'seller') {
    location.href = 'seller.html';
  } else {
    location.href = 'buyer.html';
  }
}

function handleSubmit() {
  seedAccounts();
  const email = (els.loginEmail?.value || '').trim().toLowerCase();
  const password = els.loginPassword?.value || '';
  if (!email || !password) {
    alert('Isi emel dan kata laluan.');
    return;
  }
  const accounts = getAccounts();
  if (loginMode === 'register') {
    const existingSameRole = accounts.find(acc => acc.email === email && acc.role === loginRole);
    if (existingSameRole) {
      alert('Emel sudah wujud untuk peranan ini. Sila log masuk.');
      setMode('login');
      return;
    }
    accounts.push({ email, password, role: loginRole });
    saveAccounts(accounts);
    alert('Pendaftaran berjaya. Anda kini log masuk.');
    setCurrentUser({ email, role: loginRole });
    redirectToRole(loginRole);
  } else {
    const account = accounts.find(acc => acc.email === email && acc.role === loginRole);
    if (!account || account.password !== password) {
      alert('Emel/kata laluan salah atau peranan tidak sepadan.');
      return;
    }
    setCurrentUser({ email, role: loginRole });
    alert('Log masuk berjaya.');
    redirectToRole(loginRole);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  seedAccounts();
  setRole('buyer');
  setMode('login');
  renderState();

  if (els.loginTab) {
    els.loginTab.addEventListener('click', () => setMode('login'));
  }
  if (els.registerTab) {
    els.registerTab.addEventListener('click', () => setMode('register'));
  }
  if (els.roleBuyer) {
    els.roleBuyer.addEventListener('click', () => setRole('buyer'));
  }
  if (els.roleSeller) {
    els.roleSeller.addEventListener('click', () => setRole('seller'));
  }
  if (els.loginSubmit) {
    els.loginSubmit.addEventListener('click', handleSubmit);
  }
  if (els.loginToDashboard) {
    els.loginToDashboard.addEventListener('click', () => {
      const user = getCurrentUser();
      if (user) redirectToRole(user.role);
    });
  }
  if (els.loginLogout) {
    els.loginLogout.addEventListener('click', () => {
      clearSession();
      alert('Anda telah log keluar.');
    });
  }
});
