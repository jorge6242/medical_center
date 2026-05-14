import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import { getTemplateCatalog, getTemplateSummary } from './template-catalog';
import { TEMPLATE_REGISTRY, type TemplateName } from './template-registry';
import { renderTemplateString } from './templates/render-template';

import type { ReceiptEmailTemplateContext } from './templates/receipt-email.template';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mailer.host'),
      port: this.configService.get<number>('mailer.port') ?? 587,
      auth: {
        user: this.configService.get<string>('mailer.user'),
        pass: this.configService.get<string>('mailer.pass'),
      },
    });
  }

  renderTemplate(
    templateName: TemplateName,
    context: ReceiptEmailTemplateContext,
  ): {
    subject: string;
    html: string;
    template: { name: string; version: number; category: string; audience: string };
  } {
    const template = TEMPLATE_REGISTRY[templateName];

    return {
      subject: this.interpolate(template.subject, context),
      html: template.render(context),
      template: {
        name: template.name,
        version: template.version,
        category: template.category,
        audience: template.audience,
      },
    };
  }

  listTemplates() {
    return getTemplateCatalog();
  }

  getTemplateSummary(name: TemplateName) {
    return getTemplateSummary(name);
  }

  async sendReceiptEmail(to: string, subject: string, html: string): Promise<void> {
    const from = this.configService.get<string>('mailer.from');
    const mailerHost = this.configService.get<string>('mailer.host');

    await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    this.logger.log(`Email sent to ${to} via ${mailerHost ?? 'smtp'}`);
  }

  private interpolate(template: string, context: ReceiptEmailTemplateContext): string {
    return renderTemplateString(template, context);
  }
}
