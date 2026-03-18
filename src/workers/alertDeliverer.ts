import { alertQueue } from './queue';
import { logger, config } from '../config';
import nodemailer from 'nodemailer';
import TelegramBot from 'node-telegram-bot-api';
import { AlertJobData } from '../types';

let mailTransporter: nodemailer.Transporter | null = null;
if (config.SMTP_HOST) {
  mailTransporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
}

let tgBot: TelegramBot | null = null;
if (config.TELEGRAM_BOT_TOKEN) {
  tgBot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: false });
}

alertQueue.process('send-alert', async (job) => {
  const data: AlertJobData = job.data;
  
  logger.info(`Sending alert for rule ${data.rule_id} and tx ${data.signature}`);

  const promises = [];

  if (data.channels.email && mailTransporter) {
    promises.push(
      mailTransporter.sendMail({
        from: config.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL || 'admin@example.com', // In a real app, user emails would be joined from DB
        subject: `Solana Webhook Alert: ${data.address}`,
        text: data.message,
      }).catch(err => logger.error({ err }, 'Failed to send email alert'))
    );
  }

  if (data.channels.telegram && tgBot && config.TELEGRAM_CHAT_ID) {
    promises.push(
      tgBot.sendMessage(config.TELEGRAM_CHAT_ID, data.message)
        .catch(err => logger.error({ err }, 'Failed to send telegram alert'))
    );
  }

  await Promise.all(promises);
});
