import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  private getFirstDefined(...keys: string[]): string | undefined {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (value && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }

  private parseBoolean(value: string | undefined, defaultValue = false): boolean {
    if (!value) {
      return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }

    return defaultValue;
  }

  async sendResetCodeEmail(email: string, name: string, resetCode: string) {
    const smtpUrl = this.getFirstDefined('SMTP_URL', 'MAIL_URL', 'EMAIL_URL');
    const service = this.getFirstDefined('SMTP_SERVICE', 'MAIL_SERVICE', 'EMAIL_SERVICE');
    const host = this.getFirstDefined('SMTP_HOST', 'MAIL_HOST', 'EMAIL_HOST');
    const portValue = this.getFirstDefined('SMTP_PORT', 'MAIL_PORT', 'EMAIL_PORT') ?? '587';
    const port = Number(portValue);
    const user = this.getFirstDefined(
      'SMTP_USER',
      'MAIL_USER',
      'EMAIL_USER',
      'SMTP_USERNAME',
      'MAIL_USERNAME',
      'EMAIL_USERNAME',
      'BREVO_SMTP_LOGIN',
    );
    const pass = this.getFirstDefined(
      'SMTP_PASS',
      'MAIL_PASS',
      'EMAIL_PASS',
      'SMTP_PASSWORD',
      'MAIL_PASSWORD',
      'EMAIL_PASSWORD',
      'BREVO_SMTP_KEY',
    );
    const from = this.getFirstDefined('SMTP_FROM', 'MAIL_FROM', 'EMAIL_FROM') ?? user;
    const secure = this.parseBoolean(
      this.getFirstDefined('SMTP_SECURE', 'MAIL_SECURE', 'EMAIL_SECURE'),
      port === 465,
    );
    const requireTls = this.parseBoolean(
      this.getFirstDefined('SMTP_REQUIRE_TLS', 'MAIL_REQUIRE_TLS', 'EMAIL_REQUIRE_TLS'),
      false,
    );

    if (!from || !user || !pass || (!smtpUrl && !service && !host)) {
      this.logger.error(
        'Configuration email incomplète. Variables attendues: SMTP_URL ou SMTP_HOST(+SMTP_PORT), SMTP_USER, SMTP_PASS, SMTP_FROM.',
      );
      return false;
    }

    const transporter = smtpUrl
      ? nodemailer.createTransport(smtpUrl)
      : nodemailer.createTransport({
          service,
          host,
          port: Number.isFinite(port) ? port : 587,
          secure,
          auth: { user, pass },
          requireTLS: requireTls,
        });

    try {
      await transporter.verify();
    } catch (error) {
      this.logger.error('Connexion SMTP impossible (vérification échouée)', error as any);
      return false;
    }

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        text: `Bonjour ${name},\n\nVotre code de réinitialisation est: ${resetCode}\n\nCe code expire dans 1 heure.\n`,
      });
      return true;
    } catch (error) {
      this.logger.error(`Erreur envoi mail reset pour ${email}`, error as any);
      return false;
    }
  }
}
