import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { getTemplateCatalog, getTemplateSummary } from './template-catalog';
import { TEMPLATE_REGISTRY, type TemplateName } from './template-registry';
import { renderTemplateString } from './templates/render-template';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('mailer.apiKey');
    this.from = this.configService.getOrThrow<string>('mailer.from');
    this.resend = new Resend(apiKey);
  }

  renderTemplate(
    templateName: TemplateName,
    context: Record<string, unknown>,
  ): {
    subject: string;
    html: string;
    template: {
      name: string;
      version: number;
      category: string;
      audience: string;
    };
  } {
    const template = TEMPLATE_REGISTRY[templateName];

    return {
      subject: this.interpolate(template.subject, context),
      html: template.render(context as never),
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

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    this.logger.log(`Email ${data.id} sent to ${to} via Resend`);
  }

  async sendReceiptEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    return this.sendEmail(to, subject, html);
  }

  private interpolate(
    template: string,
    context: Record<string, unknown>,
  ): string {
    return renderTemplateString(template, context);
  }
}
