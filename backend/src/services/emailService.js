const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    async sendVerificationEmail(email, token) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
        
        const mailOptions = {
            from: `"Registry System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Vérification de votre compte',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #4A90E2; text-align: center;">Bienvenue !</h2>
                    <p>Merci de vous être inscrit. Veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse email :</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" style="background-color: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Vérifier mon email</a>
                    </div>
                    <p>Ou copiez et collez ce lien dans votre navigateur :</p>
                    <p style="word-break: break-all; color: #888;">${verificationLink}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
                </div>
            `,
        };

        return await this.transporter.sendMail(mailOptions);
    }

    async sendPasswordResetEmail(email, token) {
        // For password reset, we can send a code or a link. The user asked for "un code".
        // Let's assume the token is the code.
        
        const mailOptions = {
            from: `"Registry System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #4A90E2; text-align: center;">Réinitialisation de mot de passe</h2>
                    <p>Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de vérification :</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; border: 1px dashed #4A90E2;">${token}</span>
                    </div>
                    <p>Ce code expirera dans 1 heure.</p>
                    <p>Si vous n'avez pas demandé de réinitialisation, veuillez ignorer cet email et sécuriser votre compte.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">Registry System - Sécurité</p>
                </div>
            `,
        };

        return await this.transporter.sendMail(mailOptions);
    }
}

module.exports = new EmailService();
