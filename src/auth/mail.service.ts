import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendNewPasswordEmail(email: string, name: string, temporaryPassword: string) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM') || user;

    if (!host || !user || !pass || !from) {
      throw new InternalServerErrorException('Configuration email manquante');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Bonjour ${name},\n\nVotre nouveau mot de passe temporaire est: ${temporaryPassword}\n\nConnectez-vous puis changez-le rapidement dans votre profil.\n`,
    }).catch((error) => {
      this.logger.error(`Erreur envoi mail reset pour ${email}`, error as any);
      throw new InternalServerErrorException("Impossible d'envoyer l'email de réinitialisation");
    });
  }
}
