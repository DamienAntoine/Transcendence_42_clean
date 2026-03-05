import { createElement } from '@/utils/dom';
import { validatePassword } from '@/utils/validation';
import { authService } from '@/services/AuthService';
import { router } from '@/router';
import { showError, showSuccess } from '@/components/Notification';
import { showLoader, hideLoader } from '@/components/Loader';

export function LoginPage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen flex items-center justify-center bg-gray-900 px-4',
  });

  const formContainer = createElement('div', {
    className: 'max-w-md w-full space-y-8',
  });

  const header = createHeader();
  formContainer.appendChild(header);

  const form = createLoginForm();
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
    textContent: 'Transcendence',
  });

  const subtitle = createElement('p', {
    className: 'mt-2 text-gray-400',
    textContent: 'Sign in to your account',
  });

  header.appendChild(logo);
  header.appendChild(title);
  header.appendChild(subtitle);

  return header;
}

function createLoginForm(): HTMLElement {
  const form = createElement('form', {
    className: 'mt-8 space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl',
  }) as HTMLFormElement;

  const usernameGroup = createFormGroup(
    'username',
    'Username',
    'text',
    'johndoe'
  );
  form.appendChild(usernameGroup);

  const passwordGroup = createFormGroup(
    'password',
    'Password',
    'password',
    '••••••••'
  );
  form.appendChild(passwordGroup);

  const rememberGroup = createRememberMeGroup();
  form.appendChild(rememberGroup);

  const submitBtn = createElement('button', {
    className: 'w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition',
    textContent: 'Sign in',
    attributes: { type: 'submit' },
  });
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin(form);
  });

  return form;
}

function createFormGroup(
  id: string,
  label: string,
  type: string,
  placeholder: string
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

  return group;
}

function createRememberMeGroup(): HTMLElement {
  const group = createElement('div', {
    className: 'flex items-center justify-between',
  });

  const checkboxDiv = createElement('div', {
    className: 'flex items-center',
  });

  const checkbox = createElement('input', {
    className: 'h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-600 rounded bg-gray-700',
    attributes: {
      id: 'remember-me',
      name: 'remember-me',
      type: 'checkbox',
    },
  });

  const label = createElement('label', {
    className: 'ml-2 block text-sm text-gray-300',
    textContent: 'Remember me',
    attributes: { for: 'remember-me' },
  });

  checkboxDiv.appendChild(checkbox);
  checkboxDiv.appendChild(label);
  group.appendChild(checkboxDiv);

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
    textContent: "Don't have an account? ",
  });

  const link = createElement('a', {
    className: 'text-primary-500 hover:text-primary-400 font-medium transition cursor-pointer',
    textContent: "Sign up",
  });

  link.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/register');
  });

  text.appendChild(span);
  text.appendChild(link);
  footer.appendChild(text);

  return footer;
}

async function handleLogin(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const username = (formData.get('username') as string).trim();
  const password = formData.get('password') as string;

  if (!username || username.length < 3) {
    showError("Username must be at least 3 characters long");
    return;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    showError(passwordValidation.error || 'Invalid password');
    return;
  }

  const loader = showLoader('Signing in...');

  try {
    const response = await authService.login({ userName: username, password });

    hideLoader(loader);

    if ('requires2FA' in response && response.requires2FA) {
      showSuccess('2FA code sent by email');
      sessionStorage.setItem('2fa_username', username);
      router.navigate('/2fa');
      return;
    }

    showSuccess('Successfully logged in!');
    router.navigate('/');
  } catch (error) {
    hideLoader(loader);
    const message = error instanceof Error ? error.message : 'Login error';
    showError(message);
  }
}
