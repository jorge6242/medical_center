import { TraceWriter } from './trace-writer';

describe('TraceWriter retention', () => {
  it('deletes only traces older than the configured retention window', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const writer = new TraceWriter();

    await expect(
      writer.prune({ traceLog: { deleteMany } } as never, 30),
    ).resolves.toBe(2);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
  });
});
