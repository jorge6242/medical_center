import { Resend } from 'resend';

import { MailerService } from './mailer.service';

import type { ConfigService } from '@nestjs/config';

jest.mock('resend');

const resendConstructorMock = jest.mocked(Resend);

describe('MailerService', () => {
  let sendEmailMock: jest.Mock;
  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'mailer.apiKey': 'test-api-key',
        'mailer.from': 'Centro Médico <onboarding@resend.dev>',
      };

      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sendEmailMock = jest.fn();
    resendConstructorMock.mockImplementation(
      () =>
        ({
          emails: {
            send: sendEmailMock,
          },
        }) as unknown as Resend,
    );
  });

  it('sends email through the Resend HTTPS API', async () => {
    sendEmailMock.mockResolvedValue({
      data: { id: 'email-1' },
      error: null,
    });
    const service = new MailerService(config as unknown as ConfigService);

    await service.sendEmail(
      'patient@example.com',
      'Feliz cumpleaños',
      '<p>Hola</p>',
    );

    expect(resendConstructorMock).toHaveBeenCalledWith('test-api-key');
    expect(sendEmailMock).toHaveBeenCalledWith({
      from: 'Centro Médico <onboarding@resend.dev>',
      to: 'patient@example.com',
      subject: 'Feliz cumpleaños',
      html: '<p>Hola</p>',
    });
  });

  it('throws when Resend rejects the email', async () => {
    sendEmailMock.mockResolvedValue({
      data: null,
      error: { message: 'Domain is not verified', name: 'validation_error' },
    });
    const service = new MailerService(config as unknown as ConfigService);

    await expect(
      service.sendEmail(
        'patient@example.com',
        'Feliz cumpleaños',
        '<p>Hola</p>',
      ),
    ).rejects.toThrow('Domain is not verified');
  });
});
