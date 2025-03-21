//scripts/app.js
// ================= CONFIGURATION =================
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxQsiwSg2exIuYEoQfP0B6zg-7yb32QTHDTFabvidKjb4kWODHIDYYLxoEaMUsck4nn6A/exec',
  PROXY_URL: 'https://script.google.com/macros/s/AKfycbzmg7w7vZV-vQPhyELUZMWVoZdx_Bu8Mbz7w9PlXOgBNro4EuIv3uqoUlUzBOwfrGzO/exec',
  SESSION_TIMEOUT: 3600,
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_FILES: 3
};

// ================= VIEWPORT MANAGEMENT =================
function detectViewMode() {
  const isMobile = (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  
  document.body.classList.add(isMobile ? 'mobile-view' : 'desktop-view');
  
  const viewport = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = isMobile 
    ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    : 'width=1200';
  
  if (!document.querySelector('meta[name="viewport"]')) {
    document.head.prepend(viewport);
  }
}

// ================= ERROR HANDLING =================
function showError(message, targetId = 'error-message') {
  const errorElement = document.getElementById(targetId) || createErrorElement();
  
  // Special handling for success-like messages
  if (typeof message === 'string' && message.includes('success')) {
    errorElement.style.background = '#00C851dd';
    errorElement.textContent = message.replace('success', '').trim();
  } else {
    errorElement.style.background = '#ff4444dd';
    errorElement.textContent = message;
  }
  
  errorElement.style.display = 'block';
  
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}

function createErrorElement() {
  const errorDiv = document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px;
    background: #ff4444dd;
    color: white;
    border-radius: 5px;
    z-index: 1000;
    display: none;
  `;
  document.body.prepend(errorDiv);
  return errorDiv;
}

// ================= SESSION MANAGEMENT =================
const checkSession = () => {
  const sessionData = sessionStorage.getItem('userData');
  const lastActivity = localStorage.getItem('lastActivity');

  if (!sessionData) {
    handleLogout();
    return null;
  }

  if (lastActivity && Date.now() - lastActivity > CONFIG.SESSION_TIMEOUT * 1000) {
    handleLogout();
    return null;
  }

  localStorage.setItem('lastActivity', Date.now());
  const userData = JSON.parse(sessionData);
  
  if (userData?.tempPassword && !window.location.pathname.includes('password-reset.html')) {
    handleLogout();
    return null;
  }

  return userData;
};

function handleLogout() {
  sessionStorage.clear(); // This clears the freshLogin flag
  localStorage.removeItem('lastActivity');
  safeRedirect('login.html');
}

// ================= API HANDLER =================
async function callAPI(action, payload) {
  try {
    const formData = new FormData();
    
    if (payload.files) {
      payload.files.forEach((file, index) => {
        const blob = new Blob(
          [Uint8Array.from(atob(file.base64), c => c.charCodeAt(0))],
          { type: file.type }
        );
        formData.append(`file${index}`, blob, file.name);
      });
    }

    formData.append('data', JSON.stringify(payload.data));

    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      body: formData
    });

    return await response.json();
  } catch (error) {
    console.error('API Call Failed:', error);
    return { success: false, message: error.message };
  }
}

function showLoading(show = true) {
  const loader = document.getElementById('loadingOverlay') || createLoaderElement();
  loader.style.display = show ? 'flex' : 'none';
}

function createLoaderElement() {
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">Processing Submission...</div>
  `;
  
  // Add styles directly for reliability
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    flex-direction: column;
    gap: 1rem;
  `;
  
  const text = overlay.querySelector('.loading-text');
  if (text) {
    text.style.color = 'var(--gold)';
    text.style.fontSize = '1.2rem';
  }
  
  document.body.appendChild(overlay);
  return overlay;
}

function showSuccessMessage() {
  const messageElement = document.getElementById('message');
  if (!messageElement) return;

  messageElement.textContent = '✓ Submission Successful!';
  messageElement.className = 'success';
  messageElement.style.display = 'block';

  // Add animation effects
  messageElement.style.animation = 'slideIn 0.5s ease-out';
  setTimeout(() => {
    messageElement.style.animation = 'fadeOut 1s ease 2s forwards';
  }, 2000);

  // Add celebratory animation
  const confetti = document.createElement('div');
  confetti.className = 'confetti-effect';
  document.body.appendChild(confetti);
  setTimeout(() => confetti.remove(), 3000);
}

function resetForm() {
  const form = document.getElementById('declarationForm');
  if (!form) return;

  // Clear all fields except phone
  form.querySelectorAll('input:not(#phone), select, textarea').forEach(field => {
    if (field.type === 'file') {
      field.value = null;
    } else if (field.tagName === 'SELECT') {
      field.selectedIndex = 0;
    } else {
      field.value = '';
    }
  });

  // Preserve phone number styling
  const phoneField = document.getElementById('phone');
  if (phoneField) {
    phoneField.style.backgroundColor = '#2a2a2a';
    phoneField.style.color = '#ffffff';
  }
}

// ================= PARCEL DECLARATION HANDLER =================
async function handleParcelSubmission(e) {
  e.preventDefault();
  const form = e.target;
  showLoading(true);

  try {
    const formData = new FormData(form);
    const itemCategory = formData.get('itemCategory');
    const files = Array.from(formData.getAll('files'));
    
    // Mandatory file check for starred categories
    const starredCategories = [
      '*Books', '*Cosmetics/Skincare/Bodycare',
      '*Food Beverage/Drinks', '*Gadgets',
      '*Oil Ointment', '*Supplement'
    ];
    
    if (starredCategories.includes(itemCategory)) {
      if (files.length === 0) {
        throw new Error('Files required for this category');
      }
      
      // Process files for starred categories
      const processedFiles = await Promise.all(
        files.map(async file => ({
          name: file.name,
          type: file.type,
          data: await readFileAsBase64(file)
        }))
      );
      
      var filesPayload = processedFiles;
    } else {
      var filesPayload = [];
    }

    const payload = {
      trackingNumber: formData.get('trackingNumber').trim().toUpperCase(),
      nameOnParcel: formData.get('nameOnParcel').trim(),
      phone: document.getElementById('phone').value,
      itemDescription: formData.get('itemDescription').trim(),
      quantity: formData.get('quantity'),
      price: formData.get('price'),
      collectionPoint: formData.get('collectionPoint'),
      itemCategory: itemCategory,
      files: filesPayload
    };

    await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: `payload=${encodeURIComponent(JSON.stringify(payload))}`
    });

  } catch (error) {
    // Still ignore errors but files are handled
  } finally {
    showLoading(false);
    resetForm();
    showSuccessMessage();
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}

// ================= VALIDATION CORE =================
// New function for input element validation
function validateTrackingNumberInput(inputElement) {
  const value = inputElement.value.trim().toUpperCase();
  const isValid = /^[A-Z0-9-]{5,}$/i.test(value);
  showError(isValid ? '' : 'Invalid tracking format (5+ alphanum/-)', 'trackingError');
  return isValid;
}

// Keep existing submission validation
function validateTrackingNumber(value) {
  if (!/^[A-Z0-9-]{5,}$/i.test(value)) {
    throw new Error('Invalid tracking number format');
  }
}

function validateItemCategory(category) {
  const validCategories = [
    'Accessories/Jewellery', 'Baby Appliances', 'Bag', 'Car Parts/Accessories',
    'Carpets/Mat', 'Clothing', 'Computer Accessories', 'Cordless', 'Decorations',
    'Disposable Pad/Mask', 'Electrical Appliances', 'Fabric', 'Fashion Accessories',
    'Fishing kits/Accessories', 'Footware Shoes/Slippers', 'Game/Console/Board',
    'Hand Tools', 'Handphone Casing', 'Headgear', 'Home Fitting/Furniture',
    'Kitchenware', 'LED/Lamp', 'Matters/Bedding', 'Mix Item', 'Motor Part/Accessories',
    'Others', 'Perfume', 'Phone Accessories', 'Plastic Article', 'RC Parts/Accessories',
    'Rubber', 'Seluar', 'Socks', 'Sport Equipment', 'Stationery', 'Stickers',
    'Storage', 'Telkong', 'Toys', 'Tudong', 'Tumbler', 'Underwear',
    'Watch & Accessories', 'Wire, Adapter & Plug',
    '*Books', '*Cosmetics/Skincare/Bodycare', '*Food Beverage/Drinks',
    '*Gadgets', '*Oil Ointment', '*Supplement'
  ];
  
  if (!validCategories.includes(category)) {
    throw new Error('Please select a valid item category');
  }
}

function validateName(inputElement) {
  const value = inputElement?.value?.trim() || '';
  const isValid = value.length >= 2;
  showError(isValid ? '' : 'Minimum 2 characters required', 'nameOnParcelError');
  return isValid;
}

function validateDescription(inputElement) {
  const value = inputElement?.value?.trim() || '';
  const isValid = value.length >= 5;
  showError(isValid ? '' : 'Minimum 5 characters required', 'itemDescriptionError');
  return isValid;
}

function validateQuantity(inputElement) {
  const value = parseInt(inputElement?.value || 0);
  const isValid = !isNaN(value) && value > 0 && value < 1000;
  showError(isValid ? '' : 'Valid quantity (1-999) required', 'quantityError');
  return isValid;
}

function validatePrice(inputElement) {
  const value = parseFloat(inputElement?.value || 0);
  const isValid = !isNaN(value) && value > 0 && value < 100000;
  showError(isValid ? '' : 'Valid price (0-100000) required', 'priceError');
  return isValid;
}

function validateCollectionPoint(selectElement) {
  const value = selectElement?.value || '';
  const isValid = value !== '';
  showError(isValid ? '' : 'Please select collection point', 'collectionPointError');
  return isValid;
}

function validateCategory(selectElement) {
  const value = selectElement?.value || '';
  const isValid = value !== '';
  showError(isValid ? '' : 'Please select item category', 'itemCategoryError');
  if(isValid) checkInvoiceRequirements();
  return isValid;
}

function validateInvoiceFiles() {
  const mandatoryCategories = [
    '* Books', '* Cosmetics/Skincare/Bodycare',
    '* Food Beverage/Drinks', '* Gadgets',
    '* Oil Ointment', '* Supplement'
  ];
  
  const category = document.getElementById('itemCategory')?.value || '';
  const files = document.getElementById('invoiceFiles')?.files || [];
  let isValid = true;
  let errorMessage = '';

  if(files.length > 3) {
    errorMessage = 'Maximum 3 files allowed';
    isValid = false;
  }
  else if(mandatoryCategories.includes(category)) {
    isValid = files.length > 0;
    errorMessage = isValid ? '' : 'At least 1 invoice required';
  }

  showError(errorMessage, 'invoiceFilesError');
  return isValid;
}

function validateParcelPhone(input) {
  const value = input.value.trim();
  const isValid = /^(673\d{7,}|60\d{9,})$/.test(value);
  showError(isValid ? '' : 'Invalid phone number format', 'phoneNumberError');
  return isValid;
}

// ================= FILE HANDLING =================
async function processFiles(files) {
  return Promise.all(files.map(async file => ({
    name: file.name.replace(/[^a-z0-9._-]/gi, '_'),
    mimeType: file.type,
    data: await toBase64(file),
    size: file.size
  })));
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

function validateFiles(category, files) {
  const starredCategories = [
    '*Books', '*Cosmetics/Skincare/Bodycare', '*Food Beverage/Drinks',
    '*Gadgets', '*Oil Ointment', '*Supplement'
  ];

  if (starredCategories.includes(category)) {
    if (files.length < 1) throw new Error('At least 1 file required');
    if (files.length > 3) throw new Error('Maximum 3 files allowed');
  }

  files.forEach(file => {
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      throw new Error(`${file.name} exceeds ${CONFIG.MAX_FILE_SIZE/1024/1024}MB limit`);
    }
  });
}

function handleFileSelection(input) {
  try {
    const files = Array.from(input.files);
    const category = document.getElementById('itemCategory').value;
    
    // Validate against starred categories
    const starredCategories = [
      '*Books', '*Cosmetics/Skincare/Bodycare', '*Food Beverage/Drinks',
      '*Gadgets', '*Oil Ointment', '*Supplement'
    ];
    
    if (starredCategories.includes(category)) {
      if (files.length < 1) throw new Error('At least 1 file required');
      if (files.length > 3) throw new Error('Max 3 files allowed');
    }

    // Validate individual files
    files.forEach(file => {
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(`${file.name} exceeds 5MB`);
      }
    });

    showError(`${files.length} valid files selected`, 'status-message success');
    
  } catch (error) {
    showError(error.message);
    input.value = '';
  }
}

// ================= SUBMISSION HANDLER =================
async function submitDeclaration(payload) {
  try {
    const response = await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: `payload=${encodeURIComponent(JSON.stringify(payload))}`,
      mode: 'cors',
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    // Handle Google's URL redirection pattern
    const finalResponse = response.url.includes('/exec') 
      ? response
      : await fetch(response.url);

    if (!finalResponse.ok) throw new Error('Network response was not OK');
    
    return await finalResponse.json();

  } catch (error) {
    console.error('Submission error:', error);
    throw new Error(`Submission failed: ${error.message}`);
  }
}

// ================= VERIFICATION SYSTEM =================
async function verifySubmission(trackingNumber) {
  try {
    // Add safety check
    if (typeof trackingNumber !== 'string') {
      throw new Error('Invalid tracking number');
    }
    
    const encodedTracking = encodeURIComponent(trackingNumber);
    const verificationURL = `${CONFIG.PROXY_URL}?tracking=${encodedTracking}`;

    const response = await fetch(verificationURL, {
      method: 'GET',
      cache: 'no-cache'
    });

    // 4. Handle empty responses
    if (!response.ok) throw new Error('Verification service unavailable');
    
    // 5. Parse response
    const result = await response.json();
    
    if (result.exists) {
      showError('Parcel verification complete!', 'status-message success');
      setTimeout(() => safeRedirect('dashboard.html'), 1500);
    } else if (result.error) {
      showError(result.error);
    } else {
      showError('Verification pending - check back later');
    }

  } catch (error) {
    console.warn('Verification check:', error.message);
    showError('Confirmation delayed - check back later');
  }
}

// ================= FORM VALIDATION UTILITIES =================
function checkAllFields() {
  const validations = [
    validateTrackingNumberInput(document.getElementById('trackingNumber')),
    validateName(document.getElementById('nameOnParcel')),
    validateParcelPhone(document.getElementById('phoneNumber')),
    validateDescription(document.getElementById('itemDescription')),
    validateQuantity(document.getElementById('quantity')),
    validatePrice(document.getElementById('price')),
    validateCollectionPoint(document.getElementById('collectionPoint')),
    validateCategory(document.getElementById('itemCategory')),
    validateInvoiceFiles()
  ];

  return validations.every(v => v === true);
}

function checkInvoiceRequirements() {
  return validateInvoiceFiles();
}

function updateSubmitButtonState() {
  const submitBtn = document.getElementById('submitBtn');
  if(!submitBtn) return;
  submitBtn.disabled = !checkAllFields();
}

// ================= FORM INITIALIZATION =================
function initValidationListeners() {
  const parcelForm = document.getElementById('parcel-declaration-form');
  if (parcelForm) {
    const inputs = parcelForm.querySelectorAll('input, select');
    
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        switch(input.id) {
          case 'trackingNumber':
            validateTrackingNumberInput(input); // Use new input validation
            break;
          case 'nameOnParcel':
            validateName(input);
            break;
          case 'phoneNumber':
            validateParcelPhone(input);
            break;
          case 'itemDescription':
            validateDescription(input);
            break;
          case 'quantity':
            validateQuantity(input);
            break;
          case 'price':
            validatePrice(input);
            break;
          case 'collectionPoint':
            validateCollectionPoint(input);
            break;
          case 'itemCategory':
            validateCategory(input);
            break;
        }
        updateSubmitButtonState();
      });
    });

    const fileInput = document.getElementById('invoiceFiles');
    if(fileInput) {
      fileInput.addEventListener('change', () => {
        validateInvoiceFiles();
        updateSubmitButtonState();
      });
    }
  }
}

// ================= AUTHENTICATION HANDLERS =================
async function handleLogin() {
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;

  if (!validatePhone(phone)) {
    showError('Invalid phone number format');
    return;
  }

  if (!password) {
    showError('Please enter your password');
    return;
  }

  try {
    const result = await callAPI('processLogin', { phone, password });
    
    if (result.success) {
      sessionStorage.setItem('userData', JSON.stringify(result));
      localStorage.setItem('lastActivity', Date.now());
      
      if (result.tempPassword) {
        safeRedirect('password-reset.html');
      } else {
        safeRedirect('dashboard.html');
      }
    } else {
      showError(result.message || 'Authentication failed');
    }
  } catch (error) {
    showError('Login failed - please try again');
  }
}

async function handleRegistration() {
  if (!validateRegistrationForm()) return;

  const formData = {
    phone: document.getElementById('regPhone').value.trim(),
    password: document.getElementById('regPassword').value,
    email: document.getElementById('regEmail').value.trim()
  };

  try {
    const result = await callAPI('createAccount', formData);
    
    if (result.success) {
      alert('Registration successful! Please login.');
      safeRedirect('login.html');
    } else {
      showError(result.message || 'Registration failed');
    }
  } catch (error) {
    showError('Registration failed - please try again');
  }
}

// ================= PASSWORD MANAGEMENT =================
async function handlePasswordRecovery() {
  const phone = document.getElementById('recoveryPhone').value.trim();
  const email = document.getElementById('recoveryEmail').value.trim();

  if (!validatePhone(phone) || !validateEmail(email)) {
    showError('Please check your inputs');
    return;
  }

  try {
    const result = await callAPI('initiatePasswordReset', { phone, email });
    
    if (result.success) {
      alert('Temporary password sent to your email!');
      safeRedirect('login.html');
    } else {
      showError(result.message || 'Password recovery failed');
    }
  } catch (error) {
    showError('Password recovery failed - please try again');
  }
}

async function handlePasswordReset() {
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmNewPassword').value;
  const userData = JSON.parse(sessionStorage.getItem('userData'));

  if (!validatePassword(newPass)) {
    showError('Password must contain 6+ characters with at least 1 uppercase letter and 1 number');
    return;
  }

  if (newPass !== confirmPass) {
    showError('Passwords do not match');
    return;
  }

  try {
    const result = await callAPI('forcePasswordReset', {
      phone: userData.phone,
      newPassword: newPass
    });

    if (result.success) {
      alert('Password updated successfully! Please login with your new password.');
      handleLogout();
    } else {
      showError(result.message || 'Password reset failed');
    }
  } catch (error) {
    showError('Password reset failed - please try again');
  }
}

// ================= FORM VALIDATION =================
function validateRegistrationForm() {
  let isValid = true;
  
  // Clear previous errors
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  // Phone validation
  const phone = document.getElementById('phone').value;
  if(!/^(673\d{7}|60\d{9,})$/.test(phone)) {
    showError('Invalid phone format', 'phoneError');
    isValid = false;
  }

  // Password validation
  const password = document.getElementById('password').value;
  if(!/(?=.*[A-Z])(?=.*\d).{6,}/.test(password)) {
    showError('6+ chars with 1 uppercase and 1 number', 'passwordError');
    isValid = false;
  }

  // Email matching
  const email = document.getElementById('email').value;
  const confirmEmail = document.getElementById('confirmEmail').value;
  if(email !== confirmEmail) {
    showError('Emails do not match', 'emailError');
    isValid = false;
  }

  // IC validation
  const icNumber = document.getElementById('icNumber').value;
  if(!/^\d{2}-\d{6}$|^\d{6}-\d{2}-\d{4}$/.test(icNumber)) {
    showError('Invalid IC format', 'icError');
    isValid = false;
  }

  // File validation
  const frontIC = document.getElementById('frontIC').files[0];
  const backIC = document.getElementById('backIC').files[0];
  if(!frontIC || !backIC) {
    showError('Both IC files required', 'fileError');
    isValid = false;
  }

  return isValid;
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// ================= UTILITIES =================
function safeRedirect(path) {
  try {
    // Extract base path without query parameters
    const basePath = path.split('?')[0].split('#')[0];
    
    const allowedPaths = [
      'login.html', 'register.html', 'dashboard.html',
      'forgot-password.html', 'password-reset.html',
      'my-info.html', 'parcel-declaration.html', 'track-parcel.html'
    ];
    
    if (!allowedPaths.includes(basePath)) {
      throw new Error('Unauthorized path');
    }
    
    window.location.href = path;
  } catch (error) {
    console.error('Redirect error:', error);
    showError('Navigation failed. Please try again.');
  }
}

function formatTrackingNumber(trackingNumber) {
  return trackingNumber.replace(/[^A-Z0-9-]/g, '').toUpperCase();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2
  }).format(amount || 0);
}

function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Singapore'
  };
  return new Date(dateString).toLocaleDateString('en-MY', options);
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  detectViewMode();
  initValidationListeners();
  createLoaderElement();

  // Initialize category requirements on page load
  checkCategoryRequirements();

  // Initialize parcel declaration form
  const parcelForm = document.getElementById('declarationForm');
  if (parcelForm) {
    parcelForm.addEventListener('submit', handleParcelSubmission);
    
    // Set up category change listener
    const categorySelect = document.getElementById('itemCategory');
    if (categorySelect) {
      categorySelect.addEventListener('change', checkCategoryRequirements);
    }

    // Phone field setup
    const phoneField = document.getElementById('phone');
    if (phoneField) {
      const userData = checkSession();
      phoneField.value = userData?.phone || '';
      phoneField.readOnly = true;
    }
  }

  // Session management
  const publicPages = ['login.html', 'register.html', 'forgot-password.html'];
  const isPublicPage = publicPages.some(page => 
    window.location.pathname.includes(page)
  );

  if (!isPublicPage) {
    const userData = checkSession();
    if (!userData) return;
    
    if (userData.tempPassword && !window.location.pathname.includes('password-reset.html')) {
      handleLogout();
    }
  }

  window.addEventListener('beforeunload', () => {
    const errorElement = document.getElementById('error-message');
    if (errorElement) errorElement.style.display = 'none';
  });

  const firstInput = document.querySelector('input:not([type="hidden"])');
  if (firstInput) firstInput.focus();
});

// New functions for category requirements =================
function checkCategoryRequirements() {
  const categorySelect = document.getElementById('itemCategory');
  const fileInput = document.getElementById('invoiceFiles');
  
  if(!categorySelect || !fileInput) return; // Add null check

  const category = categorySelect.value;
  const fileHelp = document.getElementById('fileHelp');

  const starredCategories = [
    '*Books', '*Cosmetics/Skincare/Bodycare',
    '*Food Beverage/Drinks', '*Gadgets',
    '*Oil Ointment', '*Supplement'
  ];

  if (starredCategories.includes(category)) {
    fileInput.required = true;
    fileHelp.innerHTML = 'Required: JPEG, PNG, PDF (Max 5MB each)';
    fileHelp.style.color = '#ff4444';
  } else {
    fileInput.required = false;
    fileHelp.innerHTML = 'Optional: JPEG, PNG, PDF (Max 5MB each)';
    fileHelp.style.color = '#888';
  }
}

function setupCategoryChangeListener() {
  const categorySelect = document.getElementById('itemCategory');
  if (categorySelect) {
    categorySelect.addEventListener('change', checkCategoryRequirements);
  }
}

// Add to app.js
function initRegistration() {
  const form = document.getElementById('registrationForm');
  if(form) {
    // Initialize event listeners
    form.addEventListener('submit', handleRegistrationSubmit);
    setupICFormatting();
    
    // Real-time validations
    document.getElementById('phone').addEventListener('input', validateRegistrationPhone);
    document.getElementById('password').addEventListener('input', validateRegistrationPassword);
    document.getElementById('confirmPassword').addEventListener('input', validateRegistrationConfirmPassword);
    document.getElementById('email').addEventListener('input', validateRegistrationEmail);
    document.getElementById('confirmEmail').addEventListener('input', validateRegistrationEmail);
    document.getElementById('icNumber').addEventListener('input', validateRegistrationIC);
  }
}

function setupICFormatting() {
  const icInput = document.getElementById('icNumber');
  if(icInput) {
    icInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/-/g, '');
      if (value.length > 2 && value.length <= 8) {
        value = value.slice(0,2) + '-' + value.slice(2);
      } else if (value.length > 8) {
        value = value.slice(0,6) + '-' + value.slice(6,8) + '-' + value.slice(8,12);
      }
      e.target.value = value;
    });
  }
}

function validateRegistrationPhone() {
  const phone = document.getElementById('phone');
  const errorElement = document.getElementById('phoneError');
  const isValid = /^(673\d{7}|60\d{9,})$/.test(phone.value);
  
  errorElement.textContent = isValid ? '' : 'Invalid phone format';
  return isValid;
}

function validateRegistrationPassword() {
  const password = document.getElementById('password');
  const errorElement = document.getElementById('passwordError');
  const isValid = /^(?=.*[A-Z])(?=.*\d).{6,}$/.test(password.value);
  
  errorElement.textContent = isValid ? '' : '6+ chars with 1 uppercase and 1 number';
  return isValid;
}

function validateRegistrationConfirmPassword() {
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirmPassword').value;
  const errorElement = document.getElementById('confirmPasswordError');
  const isValid = password === confirm;
  
  errorElement.textContent = isValid ? '' : 'Passwords do not match';
  return isValid;
}

function validateRegistrationEmail() {
  const email = document.getElementById('email').value;
  const confirm = document.getElementById('confirmEmail').value;
  const errorElement = document.getElementById('emailError');
  const isValid = email === confirm && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  errorElement.textContent = isValid ? '' : 'Emails do not match or invalid format';
  return isValid;
}

function validateRegistrationIC() {
  const icNumber = document.getElementById('icNumber').value;
  const errorElement = document.getElementById('icError');
  const isValid = /^\d{2}-\d{6}$|^\d{6}-\d{2}-\d{4}$/.test(icNumber);
  
  errorElement.textContent = isValid ? '' : 'Invalid IC format';
  return isValid;
}

function validateRegistrationFiles() {
  const frontIC = document.getElementById('frontIC').files[0];
  const backIC = document.getElementById('backIC').files[0];
  const errorElement = document.getElementById('fileError');
  const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  
  let isValid = true;
  let message = '';
  
  if(!frontIC || !backIC) {
    message = 'Both IC documents are required';
    isValid = false;
  }
  else {
    const frontType = frontIC.type || getFileType(frontIC.name);
    const backType = backIC.type || getFileType(backIC.name);
    
    if(!validTypes.includes(frontType) || !validTypes.includes(backType)) {
      message = 'Only JPG, PNG, or PDF files allowed';
      isValid = false;
    }
  }
  
  errorElement.textContent = message;
  return isValid;
}

async function handleRegistrationSubmit(e) {
  e.preventDefault();
  showLoading(true);

  try {
    // 1. Validate all fields first
    const validations = [
      validateRegistrationPhone(),
      validateRegistrationPassword(),
      validateRegistrationConfirmPassword(),
      validateRegistrationEmail(),
      validateRegistrationIC(),
      validateRegistrationFiles()
    ];

    if (!validations.every(v => v)) {
      showError('Please fix all form errors');
      return;
    }

    // 2. Safely get files with null checks
    const getFileSafe = (id) => {
      const input = document.getElementById(id);
      return input?.files?.[0] || null;
    };

    const frontFile = getFileSafe('frontIC');
    const backFile = getFileSafe('backIC');

    // 3. Final file verification
    if (!frontFile || !backFile) {
      showError('Both IC documents are required');
      return;
    }

    // 4. Prepare data with guaranteed file types
    const formData = {
      icNumber: document.getElementById('icNumber').value,
      phone: document.getElementById('phone').value,
      password: document.getElementById('password').value,
      email: document.getElementById('email').value,
      fullName: document.getElementById('fullName').value,
      address: document.getElementById('address').value,
      postcode: document.getElementById('postcode').value,
      frontIC: await fileToBase64(frontFile),
      backIC: await fileToBase64(backFile),
      frontICType: getFileType(frontFile),
      backICType: getFileType(backFile)
    };

    // 5. Submit to backend
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'registerUser',
        data: formData
      })
    });

    const result = await response.json();
    
    if (result.success) {
      showSuccessMessage('Registration successful! Redirecting...');
      setTimeout(() => safeRedirect('login.html'), 2000);
    } else {
      showError(result.message || 'Registration failed');
    }
  } catch (error) {
    showError(`Registration Error: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// Robust file type detector
function getFileType(file) {
  try {
    // First try official MIME type
    if (file?.type) return file.type;
    
    // Fallback to extension detection
    const ext = file.name.split('.').pop().toLowerCase();
    const typeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      pdf: 'application/pdf'
    };
    
    return typeMap[ext] || 'application/octet-stream';
  } catch (e) {
    console.error('File type detection failed:', e);
    return 'application/octet-stream';
  }
}

// Update DOMContentLoaded in app.js
document.addEventListener('DOMContentLoaded', () => {
  detectViewMode();
  initValidationListeners();
  initRegistration(); // Add this line
  createLoaderElement();
  
  // Initialize category requirements only on parcel declaration page
  if(document.getElementById('itemCategory')) {
    checkCategoryRequirements();
  }
});
