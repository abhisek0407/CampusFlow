import { POST as loginPost } from '../app/api/auth/login/route.js';
import { POST as registerPost } from '../app/api/auth/register/route.js';
import { POST as logoutPost } from '../app/api/auth/logout/route.js';
import { POST as forgotPost } from '../app/api/auth/forgot-password/route.js';
import { POST as resetPost } from '../app/api/auth/reset-password/route.js';

function mockReq(body) {
  return {
    json: async () => body,
    headers: new Map(),
  };
}

async function runTests() {
  console.log('Testing Auth APIs...');

  // 1. Demo Login
  const loginRes = await loginPost(mockReq({ email: 'admin@cit.edu', password: 'Admin@123' }));
  const loginData = await loginRes.json();
  console.log('1. Admin login status:', loginRes.status, 'Success:', loginData.success, 'Role:', loginData.user?.role);
  if (!loginData.success) throw new Error('Admin login failed');

  // 2. Register
  const testEmail = `test_${Date.now()}@cit.edu`;
  const regRes = await registerPost(mockReq({
    name: 'Test Professor',
    email: testEmail,
    password: 'Password@123',
    role: 'faculty',
    department: 'CSE',
    linked_faculty_id: 'F15',
  }));
  const regData = await regRes.json();
  console.log('2. Register status:', regRes.status, 'Success:', regData.success, 'User:', regData.user?.name);
  if (!regData.success) throw new Error('Registration failed');

  // 3. Login with newly registered user
  const newLoginRes = await loginPost(mockReq({ email: testEmail, password: 'Password@123' }));
  const newLoginData = await newLoginRes.json();
  console.log('3. New user login:', newLoginData.success);
  if (!newLoginData.success) throw new Error('New user login failed');

  // 4. Forgot Password
  const forgotRes = await forgotPost(mockReq({ email: testEmail }));
  const forgotData = await forgotRes.json();
  console.log('4. Forgot password token:', forgotData.reset_token);
  if (!forgotData.reset_token) throw new Error('Forgot password token missing');

  // 5. Reset Password
  const resetRes = await resetPost(mockReq({
    email: testEmail,
    token: forgotData.reset_token,
    new_password: 'NewPassword@456',
  }));
  const resetData = await resetRes.json();
  console.log('5. Reset password success:', resetData.success);
  if (!resetData.success) throw new Error('Reset password failed');

  // 6. Login with new password
  const reLoginRes = await loginPost(mockReq({ email: testEmail, password: 'NewPassword@456' }));
  const reLoginData = await reLoginRes.json();
  console.log('6. Login with reset password:', reLoginData.success);
  if (!reLoginData.success) throw new Error('Login with new password failed');

  // 7. Logout
  const logoutRes = await logoutPost(mockReq({}));
  const logoutData = await logoutRes.json();
  console.log('7. Logout status:', logoutData.success);

  console.log('\nALL 7 AUTH API CHECKS PASSED PERFECTLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
