import { describe, it, expect } from 'vitest';
import { getUsers, saveUser, findUserByEmail } from '../lib/database';

describe('Database Operations', () => {
  it('should retrieve users list cleanly', async () => {
    const users = await getUsers();
    expect(Array.isArray(users)).toBe(true);
  });

  it('should save and find user by email', async () => {
    const testUser = {
      id: 'test_user_id_' + Date.now(),
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      password: 'hashed_password_sample',
      createdAt: new Date().toISOString(),
    };

    await saveUser(testUser);
    const foundUser = await findUserByEmail(testUser.email);

    expect(foundUser).not.toBeNull();
    expect(foundUser?.id).toBe(testUser.id);
    expect(foundUser?.name).toBe('Test User');
  });
});
