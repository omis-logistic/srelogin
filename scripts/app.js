//scripts/app.js
// ================= CONFIGURATION =================
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbx41tgK3ZW_z-SEunWUBVqKckfPd6NL1v3wHlhTsRchVfSpX_z2-a5wkF1J_2NJuNLBSg/exec',
  PROXY_URL: 'https://script.google.com/macros/s/AKfycbw3cdvA0BGdhQLVliVUzO5sdP4cGlNrY3jU4-URN0DJdQesji8sHaQ5d2MoOGgIXBrW/exec',
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

  // Preserve both phone AND user ID
  form.querySelectorAll('input:not(#phone,#userId), select, textarea').forEach(field => {
    if (field.type === 'file') {
      field.value = null;
    } else if (field.tagName === 'SELECT') {
      field.selectedIndex = 0;
    } else {
      field.value = '';
    }
  });

  // Keep existing phone styling
  const phoneField = document.getElementById('phone');
  const userIdField = document.getElementById('userId');
  if (phoneField) {
    phoneField.style.backgroundColor = '#2a2a2a';
    phoneField.style.color = '#ffffff';
  }
  if (userIdField) {
    userIdField.style.backgroundColor = '#2a2a2a';
    userIdField.style.color = '#ffffff';
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
    const files = Array.from(formData.getAll('files[]')); // Changed to match input name

    // Process ALL files regardless of category
    const processedFiles = await Promise.all(
      files.map(async file => ({
        name: file.name,
        type: file.type,
        data: await readFileAsBase64(file)
      }))
    );

    const payload = {
      trackingNumber: formData.get('trackingNumber').trim().toUpperCase(),
      nameOnParcel: formData.get('nameOnParcel').trim(),
      phone: document.getElementById('phone').value, 
      itemDescription: formData.get('itemDescription').trim(),
      quantity: formData.get('quantity'),
      price: formData.get('price'),
      collectionPoint: formData.get('collectionPoint'),
      itemCategory: itemCategory,
      userId: document.getElementById('userId').value,
      files: processedFiles
    };

    console.log('Submission Payload:', payload); // Debug log

    await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: `payload=${encodeURIComponent(JSON.stringify(payload))}`
    });

  } catch (error) {
    console.error('Submission error:', error);
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

async function populateUserInfo() {
  try {
    const userData = checkSession();
    if (!userData) return;

    // Get User ID from backend
    const response = await fetch(`${CONFIG.GAS_URL}?action=getUserID&phone=${userData.phone}&callback=callback${Date.now()}`);
    const data = await response.json();
    
    if(data.success) {
      document.getElementById('userId').value = data.userId;
      document.getElementById('phone').value = userData.phone;
    }
  } catch (error) {
    console.error('Error populating user info:', error);
  }
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
    'CHAPTER 73 ARTICLES OF IRON OR STEEL',
    'CHAPTER 68 ARTICLES OF STONE',
    'CHAPTER 67.02.10 ARTIFICAL FLOWER',
    'CHAPTER 87 AUTOPARTS ; CAR ACCESSORIES',
    'CHAPTER 62.09 BAJU BABY ; AND ACCESSORIES',
    'CHAPTER 62.06 BAJU ; PAKAIAN  ; SET SUIT',
    'CHAPTER 94.04 BEDDING SET ; CUSHION ; PILLOW',
    'CHAPTER 63 BLANKET',
    'CHAPTER 62.12 BRA ; BENGKUNG ; CORSET',
    'CHAPTER 96.03 BROOM ; BRUSH ;FLOOR MOPS SWEEPERS',
    'CHAPTER 69 CERAMIC PRODUCTS',
    'CHAPTER 96.15 COMBS ; HAIR PIN ; AND PARTS',
    'CHAPTER 90.01.30 CONTACT LENS',
    '*CHAPTER 18 COCOA PREPARATION',
    'CHAPTER 63.03 CURTAIN ; BLINDS',
    'CHAPTER 85.16 ELETRICAL',
    'CHAPTER 58 SPECIAL WOVEN FABRIC ; LACE ; TAPESTRIES ; EMBROIDERY',
    'CHAPTER 95.06.91 EXERCISE EQUIPMENT',
    'CHAPTER 67.04.19 EYELASHES',
    'CHAPTER 50 FABRIC SILK ; KAIN ; SAMPIN',
    'CHAPTER 95.07 FISHING ACCESSORIES',
    'CHAPTER 64 FOOTWEAR ARTICLES ; KASUT SLIPPER',
    'CHAPTER 94.03 FURNITURE',
    'CHAPTER 70 GLASS AND GLASSWARE',
    'CHAPTER 42 LEATHER ; HANDBAG ; WALLET',
    'CHAPTER 42.02 HANDPHONE CASING',
    'CHAPTER 65 HEADGEAR ; PARTS ; TOPI ; SONGKOK ; CAP ; INNER TUDUNG',
    '*CHAPTER 85.18.30 HEADPHONE ; EARPHONE',
    'CHAPTER 71 IMITATION JEWELLERY ; PIN ; BROOCH',
    'CHAPTER 32 PAINTS , INK',
    'CHAPTER 48 PAPER AND PAPERBOARD ARTICLES',
    'CHAPTER 96.09 PENCIL',
    'CHAPTER 96.08 PEN',
    '*CHAPTER 30 PHARMACEUTICAL PRODUCT',
    'CHAPTER 39 PLASTIC ARTICLES',
    '*CHAPTER 95.04 PLAYING CARD ;GAMING ; VIDEO GAMES',
    '*CHAPTER 49 PRINTED BOOK ; PICTURE',
    'CHAPTER 40 RUBBER ARTICLES',
    'CHAPTER 96.19 SANITARY TOWELS ; DIAPERS ; NAPKIN LINER',
    'CHAPTER 62.04.69 SELUAR',
    'CHAPTER 62.04.52 SKIRT',
    'CHAPTER 34 SOAP , DETERGENT , WASHING PREPARATION',
    'CHAPTER 61.15 SOCKS',
    'CHAPTER 94.05.50 SOLAR LIGHT',
    'CHAPTER 39.19 STICKER',
    '*CHAPTER 17 SUGAR CONFECTIONERY',
    'CHAPTER 90.04 SUNGLASSES',
    '*CHAPTER 21 SUPPLEMENT MISCELLANEOUS',
    'CHAPTER 62.11 TELEKUNG',
    '*CHAPTER 85.17 TELEPHONE SET ; WIRELESS NETWORK ; OTHERS',
    'CHAPTER 48.03 TISSUE ; NAPKIN',
    'CHAPTER 82 TOOLS ; CUTLERY ; OF BASE METAL',
    'CHAPTER 63.02 TOWELS',
    'CHAPTER 95.03 TOYS',
    'CHAPTER 96.20 TRIPODS',
    'CHAPTER 61.17.10 TUDUNG ; SHAWL ; SCARVES',
    'CHAPTER 62.14 TUDUNG ; SHAWL ; SCARVES',
    'CHAPTER 96.17 TUMBLER VACUUM FLASK ; PARTS ACCESSORIES',
    'CHAPTER 66 UMBRELLA',
    'CHAPTER 61.08.21 UNDERWEAR ; PANTIES',
    'CHAPTER 98.02.10 USED PERSONAL OR HOUSEHOLD EFFECT',
    'CHAPTER 96.16 WALL MOUNT ; POWDER PUFFS SPONGE',
    'CHAPTER 91 WATCHES AND PARTS THEREOF',
    '*CHAPTER 44 WOOD ARTICLES'
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
    '* CHAPTER 17 SUGAR CONFECTIONERY',
    '* CHAPTER 18 COCOA PREPARATION',
    '* CHAPTER 21 SUPPLEMENT MISCELLANEOUS',
    '* CHAPTER 30 PHARMACEUTICAL PRODUCT',
    '* CHAPTER 44 WOOD ARTICLES',
    '* CHAPTER 49 PRINTED BOOK ; PICTURE',
    '* CHAPTER 85.17 TELEPHONE SET ; WIRELESS NETWORK ; OTHERS',
    '* CHAPTER 85.18.30 HEADPHONE ; EARPHONE',
    '* CHAPTER 95.04 PLAYING CARD ;GAMING ; VIDEO GAMES'
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
    '*CHAPTER 17 SUGAR CONFECTIONERY',
    '*CHAPTER 18 COCOA PREPARATION',
    '*CHAPTER 21 SUPPLEMENT MISCELLANEOUS',
    '*CHAPTER 30 PHARMACEUTICAL PRODUCT',
    '*CHAPTER 44 WOOD ARTICLES',
    '*CHAPTER 49 PRINTED BOOK ; PICTURE',
    '*CHAPTER 85.17 TELEPHONE SET ; WIRELESS NETWORK ; OTHERS',
    '*CHAPTER 85.18.30 HEADPHONE ; EARPHONE',
    '*CHAPTER 95.04 PLAYING CARD ;GAMING ; VIDEO GAMES'
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
    
    // Global file count validation
    if (files.length > CONFIG.MAX_FILES) {
      throw new Error(`Maximum ${CONFIG.MAX_FILES} files allowed`);
    }

    // Validate file types and sizes
    files.forEach(file => {
      if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type: ${file.type}`);
      }
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(`${file.name} exceeds 5MB`);
      }
    });

    // Starred category validation
    const starredCategories = [
    '*CHAPTER 17 SUGAR CONFECTIONERY',
    '*CHAPTER 18 COCOA PREPARATION',
    '*CHAPTER 21 SUPPLEMENT MISCELLANEOUS',
    '*CHAPTER 30 PHARMACEUTICAL PRODUCT',
    '*CHAPTER 44 WOOD ARTICLES',
    '*CHAPTER 49 PRINTED BOOK ; PICTURE',
    '*CHAPTER 85.17 TELEPHONE SET ; WIRELESS NETWORK ; OTHERS',
    '*CHAPTER 85.18.30 HEADPHONE ; EARPHONE',
    '*CHAPTER 95.04 PLAYING CARD ;GAMING ; VIDEO GAMES'
  ];
    
    if (starredCategories.includes(category)) {
      if (files.length < 1) throw new Error('At least 1 file required');
    }

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

  try {
    const callbackName = `login_${Date.now()}`;
    const script = document.createElement('script');
    script.src = `${CONFIG.GAS_URL}?action=processLogin&phone=${encodeURIComponent(phone)}&password=${encodeURIComponent(password)}&callback=${callbackName}`;

    window[callbackName] = (response) => {
      console.log('Login response:', response); // Debug log
      if (response.success) {
        const userData = {
          phone: response.phone,
          email: response.email,
          userId: response.userId,
          tempPassword: response.tempPassword
        };
        console.log('Storing session:', userData); // Debug log
        sessionStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('lastActivity', Date.now());
        
        if (response.tempPassword) {
          safeRedirect('password-reset.html');
        } else {
          safeRedirect('dashboard.html');
        }
      } else {
        showError(response.message || 'Authentication failed');
      }
      document.body.removeChild(script);
      delete window[callbackName];
    };
    
    document.body.appendChild(script);
  } catch (error) {
    console.error('Login error:', error);
    showError('Login failed - please try again');
  }
}

// ================= REGISTRATION HANDLER ================= 
async function handleRegistration() {
  try {
    const btn = document.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"></div> Processing...';

    // === NEW VALIDATION CHECK ===
    const phoneValidation = document.getElementById('phoneValidation');
    if (phoneValidation.classList.contains('invalid')) {
      showError('Phone number already exists in system');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }
    // === END NEW CODE ===

    // Your existing registration logic
    const formData = {
      action: 'registerUser',
      icNumber: document.getElementById('icNumber').value,
      phone: document.getElementById('phone').value,
      password: document.getElementById('password').value,
      email: document.getElementById('email').value,
      fullName: document.getElementById('fullName').value,
      address: document.getElementById('address').value,
      postcode: document.getElementById('postcode').value
    };

    // Process files and submit (existing code)
    const frontIC = document.getElementById('frontIC').files[0];
    const backIC = document.getElementById('backIC').files[0];

    const result = await callAPI('registerUser', {
      data: formData,
      files: [
        await processFile(frontIC),
        await processFile(backIC)
      ]
    });

    if (result.success) {
      showSuccessMessage();
      setTimeout(() => safeRedirect('login.html'), 2000);
    } else {
      showError(result.message);
    }
  } catch (error) {
    showError('Registration failed: ' + error.message);
  } finally {
    const btn = document.querySelector('button[type="submit"]');
    btn.disabled = false;
    btn.innerHTML = 'Register Now';
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
function validatePhone(phone) {
  const regex = /^(673\d{7,}|60\d{9,})$/;
  return regex.test(phone);
}

function validatePassword(password) {
  const regex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
  return regex.test(password);
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validateRegistrationForm() {
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPass').value;
  const email = document.getElementById('regEmail').value;
  const confirmEmail = document.getElementById('regConfirmEmail').value;

  let isValid = true;
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  if (!validatePhone(phone)) {
    document.getElementById('phoneError').textContent = 'Invalid phone format';
    isValid = false;
  }

  if (!validatePassword(password)) {
    document.getElementById('passError').textContent = '6+ chars, 1 uppercase, 1 number';
    isValid = false;
  }

  if (password !== confirmPassword) {
    document.getElementById('confirmPassError').textContent = 'Passwords mismatch';
    isValid = false;
  }

  if (!validateEmail(email)) {
    document.getElementById('emailError').textContent = 'Invalid email format';
    isValid = false;
  }

  if (email !== confirmEmail) {
    document.getElementById('confirmEmailError').textContent = 'Emails mismatch';
    isValid = false;
  }

  return isValid;
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

function initParcelDeclarationPage(userData) {
  const phoneField = document.getElementById('phone');
  const userIdField = document.getElementById('parcelUserId'); // Note different ID
  
  if (!phoneField || !userIdField) return;

  phoneField.value = userData.phone || '';
  phoneField.readOnly = true;

  // First try session data
  if (userData.userId) {
    userIdField.value = userData.userId;
    return;
  }

  // Fallback to API call
  const callbackName = `userIdCallback_${Date.now()}`;
  const script = document.createElement('script');
  script.src = `${CONFIG.GAS_URL}?action=getParcelUserId&phone=${encodeURIComponent(userData.phone)}&callback=${callbackName}`;

  window[callbackName] = (response) => {
    if (response.success) {
      userIdField.value = response.userId;
      // Update session data
      sessionStorage.setItem('userData', JSON.stringify({
        ...userData,
        userId: response.userId
      }));
    }
    document.body.removeChild(script);
    delete window[callbackName];
  };
  
  document.body.appendChild(script);
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  // Existing initialization
  detectViewMode();
  initValidationListeners();
  createLoaderElement();
  checkCategoryRequirements();

  // Session management
  const publicPages = ['login.html', 'register.html', 'forgot-password.html'];
  const isPublicPage = publicPages.some(page => 
    window.location.pathname.includes(page)
  );

  // Parcel declaration page specific code
  if (window.location.pathname.includes('parcel-declaration.html')) {
    const pageLoader = document.getElementById('pageLoadingOverlay');
    
    // Show page load spinner immediately
    if(pageLoader) pageLoader.style.display = 'flex';
    
    try {
      const userData = checkSession();
      if (!userData) {
        handleLogout();
        return;
      }

      // Phone field handling
      const phoneField = document.getElementById('phone');
      if (phoneField) {
        phoneField.value = userData.phone || '';
        phoneField.readOnly = true;
      }

      // User ID population
      const userIdField = document.getElementById('userId');
      if (userIdField) {
        if (userData.userId) {
          userIdField.value = userData.userId;
          if(pageLoader) pageLoader.style.display = 'none';
        } else {
          const callbackName = `uid_${Date.now()}`;
          const script = document.createElement('script');
          script.src = `${CONFIG.GAS_URL}?action=getCurrentUserID&phone=${encodeURIComponent(userData.phone)}&callback=${callbackName}`;

          window[callbackName] = (response) => {
            if (response.success) {
              userIdField.value = response.userId;
              // Update session storage
              sessionStorage.setItem('userData', JSON.stringify({
                ...userData,
                userId: response.userId
              }));
            } else {
              console.error('User ID lookup failed:', response);
              userIdField.value = 'N/A';
            }
            if(pageLoader) pageLoader.style.display = 'none';
            document.body.removeChild(script);
            delete window[callbackName];
          };
          document.body.appendChild(script);
        }
      }

      // Form setup
      const parcelForm = document.getElementById('declarationForm');
      if (parcelForm) {
        parcelForm.addEventListener('submit', handleParcelSubmission);
        
        // Existing category handler
        const categorySelect = document.getElementById('itemCategory');
        if (categorySelect) {
          categorySelect.addEventListener('change', checkCategoryRequirements);
        }
      }

    } catch (error) {
      console.error('Parcel page init error:', error);
      if(pageLoader) pageLoader.style.display = 'none';
      showError('Failed to initialize declaration form');
      safeRedirect('dashboard.html');
    }
  }

  // Existing session validation (for non-public pages)
  if (!isPublicPage) {
    const userData = checkSession();
    if (!userData) {
      handleLogout();
      return;
    }
    
    if (userData.tempPassword && !window.location.pathname.includes('password-reset.html')) {
      handleLogout();
    }
  }

  // Existing UI cleanup
  window.addEventListener('beforeunload', () => {
    const errorElement = document.getElementById('error-message');
    if (errorElement) errorElement.style.display = 'none';
  });

  // Existing focus management
  const firstInput = document.querySelector('input:not([type="hidden"])');
  if (firstInput) firstInput.focus();
});

// New functions for category requirements =================
function checkCategoryRequirements() {
  const category = document.getElementById('itemCategory')?.value || '';
  const fileInput = document.getElementById('fileUpload');
  const fileHelp = document.getElementById('fileHelp');
  
  const starredCategories = [
    '*CHAPTER 17 SUGAR CONFECTIONERY',
    '*CHAPTER 18 COCOA PREPARATION',
    '*CHAPTER 21 SUPPLEMENT MISCELLANEOUS',
    '*CHAPTER 30 PHARMACEUTICAL PRODUCT',
    '*CHAPTER 44 WOOD ARTICLES',
    '*CHAPTER 49 PRINTED BOOK ; PICTURE',
    '*CHAPTER 85.17 TELEPHONE SET ; WIRELESS NETWORK ; OTHERS',
    '*CHAPTER 85.18.30 HEADPHONE ; EARPHONE',
    '*CHAPTER 95.04 PLAYING CARD ;GAMING ; VIDEO GAMES'
  ];

  if (starredCategories.includes(category)) {
    fileInput.required = true;
    fileHelp.innerHTML = 'Required: JPEG, PNG, PDF (Max 5MB each)';
    fileHelp.style.color = '#ff4444';
  } else {
    fileInput.required = false;
    fileHelp.innerHTML = '3 files maximum upload: JPEG, PNG, PDF (Max 5MB each)';
    fileHelp.style.color = '#888';
  }
}

function setupCategoryChangeListener() {
  const categorySelect = document.getElementById('itemCategory');
  if (categorySelect) {
    categorySelect.addEventListener('change', checkCategoryRequirements);
  }
}
