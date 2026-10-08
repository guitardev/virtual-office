
// Page routing
const pages = ['dashboard', 'chat', 'task', 'meetings', 'carbooking', 'user'];
const sidebarToggle = document.getElementById('sidebarToggle');

// Toggle sidebar on mobile
sidebarToggle.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Nav links — show pages
document.querySelectorAll('.sidebar-nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target page
    document.getElementById(`page-${page}`).classList.add('active');
    // Update active nav
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  });
});

// Login form
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.textContent = '✅ เข้าสู่ระบบ...';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
    // Redirect to dashboard (in real app: check auth)
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-dashboard').classList.add('active');
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector('.sidebar-nav a[data-page="dashboard"]').classList.add('active');
  }, 600);
});

// Close sidebar on outside click (mobile)
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  if (!sidebar.contains(e.target) && e.target !== toggle) {
    sidebar.classList.remove('open');
  }
});
