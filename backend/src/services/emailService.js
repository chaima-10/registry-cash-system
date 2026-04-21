const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!resend) {
    console.warn('⚠️ RESEND_API_KEY is missing. Verification emails will not be sent.');
}

/**
 * Sends a verification email using Resend
 * @param {string} email - Recipient email address
 * @param {string} token - Verification token
 */
exports.sendVerificationEmail = async (email, token) => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://registry-cash-system.vercel.app';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    console.log(`Attempting to send verification email to ${email} via Resend...`);

    try {
        if (!resend) {
            console.error('❌ Resend is not initialized. Cannot send verification email.');
            throw new Error('Le service d\'e-mail n\'est pas configuré.');
        }

        const { data, error } = await resend.emails.send({
            from: 'Registry Cash System <onboarding@resend.dev>',
            to: [email],
            subject: 'Vérifiez votre nouvelle adresse e-mail',
            html: `
                <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 40px; border-radius: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px; margin-bottom: 16px;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Vérification de l'e-mail</h1>
                    </div>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Bonjour,</p>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Vous avez demandé à mettre à jour votre adresse e-mail sur <strong>Registry Cash System</strong>. Pour valider ce changement et sécuriser votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${verificationUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 16px; display: inline-block; transition: all 0.2s ease; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.4);">
                            Confirmer mon adresse e-mail
                        </a>
                    </div>
                    
                    <div style="background-color: #f9fafb; border-radius: 16px; padding: 20px; margin-top: 32px;">
                        <p style="color: #6b7280; font-size: 13px; text-align: center; margin-bottom: 8px;">Si le bouton ne fonctionne pas, copiez ce lien :</p>
                        <p style="color: #3b82f6; font-size: 12px; text-align: center; word-break: break-all; margin: 0;">
                            <a href="${verificationUrl}" style="color: #3b82f6; text-decoration: none;">${verificationUrl}</a>
                        </p>
                    </div>
                    
                    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center;">
                        <p style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
                        <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; 2026 Registry Cash System &bull; <span style="color: #6b7280;">Produit par Antigravity</span></p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error('Resend SDK Error:', error);
            throw error;
        }

        console.log(`✓ Verification email sent successfully to ${email}. ID: ${data?.id}`);
        return data;
    } catch (err) {
        console.error('Failed to send email via Resend:', err.message);
        throw new Error(`Échec de l'envoi de l'e-mail: ${err.message}`);
    }
};
