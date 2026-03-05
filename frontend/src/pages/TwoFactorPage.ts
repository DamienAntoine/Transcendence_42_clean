import { createElement } from '@/utils/dom';
import { validateOTP } from '@/utils/validation';
import { authService } from '@/services/AuthService';
import { router } from '@/router';
import { showError, showSuccess } from '@/components/Notification';
import { showLoader, hideLoader } from '@/components/Loader';

export function TwoFactorPage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen flex items-center justify-center bg-gray-900 px-4',
  });

  const formContainer = createElement('div', {
    className: 'max-w-md w-full space-y-8',
  });

  const header = createHeader();
  formContainer.appendChild(header);

  const form = create2FAForm();
  formContainer.appendChild(form);

  const footer = createFooter();
  formContainer.appendChild(footer);

  container.appendChild(formContainer);

  return container;
}

function createHeader(): HTMLElement {
  const header = createElement('div', {
    className: 'text-center',
  });

  const icon = createElement('div', {
    className: 'text-6xl mb-4',
    textContent: '🔐',
  });

  const title = createElement('h2', {
    className: 'text-3xl font-bold text-white',
    textContent: 'Two-factor authentication',
  });

  const subtitle = createElement('p', {
    className: 'mt-2 text-gray-400',
    textContent: 'Enter the code from your authenticator app',
  });

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(subtitle);

  return header;
}

function create2FAForm(): HTMLElement {
  const form = createElement('form', {
    className: 'mt-8 space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl',
  }) as HTMLFormElement;

  const infoBox = createElement('div', {
    className: 'bg-blue-600 bg-opacity-20 border border-blue-600 rounded-lg p-4',
  });

  const infoText = createElement('p', {
    className: 'text-blue-400 text-sm',
    textContent: 'Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code.',
  });

  infoBox.appendChild(infoText);
  form.appendChild(infoBox);

  const codeGroup = createElement('div');

  const label = createElement('label', {
    className: 'block text-sm font-medium text-gray-300 mb-2',
    textContent: 'Verification code',
    attributes: { for: 'code' },
  });

  const input = createElement('input', {
    className: 'appearance-none block w-full px-3 py-4 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 bg-gray-700 text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-primary-500 focus:border-primary-500',
    attributes: {
      id: 'code',
      name: 'code',
      type: 'text',
      placeholder: '000000',
      required: 'true',
      maxlength: '6',
      pattern: '[0-9]{6}',
      autocomplete: 'one-time-code',
    },
  }) as HTMLInputElement;

  input.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.replace(/\D/g, '').slice(0, 6);
  });

  codeGroup.appendChild(label);
  codeGroup.appendChild(input);
  form.appendChild(codeGroup);

  const submitBtn = createElement('button', {
    className: 'w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition',
    textContent: 'Verify',
    attributes: { type: 'submit' },
  });
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handle2FAVerification(form);
  });

  return form;
}

function createFooter(): HTMLElement {
  const footer = createElement('div', {
    className: 'text-center space-y-3',
  });

  const backText = createElement('p', {
    className: 'text-gray-400',
  });

  const backLink = createElement('a', {
    className: 'text-primary-500 hover:text-primary-400 font-medium transition cursor-pointer',
    textContent: 'Back to login',
  });

  backLink.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/login');
  });

  backText.appendChild(backLink);
  footer.appendChild(backText);

  const helpText = createElement('p', {
    className: 'text-gray-400',
  });

  const helpLink = createElement('a', {
    className: 'text-sm text-gray-500 hover:text-gray-400 transition cursor-pointer',
    textContent: 'Problem with the code?',
  });

  helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    showError('Feature not implemented - Contact administrator');
  });

  helpText.appendChild(helpLink);
  footer.appendChild(helpText);

  return footer;
}

async function handle2FAVerification(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const code = formData.get('code') as string;

  const codeValidation = validateOTP(code);
  if (!codeValidation.valid) {
    showError(codeValidation.error || 'Invalid code');
    return;
  }

  const email = sessionStorage.getItem('2fa_email');
  if (!email) {
    showError('Session expired, please log in again');
    router.navigate('/login');
    return;
  }

  const loader = showLoader('Verifying...');

  try {
    await authService.login2FA({ userName: email, otp: code });

    hideLoader(loader);
    sessionStorage.removeItem('2fa_email');
    showSuccess('Authentication successful!');
    router.navigate('/');
  } catch (error) {
    hideLoader(loader);
    const message = error instanceof Error ? error.message : 'Incorrect code';
    showError(message);
  }
}
