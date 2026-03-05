import { createElement } from '@/utils/dom';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
} from '@/utils/validation';
import { authService } from '@/services/AuthService';
import { router } from '@/router';
import { showError, showSuccess } from '@/components/Notification';
import { showLoader, hideLoader } from '@/components/Loader';

export function RegisterPage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen flex items-center justify-center bg-gray-900 px-4 py-12',
  });

  const formContainer = createElement('div', {
    className: 'max-w-md w-full space-y-8',
  });

  const header = createHeader();
  formContainer.appendChild(header);

  const form = createRegisterForm();
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

  const logo = createElement('div', {
    className: 'text-6xl mb-4',
    textContent: '🏓',
  });

  const title = createElement('h2', {
    className: 'text-3xl font-bold text-white',
    textContent: 'Create an account',
  });

  const subtitle = createElement('p', {
    className: 'mt-2 text-gray-400',
    textContent: 'Join Transcendence',
  });

  header.appendChild(logo);
  header.appendChild(title);
  header.appendChild(subtitle);

  return header;
}

function createRegisterForm(): HTMLElement {
  const form = createElement('form', {
    className: 'mt-8 space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl',
  }) as HTMLFormElement;

  const usernameGroup = createFormGroup(
    'username',
    'Username',
    'text',
    'johndoe',
    'Only letters, numbers and _'
  );
  form.appendChild(usernameGroup);

  const displayNameGroup = createFormGroup(
    'displayName',
    'Display name',
    'text',
    'John Doe',
    'Your public name (3-30 characters)'
  );
  form.appendChild(displayNameGroup);

  const emailGroup = createFormGroup(
    'email',
    'Email address',
    'email',
    'email@example.com'
  );
  form.appendChild(emailGroup);

  const passwordGroup = createFormGroup(
    'password',
    'Password',
    'password',
    '••••••••',
    'Min 8 characters, 1 uppercase, 1 lowercase, 1 digit'
  );
  form.appendChild(passwordGroup);

  const confirmPasswordGroup = createFormGroup(
    'confirmPassword',
    'Confirm password',
    'password',
    '••••••••'
  );
  form.appendChild(confirmPasswordGroup);

  const submitBtn = createElement('button', {
    className: 'w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition',
    textContent: 'Sign up',
    attributes: { type: 'submit' },
  });
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegister(form);
  });

  return form;
}

function createFormGroup(
  id: string,
  label: string,
  type: string,
  placeholder: string,
  helperText?: string
): HTMLElement {
  const group = createElement('div');

  const labelEl = createElement('label', {
    className: 'block text-sm font-medium text-gray-300 mb-2',
    textContent: label,
    attributes: { for: id },
  });

  const input = createElement('input', {
    className: 'appearance-none block w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 bg-gray-700 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500',
    attributes: {
      id,
      name: id,
      type,
      placeholder,
      required: 'true',
    },
  });

  group.appendChild(labelEl);
  group.appendChild(input);

  if (helperText) {
    const helper = createElement('p', {
      className: 'mt-1 text-xs text-gray-400',
      textContent: helperText,
    });
    group.appendChild(helper);
  }

  return group;
}

function createFooter(): HTMLElement {
  const footer = createElement('div', {
    className: 'text-center',
  });

  const text = createElement('p', {
    className: 'text-gray-400',
  });

  const span = createElement('span', {
    textContent: 'Already have an account? ',
  });

  const link = createElement('a', {
    className: 'text-primary-500 hover:text-primary-400 font-medium transition cursor-pointer',
    textContent: 'Sign in',
  });

  link.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/login');
  });

  text.appendChild(span);
  text.appendChild(link);
  footer.appendChild(text);

  return footer;
}

async function handleRegister(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const username = (formData.get('username') as string).trim();
  const displayName = (formData.get('displayName') as string).trim();
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    showError(usernameValidation.error || 'Invalid username');
    return;
  }

  const displayNameValidation = validateDisplayName(displayName);
  if (!displayNameValidation.valid) {
    showError(displayNameValidation.error || 'Invalid display name');
    return;
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    showError(emailValidation.error || 'Invalid email');
    return;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    showError(passwordValidation.error || 'Invalid password');
    return;
  }

  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }

  const loader = showLoader('Creating account...');

  try {
    await authService.register({
      userName: username,
      displayName,
      email,
      password,
    });

    hideLoader(loader);
    showSuccess('Account created successfully!');
    router.navigate('/login');
  } catch (error) {
    hideLoader(loader);
    const message = error instanceof Error ? error.message : 'Registration error';
    showError(message);
  }
}
