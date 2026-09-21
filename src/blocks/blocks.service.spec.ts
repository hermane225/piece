import { ForbiddenException } from '@nestjs/common';
import { BlocksService } from './blocks.service';

describe('BlocksService', () => {
  const findMany = jest.fn();
  const service = new BlocksService({ block: { findMany } } as never);

  beforeEach(() => findMany.mockReset());

  it('reports who blocked whom per interlocutor', async () => {
    findMany.mockResolvedValue([
      { blockerId: 'me', blockedId: 'a' },
      { blockerId: 'b', blockedId: 'me' },
    ]);

    const states = await service.getBlockStates('me', ['a', 'b', 'c']);

    expect(states.get('a')).toEqual({ blockedByMe: true, blockedMe: false });
    expect(states.get('b')).toEqual({ blockedByMe: false, blockedMe: true });
    expect(states.get('c')).toEqual({ blockedByMe: false, blockedMe: false });
  });

  it('throws 403 when I blocked the recipient', async () => {
    findMany.mockResolvedValue([{ blockerId: 'me', blockedId: 'a' }]);

    await expect(service.assertNoBlock('me', ['a'])).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws 403 when the recipient blocked me', async () => {
    findMany.mockResolvedValue([{ blockerId: 'a', blockedId: 'me' }]);

    await expect(service.assertNoBlock('me', ['a'])).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('passes when nobody is blocked', async () => {
    findMany.mockResolvedValue([]);

    await expect(service.assertNoBlock('me', ['a'])).resolves.toBeUndefined();
  });
});
